import uuid
from datetime import UTC, datetime

import sentry_sdk
from fastapi import status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.errors import erro_negocio
from app.models.notificacao import Notificacao, TipoNotificacao


def registrar_notificacao(
    db: Session,
    destinatario_id: uuid.UUID,
    tipo: TipoNotificacao,
    titulo: str,
    corpo: str,
    link: str,
) -> Notificacao | None:
    # A notification must never block the action that triggered it (spec §6) —
    # same spirit as enviar_email, which already swallows its own exceptions.
    # The insert runs in its own savepoint so a failure here rolls back only
    # the notification, leaving the caller's session (and its own pending or
    # already-committed work) untouched.
    try:
        with db.begin_nested():
            notificacao = Notificacao(
                destinatario_id=destinatario_id, tipo=tipo, titulo=titulo, corpo=corpo, link=link
            )
            db.add(notificacao)
            db.flush()
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
        return None
    # Flush only, never commit: a caller inside a savepoint (e.g. billing's
    # processar_evento) would have its `with db.begin_nested()` block broken by
    # a commit here. Callers outside a savepoint must commit themselves.
    db.refresh(notificacao)
    return notificacao


def listar_notificacoes(
    db: Session, user_id: uuid.UUID, limit: int = 20, offset: int = 0
) -> tuple[list[Notificacao], int, int]:
    total = (
        db.scalar(
            select(func.count())
            .select_from(Notificacao)
            .where(Notificacao.destinatario_id == user_id)
        )
        or 0
    )
    total_nao_lidas = (
        db.scalar(
            select(func.count())
            .select_from(Notificacao)
            .where(Notificacao.destinatario_id == user_id, Notificacao.lida_em.is_(None))
        )
        or 0
    )
    items = list(
        db.scalars(
            select(Notificacao)
            .where(Notificacao.destinatario_id == user_id)
            .order_by(Notificacao.criado_em.desc(), Notificacao.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )
    return items, total, total_nao_lidas


def _notificacao_do_usuario(db: Session, user_id: uuid.UUID, notificacao_id: int) -> Notificacao:
    notificacao = db.get(Notificacao, notificacao_id)
    if notificacao is None or notificacao.destinatario_id != user_id:
        raise erro_negocio(
            status.HTTP_404_NOT_FOUND, "notificacao_inexistente", "Notificação não encontrada"
        )
    return notificacao


def marcar_lida(db: Session, user_id: uuid.UUID, notificacao_id: int) -> Notificacao:
    notificacao = _notificacao_do_usuario(db, user_id, notificacao_id)
    if notificacao.lida_em is None:
        notificacao.lida_em = datetime.now(UTC)
        db.commit()
        db.refresh(notificacao)
    return notificacao


def marcar_todas_lidas(db: Session, user_id: uuid.UUID) -> int:
    resultado = db.execute(
        update(Notificacao)
        .where(Notificacao.destinatario_id == user_id, Notificacao.lida_em.is_(None))
        .values(lida_em=datetime.now(UTC))
    )
    db.commit()
    return resultado.rowcount
