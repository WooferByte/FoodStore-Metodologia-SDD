# Proposal: fix-timestamps-timezone

## Why

Todos los timestamps del sistema se muestran **+3 horas adelantados** en la UI. Verificado en vivo el 2026-08-25: un pedido creado a las 15:12 (Argentina, UTC-3) se muestra como 18:12 en `es-AR`. La cadena causal es: (1) `datetime.utcnow()` (naive UTC, deprecado en Python 3.12) genera timestamps sin timezone en `backend/core/models.py` y en ~17 escrituras explícitas; (2) las columnas son `TIMESTAMP WITHOUT TIME ZONE`; (3) Pydantic v2 serializa el datetime naive SIN sufijo `Z` → `"2026-08-25T18:12:56"`; (4) JS `new Date("2026-08-25T18:12:56")` la interpreta como LOCAL (no UTC), y `Intl.DateTimeFormat('es-AR')` muestra 18:12 en vez de 15:12. Afecta a TODAS las entidades (~15 tablas) y al seed.

## What Changes

- **Backend = timestamps aware UTC** (Option A, robusto):
  - Nuevo helper `utc_now()` en `backend/core/time.py` que reemplaza TODOS los usos de `datetime.utcnow()` (22 `default_factory` en `core/models.py` + `pagos/model.py`, y las escrituras explícitas en `base_repository.py:138,161`, `pedidos/repository.py:265`, `admin/service.py:57,250,343`, `configuracion/service.py:110`, `pagos/service.py:419`, `direcciones/repository.py:82`, `auth/service.py:100,206,260,289,362`, `usuarios/perfil_service.py:111`, `admin/repository.py:62`, `pedidos/service.py:271`) y el seed (`seed_dev_data.py:49`).
  - Columnas timestamp marcadas `timezone=True` en los modelos SQLModel → `TIMESTAMPTZ` (32 columnas en 15 tablas).
  - Migración Alembic `013`: reinterpretar los valores naive UTC existentes como UTC (`AT TIME ZONE 'UTC'`) → sin corrimiento del instante.
- **Serialización**: con datetimes aware, Pydantic v2 emite RFC 3339 con sufijo `Z` (`"2026-08-25T18:12:56Z"`, verificado empíricamente con pydantic 2.13.4). JS la convierte automáticamente a la zona local del browser.
- **Frontend**: SIN cambios de código — solo verificar que los tests que mockean fechas sigan pasando (los de órdenes ya usan `'...Z'`).

## Capabilities

### New Capabilities
- `timestamp-handling`: Contrato de timestamps del sistema — todos los timestamps se generan como UTC aware, se almacenan en columnas `TIMESTAMP WITH TIME ZONE`, y las respuestas de la API los serializan en RFC 3339 con sufijo `Z` (incluye la reinterpretación de datos históricos naive UTC sin corrimiento del instante).

### Modified Capabilities
- Ninguna: las capacidades existentes (`backend-postgres-alembic-seed`, `orders-api`, etc.) describen comportamiento que sigue siendo verdadero (timestamps UTC, soft delete con `eliminado_en`, migraciones vía Alembic). El cambio de formato en la serialización es un estándar transversal nuevo, no un requisito que cambie en cada capability.

## Impact

- **Backend**: `backend/core/time.py` (nuevo), `backend/core/models.py` (22 `default_factory` + `timezone=True`), `backend/pagos/model.py`, `backend/infrastructure/repositories/base_repository.py`, `backend/pedidos/repository.py`, `backend/pedidos/service.py` (rate-limit), `backend/admin/service.py`, `backend/admin/repository.py` (KPI `pedidos_hoy`), `backend/configuracion/service.py`, `backend/pagos/service.py`, `backend/direcciones/repository.py`, `backend/auth/service.py`, `backend/usuarios/perfil_service.py`, `backend/usuarios/role_service.py` (solo docstring desactualizada), `backend/scripts/seed_dev_data.py`, `backend/alembic/versions/013_timestamps_timezone.py` (nueva migración, down_revision `012`).
- **Backend tests**: `test_auth_login.py`, `test_auth_register.py`, `test_auth_logout.py`, `test_base_repository.py`, `test_infrastructure_integration.py` (comparaciones naive-vs-aware que rompen), + tests nuevos de serialización con `Z`.
- **Frontend**: sin cambios de código. Verificar `npx vitest run` + `npx tsc --noEmit`.
- **API**: respuestas JSON de todos los endpoints que exponen timestamps pasan de `"...T18:12:56"` a `"...T18:12:56Z"` — **BREAKING** menor para clientes que parsean con regex de offset, pero compatible con ISO 8601 y con el frontend actual (usa `new Date`).
