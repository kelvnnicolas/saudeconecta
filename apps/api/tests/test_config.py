from app.core.config import get_settings


def test_settings_reads_database_url_from_env(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/example_db"
    )
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.database_url == "postgresql+psycopg://postgres:postgres@localhost:5432/example_db"
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
