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
    "mensagens_contato",
    "links_pagamento",
    "planos",
    "assinaturas",
    "eventos_stripe",
    "demandas",
}

TABELAS_COM_RLS = {"planos", "assinaturas", "eventos_stripe", "demandas", "mensagens_contato"}


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


def test_migration_seeds_planos_with_price_ids_from_env():
    with engine.connect() as conn:
        rows = conn.execute(
            sa.text(
                "SELECT codigo, stripe_price_id, limite_demandas_ativas, ativo "
                "FROM planos ORDER BY codigo"
            )
        ).all()
    assert rows == [
        ("essencial", "price_test_essencial", 5, True),
        ("pro", "price_test_pro", None, True),
    ]


def test_migration_enables_rls_on_new_tables():
    with engine.connect() as conn:
        rows = conn.execute(
            sa.text(
                "SELECT relname FROM pg_class " "WHERE relrowsecurity AND relname = ANY(:nomes)"
            ),
            {"nomes": list(TABELAS_COM_RLS)},
        ).scalars()
        assert set(rows) == TABELAS_COM_RLS


def test_migration_adds_origem_and_demanda_id_to_contatos():
    colunas = {c["name"]: c for c in inspect(engine).get_columns("contatos")}
    assert colunas["origem"]["nullable"] is False
    assert colunas["demanda_id"]["nullable"] is True


def test_migration_adds_aceito_em_to_contatos():
    colunas = {c["name"]: c for c in inspect(engine).get_columns("contatos")}
    assert colunas["aceito_em"]["nullable"] is True
