from fastapi import FastAPI

from app.core.errors import registrar_tratadores
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
