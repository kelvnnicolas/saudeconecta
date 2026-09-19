import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5433/saudeconecta_test",
)

import pytest
from alembic import command
from alembic.config import Config

from app.core.database import SessionLocal, engine


def _alembic_config() -> Config:
    return Config("alembic.ini")


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
