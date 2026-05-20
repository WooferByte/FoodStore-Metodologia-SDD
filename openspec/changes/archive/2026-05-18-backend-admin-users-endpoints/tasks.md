## 0. Skills

- [x] 0.1 Leer `.agents/skills/python-fastapi-ddd-skill/SKILL.md` — arquitectura DDD FastAPI, capas Router→Service→UoW→Repository→Model
- [x] 0.2 Leer `.agents/skills/supabase-postgres-best-practices/SKILL.md` — queries PostgreSQL, ILIKE, JOIN, UPDATE bulk
- [x] 0.3 Leer `.agents/skills/api-design/SKILL.md` — diseño de endpoints REST, paginación offset, status codes
- [x] 0.4 Leer `.agents/skills/rest-api-design-patterns/SKILL.md` — patrones REST, filtros, sorting
- [x] 0.5 Leer `.agents/skills/jwt-security/SKILL.md` — seguridad JWT, revocación de tokens, refresh token lifecycle
- [x] 0.6 Leer `.agents/skills/post-change-verification/SKILL.md` — health check post-change antes de archivar

## 1. Schemas (`backend/admin/schemas.py`)

- [x] 1.1 Crear `AdminUsuarioResponse` — extiende datos de usuario con campo `roles: list[str]` (nombres de rol), `model_config = {"from_attributes": True}`
- [x] 1.2 Crear `AdminListUsuariosResponse` — campos `items: list[AdminUsuarioResponse]`, `total: int`, `limit: int`, `offset: int`
- [x] 1.3 Crear `AdminUpdateUsuarioRequest` — campos opcionales `nombre`, `email` (EmailStr), `apellido`, `roles: list[str]` con validación que la lista no esté vacía si se provee
- [x] 1.4 Crear `AdminToggleEstadoRequest` — campo `activo: bool` (requerido)

## 2. Service (`backend/admin/service.py`)

- [x] 2.1 Implementar `AdminUsuarioService.list_usuarios(uow, limit, offset, q, rol)` — query con `WHERE eliminado_en IS NULL`, `ILIKE` en email/nombre, JOIN con `usuario_rol`/`roles` para filtro por rol, retorna `(items, total)`
- [x] 2.2 Implementar helper privado `_revoke_all_tokens(uow, usuario_id)` — ejecuta `UPDATE refresh_tokens SET revoked_at = NOW() WHERE usuario_id = :id AND revoked_at IS NULL` usando SQLAlchemy `update()` stmt
- [x] 2.3 Implementar helper privado `_check_last_admin(uow, usuario_id)` — cuenta cuántos usuarios activos tienen rol ADMIN usando `SELECT ... FOR UPDATE`; lanza HTTP 409 RFC 7807 si el usuario es el único ADMIN
- [x] 2.4 Implementar `AdminUsuarioService.update_usuario(uow, usuario_id, data)` — (a) verifica usuario existe, (b) detecta si cambian roles, (c) aplica "último admin" si se quita ADMIN, (d) actualiza campos en `usuarios`, (e) si cambia roles: borra `usuario_rol` del user + inserta nuevos + llama `_revoke_all_tokens`, (f) retorna usuario con roles cargados
- [x] 2.5 Implementar `AdminUsuarioService.toggle_estado(uow, usuario_id, activo)` — (a) verifica usuario existe, (b) si `activo=False` llama `_check_last_admin`, (c) actualiza `usuario.activo`, (d) si `activo=False` llama `_revoke_all_tokens`, (e) retorna usuario actualizado
- [x] 2.6 Capturar `sqlalchemy.exc.IntegrityError` en `update_usuario` al cambiar email duplicado → relanzar como HTTP 409 RFC 7807

## 3. Router (`backend/admin/router.py`)

