from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.errors import registrar_tratadores
from app.core.rate_limit import limiter
from app.core.sentry import init_sentry
from app.routers import (
    analytics,
    assinaturas,
    auth,
    avaliacoes,
    contatos,
    demandas,
    empresas,
    especialidades,
    health,
    perfis,
    planos,
    profissionais,
    webhooks,
)

init_sentry()

app = FastAPI(title="SaúdeConecta API")
registrar_tratadores(app)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Lista explícita, nunca "*": APP_URL já é a origem do frontend, obrigatória
# na configuração (ver app/core/config.py) — reaproveitada aqui em vez de uma
# segunda variável de ambiente só pra CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().app_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(especialidades.router)
app.include_router(profissionais.router)
app.include_router(empresas.router)
app.include_router(perfis.router)
app.include_router(contatos.router)
app.include_router(avaliacoes.router)
app.include_router(analytics.router)
app.include_router(planos.router)
app.include_router(assinaturas.router)
app.include_router(webhooks.router)
app.include_router(demandas.router)
