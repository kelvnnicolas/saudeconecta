import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any

import sentry_sdk
import stripe
from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from stripe import SignatureVerificationError

from app.core.config import get_settings
from app.core.errors import erro_negocio
from app.models.assinatura import Assinatura, StatusAssinatura
from app.models.empresa import Empresa
from app.models.evento_stripe import EventoStripe
from app.models.plano import Plano
from app.models.profile import Papel, Profile
from app.services import email_templates
from app.services.email_service import enviar_email
from app.services.entitlements import (
    assinatura_vigente,
    contar_demandas_abertas,
    obter_empresa_elegivel,
)

EVENTOS_ASSINATURA = (
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
)


class ErroProcessamentoWebhook(Exception):
    pass


class EventoNaoAplicavel(Exception):
    """Event that can never be applied locally; retrying would only loop."""


@contextmanager
def _chamada_stripe() -> Iterator[None]:
    try:
        yield
    # No explicit capture: the Starlette integration already reports 5xx HTTPExceptions.
    except stripe.StripeError as exc:
        raise erro_negocio(
            status.HTTP_502_BAD_GATEWAY,
            "stripe_indisponivel",
            "Não foi possível concluir a operação com o Stripe. Tente novamente.",
        ) from exc


def _api_key() -> str:
    return get_settings().stripe_secret_key


def _campo(obj: Any, chave: str, padrao: Any = None) -> Any:
    try:
        valor = obj[chave]
    except (KeyError, TypeError):
        return padrao
    return padrao if valor is None else valor


def listar_planos_ativos(db: Session) -> list[Plano]:
    return list(db.scalars(select(Plano).where(Plano.ativo.is_(True)).order_by(Plano.codigo)))


def _customer_id_existente(db: Session, empresa_id: uuid.UUID) -> str | None:
    return db.scalar(
        select(Assinatura.stripe_customer_id)
        .where(Assinatura.empresa_id == empresa_id)
        .order_by(Assinatura.criado_em.desc())
        .limit(1)
    )


def _criar_customer(empresa: Empresa) -> str:
    customer = stripe.Customer.create(
        api_key=_api_key(),
        email=empresa.profile.email,
        name=empresa.nome_fantasia,
        metadata={"empresa_id": str(empresa.user_id)},
    )
    return customer["id"]


def _encerrar_checkout_anterior(sessao_id: str) -> None:
    # A previous Checkout Session stays payable for 24h; leaving it open would let the
    # company pay twice and end up with two live subscriptions.
    em_processamento = erro_negocio(
        status.HTTP_409_CONFLICT,
        "assinatura_em_processamento",
        "O pagamento de um checkout anterior já foi concluído e está sendo confirmado.",
    )
    try:
        sessao = stripe.checkout.Session.retrieve(sessao_id, api_key=_api_key())
    except stripe.InvalidRequestError as exc:
        if exc.code != "resource_missing":
            raise
        return  # no longer exists on this Stripe account, so it can't be paid either
    situacao = _campo(sessao, "status")
    if situacao == "complete":
        raise em_processamento
    if situacao == "open":
        try:
            stripe.checkout.Session.expire(sessao_id, api_key=_api_key())
        except stripe.InvalidRequestError as exc:
            raise em_processamento from exc


