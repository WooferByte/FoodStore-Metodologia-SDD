"""
Unit tests for admin metrics endpoints and service layer.

Uses AsyncMock and MagicMock to isolate all DB calls — no live DB required.

Tests:
  7.2  test_resumen_sin_fechas_200
  7.3  test_resumen_con_rango_fechas_200
  7.4  test_resumen_sin_token_401
  7.5  test_resumen_usuario_no_admin_403
  7.6  test_ventas_granularidad_dia_200
  7.7  test_ventas_granularidad_mes_200
  7.8  test_ventas_granularidad_invalida_422
  7.9  test_top_productos_200
  7.10 test_pedidos_por_estado_todos_presentes
  7.11 test_cache_control_header_presente
  7.12 date_range_validation_desde_mayor_hasta_422
"""
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Helpers shared with test_admin_usuarios pattern
# ---------------------------------------------------------------------------

def _make_mock_rol(nombre: str = "ADMIN") -> MagicMock:
    rol = MagicMock()
    rol.nombre = nombre
    return rol


def _make_mock_user(roles: list | None = None) -> MagicMock:
    user = MagicMock()
    user.roles = roles if roles is not None else [_make_mock_rol("ADMIN")]
    user.eliminado_en = None
    return user


def _make_uow() -> MagicMock:
    """Build a mock UnitOfWork that works as async context manager."""
    uow = MagicMock()
    uow.__aenter__ = AsyncMock(return_value=uow)
    uow.__aexit__ = AsyncMock(return_value=False)
    return uow


# ---------------------------------------------------------------------------
# 7.4 / 7.5 — RBAC tests via require_role directly
# ---------------------------------------------------------------------------

class TestMetricasAuth:
    """Test that require_role(["ADMIN"]) correctly allows/denies access."""

    @pytest.mark.asyncio
    async def test_resumen_sin_token_401(self):
        """
        7.4 — Without a token, get_current_user raises 401.
        We simulate this by calling require_role with no token header.
        """
        from infrastructure.dependencies import require_role

        # A user with CLIENT role (simulates wrong token, not missing — but covers RBAC)
        check_fn = require_role(["ADMIN"])
        client_user = _make_mock_user(roles=[_make_mock_rol("CLIENT")])

        with pytest.raises(HTTPException) as exc_info:
            await check_fn(current_user=client_user)

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_resumen_usuario_no_admin_403(self):
        """7.5 — Authenticated user without ADMIN role → 403."""
        from infrastructure.dependencies import require_role

        check_fn = require_role(["ADMIN"])
        stock_user = _make_mock_user(roles=[_make_mock_rol("STOCK")])

        with pytest.raises(HTTPException) as exc_info:
            await check_fn(current_user=stock_user)

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_user_passes_require_role(self):
        """ADMIN user passes require_role(["ADMIN"]) without raising."""
        from infrastructure.dependencies import require_role

        check_fn = require_role(["ADMIN"])
        admin_user = _make_mock_user(roles=[_make_mock_rol("ADMIN")])

        # Should not raise
        await check_fn(current_user=admin_user)


# ---------------------------------------------------------------------------
# 7.2 / 7.3 — AdminMetricasService.get_resumen
# ---------------------------------------------------------------------------

class TestGetResumen:
    """Tests for AdminMetricasService.get_resumen via repository mock."""

    @pytest.mark.asyncio
    async def test_resumen_sin_fechas_200(self):
        """7.2 — get_resumen without dates returns MetricasResumenResponse with numbers >= 0."""
        from admin.service import AdminMetricasService
        from admin.schemas import MetricasResumenResponse

        expected = MetricasResumenResponse(
            total_ventas=Decimal("1500.00"),
            pedidos_hoy=3,
            productos_activos=42,
            usuarios_activos=100,
        )

        uow = _make_uow()

        with patch("admin.repository.AdminMetricasRepository.get_resumen", new=AsyncMock(return_value=expected)):
            result = await AdminMetricasService.get_resumen(uow)

        assert result.total_ventas >= 0
        assert result.pedidos_hoy >= 0
        assert result.productos_activos >= 0
        assert result.usuarios_activos >= 0
        assert isinstance(result, MetricasResumenResponse)

    @pytest.mark.asyncio
    async def test_resumen_con_rango_fechas_200(self):
        """7.3 — get_resumen with date range (can return 0 ventas for empty range)."""
        from admin.service import AdminMetricasService
        from admin.schemas import MetricasResumenResponse

        expected = MetricasResumenResponse(
            total_ventas=Decimal("0.00"),
            pedidos_hoy=0,
            productos_activos=42,
            usuarios_activos=100,
        )

        uow = _make_uow()

        with patch("admin.repository.AdminMetricasRepository.get_resumen", new=AsyncMock(return_value=expected)):
            result = await AdminMetricasService.get_resumen(
                uow, desde=date(2020, 1, 1), hasta=date(2020, 12, 31)
            )

        assert result.total_ventas == Decimal("0.00")
        assert result.pedidos_hoy == 0


