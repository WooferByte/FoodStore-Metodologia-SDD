"""Create configuracion table for system key-value configuration store

Adds configuracion table to store system parameters with audit trail.

Revision ID: 011_configuracion_table
Revises: 010_pagos_webhook_log
Create Date: 2026-05-26 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create configuracion table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS configuracion (
            id SERIAL PRIMARY KEY,
            clave VARCHAR(255) NOT NULL UNIQUE,
            valor VARCHAR(1000) NOT NULL,
            descripcion VARCHAR(500),
            actualizado_por INTEGER NOT NULL REFERENCES usuarios(id),
            creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
        )
        """
    )

    # Index on clave for fast lookups
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_configuracion_clave ON configuracion(clave)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_configuracion_clave")
    op.execute("DROP TABLE IF EXISTS configuracion")
