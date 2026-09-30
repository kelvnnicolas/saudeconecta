import hashlib
import hmac
import json
import time
import uuid
from datetime import UTC, datetime
from unittest.mock import patch

import pytest
import stripe
from sqlalchemy import select

from app.models.assinatura import Assinatura, StatusAssinatura
from app.models.evento_stripe import EventoStripe
from tests.fabrica import autenticar, criar_assinatura, criar_empresa, plano

SEGREDO = "whsec_dummy_for_tests"
FIM_PERIODO = 1792800000


def _assinar(payload: str, segredo: str = SEGREDO) -> str:
    timestamp = int(time.time())
    assinatura = hmac.new(
        segredo.encode(), f"{timestamp}.{payload}".encode(), hashlib.sha256
    ).hexdigest()
    return f"t={timestamp},v1={assinatura}"


def _evento(tipo: str, objeto: dict, evento_id: str | None = None) -> str:
    return json.dumps(
        {
            "id": evento_id or f"evt_{uuid.uuid4().hex}",
            "object": "event",
            "type": tipo,
            "data": {"object": objeto},
        }
    )


def _enviar(client, payload: str, assinatura: str | None = None):
    return client.post(
        "/webhooks/stripe",
        content=payload,
        headers={"stripe-signature": assinatura or _assinar(payload)},
    )


def _subscription(
    sub_id: str,
    status: str = "active",
    price_id: str = "price_test_pro",
    empresa_id: uuid.UUID | None = None,
    cancel_at_period_end: bool = False,
):
    return stripe.Subscription.construct_from(
        {
            "id": sub_id,
            "object": "subscription",
            "status": status,
            "cancel_at_period_end": cancel_at_period_end,
            "metadata": {"empresa_id": str(empresa_id)} if empresa_id else {},
            "items": {
                "object": "list",
                "data": [
                    {
                        "id": "si_1",
                        "current_period_end": FIM_PERIODO,
                        "price": {"id": price_id},
                    }
                ],
            },
        },
        "k",
    )


@pytest.fixture
def retrieve():
    with patch("app.services.billing.stripe.Subscription.retrieve") as mock:
        yield mock


def test_assinatura_invalida_retorna_400_e_nao_registra_nada(client, db_session, retrieve):
    payload = _evento("customer.subscription.updated", {"id": "sub_1"}, "evt_invalido")

    response = _enviar(client, payload, assinatura=_assinar(payload, segredo="whsec_errado"))

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "assinatura_webhook_invalida"
    assert db_session.get(EventoStripe, "evt_invalido") is None
    retrieve.assert_not_called()


def test_sem_header_de_assinatura_retorna_400(client, retrieve):
    payload = _evento("customer.subscription.updated", {"id": "sub_1"})
    response = client.post("/webhooks/stripe", content=payload)
    assert response.status_code == 400


def test_checkout_concluido_vincula_subscription_e_sincroniza(client, db_session, retrieve):
    empresa_id = criar_empresa(db_session)
    assinatura = criar_assinatura(
        db_session, empresa_id, status=StatusAssinatura.incomplete, plano_codigo="pro"
    )
    db_session.commit()
    retrieve.return_value = _subscription("sub_novo", empresa_id=empresa_id)
    payload = _evento(
        "checkout.session.completed",
        {
            "id": "cs_1",
            "object": "checkout.session",
            "client_reference_id": str(empresa_id),
            "subscription": "sub_novo",
            "customer": "cus_test_existente",
        },
        "evt_checkout",
    )

    response = _enviar(client, payload)

    assert response.status_code == 200
    db_session.refresh(assinatura)
    assert assinatura.stripe_subscription_id == "sub_novo"
    assert assinatura.status == StatusAssinatura.active
    assert assinatura.current_period_end == datetime.fromtimestamp(FIM_PERIODO, UTC)
    evento = db_session.get(EventoStripe, "evt_checkout")
    assert evento.tipo == "checkout.session.completed"
    assert evento.processado_em is not None
    assert evento.erro is None


