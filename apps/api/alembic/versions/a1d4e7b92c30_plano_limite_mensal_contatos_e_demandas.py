"""plano_limite_mensal_contatos_e_demandas

O limite do plano deixa de ser "demandas abertas" e passa a ser uma cota mensal
única de contatos iniciados + demandas publicadas. Essencial = 50; Pro ilimitado
(NULL). O plano gratuito (sem assinatura) é 5 e vive no código.

Migration aditiva de propósito: a coluna antiga limite_demandas_ativas fica onde
está para o código anterior continuar funcionando entre a migration e o deploy.
Remover a coluna antiga numa migration futura, depois do deploy.

Revision ID: a1d4e7b92c30
Revises: c5776b5edc0c
Create Date: 2026-10-12 17:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1d4e7b92c30'
down_revision: Union[str, None] = 'c5776b5edc0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("planos", sa.Column("limite_mensal", sa.Integer(), nullable=True))
    op.execute("UPDATE planos SET limite_mensal = 50 WHERE codigo = 'essencial'")


def downgrade() -> None:
    op.drop_column("planos", "limite_mensal")
