"""
Admin routers — user management and metrics endpoints.

Users router (prefix /admin/usuarios):
  GET  /admin/usuarios          — Paginated list with optional search and role filter
  PUT  /admin/usuarios/{id}     — Update user fields and/or roles
  PATCH /admin/usuarios/{id}/estado — Toggle user active/inactive state

Metrics router (prefix /admin/metricas):
  GET  /admin/metricas/         — KPI summary (total_ventas, pedidos_hoy, ...)
  GET  /admin/metricas/ventas   — Sales by period (dia/semana/mes)
  GET  /admin/metricas/top-productos — Top 10 products by units sold
  GET  /admin/metricas/pedidos-por-estado — Orders grouped by all 6 states

All endpoints require ADMIN role.
Cache-Control: max-age=300, private is set on all metrics endpoints.
"""
from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError

from admin.schemas import (
    AdminListUsuariosResponse,
    AdminToggleEstadoRequest,
    AdminUpdateUsuarioRequest,
    AdminUsuarioResponse,
    MetricasResumenResponse,
    PedidosPorEstadoResponse,
    TopProductosResponse,
    VentasResponse,
)
from admin.service import AdminMetricasService, AdminUsuarioService
from core.models import Usuario
from infrastructure.dependencies import require_role
from infrastructure.uow import UnitOfWork, get_uow

router = APIRouter(prefix="/admin/usuarios", tags=["admin-usuarios"])


def _usuario_to_response(usuario: Usuario) -> AdminUsuarioResponse:
    """Convert a Usuario ORM object to AdminUsuarioResponse."""
    return AdminUsuarioResponse(
        id=usuario.id,
        email=usuario.email,
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        activo=usuario.activo,
        telefono=usuario.telefono,
        creado_en=usuario.creado_en,
        roles=[rol.nombre for rol in usuario.roles],
    )


@router.get(
    "/",
    response_model=AdminListUsuariosResponse,
    summary="List users (admin)",
    description="Paginated list of users with optional ILIKE search and role filter.",
)
async def list_usuarios(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    q: Optional[str] = Query(None, description="Search in email and nombre (case-insensitive)"),
    rol: Optional[str] = Query(None, description="Filter by exact role name (e.g. STOCK)"),
    _: Usuario = Depends(require_role(["ADMIN"])),
    uow: UnitOfWork = Depends(get_uow),
) -> AdminListUsuariosResponse:
    """GET /admin/usuarios — return paginated user list."""
    async with uow:
        items, total = await AdminUsuarioService.list_usuarios(
            uow, limit=limit, offset=offset, q=q, rol=rol
        )
    return AdminListUsuariosResponse(
        items=[_usuario_to_response(u) for u in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.put(
    "/{usuario_id}",
    response_model=AdminUsuarioResponse,
    summary="Update user (admin)",
    description="Update user fields (nombre, apellido, email) and/or roles. "
    "Changing roles revokes all active refresh tokens for the user.",
)
async def update_usuario(
    usuario_id: int,
    data: AdminUpdateUsuarioRequest,
    _: Usuario = Depends(require_role(["ADMIN"])),
    uow: UnitOfWork = Depends(get_uow),
) -> AdminUsuarioResponse:
    """PUT /admin/usuarios/{usuario_id} — update user data and/or roles."""
    try:
        async with uow:
            usuario = await AdminUsuarioService.update_usuario(uow, usuario_id, data)
            return _usuario_to_response(usuario)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "type": "https://tools.ietf.org/html/rfc7807",
                "title": "Conflict",
                "status": 409,
                "detail": "Email already exists. Please use a different email address.",
                "instance": f"/api/v1/admin/usuarios/{usuario_id}",
            },
        )


@router.patch(
    "/{usuario_id}/estado",
    response_model=AdminUsuarioResponse,
    summary="Toggle user active state (admin)",
    description="Activate or deactivate a user account. "
    "Deactivating revokes all active refresh tokens for the user.",
)
async def toggle_estado(
    usuario_id: int,
    data: AdminToggleEstadoRequest,
    _: Usuario = Depends(require_role(["ADMIN"])),
    uow: UnitOfWork = Depends(get_uow),
) -> AdminUsuarioResponse:
    """PATCH /admin/usuarios/{usuario_id}/estado — toggle user activo state."""
    async with uow:
        usuario = await AdminUsuarioService.toggle_estado(uow, usuario_id, data.activo)
        return _usuario_to_response(usuario)


# ============================================================================
# Metrics router
# ============================================================================

metricas_router = APIRouter(prefix="/admin/metricas", tags=["admin-metricas"])

_CACHE_HEADER = "max-age=300, private"


