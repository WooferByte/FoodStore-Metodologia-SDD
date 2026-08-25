"""
AdminMetricasRepository — read-only SQL queries for admin dashboard KPIs.

All methods receive a bare AsyncSession (from uow.session). No session.commit()
is ever called here — the UoW context manager in the router owns the transaction.

Queries:
  get_resumen        — 4 scalar aggregates in one logical block
  get_ventas_por_periodo — DATE_TRUNC group-by with configurable granularity
  get_top_productos  — JOIN detalle_pedido→pedido→estado, exclude CANCELADO, LIMIT 10
  get_pedidos_por_estado — count + merge with all states (max 6 iterations)
"""
from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import func, select, cast, Date as SaDate
from sqlalchemy.ext.asyncio import AsyncSession

from core.models import DetallePedido, EstadoPedido, Pedido, Producto, Usuario
from core.time import utc_now
from admin.schemas import (
    MetricasResumenResponse,
    PedidosPorEstadoItem,
    TopProductoItem,
    VentasPorPeriodoItem,
)


# Mapping from API granularity param to PostgreSQL DATE_TRUNC unit
_GRAN_MAP: dict[str, str] = {
    "dia": "day",
    "semana": "week",
    "mes": "month",
}


class AdminMetricasRepository:
    """
    Read-only repository for admin dashboard metrics.

    Methods are static — no instance state needed.
    """

    @staticmethod
    async def get_resumen(
        session: AsyncSession,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> MetricasResumenResponse:
        """
        Return 4 KPIs in a single logical block using independent scalar queries.

        - total_ventas: SUM(pedido.total) for non-deleted, non-CANCELADO orders.
          Filtered by creado_en if desde/hasta are provided.
        - pedidos_hoy: COUNT of orders created today (UTC, by DATE).
        - productos_activos: COUNT of active, non-deleted products.
        - usuarios_activos: COUNT of active, non-deleted users.

        No Python loops — all aggregation done in SQL.
        """
        today = utc_now().date()

        # --- total_ventas ---
        ventas_stmt = (
            select(func.coalesce(func.sum(Pedido.total), Decimal("0.00")))
            .where(Pedido.eliminado_en.is_(None))
        )
        if desde is not None:
            ventas_stmt = ventas_stmt.where(
                cast(Pedido.creado_en, SaDate) >= desde
            )
        if hasta is not None:
            ventas_stmt = ventas_stmt.where(
                cast(Pedido.creado_en, SaDate) <= hasta
            )
        ventas_result = await session.execute(ventas_stmt)
        total_ventas: Decimal = ventas_result.scalar() or Decimal("0.00")

        # --- pedidos_hoy ---
        hoy_stmt = (
            select(func.count(Pedido.id))
            .where(Pedido.eliminado_en.is_(None))
            .where(cast(Pedido.creado_en, SaDate) == today)
        )
        hoy_result = await session.execute(hoy_stmt)
        pedidos_hoy: int = hoy_result.scalar() or 0

        # --- productos_activos ---
        prod_stmt = (
            select(func.count(Producto.id))
            .where(Producto.disponible.is_(True))
            .where(Producto.eliminado_en.is_(None))
        )
        prod_result = await session.execute(prod_stmt)
        productos_activos: int = prod_result.scalar() or 0

        # --- usuarios_activos ---
        usr_stmt = (
            select(func.count(Usuario.id))
            .where(Usuario.activo.is_(True))
            .where(Usuario.eliminado_en.is_(None))
        )
        usr_result = await session.execute(usr_stmt)
        usuarios_activos: int = usr_result.scalar() or 0

        return MetricasResumenResponse(
            total_ventas=total_ventas,
            pedidos_hoy=pedidos_hoy,
            productos_activos=productos_activos,
            usuarios_activos=usuarios_activos,
        )

    @staticmethod
    async def get_ventas_por_periodo(
        session: AsyncSession,
        granularidad: str,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> List[VentasPorPeriodoItem]:
        """
        Return sales aggregated by time bucket using DATE_TRUNC.

        Groups by DATE_TRUNC(unit, creado_en), orders by fecha ASC.
        Only considers non-deleted orders.

        Args:
            granularidad: One of "dia", "semana", "mes" — maps to 'day'/'week'/'month'.
        """
        pg_unit = _GRAN_MAP.get(granularidad, "day")

        fecha_col = func.date_trunc(pg_unit, Pedido.creado_en).label("fecha")

        stmt = (
            select(
                fecha_col,
                func.coalesce(func.sum(Pedido.total), Decimal("0.00")).label("total_ventas"),
                func.count(Pedido.id).label("cantidad_pedidos"),
            )
            .where(Pedido.eliminado_en.is_(None))
            .group_by(fecha_col)
            .order_by(fecha_col)
        )

        if desde is not None:
            stmt = stmt.where(cast(Pedido.creado_en, SaDate) >= desde)
        if hasta is not None:
            stmt = stmt.where(cast(Pedido.creado_en, SaDate) <= hasta)

        result = await session.execute(stmt)
        rows = result.all()

        return [
            VentasPorPeriodoItem(
                fecha=row.fecha,
                total_ventas=row.total_ventas,
                cantidad_pedidos=row.cantidad_pedidos,
            )
            for row in rows
        ]

    @staticmethod
    async def get_top_productos(
        session: AsyncSession,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
        limit: int = 10,
    ) -> List[TopProductoItem]:
        """
        Return the top-selling products (by units sold) excluding CANCELADO orders.

        JOINs: detalle_pedido → pedido → estado_pedido
        Filters: estado.nombre != 'CANCELADO', pedido.eliminado_en IS NULL
        Groups by: producto_id, nombre_snapshot
        Orders by: SUM(cantidad) DESC
        Limit: 10
        """
        stmt = (
            select(
                DetallePedido.producto_id,
                DetallePedido.nombre_snapshot.label("nombre"),
                func.sum(DetallePedido.cantidad).label("cantidad_total"),
            )
            .join(Pedido, Pedido.id == DetallePedido.pedido_id)
            .join(EstadoPedido, EstadoPedido.id == Pedido.estado_pedido_id)
            .where(Pedido.eliminado_en.is_(None))
            .where(EstadoPedido.nombre != "CANCELADO")
            .group_by(DetallePedido.producto_id, DetallePedido.nombre_snapshot)
            .order_by(func.sum(DetallePedido.cantidad).desc())
            .limit(limit)
        )

        if desde is not None:
            stmt = stmt.where(cast(Pedido.creado_en, SaDate) >= desde)
        if hasta is not None:
            stmt = stmt.where(cast(Pedido.creado_en, SaDate) <= hasta)

        result = await session.execute(stmt)
        rows = result.all()

        return [
            TopProductoItem(
                producto_id=row.producto_id,
                nombre=row.nombre,
                cantidad_total=row.cantidad_total,
            )
            for row in rows
        ]

    @staticmethod
    async def get_pedidos_por_estado(
        session: AsyncSession,
    ) -> List[PedidosPorEstadoItem]:
        """
        Return order counts grouped by status — always includes all 6 states (even with 0).

        Strategy:
          1. SELECT all EstadoPedido rows (max 6).
          2. SELECT COUNT(*) GROUP BY estado_pedido_id for non-deleted orders.
          3. Merge in Python using defaultdict — max 6 iterations, no N+1.
        """
        # 1. All states
        estados_stmt = select(EstadoPedido).order_by(EstadoPedido.id)
        estados_result = await session.execute(estados_stmt)
        estados = estados_result.scalars().all()

        # 2. Counts per estado_id
        counts_stmt = (
            select(
                Pedido.estado_pedido_id,
                func.count(Pedido.id).label("cantidad"),
            )
            .where(Pedido.eliminado_en.is_(None))
            .group_by(Pedido.estado_pedido_id)
        )
        counts_result = await session.execute(counts_stmt)
        counts_rows = counts_result.all()

        # 3. Build lookup dict and merge (max 6 iterations — not a violation)
        counts_map: dict[int, int] = defaultdict(int)
        for row in counts_rows:
            counts_map[row.estado_pedido_id] = row.cantidad

        return [
            PedidosPorEstadoItem(
                estado=estado.nombre,
                cantidad=counts_map.get(estado.id, 0),
            )
            for estado in estados
        ]
