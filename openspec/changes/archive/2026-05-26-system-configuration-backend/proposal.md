## Why

Food Store necesita un sistema de configuración clave-valor en backend que permita ajustar parámetros del sistema (tiempos de expiración, umbrales, features flags) sin reiniciar el servidor ni modificar código. Actualmente todas las configuraciones están hardcodeadas en `.env` o en constantes del código, lo que requiere redeploy para cualquier cambio.

## What Changes

- **Nuevo modelo** `Configuracion` en SQLModel con: `clave` (UNIQUE), `valor`, `descripcion`, `actualizado_por` (FK Usuario), `actualizado_en`
- **Seed inicial** con configuraciones por defecto del sistema
- **`GET /api/v1/admin/configuracion`** — listar todas las configuraciones (solo ADMIN)
- **`PUT /api/v1/admin/configuracion/{clave}`** — actualizar el valor de una configuración (solo ADMIN)
- **Auditoría** automática: quién modificó y cuándo, sin migración adicional
- No requiere reinicio del servidor — los cambios surten efecto inmediato al leer de BD
- Migración Alembic `011` para crear la tabla

## Capabilities

### New Capabilities

- `system-configuration`: Gestión de configuración clave-valor del sistema con persistencia en BD, API REST protegida por RBAC, y auditoría de cambios.

### Modified Capabilities

- *(ninguna — no cambian requirements de specs existentes)*

## Impact

- **Backend**: Nuevo módulo `backend/configuracion/` con `model.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`
- **BD**: Nueva tabla `configuracion` + migración Alembic `011`
- **Seed**: Configuraciones por defecto agregadas al seed existente
- **Dependencias**: `route-protection-rbac` (protección ADMIN), `backend-patterns-base-repository-uow` (BaseRepository + UoW)
- **No breaking changes**: cero impacto en APIs existentes
