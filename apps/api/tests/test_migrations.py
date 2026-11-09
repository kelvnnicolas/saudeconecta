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
    "notificacoes",
    "links_pagamento",
    "planos",
    "assinaturas",
    "eventos_stripe",
    "demandas",
}

TABELAS_COM_RLS = {
    "planos",
    "assinaturas",
    "eventos_stripe",
    "demandas",
    "mensagens_contato",
    "notificacoes",
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


def test_migration_seeds_planos_with_price_ids_from_env():
    with engine.connect() as conn:
        rows = conn.execute(
            sa.text(
                "SELECT codigo, stripe_price_id, limite_mensal, ativo "
                "FROM planos ORDER BY codigo"
            )
        ).all()
    assert rows == [
        ("essencial", "price_test_essencial", 50, True),
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


def test_migration_da_verificacao_zera_o_selo_legado_sem_criar_conferencia():
    # `verificado` nunca foi gravado por código nenhum: quem o tinha não passou por conferência,
    # então a migration não pode transformá-lo em "conferido em <data da migração>".
    cfg = _alembic_config()
    user_id = "00000000-0000-0000-0000-0000000000a1"
    command.downgrade(cfg, "d3f8a1c26e57")
    try:
        with engine.begin() as conn:
            conn.execute(
                sa.text(
                    "INSERT INTO profiles (id, papel, nome) VALUES (:id, 'profissional', 'Legado')"
                ),
                {"id": user_id},
            )
            conn.execute(
                sa.text("INSERT INTO profissionais (user_id, verificado) VALUES (:id, true)"),
                {"id": user_id},
            )
        command.upgrade(cfg, "head")
        with engine.connect() as conn:
            verificado, verificado_em = conn.execute(
                sa.text("SELECT verificado, verificado_em FROM profissionais WHERE user_id = :id"),
                {"id": user_id},
            ).one()
            trilha = conn.execute(sa.text("SELECT COUNT(*) FROM verificacoes_registro")).scalar()
        assert verificado is False and verificado_em is None
        assert trilha == 0
    finally:
        command.upgrade(cfg, "head")
        with engine.begin() as conn:
            conn.execute(sa.text("DELETE FROM profissionais WHERE user_id = :id"), {"id": user_id})
            conn.execute(sa.text("DELETE FROM profiles WHERE id = :id"), {"id": user_id})
