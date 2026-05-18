"""
Admin users router — endpoints for managing users from the admin panel.

Endpoints:
  GET  /admin/usuarios          — Paginated list with optional search and role filter
  PUT  /admin/usuarios/{id}     — Update user fields and/or roles
  PATCH /admin/usuarios/{id}/estado — Toggle user active/inactive state

All endpoints require ADMIN role.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError

from admin.schemas import (
    AdminListUsuariosResponse,
    AdminToggleEstadoRequest,
    AdminUpdateUsuarioRequest,
    AdminUsuarioResponse,
)
from admin.service import AdminUsuarioService
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
