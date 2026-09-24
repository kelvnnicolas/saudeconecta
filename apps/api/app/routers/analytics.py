from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analytics import RelatorioResponse
from app.services.relatorio_service import gerar_relatorio

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/relatorio", response_model=RelatorioResponse)
def get_relatorio(
    data_inicio: date,
    data_fim: date,
    db: Session = Depends(get_db),
) -> RelatorioResponse:
    return gerar_relatorio(db, data_inicio, data_fim)
