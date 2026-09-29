from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.errors import ErroNegocio
from app.models.contato import Contato
from app.schemas.contato import ContatoCreateRequest, ContatoRead
from app.schemas.mensagem_contato import MensagemContatoRead
from app.services.contato_service import create_contato, list_own_contatos, listar_mensagens

router = APIRouter(prefix="/contatos", tags=["contatos"])

ERRO_403_404 = {
    403: {"model": ErroNegocio, "description": "code=nao_participante"},
    404: {"model": ErroNegocio, "description": "code=contato_inexistente"},
}


@router.post("", response_model=ContatoRead)
def create_contato_route(
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
