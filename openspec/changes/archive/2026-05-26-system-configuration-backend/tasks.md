## 0. Skills

- [x] 0.1 Leer `.agents/skills/python-fastapi-ddd-skill/SKILL.md` — patrones DDD, estructura módulo (model → repository → service → router), manejo de excepciones
- [x] 0.2 Leer `.agents/skills/supabase-postgres-best-practices/SKILL.md` — convenciones PostgreSQL, índices, migraciones Alembic

## 1. Modelo y Migración

- [x] 1.1 Agregar clase `Configuracion` en `core/models.py` con campos: `id`, `clave` (UNIQUE), `valor`, `descripcion`, `actualizado_por` (FK usuarios.id), `actualizado_en`, `creado_en`
- [x] 1.2 Crear migración Alembic `011` con tabla `configuracion`
- [x] 1.3 Ejecutar migración y verificar

## 2. Módulo configuracion/

- [x] 2.1 Crear `backend/configuracion/__init__.py`
- [x] 2.2 Crear `backend/configuracion/schemas.py` — `ConfiguracionCreate` (valor), `ConfiguracionResponse` (todos los campos), `ConfiguracionUpdate` (valor)
- [x] 2.3 Crear `backend/configuracion/repository.py` — `ConfiguracionRepository` heredando `BaseRepository[Configuracion]`
- [x] 2.4 Crear `backend/configuracion/service.py` — `_get_by_clave_or_404()`, `list_configuraciones()`, `update_configuracion()` con auditoría
- [x] 2.5 Crear `backend/configuracion/router.py` — `GET /api/v1/admin/configuracion` + `PUT /api/v1/admin/configuracion/{clave}` con `require_role(["ADMIN"])`
- [x] 2.6 Agregar `configuracion` repository property al `UnitOfWork` en `infrastructure/uow.py`
- [x] 2.7 Registrar router en `main.py` con prefijo `/api/v1/admin`

## 3. Seed

- [x] 3.1 Agregar configuraciones por defecto al seed (`backend/scripts/seed.py`): `envio_gratis_umbral`, `token_expiracion_minutos`, `refresh_token_expiracion_dias`, `pedidos_rate_limit_por_hora`, `productos_por_pagina`
- [x] 3.2 Verificar idempotencia del seed

## 4. Tests

- [x] 4.1 Crear `backend/tests/test_configuracion.py` con tests para `GET /api/v1/admin/configuracion` (admin success, non-admin 403, unauthenticated 401)
- [x] 4.2 Agregar tests para `PUT /api/v1/admin/configuracion/{clave}` (success, 404, 422)
- [x] 4.3 Verificar auditoría: `actualizado_por` y `actualizado_en` se setean correctamente

## 5. Validación Final

- [x] 5.1 Ejecutar `pytest` y verificar que no hay regresiones
- [x] 5.2 `git status` y verificar archivos involucrados
