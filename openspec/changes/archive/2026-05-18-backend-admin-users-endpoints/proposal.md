## Why

El panel de administración necesita endpoints dedicados para gestionar usuarios: listar con búsqueda/filtro/paginación, editar datos y roles, y activar/desactivar cuentas. Sin estos endpoints, el admin no puede administrar usuarios desde el dashboard. El EPIC 12 (Panel de Administración) requiere esta capacidad como base para el módulo de administración de usuarios.

## What Changes

- Nuevo endpoint `GET /api/v1/admin/usuarios` — lista paginada con búsqueda case-insensitive por email/nombre y filtro por rol
- Nuevo endpoint `PUT /api/v1/admin/usuarios/:id` — edita nombre, email y roles del usuario; al cambiar rol revoca todos sus refresh tokens
- Nuevo endpoint `PATCH /api/v1/admin/usuarios/:id/estado` — toggle campo `activo`; al desactivar revoca todos sus refresh tokens
- Todos los endpoints requieren rol ADMIN (`require_role(["ADMIN"])`)
- Respuestas de error en formato RFC 7807
- Tests en `backend/tests/` cubriendo: 401/403, paginación, búsqueda, filtro rol, cambio rol revoca tokens, desactivar revoca tokens, protección del último ADMIN

## Capabilities

### New Capabilities

- `admin-users-management`: Endpoints REST para administración de usuarios desde el panel admin — listar, editar y cambiar estado con invalidación automática de tokens

### Modified Capabilities

- `rbac-role-assignment`: Se extiende para soportar reasignación de roles desde admin con revocación automática de refresh tokens al cambiar roles

## Impact

- **Backend**: carpeta `backend/admin/` — agregar nuevos endpoints o extender router existente
- **Módulos relacionados**: `backend/usuarios/` (modelo + repo), `backend/refresh_tokens/` (repo para revocación masiva), `backend/core/uow.py` (UoW), `backend/core/dependencies.py` (`require_role`)
- **Base de datos**: sin cambios de schema — usa tablas existentes `usuario`, `usuariorol`, `refreshtoken`
- **Tests**: nuevos archivos en `backend/tests/` con pytest + pytest-asyncio
- **Seguridad**: todos los endpoints protegidos por ADMIN; no permitir desactivar al último ADMIN
