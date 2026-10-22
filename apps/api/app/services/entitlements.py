import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import MSG_SO_EMPRESAS, PERFIL_NAO_CONCLUIDO, erro_negocio
from app.models.assinatura import STATUS_ENCERRADOS, Assinatura, StatusAssinatura
from app.models.contato import Contato, OrigemContato
from app.models.demanda import Demanda
from app.models.empresa import Empresa
from app.models.profile import Papel, Profile

STATUS_LIBERADOS = (StatusAssinatura.active, StatusAssinatura.trialing)

NAO_ELEGIVEL = "nao_elegivel"
PAGAMENTO_PENDENTE = "pagamento_pendente"
LIMITE_ATINGIDO = "limite_atingido"

# Plano gratuito (empresa sem assinatura ativa): cota mensal única de contatos
# iniciados + demandas publicadas. Essencial e Pro vêm de planos.limite_mensal.
LIMITE_GRATUITO = 5


def obter_empresa_elegivel(db: Session, user_id: uuid.UUID) -> Empresa:
    profile = db.get(Profile, user_id)
    empresa = db.get(Empresa, user_id) if profile and profile.papel == Papel.empresa else None
    # Todo perfil de empresa com cadastro completo vale, inclusive pessoa física e família:
    # publicam e assinam sob as mesmas regras de plano (cota mensal).
    if empresa is None:
        raise erro_negocio(
            status.HTTP_403_FORBIDDEN,
            NAO_ELEGIVEL,
            "Só perfis de empresa ou pessoa, com cadastro completo, "
            "podem assinar e publicar demandas.",
        )
    return empresa


def assinatura_vigente(
    db: Session, empresa_id: uuid.UUID, bloquear: bool = False
) -> Assinatura | None:
    query = select(Assinatura).where(
        Assinatura.empresa_id == empresa_id, Assinatura.status.not_in(STATUS_ENCERRADOS)
    )
    if bloquear:
        query = query.with_for_update()
    return db.scalar(query)


def inicio_do_mes() -> datetime:
    return datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def contar_uso_mensal(db: Session, empresa_id: uuid.UUID) -> int:
    """Contatos que a empresa iniciou + demandas que publicou neste mês.

    Interesse recebido de profissionais (origem=demanda) não conta: quem inicia
    é o profissional, não a empresa.
    """
    desde = inicio_do_mes()
    contatos = db.scalar(
        select(func.count())
        .select_from(Contato)
        .where(
            Contato.solicitante_id == empresa_id,
            Contato.origem == OrigemContato.busca,
            Contato.criado_em >= desde,
        )
    )
    demandas = db.scalar(
        select(func.count())
        .select_from(Demanda)
        .where(Demanda.empresa_id == empresa_id, Demanda.criado_em >= desde)
    )
    return (contatos or 0) + (demandas or 0)


def limite_vigente(assinatura: Assinatura | None) -> int | None:
    """None = ilimitado. Sem assinatura ativa vale o limite do plano gratuito."""
    if assinatura is not None and assinatura.status in (
        *STATUS_LIBERADOS,
        StatusAssinatura.past_due,
    ):
        return assinatura.plano.limite_mensal
    return LIMITE_GRATUITO


def _verificar_cota(db: Session, empresa: Empresa) -> None:
    # Trava a linha da empresa (existe mesmo no plano gratuito, ao contrário da
    # assinatura) para que duas requisições simultâneas não passem juntas.
    db.get(Empresa, empresa.user_id, with_for_update=True)
    assinatura = assinatura_vigente(db, empresa.user_id)

    if assinatura is not None and assinatura.status == StatusAssinatura.past_due:
        raise erro_negocio(
            status.HTTP_402_PAYMENT_REQUIRED,
            PAGAMENTO_PENDENTE,
            "O pagamento da sua assinatura está pendente. Atualize o cartão para voltar a "
            "entrar em contato e publicar demandas.",
        )

    limite = limite_vigente(assinatura)
    if limite is not None:
        uso = contar_uso_mensal(db, empresa.user_id)
        if uso >= limite:
            raise erro_negocio(
                status.HTTP_409_CONFLICT,
                LIMITE_ATINGIDO,
                "Você atingiu o limite de contatos e demandas do seu plano neste mês.",
                uso=uso,
                limite=limite,
            )


def verificar_publicacao_demanda(db: Session, user_id: uuid.UUID) -> Empresa:
    empresa = obter_empresa_elegivel(db, user_id)
    _verificar_cota(db, empresa)
    return empresa


def verificar_contato_direto(db: Session, user_id: uuid.UUID) -> Empresa:
    profile = db.get(Profile, user_id)
    if profile is None or profile.papel != Papel.empresa:
        raise erro_negocio(status.HTTP_403_FORBIDDEN, "apenas_empresas", MSG_SO_EMPRESAS)
    empresa = db.get(Empresa, user_id)
    if empresa is None:
        raise erro_negocio(
            status.HTTP_400_BAD_REQUEST, "perfil_nao_concluido", PERFIL_NAO_CONCLUIDO
        )
    _verificar_cota(db, empresa)
    return empresa
