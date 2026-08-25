"""Unit tests for core.time.utc_now — the single system clock source."""

from datetime import datetime, timezone, timedelta
from decimal import Decimal

from core.time import utc_now
from pedidos.schemas import PedidoResponse


class TestUtcNow:
    """Tests for core.time.utc_now."""

    def test_returns_aware_datetime_in_utc(self):
        """utc_now() returns a datetime with tzinfo == timezone.utc (aware)."""
        result = utc_now()

        assert isinstance(result, datetime)
        assert result.tzinfo == timezone.utc
        assert result.utcoffset() == timedelta(0)

    def test_returns_value_close_to_system_utc_clock(self):
        """utc_now() is within ±2 seconds of datetime.now(timezone.utc)."""
        before = datetime.now(timezone.utc) - timedelta(seconds=2)
        result = utc_now()
        after = datetime.now(timezone.utc) + timedelta(seconds=2)

        assert before <= result <= after


def _make_pedido_response(*, creado_en: datetime, actualizado_en: datetime) -> PedidoResponse:
    return PedidoResponse(
        id=1,
        usuario_id=1,
        direccion_entrega_id=1,
        forma_pago_id=1,
        estado_pedido_id=1,
        envio=Decimal("0.00"),
        total=Decimal("100.00"),
        observacion=None,
        direccion_snapshot=None,
        creado_en=creado_en,
        actualizado_en=actualizado_en,
    )


class TestSerializationRFC3339:
    """Timestamp serialization contract: aware UTC → RFC 3339 with Z suffix."""

    def test_aware_utc_serializes_with_z(self):
        """An aware UTC datetime serializes as '2026-08-25T18:12:56Z'."""
        aware = datetime(2026, 8, 25, 18, 12, 56, tzinfo=timezone.utc)
        js = _make_pedido_response(creado_en=aware, actualizado_en=aware).model_dump_json()

        assert '"creado_en":"2026-08-25T18:12:56Z"' in js
        assert '"actualizado_en":"2026-08-25T18:12:56Z"' in js

    def test_naive_datetime_is_not_emitted_with_z(self):
        """A naive datetime serializes WITHOUT offset — proving aware input is mandatory."""
        naive = datetime(2026, 8, 25, 18, 12, 56)
        js = _make_pedido_response(creado_en=naive, actualizado_en=naive).model_dump_json()

        assert '"2026-08-25T18:12:56"' in js
        assert "Z" not in js