@metricas_router.get(
    "/",
    response_model=MetricasResumenResponse,
    summary="Admin metrics summary",
    description=(
        "KPI dashboard: total_ventas, pedidos_hoy, productos_activos, usuarios_activos. "
        "Optional date range filter via `desde` / `hasta` (YYYY-MM-DD). "
        "Returns 422 if desde > hasta."
    ),
)
async def get_resumen(
    response: Response,
    desde: Optional[date] = Query(None, description="Start date (inclusive, YYYY-MM-DD)"),
    hasta: Optional[date] = Query(None, description="End date (inclusive, YYYY-MM-DD)"),
    _: Usuario = Depends(require_role(["ADMIN"])),
    uow: UnitOfWork = Depends(get_uow),
) -> MetricasResumenResponse:
    """GET /admin/metricas/ — return KPI summary."""
    if desde is not None and hasta is not None and desde > hasta:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "type": "https://tools.ietf.org/html/rfc7807",
                "title": "Invalid Date Range",
                "status": 422,
                "detail": "`desde` must be less than or equal to `hasta`.",
                "instance": "/api/v1/admin/metricas/",
            },
        )
    response.headers["Cache-Control"] = _CACHE_HEADER
    async with uow:
        return await AdminMetricasService.get_resumen(uow, desde=desde, hasta=hasta)


@metricas_router.get(
    "/ventas",
    response_model=VentasResponse,
    summary="Sales by period",
    description=(
        "Aggregated sales totals grouped by `granularidad` (dia/semana/mes). "
        "Optional date range via `desde` / `hasta`. "
        "Returns 422 if desde > hasta."
    ),
)
async def get_ventas(
    response: Response,
    granularidad: Literal["dia", "semana", "mes"] = Query(
        "dia", description="Time bucket: dia | semana | mes"
    ),
    desde: Optional[date] = Query(None, description="Start date (inclusive, YYYY-MM-DD)"),
    hasta: Optional[date] = Query(None, description="End date (inclusive, YYYY-MM-DD)"),
    _: Usuario = Depends(require_role(["ADMIN"])),
    uow: UnitOfWork = Depends(get_uow),
) -> VentasResponse:
    """GET /admin/metricas/ventas — return sales aggregated by period."""
    if desde is not None and hasta is not None and desde > hasta:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "type": "https://tools.ietf.org/html/rfc7807",
                "title": "Invalid Date Range",
                "status": 422,
                "detail": "`desde` must be less than or equal to `hasta`.",
                "instance": "/api/v1/admin/metricas/ventas",
            },
        )
    response.headers["Cache-Control"] = _CACHE_HEADER
    async with uow:
        items = await AdminMetricasService.get_ventas(
            uow, granularidad=granularidad, desde=desde, hasta=hasta
        )
    return VentasResponse(items=items)


@metricas_router.get(
    "/top-productos",
    response_model=TopProductosResponse,
    summary="Top selling products",
    description=(
        "Returns up to 10 products ranked by total units sold across non-cancelled orders. "
        "Optional date range via `desde` / `hasta`."
    ),
)
async def get_top_productos(
    response: Response,
    desde: Optional[date] = Query(None, description="Start date (inclusive, YYYY-MM-DD)"),
    hasta: Optional[date] = Query(None, description="End date (inclusive, YYYY-MM-DD)"),
    _: Usuario = Depends(require_role(["ADMIN"])),
    uow: UnitOfWork = Depends(get_uow),
) -> TopProductosResponse:
    """GET /admin/metricas/top-productos — return top products by units sold."""
    if desde is not None and hasta is not None and desde > hasta:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "type": "https://tools.ietf.org/html/rfc7807",
                "title": "Invalid Date Range",
                "status": 422,
                "detail": "`desde` must be less than or equal to `hasta`.",
                "instance": "/api/v1/admin/metricas/top-productos",
            },
        )
    response.headers["Cache-Control"] = _CACHE_HEADER
    async with uow:
        items = await AdminMetricasService.get_top_productos(uow, desde=desde, hasta=hasta)
    return TopProductosResponse(items=items)


@metricas_router.get(
    "/pedidos-por-estado",
    response_model=PedidosPorEstadoResponse,
    summary="Orders by status",
    description=(
        "Returns order counts grouped by all 6 statuses. "
        "Statuses with 0 orders are always included."
    ),
)
async def get_pedidos_por_estado(
    response: Response,
    _: Usuario = Depends(require_role(["ADMIN"])),
    uow: UnitOfWork = Depends(get_uow),
) -> PedidosPorEstadoResponse:
    """GET /admin/metricas/pedidos-por-estado — return all order states with counts."""
    response.headers["Cache-Control"] = _CACHE_HEADER
    async with uow:
        items = await AdminMetricasService.get_pedidos_por_estado(uow)
    return PedidosPorEstadoResponse(items=items)
