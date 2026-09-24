"""create_planos

Revision ID: afbbf49c8fb1
Revises: 3c035f94f9e4
Create Date: 2026-09-24 00:00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.core.config import get_settings

revision: str = "afbbf49c8fb1"
down_revision: Union[str, None] = "3c035f94f9e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Business assumption (not in the spec): Essencial caps open demandas at 5, Pro is unlimited.
PLANOS_INICIAIS = (
    ("essencial", "Essencial", "stripe_price_essencial", 5),
    ("pro", "Pro", "stripe_price_pro", None),
)


def upgrade() -> None:
    op.create_table(
        "planos",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("codigo", sa.Text(), nullable=False, unique=True),
        sa.Column("nome", sa.Text(), nullable=False),
        sa.Column("stripe_price_id", sa.Text(), nullable=False, unique=True),
        sa.Column("limite_demandas_ativas", sa.Integer(), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    # The API role owns this table and so bypasses RLS; enabling it only denies
    # direct PostgREST access (anon/authenticated) when the DB is Supabase's.
    op.execute("ALTER TABLE planos ENABLE ROW LEVEL SECURITY")

    settings = get_settings()
    planos = sa.table(
        "planos",
        sa.column("codigo", sa.Text),
        sa.column("nome", sa.Text),
        sa.column("stripe_price_id", sa.Text),
        sa.column("limite_demandas_ativas", sa.Integer),
    )
    op.bulk_insert(
        planos,
        [
            {
                "codigo": codigo,
                "nome": nome,
                "stripe_price_id": getattr(settings, campo_price),
                "limite_demandas_ativas": limite,
            }
            for codigo, nome, campo_price, limite in PLANOS_INICIAIS
        ],
    )


def downgrade() -> None:
    op.drop_table("planos")
