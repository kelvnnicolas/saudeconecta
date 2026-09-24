from datetime import UTC, datetime
from unittest.mock import patch

import pytest
import stripe
from sqlalchemy import select

from app.models.assinatura import Assinatura, StatusAssinatura
from app.models.empresa import TipoEmpresa
from tests.fabrica import (
    autenticar,
    criar_assinatura,
    criar_demanda,
    criar_empresa,
    criar_profissional,
    plano,
)


@pytest.fixture
def stripe_mock():
    with (
        patch("app.services.billing.stripe.Customer.create") as customer_create,
        patch("app.services.billing.stripe.checkout.Session.create") as checkout_create,
        patch("app.services.billing.stripe.billing_portal.Session.create") as portal_create,
    ):
        customer_create.return_value = stripe.Customer.construct_from({"id": "cus_novo"}, "k")
        checkout_create.return_value = stripe.checkout.Session.construct_from(
            {"id": "cs_1", "url": "https://checkout.stripe.test/cs_1"}, "k"
        )
        portal_create.return_value = stripe.billing_portal.Session.construct_from(
            {"id": "bps_1", "url": "https://billing.stripe.test/bps_1"}, "k"
        )
        yield customer_create, checkout_create, portal_create


def test_listar_planos_e_publico_e_nao_expoe_price_id(client):
    response = client.get("/planos")

    assert response.status_code == 200
    assert response.json() == [
        {"codigo": "essencial", "nome": "Essencial", "limite_demandas_ativas": 5},
        {"codigo": "pro", "nome": "Pro", "limite_demandas_ativas": None},
    ]


def test_checkout_exige_autenticacao(client):
    assert client.post("/assinaturas/checkout", json={"plano_codigo": "pro"}).status_code == 401


def test_checkout_recusa_empresa_pessoa_fisica(client, db_session, stripe_mock):
    empresa_id = criar_empresa(db_session, tipo=TipoEmpresa.pessoa_fisica)
    db_session.commit()
    autenticar(empresa_id)

    response = client.post("/assinaturas/checkout", json={"plano_codigo": "pro"})

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "nao_elegivel"
    stripe_mock[1].assert_not_called()


def test_checkout_recusa_profissional(client, db_session, stripe_mock):
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    response = client.post("/assinaturas/checkout", json={"plano_codigo": "pro"})

    assert response.status_code == 403


def test_checkout_plano_inexistente_retorna_404(client, db_session, stripe_mock):
    empresa_id = criar_empresa(db_session)
    db_session.commit()
    autenticar(empresa_id)

    response = client.post("/assinaturas/checkout", json={"plano_codigo": "platinum"})

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "plano_inexistente"


def test_checkout_cria_customer_sessao_e_assinatura_incomplete(client, db_session, stripe_mock):
    customer_create, checkout_create, _ = stripe_mock
    empresa_id = criar_empresa(db_session, email="financeiro@clinica.com")
    db_session.commit()
    autenticar(empresa_id)

    response = client.post("/assinaturas/checkout", json={"plano_codigo": "pro"})

    assert response.status_code == 200
    assert response.json() == {"checkout_url": "https://checkout.stripe.test/cs_1"}

    assert customer_create.call_args.kwargs["email"] == "financeiro@clinica.com"
    kwargs = checkout_create.call_args.kwargs
    assert kwargs["mode"] == "subscription"
    assert kwargs["customer"] == "cus_novo"
    assert kwargs["line_items"] == [{"price": "price_test_pro", "quantity": 1}]
    assert kwargs["client_reference_id"] == str(empresa_id)
    assert kwargs["subscription_data"] == {"metadata": {"empresa_id": str(empresa_id)}}
    assert kwargs["success_url"] == "http://localhost:3000/empresa/assinatura?status=processando"
    assert kwargs["cancel_url"] == "http://localhost:3000/empresa/planos"

    assinatura = db_session.scalar(select(Assinatura).where(Assinatura.empresa_id == empresa_id))
    assert assinatura.status == StatusAssinatura.incomplete
    assert assinatura.stripe_customer_id == "cus_novo"
    assert assinatura.stripe_subscription_id is None
    assert assinatura.plano_id == plano(db_session, "pro").id


