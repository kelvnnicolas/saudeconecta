"""add_origem_demanda_to_contatos

Revision ID: ba676ac3e504
Revises: d494025c529f
Create Date: 2026-09-24 00:00:04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "ba676ac3e504"
down_revision: Union[str, None] = "d494025c529f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    origem_enum = postgresql.ENUM("busca", "demanda", name="origem_contato_enum", create_type=False)
    origem_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "contatos", sa.Column("origem", origem_enum, nullable=False, server_default="busca")
    )
    op.add_column(
        "contatos",
        sa.Column(
            "demanda_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("demandas.id", name="fk_contatos_demanda_id"),
            nullable=True,
        ),
    )
    op.create_index(
        "uq_contatos_demanda_profissional",
        "contatos",
        ["demanda_id", "profissional_id"],
        unique=True,
        postgresql_where=sa.text("demanda_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_contatos_demanda_profissional", table_name="contatos")
    op.drop_constraint("fk_contatos_demanda_id", "contatos", type_="foreignkey")
    op.drop_column("contatos", "demanda_id")
    op.drop_column("contatos", "origem")
    postgresql.ENUM(name="origem_contato_enum").drop(op.get_bind(), checkfirst=True)
