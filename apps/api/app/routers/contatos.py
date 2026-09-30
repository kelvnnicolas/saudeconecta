from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.errors import ErroNegocio
from app.core.rate_limit import limiter
from app.models.contato import Contato
from app.schemas.contato import ContatoCreateRequest, ContatoRead
from app.schemas.mensagem_contato import MensagemContatoCreateRequest, MensagemContatoRead
from app.services.contato_service import (
    aceitar_demanda_direta,
    create_contato,
    criar_mensagem,
    list_own_contatos,
    listar_mensagens,
)

router = APIRouter(prefix="/contatos", tags=["contatos"])

ERRO_403_404 = {
    403: {"model": ErroNegocio, "description": "code=nao_participante"},
    404: {"model": ErroNegocio, "description": "code=contato_inexistente"},
}


@router.post("", response_model=ContatoRead)
@limiter.limit("10/minute")
def create_contato_route(
    request: Request,
    data: ContatoCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Contato:
    return create_contato(db, current_user.id, data)


@router.get("", response_model=list[ContatoRead])
def list_own_contatos_route(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Contato]:
    return list_own_contatos(db, current_user.id)


@router.get(
    "/{contato_id}/mensagens", response_model=list[MensagemContatoRead], responses=ERRO_403_404
)
def listar_mensagens_route(
    contato_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MensagemContatoRead]:
    return listar_mensagens(db, current_user.id, contato_id)


@router.post(
    "/{contato_id}/mensagens",
    response_model=MensagemContatoRead,
    status_code=201,
    responses=ERRO_403_404,
)
@limiter.limit("20/minute")
def criar_mensagem_route(
    request: Request,
    contato_id: int,
    data: MensagemContatoCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MensagemContatoRead:
    return criar_mensagem(db, current_user.id, contato_id, data.corpo)


@router.post(
    "/{contato_id}/aceitar",
    response_model=ContatoRead,
    responses={
        **ERRO_403_404,
        403: {
            "model": ErroNegocio,
            "description": "code=nao_participante | apenas_profissional_aceita",
        },
    },
)
def aceitar_route(
    contato_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Contato:
    return aceitar_demanda_direta(db, current_user.id, contato_id)
