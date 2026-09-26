from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.assinatura import StatusAssinatura


class PlanoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    codigo: str
    nome: str
    limite_demandas_ativas: int | None


class CheckoutRequest(BaseModel):
    plano_codigo: str


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


class UsoDemandas(BaseModel):
    demandas_ativas: int
    limite: int | None


class MinhaAssinaturaResponse(BaseModel):
    plano: PlanoRead | None
    status: StatusAssinatura | None
    current_period_end: datetime | None
    cancel_at_period_end: bool
    uso: UsoDemandas


class WebhookResponse(BaseModel):
    recebido: bool
