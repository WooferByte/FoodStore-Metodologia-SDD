"""Guard: every timestamp column in the system must be timezone-aware (TIMESTAMPTZ).

Iterates SQLModel.metadata (core/models.py + pagos/model.py) and asserts that every
timestamp column (creado_en, actualizado_en, eliminado_en, ultimo_login, expires_at,
revoked_at) is declared with type.timezone=True so PostgreSQL stores TIMESTAMPTZ.
"""
import core.models  # noqa: F401 — registers all domain tables
import pagos.model  # noqa: F401 — registers PagoWebhookLog
from sqlmodel import SQLModel

TIMESTAMP_COLUMN_NAMES = {
    "creado_en",
    "actualizado_en",
    "eliminado_en",
    "ultimo_login",
    "expires_at",
    "revoked_at",
}

# (table, column) mapping from design.md — 15 tables, 32 columns
EXPECTED_TIMESTAMP_COLUMNS = {
    ("roles", "creado_en"),
    ("estados_pedido", "creado_en"),
    ("formas_pago", "creado_en"),
    ("usuarios", "ultimo_login"),
    ("usuarios", "creado_en"),
    ("usuarios", "actualizado_en"),
    ("usuarios", "eliminado_en"),
    ("refresh_tokens", "expires_at"),
    ("refresh_tokens", "revoked_at"),
    ("refresh_tokens", "creado_en"),
    ("direcciones_entrega", "creado_en"),
    ("direcciones_entrega", "actualizado_en"),
    ("direcciones_entrega", "eliminado_en"),
    ("categorias", "creado_en"),
    ("categorias", "actualizado_en"),
    ("categorias", "eliminado_en"),
    ("productos", "creado_en"),
    ("productos", "actualizado_en"),
    ("productos", "eliminado_en"),
    ("ingredientes", "creado_en"),
    ("ingredientes", "eliminado_en"),
    ("pedidos", "creado_en"),
    ("pedidos", "actualizado_en"),
    ("pedidos", "eliminado_en"),
    ("detalle_pedido", "creado_en"),
    ("historial_estado_pedido", "creado_en"),
    ("pagos", "creado_en"),
    ("pagos", "actualizado_en"),
    ("pagos", "eliminado_en"),
    ("pago_webhook_log", "creado_en"),
    ("configuracion", "creado_en"),
    ("configuracion", "actualizado_en"),
}


def _all_timestamp_columns():
    for table in SQLModel.metadata.tables.values():
        for name in TIMESTAMP_COLUMN_NAMES:
            col = table.columns.get(name)
            if col is not None:
                yield table.name, name, col


def test_expected_timestamp_columns_are_all_present():
    """The 32 (table, column) pairs from the design mapping must exist."""
    actual = {(t, c) for t, c, _ in _all_timestamp_columns()}
    assert actual == EXPECTED_TIMESTAMP_COLUMNS


def test_all_timestamp_columns_are_timezone_aware():
    """Every timestamp column is declared timezone=True → TIMESTAMPTZ."""
    columns = list(_all_timestamp_columns())
    assert columns, "no timestamp columns found"
    for table_name, col_name, col in columns:
        assert col.type.timezone is True, (
            f"{table_name}.{col_name} is NOT timezone-aware "
            f"(type.timezone={col.type.timezone!r})"
        )
