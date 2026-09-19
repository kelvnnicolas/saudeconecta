import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5433/saudeconecta_test",
)

import pytest

from app.core.database import Base, SessionLocal, engine


@pytest.fixture(scope="session", autouse=True)
def _create_test_schema():
    import app.models  # noqa: F401  ensure all models are registered on Base.metadata

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()
