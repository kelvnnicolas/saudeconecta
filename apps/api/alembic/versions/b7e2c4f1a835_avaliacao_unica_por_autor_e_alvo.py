"""avaliacao_unica_por_autor_e_alvo

Uma pessoa só avalia o mesmo alvo uma vez (B-008): sem isso, repetir a avaliação
infla ou derruba a nota. Antes de aplicar em produção, conferir que não há
duplicatas (a migration falha, sem alterar nada, se houver):

    SELECT autor_id, alvo_id, count(*) FROM avaliacoes GROUP BY 1, 2 HAVING count(*) > 1;

Revision ID: b7e2c4f1a835
Revises: a1d4e7b92c30
Create Date: 2026-10-14 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7e2c4f1a835'
down_revision: Union[str, None] = 'a1d4e7b92c30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint("uq_avaliacoes_autor_alvo", "avaliacoes", ["autor_id", "alvo_id"])


def downgrade() -> None:
    op.drop_constraint("uq_avaliacoes_autor_alvo", "avaliacoes", type_="unique")
