"""create_eventos_stripe

Revision ID: 4fc0a8dcb554
Revises: 6f2b04f10628
Create Date: 2026-09-24 00:00:02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "4fc0a8dcb554"
down_revision: Union[str, None] = "6f2b04f10628"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "eventos_stripe",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column(
            "recebido_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("processado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("erro", sa.Text(), nullable=True),
    )
    op.execute("ALTER TABLE eventos_stripe ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_table("eventos_stripe")
