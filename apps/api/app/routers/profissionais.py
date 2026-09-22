import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.schemas.profissional import ProfissionalRead, ProfissionalUpdateRequest
from app.services.profissional_service import (
    get_profissional_by_id,
    to_profissional_read,
    upsert_profissional,
)

router = APIRouter(prefix="/profissionais", tags=["profissionais"])


@router.get("/{user_id}", response_model=ProfissionalRead)
def get_profissional(user_id: uuid.UUID, db: Session = Depends(get_db)) -> ProfissionalRead:
    profissional = get_profissional_by_id(db, user_id)
    if profissional is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profissional não encontrado"
        )
    return to_profissional_read(profissional)


@router.put("/me", response_model=ProfissionalRead)
def update_own_profissional(
    data: ProfissionalUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfissionalRead:
    profissional = upsert_profissional(db, current_user.id, data)
    return to_profissional_read(profissional)
