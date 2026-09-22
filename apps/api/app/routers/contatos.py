from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.contato import Contato
from app.schemas.contato import ContatoCreateRequest, ContatoRead
from app.services.contato_service import create_contato, list_own_contatos

router = APIRouter(prefix="/contatos", tags=["contatos"])


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
