"""initial_schema

Revision ID: d6a1d35da1f9
Revises:
Create Date: 2026-09-19 01:35:42.546303

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd6a1d35da1f9'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    papel_enum = postgresql.ENUM(
        "profissional", "empresa", name="papel_enum", create_type=False
    )
    tipo_empresa_enum = postgresql.ENUM(
        "clinica", "hospital", "homecare", "pessoa_fisica", name="tipo_empresa_enum", create_type=False
    )
    status_contato_enum = postgresql.ENUM(
        "pendente", "respondido", "encerrado", name="status_contato_enum", create_type=False
    )
    status_pagamento_enum = postgresql.ENUM(
        "pendente", "pago", "cancelado", name="status_pagamento_enum", create_type=False
    )

    bind = op.get_bind()
    papel_enum.create(bind, checkfirst=True)
    tipo_empresa_enum.create(bind, checkfirst=True)
    status_contato_enum.create(bind, checkfirst=True)
    status_pagamento_enum.create(bind, checkfirst=True)

    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("papel", papel_enum, nullable=False),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("telefone", sa.String(20)),
        sa.Column("cidade", sa.String(100)),
        sa.Column("estado", sa.String(2)),
        sa.Column("latitude", sa.Float()),
        sa.Column("longitude", sa.Float()),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("CREATE INDEX ix_profiles_nome_trgm ON profiles USING gin (nome gin_trgm_ops)")

    op.create_table(
        "especialidades",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nome", sa.String(100), nullable=False, unique=True),
    )
    op.execute("CREATE INDEX ix_especialidades_nome_trgm ON especialidades USING gin (nome gin_trgm_ops)")

    op.create_table(
        "profissionais",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), primary_key=True),
        sa.Column("registro_profissional", sa.String(100)),
        sa.Column("bio", sa.Text()),
        sa.Column("preco_hora", sa.Numeric(10, 2)),
        sa.Column("verificado", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "profissional_especialidades",
        sa.Column(
            "profissional_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profissionais.user_id"),
            primary_key=True,
        ),
        sa.Column(
            "especialidade_id", sa.Integer(), sa.ForeignKey("especialidades.id"), primary_key=True
        ),
    )

    op.create_table(
        "empresas",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), primary_key=True),
        sa.Column("nome_fantasia", sa.String(255), nullable=False),
        sa.Column("tipo", tipo_empresa_enum, nullable=False),
        sa.Column("cidade", sa.String(100)),
        sa.Column("estado", sa.String(2)),
    )

    op.create_table(
        "avaliacoes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("autor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), nullable=False),
        sa.Column("alvo_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), nullable=False),
        sa.Column("nota", sa.Integer(), nullable=False),
        sa.Column("comentario", sa.Text()),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("nota >= 1 AND nota <= 5", name="ck_avaliacoes_nota_range"),
    )

    op.create_table(
        "contatos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("solicitante_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), nullable=False),
        sa.Column(
            "profissional_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profissionais.user_id"),
            nullable=False,
        ),
        sa.Column("mensagem", sa.Text(), nullable=False),
        sa.Column("status", status_contato_enum, nullable=False, server_default="pendente"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "links_pagamento",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("contato_id", sa.Integer(), sa.ForeignKey("contatos.id"), nullable=False),
        sa.Column("valor", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", status_pagamento_enum, nullable=False, server_default="pendente"),
        sa.Column("url_checkout", sa.String(500), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    especialidades_table = sa.table("especialidades", sa.column("nome", sa.String))
    op.bulk_insert(
        especialidades_table,
        [
            {"nome": nome}
            for nome in [
                "Enfermagem",
                "Técnico de Enfermagem",
                "Medicina (Clínico Geral)",
                "Fisioterapia",
                "Fonoaudiologia",
                "Nutrição",
                "Psicologia",
                "Cuidador de Idosos",
                "Cuidador Infantil",
                "Terapia Ocupacional",
            ]
        ],
    )


def downgrade() -> None:
    op.drop_table("links_pagamento")
    op.drop_table("contatos")
    op.drop_table("avaliacoes")
    op.drop_table("empresas")
    op.drop_table("profissional_especialidades")
    op.drop_table("profissionais")
    op.execute("DROP INDEX IF EXISTS ix_especialidades_nome_trgm")
    op.drop_table("especialidades")
    op.execute("DROP INDEX IF EXISTS ix_profiles_nome_trgm")
    op.drop_table("profiles")

    postgresql.ENUM(name="status_pagamento_enum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="status_contato_enum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="tipo_empresa_enum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="papel_enum").drop(op.get_bind(), checkfirst=True)
