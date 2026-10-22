import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.admin import exigir_admin
from app.core.auth import CurrentUser
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models.verificacao import StatusVerificacao
from app.schemas.verificacao import (
    ResultadoVerificacaoRequest,
    TrilhaItem,
    VerificacaoAdminItem,
    VerificacaoAdminLista,
    VerificacaoPropriaRead,
)
from app.services.verificacao_service import (
    estado_atual,
    historico,
    listar_para_admin,
    registrar_resultado,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/eu")
@limiter.limit("60/minute")
def admin_eu(request: Request, _admin: CurrentUser = Depends(exigir_admin)) -> dict:
    """200 para administrador e 403 para os demais: a tela usa para decidir se aparece."""
    return {"admin": True}


@router.get("/verificacoes", response_model=VerificacaoAdminLista)
@limiter.limit("60/minute")
def listar_verificacoes(
    request: Request,
    status: StatusVerificacao = StatusVerificacao.pending,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _admin: CurrentUser = Depends(exigir_admin),
    db: Session = Depends(get_db),
) -> VerificacaoAdminLista:
    linhas, total = listar_para_admin(db, status, limit, offset)
    items = [
        VerificacaoAdminItem(
            user_id=profissional.user_id,
            nome=perfil.nome,
            cidade=perfil.cidade,
            estado=perfil.estado,
            registro_informado=profissional.registro_profissional,
            status=linha.status_novo,
            atualizado_em=linha.criado_em,
        )
        for linha, profissional, perfil in linhas
    ]
    return VerificacaoAdminLista(items=items, total=total, limit=limit, offset=offset)


@router.get("/profissionais/{user_id}/verificacoes", response_model=list[TrilhaItem])
@limiter.limit("60/minute")
def historico_do_profissional(
    request: Request,
    user_id: uuid.UUID,
    _admin: CurrentUser = Depends(exigir_admin),
    db: Session = Depends(get_db),
) -> list[TrilhaItem]:
    return [TrilhaItem.model_validate(linha) for linha in historico(db, user_id)]


@router.post("/profissionais/{user_id}/verificacao", response_model=VerificacaoPropriaRead)
@limiter.limit("60/minute")
def registrar_conferencia(
    request: Request,
    user_id: uuid.UUID,
    dados: ResultadoVerificacaoRequest,
    admin: CurrentUser = Depends(exigir_admin),
    db: Session = Depends(get_db),
) -> VerificacaoPropriaRead:
    profissional = registrar_resultado(db, admin.id, user_id, dados)
    return VerificacaoPropriaRead(
        status=estado_atual(db, user_id), verificado_em=profissional.verificado_em
    )
