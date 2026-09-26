import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.errors import ErroNegocio
from app.schemas.demanda import (
    DemandaCreate,
    DemandaDetalheEmpresa,
    DemandaDetalheProfissional,
    DemandaRead,
    DemandaStatusUpdate,
    InteresseCreate,
    InteresseResponse,
    MinhaDemandaRead,
    OportunidadesResponse,
)
from app.services import demandas as servico

router = APIRouter(prefix="/demandas", tags=["demandas"])

ERRO_404 = {404: {"model": ErroNegocio, "description": "code=demanda_inexistente"}}


@router.post(
    "",
    response_model=DemandaRead,
    status_code=201,
    responses={
        400: {"model": ErroNegocio, "description": "code=especialidade_inexistente"},
        402: {
            "model": ErroNegocio,
            "description": "code=assinatura_necessaria | pagamento_pendente",
        },
        403: {"model": ErroNegocio, "description": "code=nao_elegivel"},
        409: {"model": ErroNegocio, "description": "code=limite_atingido (com uso e limite)"},
    },
)
def publicar_demanda(
    data: DemandaCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DemandaRead:
    return servico.criar_demanda(db, current_user.id, data)


@router.get(
    "/minhas",
    response_model=list[MinhaDemandaRead],
    responses={403: {"model": ErroNegocio, "description": "code=apenas_empresas"}},
)
def minhas_demandas(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MinhaDemandaRead]:
    return servico.listar_minhas(db, current_user.id)


@router.get(
    "/oportunidades",
    response_model=OportunidadesResponse,
    responses={403: {"model": ErroNegocio, "description": "code=apenas_profissionais"}},
)
def oportunidades(
    especialidade_id: int | None = None,
    cidade: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OportunidadesResponse:
    items, total = servico.listar_oportunidades(
        db, current_user.id, especialidade_id, cidade, limit, offset
    )
    return OportunidadesResponse(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/{demanda_id}",
    response_model=DemandaDetalheEmpresa | DemandaDetalheProfissional,
    responses=ERRO_404,
)
def detalhe_demanda(
    demanda_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DemandaDetalheEmpresa | DemandaDetalheProfissional:
    return servico.obter_demanda(db, current_user.id, demanda_id)


@router.patch(
    "/{demanda_id}",
    response_model=DemandaRead,
    responses={
        **ERRO_404,
        409: {"model": ErroNegocio, "description": "code=transicao_invalida"},
    },
)
def atualizar_demanda(
    demanda_id: uuid.UUID,
    data: DemandaStatusUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DemandaRead:
    return servico.atualizar_status(db, current_user.id, demanda_id, data.status)


@router.post(
    "/{demanda_id}/interesse",
    response_model=InteresseResponse,
    status_code=201,
    responses={
        **ERRO_404,
        400: {"model": ErroNegocio, "description": "code=perfil_profissional_incompleto"},
        403: {"model": ErroNegocio, "description": "code=apenas_profissionais"},
        409: {"model": ErroNegocio, "description": "code=interesse_existente"},
        410: {"model": ErroNegocio, "description": "code=demanda_indisponivel"},
    },
)
def demonstrar_interesse(
    demanda_id: uuid.UUID,
    data: InteresseCreate | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InteresseResponse:
    contato = servico.demonstrar_interesse(
        db, current_user.id, demanda_id, data.mensagem if data else None
    )
    return InteresseResponse(contato_id=contato.id)
