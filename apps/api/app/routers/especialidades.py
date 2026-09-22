from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.especialidade import EspecialidadeRead
from app.services.especialidade_service import list_especialidades

router = APIRouter(prefix="/especialidades", tags=["especialidades"])


@router.get("", response_model=list[EspecialidadeRead])
def get_especialidades(db: Session = Depends(get_db)) -> list[EspecialidadeRead]:
    return list_especialidades(db)