@pytest.mark.parametrize(
    "tipo,status_stripe,esperado",
    [
        ("customer.subscription.created", "trialing", StatusAssinatura.trialing),
        ("customer.subscription.updated", "past_due", StatusAssinatura.past_due),
        ("customer.subscription.deleted", "canceled", StatusAssinatura.canceled),
    ],
)
def test_eventos_de_subscription_sincronizam_status_plano_e_periodo(
    client, db_session, retrieve, tipo, status_stripe, esperado
):
    empresa_id = criar_empresa(db_session)
    assinatura = criar_assinatura(
        db_session, empresa_id, subscription_id="sub_sync", plano_codigo="essencial"
    )
    db_session.commit()
    retrieve.return_value = _subscription(
        "sub_sync", status=status_stripe, price_id="price_test_pro", cancel_at_period_end=True
    )

    response = _enviar(client, _evento(tipo, {"id": "sub_sync", "object": "subscription"}))

    assert response.status_code == 200
    db_session.refresh(assinatura)
    assert assinatura.status == esperado
    assert assinatura.plano_id == plano(db_session, "pro").id
    assert assinatura.cancel_at_period_end is True
    assert assinatura.current_period_end == datetime.fromtimestamp(FIM_PERIODO, UTC)


def test_evento_fora_de_ordem_grava_estado_do_objeto_buscado(client, db_session, retrieve):
    empresa_id = criar_empresa(db_session)
    assinatura = criar_assinatura(db_session, empresa_id, subscription_id="sub_ordem")
    db_session.commit()
    # A stale "active" update arriving after the subscription already went past_due.
    retrieve.return_value = _subscription("sub_ordem", status="past_due")
    payload = _evento(
        "customer.subscription.updated",
        {"id": "sub_ordem", "object": "subscription", "status": "active"},
    )

    assert _enviar(client, payload).status_code == 200

    db_session.refresh(assinatura)
    assert assinatura.status == StatusAssinatura.past_due
    retrieve.assert_called_once_with("sub_ordem", api_key="sk_test_dummy_for_tests")


def test_subscription_created_antes_do_checkout_vincula_pela_metadata(client, db_session, retrieve):
    empresa_id = criar_empresa(db_session)
    assinatura = criar_assinatura(db_session, empresa_id, status=StatusAssinatura.incomplete)
    db_session.commit()
    retrieve.return_value = _subscription("sub_cedo", empresa_id=empresa_id)

    payload = _evento("customer.subscription.created", {"id": "sub_cedo"})
    assert _enviar(client, payload).status_code == 200

    db_session.refresh(assinatura)
    assert assinatura.stripe_subscription_id == "sub_cedo"
    assert assinatura.status == StatusAssinatura.active


def test_evento_duplicado_nao_reprocessa(client, db_session, retrieve):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id, subscription_id="sub_dup")
    db_session.commit()
    retrieve.return_value = _subscription("sub_dup")
    payload = _evento("customer.subscription.updated", {"id": "sub_dup"}, "evt_duplicado")

    primeira = _enviar(client, payload)
    segunda = _enviar(client, payload)

    assert primeira.status_code == 200
    assert segunda.status_code == 200
    retrieve.assert_called_once()


def test_price_desconhecido_registra_erro_sem_quebrar_os_demais_campos(
    client, db_session, retrieve
):
    empresa_id = criar_empresa(db_session)
    assinatura = criar_assinatura(
        db_session, empresa_id, subscription_id="sub_price", plano_codigo="essencial"
    )
    db_session.commit()
    retrieve.return_value = _subscription("sub_price", status="past_due", price_id="price_x")
    payload = _evento("customer.subscription.updated", {"id": "sub_price"}, "evt_price")

    with patch("app.services.billing.sentry_sdk.capture_message") as capture:
        response = _enviar(client, payload)

    assert response.status_code == 200
    db_session.refresh(assinatura)
    assert assinatura.status == StatusAssinatura.past_due
    assert assinatura.plano_id == plano(db_session, "essencial").id
    evento = db_session.get(EventoStripe, "evt_price")
    assert "price_x" in evento.erro
    assert evento.processado_em is not None
    capture.assert_called_once()


def test_evento_nao_tratado_e_registrado_e_retorna_200(client, db_session, retrieve):
    payload = _evento("customer.created", {"id": "cus_1"}, "evt_nao_tratado")

    response = _enviar(client, payload)

    assert response.status_code == 200
    evento = db_session.get(EventoStripe, "evt_nao_tratado")
    assert evento.tipo == "customer.created"
    assert evento.processado_em is not None
    retrieve.assert_not_called()


def test_erro_de_processamento_grava_erro_reporta_e_retorna_500(client, db_session, retrieve):
    empresa_id = criar_empresa(db_session)
    assinatura = criar_assinatura(db_session, empresa_id, subscription_id="sub_erro")
    db_session.commit()
    retrieve.side_effect = stripe.APIConnectionError("Stripe fora do ar")
    payload = _evento("customer.subscription.updated", {"id": "sub_erro"}, "evt_erro")

    with patch("app.services.billing.sentry_sdk.capture_exception") as capture:
        response = _enviar(client, payload)

    assert response.status_code == 500
    evento = db_session.get(EventoStripe, "evt_erro")
    assert "APIConnectionError" in evento.erro
    assert evento.processado_em is None
    capture.assert_called_once()
    db_session.refresh(assinatura)
    assert assinatura.status == StatusAssinatura.active


