"""
Configuration service — business logic layer for configuracion module.

Architecture: Router → Service → UoW → Repository → Model
- This module is the ONLY layer that raises HTTPException.
- Never calls session.commit() directly (handled by UoW).
- Validates business rules: existence checks, audit trail.
"""

from fastapi import HTTPException, status

from configuracion.schemas import ConfigUpdateRequest, ConfiguracionResponse
from core.models import Configuracion, Usuario
from core.time import utc_now
from infrastructure.uow import UnitOfWork


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_by_clave_or_404(uow: UnitOfWork, clave: str) -> Configuracion:
    """
    Return Configuracion by clave or raise HTTPException 404.

    Args:
        uow: Unit of Work providing repository access.
        clave: Configuration key to look up.

    Returns:
        Configuracion if found.

    Raises:
        HTTPException 404 if not found.
    """
    # Use BaseRepository's filter capability via get_by_id (we'll use a workaround)
    # Actually, BaseRepository doesn't have filter by field. We'll query directly.
    from sqlalchemy import select

    stmt = select(Configuracion).where(Configuracion.clave == clave)
    result = await uow.session.execute(stmt)
    config = result.scalars().first()

    if config is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "type": "about:blank",
                "title": "Not Found",
                "status": 404,
                "detail": f"Configuracion '{clave}' not found",
            },
        )
    return config


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


async def list_configuraciones(
    uow: UnitOfWork,
    skip: int = 0,
    limit: int = 100,
) -> list[Configuracion]:
    """
    Return a flat paginated list of all configurations.

    Args:
        uow: Unit of Work.
        skip: Pagination offset.
        limit: Maximum records to return (capped at 1000 by BaseRepository).

    Returns:
        List of Configuracion instances.
    """
    return await uow.configuracion.list_all(skip=skip, limit=limit)


async def update_configuracion(
    uow: UnitOfWork,
    clave: str,
    data: ConfigUpdateRequest,
    current_user: Usuario,
) -> Configuracion:
    """
    Update a configuration value with audit trail.

    Sets actualizado_por to current_user.id and actualizado_en to current timestamp.

    Args:
        uow: Unit of Work.
        clave: Configuration key to update.
        data: ConfigUpdateRequest payload with new valor.
        current_user: Authenticated user (from JWT token).

    Returns:
        Updated Configuracion instance.

    Raises:
        HTTPException 404 if clave does not exist.
    """
    config = await _get_by_clave_or_404(uow, clave)

    config.valor = data.valor
    config.actualizado_por = current_user.id
    config.actualizado_en = utc_now()

    await uow.configuracion.update(config)
    return config
