"""create_assinaturas

Revision ID: 6f2b04f10628
Revises: afbbf49c8fb1
Create Date: 2026-09-24 00:00:01

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "6f2b04f10628"
down_revision: Union[str, None] = "afbbf49c8fb1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

STATUS = (
    "incomplete",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "incomplete_expired",
    "paused",
)


def upgrade() -> None:
    status_enum = postgresql.ENUM(*STATUS, name="status_assinatura_enum", create_type=False)
    status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "assinaturas",
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
            "plano_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("planos.id"), nullable=False
        ),
        sa.Column("stripe_customer_id", sa.Text(), nullable=False),
        sa.Column("stripe_subscription_id", sa.Text(), nullable=True, unique=True),
        sa.Column("stripe_checkout_session_id", sa.Text(), nullable=True),
        sa.Column("status", status_enum, nullable=False, server_default="incomplete"),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.text("false")
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
    )
    op.create_index(
        "uq_assinaturas_empresa_vigente",
        "assinaturas",
        ["empresa_id"],
        unique=True,
        postgresql_where=sa.text("status NOT IN ('canceled', 'incomplete_expired')"),
    )
    op.create_index("ix_assinaturas_stripe_customer_id", "assinaturas", ["stripe_customer_id"])
    op.execute("ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index("ix_assinaturas_stripe_customer_id", table_name="assinaturas")
    op.drop_index("uq_assinaturas_empresa_vigente", table_name="assinaturas")
    op.drop_table("assinaturas")
    postgresql.ENUM(name="status_assinatura_enum").drop(op.get_bind(), checkfirst=True)
