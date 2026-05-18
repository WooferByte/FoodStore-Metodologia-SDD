## Context

El módulo `backend/admin/` existe como carpeta con `.gitkeep` — sin implementación. El módulo `backend/usuarios/` tiene `role_service.py` (asignación de rol único por usuario), `schemas.py` (UsuarioCreate, UsuarioUpdate, UsuarioResponse), `perfil_service.py` y sus routers. El módulo `backend/refresh_tokens/` también está vacío. La lógica de "último admin" y revocación de rol ya existe en `RoleService.assign_role` — este change la extiende para el flujo admin.

El UoW expone `uow.usuarios`, `uow.refresh_tokens`, `uow.roles`, `uow.usuario_roles` (todos `BaseRepository[T]`). La lógica de negocio de revocación de tokens al desactivar/cambiar rol no existe aún.

## Goals / Non-Goals

**Goals:**
- `GET /api/v1/admin/usuarios` con paginación (limit/offset/total), búsqueda case-insensitive por email y nombre, filtro por rol
- `PUT /api/v1/admin/usuarios/:id` que edita nombre/email/roles; si cambia rol revoca todos los refresh tokens del usuario
- `PATCH /api/v1/admin/usuarios/:id/estado` que hace toggle de `activo`; al desactivar revoca todos sus refresh tokens
- Protección del último ADMIN (409 si intento de desactivar o cambiar rol al último ADMIN)
- Errores RFC 7807 en todos los endpoints
- Tests en `backend/tests/` cubriendo los escenarios listados en el change

**Non-Goals:**
- Creación o eliminación hard de usuarios desde el admin
- Búsqueda full-text con indexación especial (basta con ILIKE)
- Paginación cursor-based (offset es suficiente para admin dashboard)
- Frontend — solo la API backend

## Decisions

### D1: Nuevo módulo `backend/admin/` en lugar de extender `backend/usuarios/`

**Decisión**: crear `backend/admin/router.py`, `admin/service.py`, `admin/schemas.py` dentro de la carpeta `backend/admin/` vacía.

**Razón**: los endpoints admin son una vista distinta sobre los datos de usuarios — requieren autorización diferente, schemas de respuesta más ricos (incluyen roles), y lógica de negocio propia (último admin, revocación masiva). Mezclarlos en `backend/usuarios/` viola SRP y el rol de ese módulo (gestión del perfil propio).

**Alternativa descartada**: extender `backend/usuarios/` con flags `is_admin=True` — contamina el módulo con responsabilidades de dos actores distintos.

### D2: `AdminUsuarioService` independiente de `RoleService`

**Decisión**: crear `AdminUsuarioService` nuevo en `backend/admin/service.py`. Reutiliza lógica de "último admin" pero no hereda ni llama a `RoleService`.

**Razón**: `RoleService.assign_role` reemplaza todos los roles del usuario por uno solo. El endpoint `PUT /admin/usuarios/:id` necesita asignar una lista de roles. La semántica es diferente — no es un wrapper limpio.

**Alternativa descartada**: reutilizar `RoleService.assign_role` en loop — múltiples transacciones, riesgo de inconsistencia, lógica de "último admin" se dispara por cada iteración.

### D3: Revocación masiva de refresh tokens vía UPDATE directo en el servicio

**Decisión**: `AdminUsuarioService` ejecuta `UPDATE refresh_tokens SET revoked_at = now() WHERE usuario_id = :id AND revoked_at IS NULL` usando `uow.session.execute(text(...))` o bien `select` + loop en memoria (preferir `update()` de SQLAlchemy para evitar N+1).

**Razón**: no existe `RefreshTokenRepository` con método `revoke_all_by_user`. Agregar el método en `BaseRepository` no es opción (es genérico). La opción más limpia es un UPDATE en bulk dentro del service vía la sesión del UoW, sin romper la capa.

**Alternativa descartada**: loop fetch + delete individual — N+1 queries innecesario para una operación admin infrecuente.

### D4: Schema de respuesta `AdminUsuarioResponse` incluye lista de roles

**Decisión**: nuevo `AdminUsuarioResponse` en `admin/schemas.py` extiende `UsuarioResponse` añadiendo `roles: list[str]` (nombres de rol).

**Razón**: la vista admin necesita ver qué roles tiene el usuario. El `UsuarioResponse` existente no los expone (es para el perfil del usuario final).

### D5: Búsqueda case-insensitive con `ilike` de SQLAlchemy

**Decisión**: usar `Usuario.email.ilike(f"%{q}%")` y `Usuario.nombre.ilike(f"%{q}%")` con `or_()`. No requiere índice GIN ni `pg_trgm` — es un admin dashboard con dataset pequeño-mediano.

**Razón**: `ilike` usa `ILIKE` nativo de PostgreSQL, que es case-insensitive. Suficiente para el caso de uso. Agregar `pg_trgm` es over-engineering para este change.

### D6: Filtro por rol vía JOIN en `usuario_rol`

**Decisión**: cuando se filtra por `rol`, hacer JOIN con `UsuarioRol` + `Rol` filtrando por `Rol.nombre`.

**Razón**: el modelo es N:M — un usuario puede tener múltiples roles en el futuro (aunque hoy el seeder asigna uno). El JOIN es la forma correcta.

## Risks / Trade-offs

- **Race condition en "último admin"**: la protección usa `SELECT ... FOR UPDATE` (heredado de `RoleService`). Aplicar mismo patrón en `AdminUsuarioService` para evitar que dos requests concurrentes desactiven al último admin simultáneamente. → Mitigación: lock row en tabla `usuario_rol` antes de verificar count.

- **Revocación masiva asíncrona**: el UPDATE de tokens puede afectar muchas filas si el usuario tiene sesiones abiertas. Es aceptable para una operación admin. → No hay mitigación necesaria; es el comportamiento esperado.

- **Email duplicado en `PUT`**: si el admin cambia el email a uno ya existente, la BD lanza `IntegrityError`. El servicio debe capturarlo y relanzar como HTTP 409 RFC 7807. → Mitigación: capturar `sqlalchemy.exc.IntegrityError` en el service.

- **Tests con AsyncSession mock vs DB real**: el proyecto usa `pytest-asyncio`. Los tests existentes en `backend/tests/` prueban contra una BD de test. Seguir el mismo patrón para consistencia. → Sin mitigación especial; heredar la fixture de sesión existente.

## Migration Plan

No hay cambios de schema — todas las tablas necesarias existen (`usuarios`, `usuario_rol`, `refresh_tokens`, `roles`). No se requiere migración Alembic.

Pasos de deploy:
1. Agregar archivos nuevos en `backend/admin/`
2. Registrar el router en `main.py` con prefix `/api/v1/admin`
3. Correr `pytest` — sin regresiones esperadas
4. Verificar endpoints con Swagger en `http://localhost:8000/docs`

## Open Questions

- **¿El campo `apellido` también es editable via `PUT /admin/usuarios/:id`?** Por consistencia con el perfil del usuario, se incluye como opcional. Si el producto owner lo excluye, eliminarlo del schema `AdminUpdateUsuarioRequest`.
- **¿El endpoint `GET /admin/usuarios` debe excluir usuarios soft-deleted?** Decisión por defecto: excluir (`WHERE eliminado_en IS NULL`). Si se necesita vista de eliminados, agregar parámetro `incluir_eliminados=false` en un change futuro.
