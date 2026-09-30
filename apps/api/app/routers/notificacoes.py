from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.schemas.notificacao import (
    ListaNotificacoesResponse,
    MarcarTodasLidasResponse,
    NotificacaoRead,
)
from app.services.notificacao_service import listar_notificacoes, marcar_lida, marcar_todas_lidas

router = APIRouter(prefix="/notificacoes", tags=["notificacoes"])


@router.get("", response_model=ListaNotificacoesResponse)
@limiter.limit("30/minute")
def listar_notificacoes_route(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListaNotificacoesResponse:
    items, total, total_nao_lidas = listar_notificacoes(db, current_user.id, limit, offset)
    return ListaNotificacoesResponse(
        items=[NotificacaoRead.model_validate(n) for n in items],
        total=total,
        total_nao_lidas=total_nao_lidas,
        limit=limit,
        offset=offset,
    )


@router.post("/{notificacao_id}/marcar-lida", response_model=NotificacaoRead)
@limiter.limit("30/minute")
def marcar_lida_route(
    request: Request,
    notificacao_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificacaoRead:
    return marcar_lida(db, current_user.id, notificacao_id)


@router.post("/marcar-todas-lidas", response_model=MarcarTodasLidasResponse)
@limiter.limit("30/minute")
def marcar_todas_lidas_route(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MarcarTodasLidasResponse:
    marcadas = marcar_todas_lidas(db, current_user.id)
    return MarcarTodasLidasResponse(marcadas=marcadas)
