import uuid
from datetime import UTC, datetime, time, timedelta

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import PERFIL_NAO_CONCLUIDO, erro_negocio
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional
from app.models.verificacao import (
    METODO_CONSULTA_MANUAL,
    AtorVerificacao,
    StatusVerificacao,
    VerificacaoRegistro,
)
from app.schemas.verificacao import ResultadoVerificacaoRequest


def estado_atual(db: Session, profissional_id: uuid.UUID) -> StatusVerificacao:
    """O estado é o `status_novo` da última linha da trilha; sem linhas, `unverified`."""
    ultimo = db.scalar(
        select(VerificacaoRegistro.status_novo)
        .where(VerificacaoRegistro.profissional_id == profissional_id)
        .order_by(VerificacaoRegistro.id.desc())
        .limit(1)
    )
    return ultimo or StatusVerificacao.unverified


def _data_da_conferencia(informada) -> datetime:
    # Guardada ao meio-dia UTC para o dia mostrado no Brasil (UTC-3) nunca "voltar" um dia.
    dia = informada or (datetime.now(UTC) - timedelta(hours=3)).date()
    return datetime.combine(dia, time(12, 0), tzinfo=UTC)


def _registrar(
    db: Session,
    profissional: Profissional,
    novo: StatusVerificacao,
    ator_tipo: AtorVerificacao,
    ator_id: uuid.UUID | None,
    **dados,
) -> VerificacaoRegistro:
    anterior = estado_atual(db, profissional.user_id)
    linha = VerificacaoRegistro(
        profissional_id=profissional.user_id,
        status_anterior=anterior,
        status_novo=novo,
        ator_tipo=ator_tipo,
        ator_id=ator_id,
        **dados,
    )
    db.add(linha)
    # Projeção pública: só `verified` vira selo. O estado detalhado fica só na trilha.
    profissional.verificado = novo == StatusVerificacao.verified
    profissional.verificado_em = dados.get("verificado_em") if profissional.verificado else None
    db.flush()
    return linha


def _profissional_logado(db: Session, user_id: uuid.UUID) -> Profissional:
    profile = db.get(Profile, user_id)
    if profile is None:
        raise erro_negocio(
            status.HTTP_400_BAD_REQUEST, "perfil_nao_concluido", PERFIL_NAO_CONCLUIDO
        )
    if profile.papel != Papel.profissional:
        raise erro_negocio(
            status.HTTP_403_FORBIDDEN,
            "apenas_profissionais",
            "Recurso disponível só para profissionais",
        )
    profissional = db.get(Profissional, user_id)
    if profissional is None:
        raise erro_negocio(
            status.HTTP_400_BAD_REQUEST, "perfil_nao_concluido", PERFIL_NAO_CONCLUIDO
        )
    return profissional


def estado_do_proprio_profissional(db: Session, user_id: uuid.UUID):
    profissional = _profissional_logado(db, user_id)
    return estado_atual(db, user_id), profissional.verificado_em


def solicitar_conferencia(db: Session, user_id: uuid.UUID) -> Profissional:
    profissional = _profissional_logado(db, user_id)
    if not (profissional.registro_profissional or "").strip():
        raise erro_negocio(
            status.HTTP_400_BAD_REQUEST,
            "registro_nao_informado",
            "Informe seu registro profissional no perfil antes de pedir a conferência.",
        )
    atual = estado_atual(db, user_id)
    if atual == StatusVerificacao.pending:
        raise erro_negocio(
            status.HTTP_409_CONFLICT,
            "verificacao_ja_solicitada",
            "Sua conferência já foi solicitada e está em análise.",
        )
    if atual == StatusVerificacao.verified:
        raise erro_negocio(
            status.HTTP_409_CONFLICT, "ja_verificado", "Seu registro já foi conferido."
        )
    _registrar(db, profissional, StatusVerificacao.pending, AtorVerificacao.profissional, user_id)
    db.commit()
    return profissional


def registrar_resultado(
    db: Session, admin_id: uuid.UUID, profissional_id: uuid.UUID, dados: ResultadoVerificacaoRequest
) -> Profissional:
    profissional = db.get(Profissional, profissional_id)
    if profissional is None:
        raise erro_negocio(
            status.HTTP_404_NOT_FOUND, "profissional_inexistente", "Profissional não encontrado"
        )
    _registrar(
        db,
        profissional,
        StatusVerificacao(dados.status),
        AtorVerificacao.administrador,
        admin_id,
        conselho=dados.conselho,
        uf=dados.uf,
        numero_registro=dados.numero_registro,
        metodo=METODO_CONSULTA_MANUAL,
        fonte=dados.fonte,
        verificado_em=_data_da_conferencia(dados.verificado_em),
    )
    db.commit()
    return profissional


def invalidar_por_mudanca_de_registro(db: Session, profissional: Profissional) -> None:
    """Mudou o registro: a conferência anterior deixa de valer e o estado volta a `unverified`."""
    if estado_atual(db, profissional.user_id) != StatusVerificacao.unverified:
        _registrar(db, profissional, StatusVerificacao.unverified, AtorVerificacao.sistema, None)


def listar_para_admin(
    db: Session, estado: StatusVerificacao, limit: int, offset: int
) -> tuple[list[tuple[VerificacaoRegistro, Profissional, Profile]], int]:
    ultima = (
        select(func.max(VerificacaoRegistro.id).label("ultimo_id"))
        .group_by(VerificacaoRegistro.profissional_id)
        .subquery()
    )
    base = (
        select(VerificacaoRegistro, Profissional, Profile)
        .join(ultima, VerificacaoRegistro.id == ultima.c.ultimo_id)
        .join(Profissional, Profissional.user_id == VerificacaoRegistro.profissional_id)
        .join(Profile, Profile.id == Profissional.user_id)
        .where(VerificacaoRegistro.status_novo == estado)
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    linhas = db.execute(
        base.order_by(VerificacaoRegistro.criado_em).limit(limit).offset(offset)
    ).all()
    return [(v, p, perfil) for v, p, perfil in linhas], total


def historico(db: Session, profissional_id: uuid.UUID) -> list[VerificacaoRegistro]:
    return list(
        db.scalars(
            select(VerificacaoRegistro)
            .where(VerificacaoRegistro.profissional_id == profissional_id)
            .order_by(VerificacaoRegistro.id)
        )
    )
