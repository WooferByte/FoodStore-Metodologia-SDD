"""Convert all timestamp columns to TIMESTAMP WITH TIME ZONE (TIMESTAMPTZ)

Reinterprets existing naive UTC values as UTC via AT TIME ZONE 'UTC' so the
instant is preserved (no shift). Reverses on downgrade using the same
reinterpretation.

Revision ID: 013_timestamps_timezone
Revises: 012_add_pedido_envio
Create Date: 2026-08-25 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None

# (table, columns) — 15 tables, 32 columns (from fix-timestamps-timezone design)
TIMESTAMP_COLUMNS: dict[str, list[str]] = {
    "roles": ["creado_en"],
    "estados_pedido": ["creado_en"],
    "formas_pago": ["creado_en"],
    "usuarios": ["ultimo_login", "creado_en", "actualizado_en", "eliminado_en"],
    "refresh_tokens": ["expires_at", "revoked_at", "creado_en"],
    "direcciones_entrega": ["creado_en", "actualizado_en", "eliminado_en"],
    "categorias": ["creado_en", "actualizado_en", "eliminado_en"],
    "productos": ["creado_en", "actualizado_en", "eliminado_en"],
    "ingredientes": ["creado_en", "eliminado_en"],
    "pedidos": ["creado_en", "actualizado_en", "eliminado_en"],
    "detalle_pedido": ["creado_en"],
    "historial_estado_pedido": ["creado_en"],
    "pagos": ["creado_en", "actualizado_en", "eliminado_en"],
    "pago_webhook_log": ["creado_en"],
    "configuracion": ["creado_en", "actualizado_en"],
}


def upgrade() -> None:
    for table, cols in TIMESTAMP_COLUMNS.items():
        for col in cols:
            op.alter_column(
                table,
                col,
                type_=sa.DateTime(timezone=True),
                postgresql_using=f"\"{col}\" AT TIME ZONE 'UTC'",
            )


def downgrade() -> None:
    for table, cols in TIMESTAMP_COLUMNS.items():
        for col in cols:
            op.alter_column(
                table,
                col,
                type_=sa.DateTime(),
                postgresql_using=f"\"{col}\" AT TIME ZONE 'UTC'",
            )
