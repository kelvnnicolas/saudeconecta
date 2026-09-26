import os
from pathlib import Path

_TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5433/saudeconecta_test",
)
if not _TEST_DATABASE_URL.rsplit("/", 1)[-1].endswith("_test"):
    raise RuntimeError(
        "Refusing to run tests against a database that doesn't look like "
        f"a test database: {_TEST_DATABASE_URL!r}"
    )
os.environ["DATABASE_URL"] = _TEST_DATABASE_URL

# Force Sentry off for the whole test session, regardless of what's in .env —
# otherwise importing app.main (which calls init_sentry() at module load)
# initializes the real SDK against whatever real SENTRY_DSN a developer has
# configured for local dev, and test runs leak events into production Sentry.
os.environ["SENTRY_DSN"] = ""

# Dummy Stripe/app values so Settings' fail-fast validation passes, and forced
# (not setdefault) so a developer's real keys in .env can never be used by a
# test — an unmocked Stripe call fails auth instead of hitting a real account.
os.environ["STRIPE_SECRET_KEY"] = "sk_test_dummy_for_tests"
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_dummy_for_tests"
os.environ["STRIPE_PRICE_ESSENCIAL"] = "price_test_essencial"
os.environ["STRIPE_PRICE_PRO"] = "price_test_pro"
os.environ["APP_URL"] = "http://localhost:3000"
os.environ["RESEND_API_KEY"] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from app.core.database import SessionLocal, engine, get_db  # noqa: E402
from app.main import app  # noqa: E402


def _alembic_config() -> Config:
    ini_path = Path(__file__).resolve().parent.parent / "alembic.ini"
    return Config(str(ini_path))


@pytest.fixture(scope="session", autouse=True)
def _create_test_schema():
    cfg = _alembic_config()
    command.upgrade(cfg, "head")
    yield
    command.downgrade(cfg, "base")


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
