from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.plano import Plano
from app.schemas.assinatura import PlanoRead
from app.services.billing import listar_planos_ativos
from app.services.entitlements import LIMITE_GRATUITO

router = APIRouter(prefix="/planos", tags=["assinaturas"])


@router.get("", response_model=list[PlanoRead])
def listar_planos(db: Session = Depends(get_db)) -> list[Plano]:
    return listar_planos_ativos(db)


@router.get("/gratuito", response_model=PlanoRead)
def plano_gratuito() -> PlanoRead:
    """Plano de quem não assina: não existe na tabela e não tem checkout, só a cota mensal.

    Fica fora de `GET /planos` (que lista o que dá para assinar); o número vem da mesma
    constante que `limite_vigente` aplica, para a vitrine nunca divergir da regra.
    """
    return PlanoRead(codigo="gratuito", nome="Gratuito", limite_mensal=LIMITE_GRATUITO)
