import uuid

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import erro_negocio
from app.models.assinatura import STATUS_ENCERRADOS, Assinatura, StatusAssinatura
from app.models.demanda import Demanda, StatusDemanda
from app.models.empresa import Empresa, TipoEmpresa
from app.models.profile import Papel, Profile

TIPOS_ELEGIVEIS = (TipoEmpresa.clinica, TipoEmpresa.hospital, TipoEmpresa.homecare)
STATUS_LIBERADOS = (StatusAssinatura.active, StatusAssinatura.trialing)

NAO_ELEGIVEL = "nao_elegivel"
ASSINATURA_NECESSARIA = "assinatura_necessaria"
PAGAMENTO_PENDENTE = "pagamento_pendente"
LIMITE_ATINGIDO = "limite_atingido"


def obter_empresa_elegivel(db: Session, user_id: uuid.UUID) -> Empresa:
    profile = db.get(Profile, user_id)
    empresa = db.get(Empresa, user_id) if profile and profile.papel == Papel.empresa else None
    if empresa is None or empresa.tipo not in TIPOS_ELEGIVEIS:
        raise erro_negocio(
            status.HTTP_403_FORBIDDEN,
            NAO_ELEGIVEL,
            "Só empresas do tipo clínica, hospital ou homecare, com cadastro completo, "
            "podem assinar e publicar demandas",
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


def contar_demandas_abertas(db: Session, empresa_id: uuid.UUID) -> int:
    return db.scalar(
        select(func.count())
        .select_from(Demanda)
        .where(
            Demanda.empresa_id == empresa_id,
            Demanda.status == StatusDemanda.aberta,
            Demanda.expira_em > func.now(),
        )
    )


def verificar_publicacao_demanda(db: Session, user_id: uuid.UUID) -> Empresa:
    empresa = obter_empresa_elegivel(db, user_id)
    # Row lock serializes concurrent publications, so two requests can't both
    # pass the plan-limit check below.
    assinatura = assinatura_vigente(db, empresa.user_id, bloquear=True)

    if assinatura is not None and assinatura.status == StatusAssinatura.past_due:
        raise erro_negocio(
            status.HTTP_402_PAYMENT_REQUIRED,
            PAGAMENTO_PENDENTE,
            "O pagamento da sua assinatura está pendente. Atualize o cartão para voltar a "
            "publicar demandas.",
        )
    if assinatura is None or assinatura.status not in STATUS_LIBERADOS:
        raise erro_negocio(
            status.HTTP_402_PAYMENT_REQUIRED,
            ASSINATURA_NECESSARIA,
            "Publicar demandas exige uma assinatura ativa.",
        )

    limite = assinatura.plano.limite_demandas_ativas
    if limite is not None:
        uso = contar_demandas_abertas(db, empresa.user_id)
        if uso >= limite:
            raise erro_negocio(
                status.HTTP_409_CONFLICT,
                LIMITE_ATINGIDO,
                "Você atingiu o limite de demandas abertas do seu plano.",
                uso=uso,
                limite=limite,
            )
    return empresa
