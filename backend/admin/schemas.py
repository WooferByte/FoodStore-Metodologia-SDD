"""
Pydantic v2 schemas for admin user management and metrics endpoints.

Schemas:
- AdminUsuarioResponse: Public-safe user representation with roles list
- AdminListUsuariosResponse: Paginated list wrapper with total/limit/offset
- AdminUpdateUsuarioRequest: Optional fields for updating user data and roles
- AdminToggleEstadoRequest: Toggle user active/inactive status
- MetricasResumenResponse: KPI summary (total_ventas, pedidos_hoy, productos_activos, usuarios_activos)
- VentasPorPeriodoItem / VentasResponse: Sales aggregated by period
- TopProductoItem / TopProductosResponse: Top-selling products
- PedidosPorEstadoItem / PedidosPorEstadoResponse: Orders grouped by status
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from core.sanitize import sanitize_text


class AdminUsuarioResponse(BaseModel):
    """Public-safe user representation for admin panel — includes roles as name list."""

    id: int
    email: str
    nombre: str
    apellido: Optional[str]
    activo: bool
    telefono: Optional[str]
    creado_en: datetime
    roles: list[str]  # List of role names, e.g. ["ADMIN", "STOCK"]

    model_config = {"from_attributes": True}


class AdminListUsuariosResponse(BaseModel):
    """Paginated response wrapper for the admin users list endpoint."""

    items: list[AdminUsuarioResponse]
    total: int
    limit: int
    offset: int


class AdminUpdateUsuarioRequest(BaseModel):
    """
    Request schema for updating a user's data and/or roles (admin only).

    All fields are optional. If `roles` is provided it must not be empty.
    """

    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    apellido: Optional[str] = Field(default=None, max_length=100)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(default=None, max_length=30)
    roles: Optional[list[str]] = None  # List of role names to assign (replaces current roles)

    @field_validator("nombre", "apellido", mode="before")
    @classmethod
    def sanitize_text_fields(cls, v: object) -> object:
        """Strip HTML tags from free-text name fields."""
        if isinstance(v, str):
            return sanitize_text(v)
        return v

    @field_validator("roles", mode="before")
    @classmethod
    def roles_not_empty(cls, v: object) -> object:
        """Roles list, if provided, must contain at least one element."""
        if v is not None and isinstance(v, list) and len(v) == 0:
            raise ValueError("roles list must not be empty if provided")
        return v


class AdminToggleEstadoRequest(BaseModel):
    """Request schema for toggling user active/inactive state (admin only)."""

    activo: bool


# ---------------------------------------------------------------------------
# Metrics schemas
# ---------------------------------------------------------------------------


class MetricasResumenResponse(BaseModel):
    """
    KPI summary for the admin dashboard.

    Fields:
    - total_ventas: Sum of all non-deleted order totals (filtered by date range if provided)
    - pedidos_hoy: Count of orders created today (UTC)
    - productos_activos: Count of active, non-deleted products
    - usuarios_activos: Count of active, non-deleted users
    """

    total_ventas: Decimal
    pedidos_hoy: int
    productos_activos: int
    usuarios_activos: int

    model_config = {"from_attributes": True}


class VentasPorPeriodoItem(BaseModel):
    """Single time-bucket entry for the sales-over-time endpoint."""

    fecha: datetime
    total_ventas: Decimal
    cantidad_pedidos: int

    model_config = {"from_attributes": True}


class VentasResponse(BaseModel):
    """Response wrapper for the sales-by-period endpoint."""

    items: List[VentasPorPeriodoItem]


class TopProductoItem(BaseModel):
    """Single entry in the top-products ranking."""

    producto_id: int
    nombre: str
    cantidad_total: int

    model_config = {"from_attributes": True}


class TopProductosResponse(BaseModel):
    """Response wrapper for the top-products endpoint."""

    items: List[TopProductoItem]


class PedidosPorEstadoItem(BaseModel):
    """Count of orders for a single status bucket."""

    estado: str
    cantidad: int

    model_config = {"from_attributes": True}


class PedidosPorEstadoResponse(BaseModel):
    """Response wrapper for the orders-by-status endpoint (always 6 items)."""

    items: List[PedidosPorEstadoItem]
