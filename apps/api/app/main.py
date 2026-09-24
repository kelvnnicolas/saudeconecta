from fastapi import FastAPI

from app.core.sentry import init_sentry
from app.routers import (
    analytics,
    auth,
    avaliacoes,
    contatos,
    empresas,
    especialidades,
    health,
    perfis,
    profissionais,
)

init_sentry()

app = FastAPI(title="SaúdeConecta API")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(especialidades.router)
app.include_router(profissionais.router)
app.include_router(empresas.router)
app.include_router(perfis.router)
app.include_router(contatos.router)
app.include_router(avaliacoes.router)
app.include_router(analytics.router)