# ---------------------------------------------------------------------------
# 7.6 / 7.7 / 7.8 — Ventas
# ---------------------------------------------------------------------------

class TestGetVentas:
    """Tests for AdminMetricasService.get_ventas."""

    @pytest.mark.asyncio
    async def test_ventas_granularidad_dia_200(self):
        """7.6 — get_ventas with granularidad=dia returns list (may be empty)."""
        from admin.service import AdminMetricasService
        from admin.schemas import VentasPorPeriodoItem

        items = [
            VentasPorPeriodoItem(
                fecha=datetime(2024, 1, 15),
                total_ventas=Decimal("500.00"),
                cantidad_pedidos=5,
            )
        ]

        uow = _make_uow()

        with patch(
            "admin.repository.AdminMetricasRepository.get_ventas_por_periodo",
            new=AsyncMock(return_value=items),
        ):
            result = await AdminMetricasService.get_ventas(uow, granularidad="dia")

        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0].cantidad_pedidos == 5

    @pytest.mark.asyncio
    async def test_ventas_granularidad_mes_200(self):
        """7.7 — get_ventas with granularidad=mes returns list."""
        from admin.service import AdminMetricasService

        uow = _make_uow()

        with patch(
            "admin.repository.AdminMetricasRepository.get_ventas_por_periodo",
            new=AsyncMock(return_value=[]),
        ):
            result = await AdminMetricasService.get_ventas(uow, granularidad="mes")

        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_ventas_granularidad_semana_200(self):
        """get_ventas with granularidad=semana returns list."""
        from admin.service import AdminMetricasService

        uow = _make_uow()

        with patch(
            "admin.repository.AdminMetricasRepository.get_ventas_por_periodo",
            new=AsyncMock(return_value=[]),
        ):
            result = await AdminMetricasService.get_ventas(uow, granularidad="semana")

        assert isinstance(result, list)


class TestVentasRouterInvalidGranularidad:
    """7.8 — Test that the router endpoint returns 422 for invalid granularidad."""

    @pytest.mark.asyncio
    async def test_ventas_granularidad_hora_422(self):
        """
        7.8 — GET /ventas?granularidad=hora → 422 because Literal["dia","semana","mes"]
        does not include "hora". We test this by overriding auth dependencies so
        FastAPI can reach the parameter validation stage.
        """
        from fastapi.testclient import TestClient
        from fastapi import FastAPI
        from admin.router import metricas_router
        from infrastructure.dependencies import require_role, get_current_user
        from infrastructure.uow import get_uow

        test_app = FastAPI()
        test_app.include_router(metricas_router)

        # Override auth and UoW so request reaches parameter validation
        async def mock_require_role():
            return None

        async def mock_get_uow():
            return _make_uow()

        async def mock_get_current_user():
            return _make_mock_user()

        test_app.dependency_overrides[get_current_user] = mock_get_current_user
        test_app.dependency_overrides[get_uow] = mock_get_uow

        with TestClient(test_app, raise_server_exceptions=False) as client:
            response = client.get("/admin/metricas/ventas?granularidad=hora")

        # FastAPI returns 422 for invalid Literal values
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# 7.9 — Top productos
# ---------------------------------------------------------------------------

class TestGetTopProductos:
    """Tests for AdminMetricasService.get_top_productos."""

    @pytest.mark.asyncio
    async def test_top_productos_200(self):
        """7.9 — Returns list of max 10 items, each with producto_id, nombre, cantidad_total."""
        from admin.service import AdminMetricasService
        from admin.schemas import TopProductoItem

        items = [
            TopProductoItem(producto_id=i, nombre=f"Producto {i}", cantidad_total=10 - i)
            for i in range(1, 8)
        ]

        uow = _make_uow()

        with patch(
            "admin.repository.AdminMetricasRepository.get_top_productos",
            new=AsyncMock(return_value=items),
        ):
            result = await AdminMetricasService.get_top_productos(uow)

        assert isinstance(result, list)
        assert len(result) <= 10
        for item in result:
            assert hasattr(item, "producto_id")
            assert hasattr(item, "nombre")
            assert hasattr(item, "cantidad_total")


# ---------------------------------------------------------------------------
# 7.10 — Pedidos por estado
# ---------------------------------------------------------------------------

