"""
AdminUsuarioService + AdminMetricasService — admin-only business logic.

AdminUsuarioService:
  - List users with pagination, ILIKE search and role filter
  - Update user fields and roles (with last-admin protection and token revocation)
  - Toggle user active/inactive state (with last-admin protection and token revocation)

AdminMetricasService:
  - Dashboard KPI summary (resumen)
  - Sales by period (ventas)
  - Top-selling products (top_productos)
  - Orders by status (pedidos_por_estado)

Architecture note:
  Service layer owns all business rules. No session.commit() here — the caller
  wraps calls inside ``async with uow:`` which auto-commits on exit.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import selectinload

from core.models import RefreshToken, Rol, Usuario, UsuarioRol
from infrastructure.uow import UnitOfWork


class AdminUsuarioService:
    """
    Admin service for user management operations.

    All methods receive an open UnitOfWork; the caller is responsible for the
    ``async with uow:`` wrapper to ensure atomicity.
    """

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def _revoke_all_tokens(uow: UnitOfWork, usuario_id: int) -> None:
        """
        Bulk-revoke all active refresh tokens for a user.

        Executes a single UPDATE to avoid N+1 queries:
          UPDATE refresh_tokens
          SET revoked_at = NOW()
          WHERE usuario_id = :id AND revoked_at IS NULL
        """
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.usuario_id == usuario_id)
            .where(RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.utcnow())
            .execution_options(synchronize_session=False)
        )
        await uow.session.execute(stmt)

    @staticmethod
    async def _check_last_admin(uow: UnitOfWork, usuario_id: int) -> None:
        """
        Raise HTTP 409 if this user is the last active ADMIN.

        Uses SELECT ... FOR UPDATE on UsuarioRol rows to prevent race conditions
        when two concurrent requests both try to demote the last admin.

        Args:
            uow: Active Unit of Work.
            usuario_id: The user whose admin status we are about to change.

        Raises:
            HTTPException 409 (RFC 7807) — user is the sole remaining ADMIN.
        """
        # Resolve ADMIN role id
        admin_rol_stmt = select(Rol).where(Rol.nombre == "ADMIN")
        admin_rol_result = await uow.session.execute(admin_rol_stmt)
        admin_rol = admin_rol_result.scalar_one_or_none()

        if admin_rol is None:
            # No ADMIN role in DB at all — nothing to protect
            return

        # Lock and fetch ACTIVE, non-deleted admin rows (FOR UPDATE prevents race conditions)
        # NOTE: PostgreSQL does not allow FOR UPDATE with aggregate functions,
        # so we fetch the rows and count in Python.
        lock_stmt = (
            select(UsuarioRol.usuario_id)
            .join(Usuario, Usuario.id == UsuarioRol.usuario_id)
            .where(UsuarioRol.rol_id == admin_rol.id)
            .where(Usuario.activo.is_(True))
            .where(Usuario.eliminado_en.is_(None))
            .with_for_update()
        )
        lock_result = await uow.session.execute(lock_stmt)
        admin_count = len(lock_result.scalars().all())

        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "type": "https://tools.ietf.org/html/rfc7807",
                    "title": "Last Admin Protection",
                    "status": 409,
                    "detail": (
                        "Cannot remove the last ADMIN. " "Assign ADMIN to another user first."
                    ),
                    "instance": f"/api/v1/admin/usuarios/{usuario_id}",
                },
            )

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    @staticmethod
    async def list_usuarios(
        uow: UnitOfWork,
        limit: int = 20,
        offset: int = 0,
        q: str | None = None,
        rol: str | None = None,
    ) -> tuple[list[Usuario], int]:
        """
        Return a paginated list of non-deleted users with optional filters.

        Filters:
          - q: case-insensitive substring match on email OR nombre
          - rol: exact role name match (via JOIN on usuario_rol / roles)

        Returns:
            Tuple of (items, total) where total is the count BEFORE pagination.
        """
        base_stmt = (
            select(Usuario)
            .where(Usuario.eliminado_en.is_(None))
            .options(selectinload(Usuario.roles))
        )
        count_stmt = select(func.count(Usuario.id)).where(Usuario.eliminado_en.is_(None))

        if q:
            ilike_q = f"%{q}%"
            from sqlalchemy import or_

            base_stmt = base_stmt.where(
                or_(
                    Usuario.email.ilike(ilike_q),
                    Usuario.nombre.ilike(ilike_q),
                )
            )
            count_stmt = count_stmt.where(
                or_(
                    Usuario.email.ilike(ilike_q),
                    Usuario.nombre.ilike(ilike_q),
                )
            )

        if rol:
            # JOIN on usuario_rol → roles to filter by role name
            base_stmt = (
                base_stmt.join(UsuarioRol, UsuarioRol.usuario_id == Usuario.id)
                .join(Rol, Rol.id == UsuarioRol.rol_id)
                .where(Rol.nombre == rol)
            )

            count_stmt = (
                count_stmt.join(UsuarioRol, UsuarioRol.usuario_id == Usuario.id)
                .join(Rol, Rol.id == UsuarioRol.rol_id)
                .where(Rol.nombre == rol)
            )

        # Execute total count (before pagination)
        count_result = await uow.session.execute(count_stmt)
        total = count_result.scalar() or 0

        # Execute paginated query
        paginated_stmt = base_stmt.offset(offset).limit(limit)
        result = await uow.session.execute(paginated_stmt)
        items = list(result.scalars().unique().all())

        return items, total

    @staticmethod
    async def update_usuario(
        uow: UnitOfWork,
        usuario_id: int,
        data: "AdminUpdateUsuarioRequest",  # type: ignore[name-defined]  # noqa: F821
    ) -> Usuario:
        """
        Update a user's fields and/or roles.

        Steps:
          a) Verify the user exists.
          b) Detect whether roles are changing.
          c) If removing ADMIN role: check last-admin protection.
          d) Update scalar fields (nombre, apellido, email).
          e) If roles changed: replace UsuarioRol pivots + revoke all tokens.
          f) Return updated user with roles eagerly loaded.

        Raises:
            HTTPException 404 — user not found.
            HTTPException 409 — last admin protection or duplicate email.
        """
        # (a) Verify user exists
        stmt = (
            select(Usuario)
            .where(Usuario.id == usuario_id)
            .where(Usuario.eliminado_en.is_(None))
            .options(selectinload(Usuario.roles))
        )
        result = await uow.session.execute(stmt)
        usuario = result.scalar_one_or_none()

        if usuario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "type": "https://tools.ietf.org/html/rfc7807",
                    "title": "User Not Found",
                    "status": 404,
                    "detail": f"User with id={usuario_id} does not exist or has been deleted.",
                    "instance": f"/api/v1/admin/usuarios/{usuario_id}",
                },
            )

        # (b) Detect role changes
        current_role_names = {rol.nombre for rol in usuario.roles}
        requested_roles = set(data.roles) if data.roles is not None else None
        roles_are_changing = requested_roles is not None and requested_roles != current_role_names

        # (c) Last-admin protection: if removing ADMIN from current roles
        if (
            roles_are_changing
            and "ADMIN" in current_role_names
            and (requested_roles is None or "ADMIN" not in requested_roles)
        ):
            await AdminUsuarioService._check_last_admin(uow, usuario_id)

        # (d) Update scalar fields
        if data.nombre is not None:
            usuario.nombre = data.nombre
        if data.apellido is not None:
            usuario.apellido = data.apellido
        if data.email is not None:
            usuario.email = str(data.email)
        if data.telefono is not None:
            usuario.telefono = data.telefono
        usuario.actualizado_en = datetime.utcnow()

        uow.session.add(usuario)
        await uow.session.flush()

        # (e) Replace roles if changed
        if roles_are_changing and requested_roles is not None:
            # Delete existing UsuarioRol pivots
            del_stmt = delete(UsuarioRol).where(UsuarioRol.usuario_id == usuario_id)
            await uow.session.execute(del_stmt)
            await uow.session.flush()

            # Look up each requested role by name and insert new pivots
            for rol_nombre in requested_roles:
                rol_stmt = select(Rol).where(Rol.nombre == rol_nombre)
                rol_result = await uow.session.execute(rol_stmt)
                rol = rol_result.scalar_one_or_none()
                if rol is None:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail={
                            "type": "https://tools.ietf.org/html/rfc7807",
                            "title": "Invalid Role",
                            "status": 422,
                            "detail": f"Role '{rol_nombre}' does not exist in the database.",
                            "instance": f"/api/v1/admin/usuarios/{usuario_id}",
                        },
                    )
                new_pivot = UsuarioRol(usuario_id=usuario_id, rol_id=rol.id)
                uow.session.add(new_pivot)

            await uow.session.flush()

            # Revoke all tokens for this user
            await AdminUsuarioService._revoke_all_tokens(uow, usuario_id)

        # Reload with roles to return correct state
        reload_stmt = (
            select(Usuario).where(Usuario.id == usuario_id).options(selectinload(Usuario.roles))
        )
        reload_result = await uow.session.execute(reload_stmt)
        return reload_result.scalar_one()

    @staticmethod
    async def toggle_estado(
        uow: UnitOfWork,
        usuario_id: int,
        activo: bool,
    ) -> Usuario:
        """
        Toggle a user's active/inactive state.

        Steps:
          a) Verify user exists.
          b) If deactivating (activo=False): check last-admin protection.
          c) Update usuario.activo.
          d) If deactivating: revoke all active refresh tokens.
          e) Return updated user.

        Raises:
            HTTPException 404 — user not found.
            HTTPException 409 — last admin protection.
        """
        # (a) Verify user exists
        stmt = (
            select(Usuario)
            .where(Usuario.id == usuario_id)
            .where(Usuario.eliminado_en.is_(None))
            .options(selectinload(Usuario.roles))
        )
        result = await uow.session.execute(stmt)
        usuario = result.scalar_one_or_none()

        if usuario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "type": "https://tools.ietf.org/html/rfc7807",
                    "title": "User Not Found",
                    "status": 404,
                    "detail": f"User with id={usuario_id} does not exist or has been deleted.",
                    "instance": f"/api/v1/admin/usuarios/{usuario_id}",
                },
            )

        # (b) Last-admin protection when deactivating
        if not activo:
            user_role_names = {rol.nombre for rol in usuario.roles}
            if "ADMIN" in user_role_names:
                await AdminUsuarioService._check_last_admin(uow, usuario_id)

        # (c) Update status
        usuario.activo = activo
        usuario.actualizado_en = datetime.utcnow()
        uow.session.add(usuario)
        await uow.session.flush()

        # (d) Revoke tokens when deactivating
        if not activo:
            await AdminUsuarioService._revoke_all_tokens(uow, usuario_id)

        # (e) Reload and return
        reload_stmt = (
            select(Usuario).where(Usuario.id == usuario_id).options(selectinload(Usuario.roles))
        )
        reload_result = await uow.session.execute(reload_stmt)
        return reload_result.scalar_one()


class AdminMetricasService:
    """
    Admin service for dashboard metrics.

    All methods receive an open UnitOfWork and delegate directly to
    AdminMetricasRepository via uow.session. The caller is responsible for
    wrapping calls inside ``async with uow:``.

    No business logic here beyond delegation — all aggregation is in the repo.
    """

    @staticmethod
    async def get_resumen(
        uow: UnitOfWork,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> "MetricasResumenResponse":  # noqa: F821
        """Return KPI summary (total_ventas, pedidos_hoy, productos_activos, usuarios_activos)."""
        from admin.repository import AdminMetricasRepository
        from admin.schemas import MetricasResumenResponse  # noqa: F401

        return await AdminMetricasRepository.get_resumen(uow.session, desde=desde, hasta=hasta)

    @staticmethod
    async def get_ventas(
        uow: UnitOfWork,
        granularidad: str,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> "List[VentasPorPeriodoItem]":  # noqa: F821
        """Return sales aggregated by time bucket."""
        from admin.repository import AdminMetricasRepository

        return await AdminMetricasRepository.get_ventas_por_periodo(
            uow.session, granularidad=granularidad, desde=desde, hasta=hasta
        )

    @staticmethod
    async def get_top_productos(
        uow: UnitOfWork,
        desde: Optional[date] = None,
        hasta: Optional[date] = None,
    ) -> "List[TopProductoItem]":  # noqa: F821
        """Return top-10 products by units sold (excluding CANCELADO orders)."""
        from admin.repository import AdminMetricasRepository

        return await AdminMetricasRepository.get_top_productos(
            uow.session, desde=desde, hasta=hasta
        )

    @staticmethod
    async def get_pedidos_por_estado(
        uow: UnitOfWork,
    ) -> "List[PedidosPorEstadoItem]":  # noqa: F821
        """Return order counts per status — always returns all 6 states."""
        from admin.repository import AdminMetricasRepository

        return await AdminMetricasRepository.get_pedidos_por_estado(uow.session)
