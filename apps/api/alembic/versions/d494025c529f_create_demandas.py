"""create_demandas

Revision ID: d494025c529f
Revises: 4fc0a8dcb554
Create Date: 2026-09-24 00:00:03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d494025c529f"
down_revision: Union[str, None] = "4fc0a8dcb554"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# auth.uid() and the "authenticated" role only exist on Supabase, so the policies
# are created only there; plain Postgres (local dev, CI) just gets RLS enabled.
POLICIES_SUPABASE = """
DO $$
BEGIN
  IF to_regnamespace('auth') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY demandas_select_empresa_dona ON demandas
             FOR SELECT TO authenticated
             USING (empresa_id = auth.uid())';
    EXECUTE 'CREATE POLICY demandas_select_profissional_aberta ON demandas
             FOR SELECT TO authenticated
             USING (
               status = ''aberta''
               AND expira_em > now()
               AND EXISTS (
                 SELECT 1 FROM profiles p
                 WHERE p.id = auth.uid() AND p.papel = ''profissional''
               )
             )';
  END IF;
END $$;
"""


def upgrade() -> None:
    status_enum = postgresql.ENUM(
        "aberta",
        "preenchida",
        "encerrada",
        "expirada",
        name="status_demanda_enum",
        create_type=False,
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "demandas",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "empresa_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("empresas.user_id"),
            nullable=False,
        ),
        sa.Column(
            "especialidade_id", sa.Integer(), sa.ForeignKey("especialidades.id"), nullable=False
        ),
        sa.Column("cidade", sa.String(100), nullable=False),
        sa.Column("estado", sa.String(2), nullable=False),
        sa.Column("bairro", sa.String(100), nullable=True),
        sa.Column("data_inicio", sa.Date(), nullable=False),
        sa.Column("turno", sa.String(60), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=False),
        sa.Column("valor_oferecido", sa.Numeric(10, 2), nullable=True),
        sa.Column("status", status_enum, nullable=False, server_default="aberta"),
        sa.Column(
            "expira_em",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now() + interval '30 days'"),
        ),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("char_length(descricao) <= 500", name="ck_demandas_descricao_max"),
    )
    op.create_index(
        "ix_demandas_status_especialidade_cidade",
        "demandas",
        ["status", "especialidade_id", "cidade"],
    )
    op.create_index("ix_demandas_empresa_id", "demandas", ["empresa_id"])
    op.execute("ALTER TABLE demandas ENABLE ROW LEVEL SECURITY")
    op.execute(POLICIES_SUPABASE)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS demandas_select_profissional_aberta ON demandas")
    op.execute("DROP POLICY IF EXISTS demandas_select_empresa_dona ON demandas")
    op.drop_index("ix_demandas_empresa_id", table_name="demandas")
    op.drop_index("ix_demandas_status_especialidade_cidade", table_name="demandas")
    op.drop_table("demandas")
    postgresql.ENUM(name="status_demanda_enum").drop(op.get_bind(), checkfirst=True)
