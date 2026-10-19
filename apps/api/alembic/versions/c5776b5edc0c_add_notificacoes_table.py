"""add_notificacoes_table

Revision ID: c5776b5edc0c
Revises: 17cc1c95a9c5
Create Date: 2026-09-30 16:04:47.816621

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c5776b5edc0c'
down_revision: Union[str, None] = '17cc1c95a9c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # create_type=False: op.create_table() fires its own automatic
    # CREATE TYPE for any postgresql.ENUM column it contains, which
    # collides with the explicit .create() call right below (unlike
    # op.add_column(), which doesn't auto-create — see
    # ba676ac3e504_add_origem_demanda_to_contatos.py).
    tipo_enum = postgresql.ENUM(
        "novo_contato",
        "nova_mensagem",
        "aceite_demanda",
        "novo_interesse",
        "falha_pagamento",
        "nova_oportunidade",
        name="tipo_notificacao_enum",
        create_type=False,
    )
    tipo_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "notificacoes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "destinatario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profiles.id", name="fk_notificacoes_destinatario_id"),
            nullable=False,
        ),
        sa.Column("tipo", tipo_enum, nullable=False),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("corpo", sa.Text(), nullable=False),
        sa.Column("link", sa.String(500), nullable=False),
        sa.Column("lida_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_notificacoes_destinatario_id", "notificacoes", ["destinatario_id"])
    op.execute("ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index("ix_notificacoes_destinatario_id", table_name="notificacoes")
    op.drop_table("notificacoes")
    postgresql.ENUM(name="tipo_notificacao_enum").drop(op.get_bind(), checkfirst=True)
