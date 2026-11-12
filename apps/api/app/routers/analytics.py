from datetime import date

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.admin import exigir_admin
from app.core.auth import CurrentUser
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.schemas.analytics import RelatorioResponse
from app.services.relatorio_service import gerar_relatorio

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/relatorio", response_model=RelatorioResponse)
@limiter.limit("60/minute")
def get_relatorio(
    request: Request,
    data_inicio: date,
    data_fim: date,
    _admin: CurrentUser = Depends(exigir_admin),
    db: Session = Depends(get_db),
) -> RelatorioResponse:
    """Métricas do negócio: só administrador (B-007)."""
    return gerar_relatorio(db, data_inicio, data_fim)
