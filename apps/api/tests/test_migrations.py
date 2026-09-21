import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import command
from app.core.database import engine
from tests.conftest import _alembic_config

EXPECTED_TABLES = {
    "profiles",
    "especialidades",
    "profissionais",
    "profissional_especialidades",
    "empresas",
    "avaliacoes",
    "contatos",
    "links_pagamento",
}


def test_migration_creates_all_tables_and_seeds_especialidades():
    inspector = inspect(engine)
    assert EXPECTED_TABLES.issubset(set(inspector.get_table_names()))

    with engine.connect() as conn:
        count = conn.execute(sa.text("SELECT COUNT(*) FROM especialidades")).scalar()
    assert count == 10


def test_migration_downgrade_and_upgrade_round_trip():
    cfg = _alembic_config()

    command.downgrade(cfg, "base")
    inspector = inspect(engine)
    assert "profiles" not in inspector.get_table_names()

    command.upgrade(cfg, "head")
    inspector = inspect(engine)
    assert EXPECTED_TABLES.issubset(set(inspector.get_table_names()))
