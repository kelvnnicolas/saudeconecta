from fastapi import APIRouter, Depends, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import ErroNegocio
from app.schemas.assinatura import WebhookResponse
from app.services.billing import ErroProcessamentoWebhook, construir_evento, processar_evento

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post(
    "/stripe",
    response_model=WebhookResponse,
    responses={
        400: {"model": ErroNegocio, "description": "code=assinatura_webhook_invalida"},
        500: {"description": "Falha ao processar; o Stripe reenvia o evento"},
    },
)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> WebhookResponse:
    payload = await request.body()
    evento = construir_evento(payload, request.headers.get("stripe-signature"))
    try:
        await run_in_threadpool(processar_evento, db, evento)
    except ErroProcessamentoWebhook:
        return JSONResponse(status_code=500, content={"detail": "erro ao processar evento"})
    return WebhookResponse(recebido=True)
