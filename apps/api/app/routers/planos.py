from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.plano import Plano
from app.schemas.assinatura import PlanoRead
from app.services.billing import listar_planos_ativos

router = APIRouter(prefix="/planos", tags=["assinaturas"])


@router.get("", response_model=list[PlanoRead])
def listar_planos(db: Session = Depends(get_db)) -> list[Plano]:
    return listar_planos_ativos(db)