def test_checkout_recusa_segunda_assinatura(client, db_session, stripe_mock):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id, subscription_id="sub_ativa")
    db_session.commit()
    autenticar(empresa_id)

    response = client.post("/assinaturas/checkout", json={"plano_codigo": "pro"})

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "assinatura_existente"
    stripe_mock[1].assert_not_called()


def test_checkout_reutiliza_customer_de_assinatura_cancelada(client, db_session, stripe_mock):
    customer_create, checkout_create, _ = stripe_mock
    empresa_id = criar_empresa(db_session)
    criar_assinatura(
        db_session,
        empresa_id,
        status=StatusAssinatura.canceled,
        subscription_id="sub_antiga",
        customer_id="cus_antigo",
    )
    db_session.commit()
    autenticar(empresa_id)

    response = client.post("/assinaturas/checkout", json={"plano_codigo": "essencial"})

    assert response.status_code == 200
    customer_create.assert_not_called()
    assert checkout_create.call_args.kwargs["customer"] == "cus_antigo"
    assinaturas = db_session.scalars(
        select(Assinatura).where(Assinatura.empresa_id == empresa_id)
    ).all()
    assert {a.status for a in assinaturas} == {
        StatusAssinatura.canceled,
        StatusAssinatura.incomplete,
    }


def test_checkout_abandonado_e_reaproveitado_em_vez_de_bloquear(client, db_session, stripe_mock):
    customer_create, _, _ = stripe_mock
    empresa_id = criar_empresa(db_session)
    abandonada = criar_assinatura(
        db_session, empresa_id, status=StatusAssinatura.incomplete, customer_id="cus_abandono"
    )
    db_session.commit()
    autenticar(empresa_id)

    response = client.post("/assinaturas/checkout", json={"plano_codigo": "pro"})

    assert response.status_code == 200
    customer_create.assert_not_called()
    db_session.refresh(abandonada)
    assert abandonada.plano_id == plano(db_session, "pro").id
    total = db_session.scalars(select(Assinatura).where(Assinatura.empresa_id == empresa_id))
    assert len(total.all()) == 1


def test_portal_sem_customer_retorna_404(client, db_session, stripe_mock):
    empresa_id = criar_empresa(db_session)
    db_session.commit()
    autenticar(empresa_id)

    response = client.post("/assinaturas/portal")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "assinatura_inexistente"


def test_portal_cria_sessao_com_return_url(client, db_session, stripe_mock):
    _, _, portal_create = stripe_mock
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id, customer_id="cus_portal")
    db_session.commit()
    autenticar(empresa_id)

    response = client.post("/assinaturas/portal")

    assert response.status_code == 200
    assert response.json() == {"portal_url": "https://billing.stripe.test/bps_1"}
    assert portal_create.call_args.kwargs["customer"] == "cus_portal"
    assert portal_create.call_args.kwargs["return_url"] == (
        "http://localhost:3000/empresa/assinatura"
    )


def test_minha_assinatura_sem_assinatura(client, db_session):
    empresa_id = criar_empresa(db_session)
    db_session.commit()
    autenticar(empresa_id)

    response = client.get("/assinaturas/me")

    assert response.status_code == 200
    assert response.json() == {
        "plano": None,
        "status": None,
        "current_period_end": None,
        "cancel_at_period_end": False,
        "uso": {"demandas_ativas": 0, "limite": None},
    }


def test_minha_assinatura_mostra_plano_status_periodo_e_uso(client, db_session):
    empresa_id = criar_empresa(db_session)
    assinatura = criar_assinatura(db_session, empresa_id, plano_codigo="essencial")
    assinatura.current_period_end = datetime(2026, 10, 24, tzinfo=UTC)
    assinatura.cancel_at_period_end = True
    criar_demanda(db_session, empresa_id)
    criar_demanda(db_session, empresa_id)
    db_session.commit()
    autenticar(empresa_id)

    body = client.get("/assinaturas/me").json()

    assert body["plano"]["codigo"] == "essencial"
    assert body["status"] == "active"
    assert body["current_period_end"].startswith("2026-10-24")
    assert body["cancel_at_period_end"] is True
    assert body["uso"] == {"demandas_ativas": 2, "limite": 5}


def test_minha_assinatura_recusa_profissional(client, db_session):
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    assert client.get("/assinaturas/me").status_code == 403
