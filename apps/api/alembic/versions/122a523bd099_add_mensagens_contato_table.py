"""add_mensagens_contato_table

Revision ID: 122a523bd099
Revises: ba676ac3e504
Create Date: 2026-09-29 02:54:47.396376

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '122a523bd099'
down_revision: Union[str, None] = 'ba676ac3e504'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mensagens_contato",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "contato_id",
            sa.Integer(),
            sa.ForeignKey("contatos.id", name="fk_mensagens_contato_contato_id"),
            nullable=False,
        ),
        sa.Column("autor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("corpo", sa.Text(), nullable=False),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_mensagens_contato_contato_id", "mensagens_contato", ["contato_id"])
    # A API dona a tabela e ignora RLS — isso só nega acesso direto via
    # PostgREST (anon/authenticated), que teria a chave anon pública do
    # bundle do frontend, para uma tabela nova que guarda texto livre de
    # conversas privadas. Mesmo padrão de afbbf49c8fb1_create_planos.py.
    op.execute("ALTER TABLE mensagens_contato ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index("ix_mensagens_contato_contato_id", table_name="mensagens_contato")
    op.drop_table("mensagens_contato")
