from sqlalchemy import text

from app.core.database import engine


def test_engine_connects_to_postgres():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        assert result.scalar() == 1