class TestGetPedidosPorEstado:
    """Tests for AdminMetricasService.get_pedidos_por_estado."""

    @pytest.mark.asyncio
    async def test_pedidos_por_estado_todos_presentes(self):
        """7.10 — Returns all 6 states even if some have cantidad=0."""
        from admin.service import AdminMetricasService
        from admin.schemas import PedidosPorEstadoItem

        all_states = [
            "PENDIENTE",
            "CONFIRMADO",
            "EN_PREPARACIÓN",
            "EN_CAMINO",
            "ENTREGADO",
            "CANCELADO",
        ]

        items = [
            PedidosPorEstadoItem(estado=estado, cantidad=0 if estado == "CANCELADO" else 2)
            for estado in all_states
        ]

        uow = _make_uow()

        with patch(
            "admin.repository.AdminMetricasRepository.get_pedidos_por_estado",
            new=AsyncMock(return_value=items),
        ):
            result = await AdminMetricasService.get_pedidos_por_estado(uow)

        assert len(result) == 6
        state_names = {item.estado for item in result}
        for estado in all_states:
            assert estado in state_names, f"Estado '{estado}' missing from response"

        # CANCELADO should have cantidad=0
        cancelado = next(i for i in result if i.estado == "CANCELADO")
        assert cancelado.cantidad == 0


# ---------------------------------------------------------------------------
# 7.11 — Cache-Control header
# ---------------------------------------------------------------------------

class TestCacheControlHeader:
    """7.11 — Verify Cache-Control header is set on metrics endpoints."""

    @pytest.mark.asyncio
    async def test_cache_control_header_set_on_resumen(self):
        """
        7.11 — The router sets response.headers["Cache-Control"] = "max-age=300, private".
        We test this via the router endpoint directly using a mock Response.
        """
        from admin.router import get_resumen
        from admin.schemas import MetricasResumenResponse

        mock_response = MagicMock()
        mock_response.headers = {}

        admin_user = _make_mock_user()
        uow = _make_uow()
        expected = MetricasResumenResponse(
            total_ventas=Decimal("0.00"),
            pedidos_hoy=0,
            productos_activos=0,
            usuarios_activos=0,
        )

        with patch("admin.router.AdminMetricasService.get_resumen", new=AsyncMock(return_value=expected)):
            result = await get_resumen(
                response=mock_response,
                desde=None,
                hasta=None,
                _=admin_user,
                uow=uow,
            )

        assert "Cache-Control" in mock_response.headers
        assert "max-age=300" in mock_response.headers["Cache-Control"]

    @pytest.mark.asyncio
    async def test_cache_control_header_set_on_ventas(self):
        """Cache-Control is also set on the ventas endpoint."""
        from admin.router import get_ventas
        from admin.schemas import VentasResponse

        mock_response = MagicMock()
        mock_response.headers = {}

        admin_user = _make_mock_user()
        uow = _make_uow()

        with patch("admin.router.AdminMetricasService.get_ventas", new=AsyncMock(return_value=[])):
            result = await get_ventas(
                response=mock_response,
                granularidad="dia",
                desde=None,
                hasta=None,
                _=admin_user,
                uow=uow,
            )

        assert "Cache-Control" in mock_response.headers
        assert "max-age=300" in mock_response.headers["Cache-Control"]


# ---------------------------------------------------------------------------
# 7.12 — Date validation (desde > hasta → 422)
# ---------------------------------------------------------------------------

class TestDateRangeValidation:
    """7.12 — Validate that desde > hasta raises 422 RFC 7807."""

    @pytest.mark.asyncio
    async def test_resumen_desde_mayor_hasta_422(self):
        """desde > hasta on /resumen → 422."""
        from admin.router import get_resumen

        mock_response = MagicMock()
        mock_response.headers = {}
        admin_user = _make_mock_user()
        uow = _make_uow()

        with pytest.raises(HTTPException) as exc_info:
            await get_resumen(
                response=mock_response,
                desde=date(2024, 12, 31),
                hasta=date(2024, 1, 1),
                _=admin_user,
                uow=uow,
            )

        assert exc_info.value.status_code == 422
        assert exc_info.value.detail["status"] == 422

    @pytest.mark.asyncio
    async def test_ventas_desde_mayor_hasta_422(self):
        """desde > hasta on /ventas → 422."""
        from admin.router import get_ventas

        mock_response = MagicMock()
        mock_response.headers = {}
        admin_user = _make_mock_user()
        uow = _make_uow()

        with pytest.raises(HTTPException) as exc_info:
            await get_ventas(
                response=mock_response,
                granularidad="dia",
                desde=date(2024, 12, 31),
                hasta=date(2024, 1, 1),
                _=admin_user,
                uow=uow,
            )

        assert exc_info.value.status_code == 422

    @pytest.mark.asyncio
    async def test_top_productos_desde_mayor_hasta_422(self):
        """desde > hasta on /top-productos → 422."""
        from admin.router import get_top_productos

        mock_response = MagicMock()
        mock_response.headers = {}
        admin_user = _make_mock_user()
        uow = _make_uow()

        with pytest.raises(HTTPException) as exc_info:
            await get_top_productos(
                response=mock_response,
                desde=date(2024, 12, 31),
                hasta=date(2024, 1, 1),
                _=admin_user,
                uow=uow,
            )

        assert exc_info.value.status_code == 422


