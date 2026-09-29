"""add_aceito_em_to_contatos

Revision ID: 17cc1c95a9c5
Revises: 122a523bd099
Create Date: 2026-09-29 02:56:05.846182

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '17cc1c95a9c5'
down_revision: Union[str, None] = '122a523bd099'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("contatos", sa.Column("aceito_em", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("contatos", "aceito_em")
