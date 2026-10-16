"""notificacao_tipos_de_cota

Dois tipos novos de notificação para o aviso de cota mensal (F-024): a empresa está
perto do limite (80%) ou o esgotou. `tipo_notificacao_enum` é um enum nativo do Postgres,
então os valores entram com ALTER TYPE.

Atenção: o Postgres não remove valor de enum, então o downgrade não desfaz isto (os
valores a mais ficam, sem efeito). O código novo é seguro com a migration ainda não
aplicada: o aviso roda em savepoint e a falha só vai ao Sentry, sem derrubar o contato
nem a demanda. Aplicar antes do deploy para não gerar ruído.

Revision ID: d3f8a1c26e57
Revises: b7e2c4f1a835
Create Date: 2026-10-15 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd3f8a1c26e57'
down_revision: Union[str, None] = 'b7e2c4f1a835'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ADD VALUE não pode rodar dentro da transação da migration em versões antigas do Postgres.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE tipo_notificacao_enum ADD VALUE IF NOT EXISTS 'cota_quase_no_limite'")
        op.execute("ALTER TYPE tipo_notificacao_enum ADD VALUE IF NOT EXISTS 'cota_esgotada'")


def downgrade() -> None:
    # Postgres não remove valores de enum; os dois ficam, sem uso.
    pass