def criar_checkout(db: Session, user_id: uuid.UUID, plano_codigo: str) -> str:
    empresa = obter_empresa_elegivel(db, user_id)
    plano = db.scalar(select(Plano).where(Plano.codigo == plano_codigo, Plano.ativo.is_(True)))
    if plano is None:
        raise erro_negocio(status.HTTP_404_NOT_FOUND, "plano_inexistente", "Plano não encontrado")

    # Lock the empresa row (it always exists, unlike the assinatura row) so concurrent
    # checkouts for the same company can't each open a payable session.
    db.execute(
        select(Empresa.user_id)
        .where(Empresa.user_id == empresa.user_id)
        .with_for_update(key_share=True)
    )
    atual = assinatura_vigente(db, empresa.user_id)
    # A row without a subscription is an abandoned checkout (Checkout only creates the
    # subscription on completion, so no webhook will ever close it) — reuse it.
    if atual is not None and atual.stripe_subscription_id is not None:
        raise erro_negocio(
            status.HTTP_409_CONFLICT,
            "assinatura_existente",
            "Esta empresa já tem uma assinatura. Use o portal para trocar de plano ou cancelar.",
        )

    with _chamada_stripe():
        if atual is not None and atual.stripe_checkout_session_id:
            _encerrar_checkout_anterior(atual.stripe_checkout_session_id)
        customer_id = _customer_id_existente(db, empresa.user_id) or _criar_customer(empresa)
        app_url = get_settings().app_url
        sessao = stripe.checkout.Session.create(
            api_key=_api_key(),
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": plano.stripe_price_id, "quantity": 1}],
            client_reference_id=str(empresa.user_id),
            subscription_data={"metadata": {"empresa_id": str(empresa.user_id)}},
            success_url=f"{app_url}/empresa/assinatura?status=processando",
            cancel_url=f"{app_url}/empresa/planos",
        )

    if atual is None:
        atual = Assinatura(
            empresa_id=empresa.user_id, plano_id=plano.id, status=StatusAssinatura.incomplete
        )
        db.add(atual)
    atual.plano_id = plano.id
    atual.stripe_customer_id = customer_id
    atual.stripe_checkout_session_id = sessao["id"]
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise erro_negocio(
            status.HTTP_409_CONFLICT,
            "assinatura_existente",
            "Esta empresa já tem uma assinatura em andamento.",
        ) from exc
    return sessao["url"]


def criar_portal(db: Session, user_id: uuid.UUID) -> str:
    empresa = obter_empresa_elegivel(db, user_id)
    customer_id = _customer_id_existente(db, empresa.user_id)
    if customer_id is None:
        raise erro_negocio(
            status.HTTP_404_NOT_FOUND,
            "assinatura_inexistente",
            "Esta empresa ainda não tem assinatura.",
        )
    with _chamada_stripe():
        sessao = stripe.billing_portal.Session.create(
            api_key=_api_key(),
            customer=customer_id,
            return_url=f"{get_settings().app_url}/empresa/assinatura",
        )
    return sessao["url"]


def obter_assinatura_da_empresa(db: Session, user_id: uuid.UUID) -> tuple[Assinatura | None, int]:
    profile = db.get(Profile, user_id)
    if profile is None or profile.papel != Papel.empresa:
        raise erro_negocio(
            status.HTTP_403_FORBIDDEN, "nao_elegivel", "Recurso disponível só para empresas"
        )
    assinatura = assinatura_vigente(db, user_id) or db.scalar(
        select(Assinatura)
        .where(Assinatura.empresa_id == user_id)
        .order_by(Assinatura.criado_em.desc())
        .limit(1)
    )
    return assinatura, contar_demandas_abertas(db, user_id)


def construir_evento(payload: bytes, assinatura_header: str | None) -> Any:
    try:
        return stripe.Webhook.construct_event(
            payload, assinatura_header, get_settings().stripe_webhook_secret
        )
    except (ValueError, SignatureVerificationError) as exc:
        raise erro_negocio(
            status.HTTP_400_BAD_REQUEST,
            "assinatura_webhook_invalida",
            "Assinatura do webhook inválida",
        ) from exc


def _localizar_assinatura(db: Session, subscription: Any) -> Assinatura:
    assinatura = db.scalar(
        select(Assinatura).where(Assinatura.stripe_subscription_id == subscription["id"])
    )
    if assinatura is not None:
        return assinatura

    empresa_id = _campo(_campo(subscription, "metadata"), "empresa_id")
    if empresa_id is not None:
        assinatura = assinatura_vigente(db, uuid.UUID(empresa_id))
    if assinatura is None:
        raise EventoNaoAplicavel(
            f"nenhuma assinatura local para a subscription {subscription['id']}"
        )
    if assinatura.stripe_subscription_id not in (None, subscription["id"]):
        raise EventoNaoAplicavel(
            f"subscription {subscription['id']} duplicada: empresa {empresa_id} já tem "
            f"{assinatura.stripe_subscription_id} vinculada — verificar cobrança em dobro"
        )
    assinatura.stripe_subscription_id = subscription["id"]
    return assinatura


def _travar_subscription(db: Session, subscription_id: str) -> None:
    # Serializes every handler touching this subscription (checkout.session.completed and
    # subscription.created/updated arrive almost together), so a handler that fetched an
    # older state can't commit after one that fetched a newer state.
    db.execute(select(func.pg_advisory_xact_lock(func.hashtext(subscription_id))))