def test_evento_que_falhou_e_reprocessado_no_reenvio(client, db_session, retrieve):
    empresa_id = criar_empresa(db_session)
    assinatura = criar_assinatura(db_session, empresa_id, subscription_id="sub_retry")
    db_session.commit()
    payload = _evento("customer.subscription.updated", {"id": "sub_retry"}, "evt_retry")

    retrieve.side_effect = stripe.APIConnectionError("instável")
    with patch("app.services.billing.sentry_sdk.capture_exception"):
        assert _enviar(client, payload).status_code == 500

    retrieve.side_effect = None
    retrieve.return_value = _subscription("sub_retry", status="past_due")
    assert _enviar(client, payload).status_code == 200

    db_session.refresh(assinatura)
    assert assinatura.status == StatusAssinatura.past_due
    assert db_session.get(EventoStripe, "evt_retry").processado_em is not None


def test_pagamento_falhou_envia_email_com_link_da_assinatura(client, db_session, retrieve):
    empresa_id = criar_empresa(db_session, email="financeiro@clinica.com")
    criar_assinatura(db_session, empresa_id, subscription_id="sub_falha", customer_id="cus_falha")
    db_session.commit()
    payload = _evento(
        "invoice.payment_failed",
        {"id": "in_1", "object": "invoice", "customer": "cus_falha"},
    )

    with patch("app.services.billing.enviar_email") as enviar:
        response = _enviar(client, payload)

    assert response.status_code == 200
    para, assunto, texto, html = enviar.call_args.args
    assert para == "financeiro@clinica.com"
    assert assunto == "Não conseguimos processar o pagamento da sua assinatura"
    assert "http://localhost:3000/empresa/assinatura" in texto
    assert "http://localhost:3000/empresa/assinatura" in html


def test_pagamento_falhou_gera_notificacao_in_app(client, db_session, retrieve):
    empresa_id = criar_empresa(db_session, email="financeiro2@clinica.com")
    criar_assinatura(db_session, empresa_id, subscription_id="sub_falha2", customer_id="cus_falha2")
    db_session.commit()
    payload = _evento(
        "invoice.payment_failed",
        {"id": "in_2", "object": "invoice", "customer": "cus_falha2"},
    )

    with patch("app.services.billing.enviar_email"):
        response = _enviar(client, payload)
    assert response.status_code == 200

    autenticar(empresa_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 1
    assert notificacoes.json()["items"][0]["tipo"] == "falha_pagamento"
    assert notificacoes.json()["items"][0]["link"] == "/assinatura"


def test_webhook_nao_exige_autenticacao_de_usuario(client, db_session, retrieve):
    payload = _evento("customer.created", {"id": "cus_2"})
    assert _enviar(client, payload).status_code == 200
    assert db_session.scalar(select(Assinatura)) is None


def test_subscription_duplicada_e_registrada_e_alertada_sem_loop_de_retry(
    client, db_session, retrieve
):
    empresa_id = criar_empresa(db_session)
    assinatura = criar_assinatura(db_session, empresa_id, subscription_id="sub_1")
    db_session.commit()
    retrieve.return_value = _subscription("sub_2", empresa_id=empresa_id)
    payload = _evento(
        "checkout.session.completed",
        {"id": "cs_2", "client_reference_id": str(empresa_id), "subscription": "sub_2"},
        "evt_duplicada",
    )

    with patch("app.services.billing.sentry_sdk.capture_message") as capture:
        response = _enviar(client, payload)

    assert response.status_code == 200
    evento = db_session.get(EventoStripe, "evt_duplicada")
    assert "duplicada" in evento.erro
    assert evento.processado_em is not None
    capture.assert_called_once()
    db_session.refresh(assinatura)
    assert assinatura.stripe_subscription_id == "sub_1"


def test_subscription_sem_assinatura_local_e_registrada_com_200(client, db_session, retrieve):
    retrieve.return_value = _subscription("sub_externa")
    payload = _evento("customer.subscription.updated", {"id": "sub_externa"}, "evt_externa")

    with patch("app.services.billing.sentry_sdk.capture_message") as capture:
        response = _enviar(client, payload)

    assert response.status_code == 200
    evento = db_session.get(EventoStripe, "evt_externa")
    assert "nenhuma assinatura local" in evento.erro
    assert evento.processado_em is not None
    capture.assert_called_once()
