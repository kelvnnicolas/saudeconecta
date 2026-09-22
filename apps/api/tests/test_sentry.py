from unittest.mock import patch

from app.core.config import get_settings
from app.core.sentry import init_sentry


def test_init_sentry_skips_when_dsn_empty(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5433/saudeconecta_test"
    )
    monkeypatch.setenv("SENTRY_DSN", "")
    get_settings.cache_clear()
    with patch("app.core.sentry.sentry_sdk.init") as mock_init:
        init_sentry()
        mock_init.assert_not_called()
    get_settings.cache_clear()


def test_init_sentry_initializes_when_dsn_present(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5433/saudeconecta_test"
    )
    monkeypatch.setenv("SENTRY_DSN", "https://public@sentry.example.com/1")
    get_settings.cache_clear()
    with patch("app.core.sentry.sentry_sdk.init") as mock_init:
        init_sentry()
        mock_init.assert_called_once()
        _, kwargs = mock_init.call_args
        assert kwargs["dsn"] == "https://public@sentry.example.com/1"
    get_settings.cache_clear()