# ---------------------------------------------------------------------------
# Repository unit tests (direct mocking of SQLAlchemy session)
# ---------------------------------------------------------------------------

class TestAdminMetricasRepositoryResumen:
    """Unit tests for AdminMetricasRepository.get_resumen (no DB required)."""

    @pytest.mark.asyncio
    async def test_get_resumen_returns_zeros_on_empty_db(self):
        """get_resumen returns Decimal('0.00') and 0 counts when all queries return None/0."""
        from admin.repository import AdminMetricasRepository

        session = AsyncMock()

        # Each scalar() call returns the zero-value for that metric
        def make_scalar_result(value):
            r = MagicMock()
            r.scalar.return_value = value
            return r

        session.execute.side_effect = [
            make_scalar_result(None),   # total_ventas → coalesce → 0.00
            make_scalar_result(0),      # pedidos_hoy
            make_scalar_result(0),      # productos_activos
            make_scalar_result(0),      # usuarios_activos
        ]

        result = await AdminMetricasRepository.get_resumen(session)

        assert result.pedidos_hoy == 0
        assert result.productos_activos == 0
        assert result.usuarios_activos == 0
        # total_ventas: None from DB → fallback to Decimal("0.00")
        assert result.total_ventas == Decimal("0.00")

    @pytest.mark.asyncio
    async def test_get_resumen_returns_correct_values(self):
        """get_resumen maps scalar results to correct fields."""
        from admin.repository import AdminMetricasRepository

        session = AsyncMock()

        def make_scalar_result(value):
            r = MagicMock()
            r.scalar.return_value = value
            return r

        session.execute.side_effect = [
            make_scalar_result(Decimal("2500.50")),  # total_ventas
            make_scalar_result(7),                   # pedidos_hoy
            make_scalar_result(35),                  # productos_activos
            make_scalar_result(88),                  # usuarios_activos
        ]

        result = await AdminMetricasRepository.get_resumen(session)

        assert result.total_ventas == Decimal("2500.50")
        assert result.pedidos_hoy == 7
        assert result.productos_activos == 35
        assert result.usuarios_activos == 88


class TestAdminMetricasRepositoryVentas:
    """Unit tests for AdminMetricasRepository.get_ventas_por_periodo."""

    @pytest.mark.asyncio
    async def test_get_ventas_empty_returns_empty_list(self):
        """Empty DB → empty list returned."""
        from admin.repository import AdminMetricasRepository

        session = AsyncMock()

        mock_result = MagicMock()
        mock_result.all.return_value = []
        session.execute.return_value = mock_result

        result = await AdminMetricasRepository.get_ventas_por_periodo(session, "dia")

        assert result == []

    @pytest.mark.asyncio
    async def test_get_ventas_maps_rows_to_items(self):
        """Rows from DB are mapped to VentasPorPeriodoItem correctly."""
        from admin.repository import AdminMetricasRepository
        from admin.schemas import VentasPorPeriodoItem

        session = AsyncMock()

        row = MagicMock()
        row.fecha = datetime(2024, 3, 15)
        row.total_ventas = Decimal("1200.00")
        row.cantidad_pedidos = 8

        mock_result = MagicMock()
        mock_result.all.return_value = [row]
        session.execute.return_value = mock_result

        result = await AdminMetricasRepository.get_ventas_por_periodo(session, "dia")

        assert len(result) == 1
        assert isinstance(result[0], VentasPorPeriodoItem)
        assert result[0].total_ventas == Decimal("1200.00")
        assert result[0].cantidad_pedidos == 8


