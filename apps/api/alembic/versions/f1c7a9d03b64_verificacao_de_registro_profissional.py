"""verificacao_de_registro_profissional

Verificação manual do registro profissional por administrador (F-031).

- Enums `status_verificacao_enum` e `ator_verificacao_enum`.
- `profissionais.verificado_em`: data da última conferência com resultado `verified`.
- `administradores`: quem pode registrar conferências.
- `verificacoes_registro`: trilha de auditoria (só inserção) e fonte do estado atual.

As duas tabelas novas ligam RLS (nenhuma política = só o backend acessa). O estado detalhado
(`pending`, `irregular`, `unable_to_verify`) NÃO vai para `profissionais`: as tabelas antigas
não têm RLS e o Supabase as expõe pela API pública.

Quem já tinha `verificado = true` ganha uma linha na trilha (`verified`, ator `sistema`).

Migration aditiva. Aplicar à mão antes do deploy (T-007).

Revision ID: f1c7a9d03b64
Revises: d3f8a1c26e57
Create Date: 2026-10-22 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f1c7a9d03b64'
down_revision: Union[str, None] = 'd3f8a1c26e57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _status_enum() -> postgresql.ENUM:
    return postgresql.ENUM(
        "unverified",
        "pending",
        "verified",
        "irregular",
        "unable_to_verify",
        name="status_verificacao_enum",
        create_type=False,
    )


def _ator_enum() -> postgresql.ENUM:
    return postgresql.ENUM(
        "profissional", "administrador", "sistema", name="ator_verificacao_enum", create_type=False
    )


def upgrade() -> None:
    status_enum, ator_enum = _status_enum(), _ator_enum()
    status_enum.create(op.get_bind(), checkfirst=True)
    ator_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "profissionais", sa.Column("verificado_em", sa.DateTime(timezone=True), nullable=True)
    )

    op.create_table(
        "administradores",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.execute("ALTER TABLE administradores ENABLE ROW LEVEL SECURITY")

    op.create_table(
        "verificacoes_registro",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "profissional_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "profissionais.user_id",
                ondelete="CASCADE",
                name="fk_verificacoes_registro_profissional_id",
            ),
            nullable=False,
        ),
        sa.Column("status_anterior", status_enum, nullable=False),
        sa.Column("status_novo", status_enum, nullable=False),
        sa.Column("conselho", sa.String(20), nullable=True),
        sa.Column("uf", sa.String(2), nullable=True),
        sa.Column("numero_registro", sa.String(40), nullable=True),
        sa.Column("metodo", sa.String(40), nullable=True),
        sa.Column("fonte", sa.String(255), nullable=True),
        sa.Column("verificado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ator_tipo", ator_enum, nullable=False),
        sa.Column("ator_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_verificacoes_registro_profissional_id",
        "verificacoes_registro",
        ["profissional_id", "id"],
    )
    op.execute("ALTER TABLE verificacoes_registro ENABLE ROW LEVEL SECURITY")

    # Quem já estava marcado como verificado passa a ter a trilha coerente com o selo.
    op.execute(
        """
        INSERT INTO verificacoes_registro
            (profissional_id, status_anterior, status_novo, ator_tipo, verificado_em)
        SELECT user_id, 'unverified', 'verified', 'sistema', now()
        FROM profissionais WHERE verificado
        """
    )
    op.execute("UPDATE profissionais SET verificado_em = now() WHERE verificado")


def downgrade() -> None:
    op.drop_index("ix_verificacoes_registro_profissional_id", table_name="verificacoes_registro")
    op.drop_table("verificacoes_registro")
    op.drop_table("administradores")
    op.drop_column("profissionais", "verificado_em")
    postgresql.ENUM(name="ator_verificacao_enum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="status_verificacao_enum").drop(op.get_bind(), checkfirst=True)
