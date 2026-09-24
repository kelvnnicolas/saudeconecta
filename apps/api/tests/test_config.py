import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings


@pytest.mark.parametrize(
    "variavel",
    [
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_PRICE_ESSENCIAL",
        "STRIPE_PRICE_PRO",
        "APP_URL",
    ],
)
def test_settings_fails_fast_when_required_var_is_empty(monkeypatch, variavel):
    monkeypatch.setenv(variavel, "  ")
    with pytest.raises(ValidationError, match=variavel):
        Settings(_env_file=None)


def test_settings_fails_fast_when_required_var_is_missing(monkeypatch):
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    with pytest.raises(ValidationError, match="stripe_webhook_secret"):
        Settings(_env_file=None)


def test_get_settings_lists_missing_vars_without_leaking_values(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_segredo")
    monkeypatch.setenv("SENTRY_DSN", "https://segredo@sentry.example.com/1")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_segredo")
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    monkeypatch.setenv("APP_URL", "")
    monkeypatch.setattr(Settings, "model_config", {**Settings.model_config, "env_file": None})
    get_settings.cache_clear()
    try:
        with pytest.raises(RuntimeError) as exc_info:
            get_settings()
    finally:
        get_settings.cache_clear()

    mensagem = str(exc_info.value)
    assert "APP_URL" in mensagem
    assert "STRIPE_WEBHOOK_SECRET" in mensagem
    assert "segredo" not in mensagem
    assert exc_info.value.__cause__ is None
    assert exc_info.value.__suppress_context__ is True


def test_settings_strips_trailing_slash_from_app_url(monkeypatch):
    monkeypatch.setenv("APP_URL", "https://app.example.com/")
    assert Settings(_env_file=None).app_url == "https://app.example.com"


def test_settings_reads_database_url_from_env(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/example_db"
    )
    get_settings.cache_clear()
    settings = get_settings()
    assert (
        settings.database_url == "postgresql+psycopg://postgres:postgres@localhost:5432/example_db"
    )
    get_settings.cache_clear()


def test_settings_defaults_storage_bucket_to_avatars(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/example_db"
    )
    monkeypatch.delenv("SUPABASE_STORAGE_BUCKET", raising=False)
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.supabase_storage_bucket == "avatars"
    get_settings.cache_clear()
