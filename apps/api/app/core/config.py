from functools import lru_cache

from pydantic import ValidationError, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_OBRIGATORIAS_NAO_VAZIAS = (
    "stripe_secret_key",
    "stripe_webhook_secret",
    "stripe_price_essencial",
    "stripe_price_pro",
    "app_url",
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    supabase_storage_bucket: str = "avatars"
    stripe_secret_key: str
    stripe_webhook_secret: str
    stripe_price_essencial: str
    stripe_price_pro: str
    app_url: str
    resend_api_key: str = ""
    sentry_dsn: str = ""
    rate_limit_enabled: bool = True

    @field_validator(*_OBRIGATORIAS_NAO_VAZIAS)
    @classmethod
    def _nao_vazia(cls, valor: str, info) -> str:
        if not valor.strip():
            raise ValueError(
                f"variável de ambiente {info.field_name.upper()} está vazia — "
                "preencha em apps/api/.env (ver README, seção Stripe)"
            )
        return valor.strip()

    @field_validator("app_url")
    @classmethod
    def _sem_barra_final(cls, valor: str) -> str:
        return valor.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as exc:
        # `from None`: pydantic's own message embeds input_value, i.e. every other
        # env value — including secrets — which would end up in boot logs.
        nomes = sorted({str(erro["loc"][0]).upper() for erro in exc.errors()})
        raise RuntimeError(
            "Configuração inválida — defina em apps/api/.env (ver README): " + ", ".join(nomes)
        ) from None