- [x] 3.1 Crear `router = APIRouter(prefix="/admin/usuarios", tags=["admin-usuarios"])`
- [x] 3.2 Implementar `GET /` con `response_model=AdminListUsuariosResponse`, `Depends(require_role(["ADMIN"]))`, query params: `limit: int = Query(20, ge=1, le=100)`, `offset: int = Query(0, ge=0)`, `q: Optional[str] = None`, `rol: Optional[str] = None`
- [x] 3.3 Implementar `PUT /{usuario_id}` con `response_model=AdminUsuarioResponse`, `Depends(require_role(["ADMIN"]))`, body `AdminUpdateUsuarioRequest`
- [x] 3.4 Implementar `PATCH /{usuario_id}/estado` con `response_model=AdminUsuarioResponse`, `Depends(require_role(["ADMIN"]))`, body `AdminToggleEstadoRequest`
- [x] 3.5 Verificar que todos los endpoints tienen `response_model` explícito (convención del proyecto)

## 4. Registro en `main.py`

- [x] 4.1 Importar el router de `admin.router` en `backend/main.py`
- [x] 4.2 Registrar con `app.include_router(admin_router, prefix="/api/v1")` — los endpoints quedan en `/api/v1/admin/usuarios`

## 5. Tests (`backend/tests/test_admin_usuarios.py`)

- [x] 5.1 Test `test_list_usuarios_requires_admin` — sin token → 401; con token CLIENT → 403
- [x] 5.2 Test `test_list_usuarios_pagination` — con admin token, verificar que `total`, `limit`, `offset` son correctos para datos de seed
- [x] 5.3 Test `test_list_usuarios_search_email` — buscar por email parcial case-insensitive, verificar resultados
- [x] 5.4 Test `test_list_usuarios_search_nombre` — buscar por nombre parcial case-insensitive, verificar resultados
- [x] 5.5 Test `test_list_usuarios_filter_rol` — filtrar por rol "STOCK", verificar solo usuarios con ese rol
- [x] 5.6 Test `test_update_usuario_requires_admin` — sin token → 401; con CLIENT token → 403
- [x] 5.7 Test `test_update_usuario_changes_nombre` — cambiar nombre, verificar 200 y nombre actualizado en response
- [x] 5.8 Test `test_update_usuario_changes_rol_revokes_tokens` — cambiar rol de usuario que tiene refresh tokens activos → verificar que `revoked_at` no es None en todos sus tokens después
- [x] 5.9 Test `test_update_usuario_same_rol_does_not_revoke_tokens` — actualizar nombre sin cambiar rol → tokens siguen activos
- [x] 5.10 Test `test_update_usuario_duplicate_email_returns_409` — intentar cambiar email a uno ya existente → 409 RFC 7807
- [x] 5.11 Test `test_update_usuario_last_admin_protection` — cambiar rol del único ADMIN → 409 RFC 7807
- [x] 5.12 Test `test_toggle_estado_requires_admin` — sin token → 401; con CLIENT → 403
- [x] 5.13 Test `test_toggle_estado_deactivate` — desactivar usuario activo → 200, `activo=false`
- [x] 5.14 Test `test_toggle_estado_deactivate_revokes_tokens` — desactivar usuario con tokens activos → tokens revocados
- [x] 5.15 Test `test_toggle_estado_reactivate_no_token_revocation` — reactivar usuario → tokens no se revocan automáticamente
- [x] 5.16 Test `test_toggle_estado_last_admin_protection` — desactivar al único ADMIN → 409 RFC 7807
- [x] 5.17 Test `test_update_usuario_not_found` — id inexistente → 404 RFC 7807
- [x] 5.18 Test `test_toggle_estado_not_found` — id inexistente → 404 RFC 7807

## 6. Verificación post-change

- [x] 6.1 Correr `cd backend && .venv/Scripts/pytest --cov=. --cov-report=term-missing -x -q` — todos los tests deben pasar, coverage ≥ 60%
- [x] 6.2 Correr `cd backend && .venv/Scripts/black --check . && .venv/Scripts/flake8 .` — sin errores de lint
- [ ] 6.3 Verificar `cd backend && .venv/Scripts/alembic upgrade head` — "already up to date" (no hay cambios de schema)
- [ ] 6.4 Levantar uvicorn y verificar endpoints en Swagger (`http://localhost:8000/docs`): `/api/v1/admin/usuarios` aparece con los 3 métodos
