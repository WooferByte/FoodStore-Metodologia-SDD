"""Add envio column to pedidos

Adds envio NUMERIC(10,2) NOT NULL DEFAULT 0 to the pedidos table.
Historical rows keep envio = 0, matching what was actually charged
before the shipping-fee rule existed.

Revision ID: 012_add_pedido_envio
Revises: 011_configuracion_table
Create Date: 2026-08-25 00:00:00.000000
"""
from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE pedidos
        ADD COLUMN envio NUMERIC(10,2) NOT NULL DEFAULT 0
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE pedidos DROP COLUMN envio")