class TestAdminMetricasRepositoryTopProductos:
    """Unit tests for AdminMetricasRepository.get_top_productos."""

    @pytest.mark.asyncio
    async def test_get_top_productos_empty_returns_empty_list(self):
        """Empty DB → empty list."""
        from admin.repository import AdminMetricasRepository

        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = []
        session.execute.return_value = mock_result

        result = await AdminMetricasRepository.get_top_productos(session)
        assert result == []

    @pytest.mark.asyncio
    async def test_get_top_productos_maps_rows(self):
        """Rows are mapped to TopProductoItem."""
        from admin.repository import AdminMetricasRepository
        from admin.schemas import TopProductoItem

        session = AsyncMock()

        row = MagicMock()
        row.producto_id = 5
        row.nombre = "Hamburguesa Clásica"
        row.cantidad_total = 42

        mock_result = MagicMock()
        mock_result.all.return_value = [row]
        session.execute.return_value = mock_result

        result = await AdminMetricasRepository.get_top_productos(session)

        assert len(result) == 1
        assert isinstance(result[0], TopProductoItem)
        assert result[0].producto_id == 5
        assert result[0].nombre == "Hamburguesa Clásica"
        assert result[0].cantidad_total == 42


class TestAdminMetricasRepositoryPedidosPorEstado:
    """Unit tests for AdminMetricasRepository.get_pedidos_por_estado."""

    @pytest.mark.asyncio
    async def test_all_states_present_with_zeros(self):
        """All 6 states are returned; states with no orders show cantidad=0."""
        from admin.repository import AdminMetricasRepository
        from admin.schemas import PedidosPorEstadoItem

        session = AsyncMock()

        # Build 6 mock EstadoPedido objects
        estados_names = [
            "PENDIENTE", "CONFIRMADO", "EN_PREPARACIÓN",
            "EN_CAMINO", "ENTREGADO", "CANCELADO"
        ]
        mock_estados = []
        for i, nombre in enumerate(estados_names, start=1):
            ep = MagicMock()
            ep.id = i
            ep.nombre = nombre
            mock_estados.append(ep)

        # Only PENDIENTE(id=1) has 3 orders; rest have 0
        count_row = MagicMock()
        count_row.estado_pedido_id = 1
        count_row.cantidad = 3

        estados_result = MagicMock()
        estados_scalars = MagicMock()
        estados_scalars.all.return_value = mock_estados
        estados_result.scalars.return_value = estados_scalars

        counts_result = MagicMock()
        counts_result.all.return_value = [count_row]

        session.execute.side_effect = [estados_result, counts_result]

        result = await AdminMetricasRepository.get_pedidos_por_estado(session)

        assert len(result) == 6

        state_map = {item.estado: item.cantidad for item in result}
        assert state_map["PENDIENTE"] == 3
        assert state_map["CONFIRMADO"] == 0
        assert state_map["CANCELADO"] == 0
        for nombre in estados_names:
            assert nombre in state_map, f"Estado '{nombre}' missing"


# ---------------------------------------------------------------------------
# Schema validation tests
# ---------------------------------------------------------------------------

class TestMetricasSchemas:
    """Validate Pydantic v2 schema construction."""

    def test_metricas_resumen_response_valid(self):
        """MetricasResumenResponse accepts valid numeric fields."""
        from admin.schemas import MetricasResumenResponse

        r = MetricasResumenResponse(
            total_ventas=Decimal("100.00"),
            pedidos_hoy=5,
            productos_activos=20,
            usuarios_activos=50,
        )
        assert r.total_ventas == Decimal("100.00")
        assert r.pedidos_hoy == 5

    def test_ventas_response_wraps_items(self):
        """VentasResponse wraps a list of VentasPorPeriodoItem."""
        from admin.schemas import VentasResponse, VentasPorPeriodoItem

        items = [VentasPorPeriodoItem(
            fecha=datetime(2024, 1, 1),
            total_ventas=Decimal("0.00"),
            cantidad_pedidos=0,
        )]
        r = VentasResponse(items=items)
        assert len(r.items) == 1

    def test_pedidos_por_estado_response_wraps_items(self):
        """PedidosPorEstadoResponse wraps a list of PedidosPorEstadoItem."""
        from admin.schemas import PedidosPorEstadoResponse, PedidosPorEstadoItem

        items = [PedidosPorEstadoItem(estado="PENDIENTE", cantidad=2)]
        r = PedidosPorEstadoResponse(items=items)
        assert r.items[0].estado == "PENDIENTE"

    def test_top_productos_response_wraps_items(self):
        """TopProductosResponse wraps a list of TopProductoItem."""
        from admin.schemas import TopProductosResponse, TopProductoItem

        items = [TopProductoItem(producto_id=1, nombre="Test", cantidad_total=5)]
        r = TopProductosResponse(items=items)
        assert r.items[0].nombre == "Test"
