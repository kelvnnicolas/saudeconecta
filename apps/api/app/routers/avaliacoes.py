import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.avaliacao import Avaliacao
from app.schemas.avaliacao import AvaliacaoCreateRequest, AvaliacaoRead
from app.services.avaliacao_service import create_avaliacao, list_avaliacoes_by_alvo

router = APIRouter(prefix="/avaliacoes", tags=["avaliacoes"])


@router.post("", response_model=AvaliacaoRead)
def create_avaliacao_route(
    data: AvaliacaoCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Avaliacao:
    return create_avaliacao(db, current_user.id, data)


@router.get("", response_model=list[AvaliacaoRead])
def list_avaliacoes_route(alvo_id: uuid.UUID, db: Session = Depends(get_db)) -> list[Avaliacao]:
    return list_avaliacoes_by_alvo(db, alvo_id)
