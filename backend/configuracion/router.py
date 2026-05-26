"""
Configuracion router — HTTP endpoints for system configuration management.

Architecture: Router → Service → UoW → Repository → Model

Endpoints:
    GET  /api/v1/admin/configuracion           — list all configs (ADMIN only)
    PUT  /api/v1/admin/configuracion/{clave}   — update config (ADMIN only)
"""

from fastapi import APIRouter, Depends, status

from configuracion.schemas import ConfigUpdateRequest, ConfiguracionResponse
from configuracion import service
from core.dependencies import require_role, get_current_user
from core.models import Usuario
from infrastructure.uow import UnitOfWork, get_uow

router = APIRouter(prefix="/configuracion", tags=["Configuración del Sistema"])


# ---------------------------------------------------------------------------
# GET endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=list[ConfiguracionResponse],
    summary="List all system configurations",
    description="Returns all system configuration entries. ADMIN only.",
)
async def list_configuraciones(
    uow: UnitOfWork = Depends(get_uow),
    _: None = Depends(require_role(["ADMIN"])),
) -> list[ConfiguracionResponse]:
    """List all system configurations (ADMIN only)."""
    async with uow:
        return await service.list_configuraciones(uow)


# ---------------------------------------------------------------------------
# PUT endpoints
# ---------------------------------------------------------------------------


@router.put(
    "/{clave}",
    response_model=ConfiguracionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update configuration value",
    description="Update the value of a system configuration by key. ADMIN only. Sets audit trail fields automatically.",
)
async def update_configuracion(
    clave: str,
    data: ConfigUpdateRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user: Usuario = Depends(get_current_user),
    _: None = Depends(require_role(["ADMIN"])),
) -> ConfiguracionResponse:
    """Update a configuration value with automatic audit trail."""
    async with uow:
        return await service.update_configuracion(uow, clave, data, current_user)
