import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import get_settings


def init_sentry() -> None:
    settings = get_settings()
    if not settings.sentry_dsn:
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
    )
