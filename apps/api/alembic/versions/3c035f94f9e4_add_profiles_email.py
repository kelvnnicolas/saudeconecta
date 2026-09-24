"""add_profiles_email

Revision ID: 3c035f94f9e4
Revises: d6a1d35da1f9
Create Date: 2026-09-22 20:22:57.387995

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c035f94f9e4'
down_revision: Union[str, None] = 'd6a1d35da1f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("email", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "email")