def _sincronizar_subscription(db: Session, subscription_id: str) -> str | None:
    # Always re-fetch: events can arrive out of order, so only the current object
    # (not the event payload) reflects the real state.
    _travar_subscription(db, subscription_id)
    subscription = stripe.Subscription.retrieve(subscription_id, api_key=_api_key())
    assinatura = _localizar_assinatura(db, subscription)

    assinatura.status = StatusAssinatura(subscription["status"])
    assinatura.cancel_at_period_end = bool(_campo(subscription, "cancel_at_period_end", False))

    # Since API version 2025-03-31.basil (this SDK pins 2026-08-26.dahlia) the billing
    # period lives on each subscription item, not on the subscription itself.
    item = subscription["items"]["data"][0]
    fim_periodo = _campo(item, "current_period_end")
    assinatura.current_period_end = (
        datetime.fromtimestamp(fim_periodo, UTC) if fim_periodo is not None else None
    )

    price_id = item["price"]["id"]
    plano = db.scalar(select(Plano).where(Plano.stripe_price_id == price_id))
    if plano is None:
        mensagem = f"price desconhecido na subscription {subscription_id}: {price_id}"
        sentry_sdk.capture_message(mensagem, level="error")
        return mensagem
    assinatura.plano_id = plano.id
    return None


def _checkout_concluido(db: Session, sessao: Any) -> str | None:
    subscription_id = _campo(sessao, "subscription")
    if subscription_id is None:
        return None
    _travar_subscription(db, subscription_id)
    empresa_id = _campo(sessao, "client_reference_id")
    assinatura = db.scalar(
        select(Assinatura).where(Assinatura.stripe_subscription_id == subscription_id)
    )
    if assinatura is None and empresa_id is not None:
        assinatura = assinatura_vigente(db, uuid.UUID(empresa_id))
    if assinatura is None:
        raise EventoNaoAplicavel(
            f"nenhuma assinatura local para o checkout da empresa {empresa_id}"
        )
    if assinatura.stripe_subscription_id is None:
        assinatura.stripe_subscription_id = subscription_id
    return _sincronizar_subscription(db, subscription_id)


def _pagamento_falhou(db: Session, invoice: Any) -> None:
    customer_id = _campo(invoice, "customer")
    assinatura = db.scalar(
        select(Assinatura)
        .where(Assinatura.stripe_customer_id == customer_id)
        .order_by(Assinatura.criado_em.desc())
        .limit(1)
    )
    if assinatura is None:
        return
    profile = db.get(Profile, assinatura.empresa_id)
    if profile is None or not profile.email:
        return
    link = f"{get_settings().app_url}/empresa/assinatura"
    enviar_email(profile.email, *email_templates.falha_pagamento_assinatura(link))


def _despachar(db: Session, tipo: str, objeto: Any) -> str | None:
    if tipo == "checkout.session.completed":
        return _checkout_concluido(db, objeto)
    if tipo in EVENTOS_ASSINATURA:
        return _sincronizar_subscription(db, objeto["id"])
    if tipo == "invoice.payment_failed":
        _pagamento_falhou(db, objeto)
    return None


def processar_evento(db: Session, evento: Any) -> None:
    evento_id = evento["id"]
    db.execute(
        insert(EventoStripe)
        .values(id=evento_id, tipo=evento["type"])
        .on_conflict_do_nothing(index_elements=["id"])
    )
    registro = db.scalar(select(EventoStripe).where(EventoStripe.id == evento_id).with_for_update())
    if registro.processado_em is not None:
        db.commit()
        return

    try:
        with db.begin_nested():
            aviso = _despachar(db, evento["type"], evento["data"]["object"])
    except EventoNaoAplicavel as exc:
        aviso = str(exc)
        sentry_sdk.capture_message(aviso, level="error")
    except Exception as exc:
        registro.erro = f"{type(exc).__name__}: {exc}"[:1000]
        db.commit()
        sentry_sdk.capture_exception(exc)
        raise ErroProcessamentoWebhook(evento_id) from exc

    registro.erro = aviso
    registro.processado_em = datetime.now(UTC)
    db.commit()
