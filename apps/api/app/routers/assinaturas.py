from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.errors import ErroNegocio
from app.core.rate_limit import limiter
from app.schemas.assinatura import (
    CheckoutRequest,
    CheckoutResponse,
    MinhaAssinaturaResponse,
    PlanoRead,
    PortalResponse,
    UsoDemandas,
)
from app.services.billing import criar_checkout, criar_portal, obter_assinatura_da_empresa

router = APIRouter(prefix="/assinaturas", tags=["assinaturas"])


@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    responses={
        403: {"model": ErroNegocio, "description": "code=nao_elegivel"},
        404: {"model": ErroNegocio, "description": "code=plano_inexistente"},
        409: {"model": ErroNegocio, "description": "code=assinatura_existente"},
    },
)
@limiter.limit("5/minute")
def iniciar_checkout(
    request: Request,
    data: CheckoutRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutResponse:
    return CheckoutResponse(checkout_url=criar_checkout(db, current_user.id, data.plano_codigo))


@router.post(
    "/portal",
    response_model=PortalResponse,
    responses={
        403: {"model": ErroNegocio, "description": "code=nao_elegivel"},
        404: {"model": ErroNegocio, "description": "code=assinatura_inexistente"},
    },
)
def abrir_portal(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortalResponse:
    return PortalResponse(portal_url=criar_portal(db, current_user.id))


@router.get(
    "/me",
    response_model=MinhaAssinaturaResponse,
    responses={403: {"model": ErroNegocio, "description": "code=nao_elegivel"}},
)
def minha_assinatura(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MinhaAssinaturaResponse:
    assinatura, demandas_ativas = obter_assinatura_da_empresa(db, current_user.id)
    plano = assinatura.plano if assinatura else None
    return MinhaAssinaturaResponse(
        plano=PlanoRead.model_validate(plano) if plano else None,
        status=assinatura.status if assinatura else None,
        current_period_end=assinatura.current_period_end if assinatura else None,
        cancel_at_period_end=assinatura.cancel_at_period_end if assinatura else False,
        uso=UsoDemandas(
            demandas_ativas=demandas_ativas,
            limite=plano.limite_demandas_ativas if plano else None,
        ),
    )
