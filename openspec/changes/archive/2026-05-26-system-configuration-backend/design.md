## Context

Food Store actualmente maneja configuración del sistema mediante variables de entorno (`.env`) y constantes hardcodeadas. Esto implica que cambiar cualquier parámetro — tiempo de expiración de tokens, umbrales de envío gratis, límites de rate limiting, feature flags — requiere modificar código y redeployar.

Se necesita un sistema de configuración clave-valor persistido en BD, accesible vía API REST protegida para ADMIN, que permita cambios sin reiniciar el servidor y mantenga auditoría de quién modificó qué y cuándo.

Este módulo sigue el patrón estándar del proyecto: `Router → Service → UoW → Repository → Model`, con modelo centralizado en `core/models.py`.

## Goals / Non-Goals

**Goals:**
- Proveer `GET /api/v1/admin/configuracion` para listar todas las configuraciones
- Proveer `PUT /api/v1/admin/configuracion/{clave}` para actualizar una configuración
- Auditoría automática: registrar `actualizado_por` (Usuario ID) y `actualizado_en` (timestamp) en cada modificación
- No requerir reinicio del servidor — los cambios son efectivos inmediatamente al leer de BD
- Seed inicial con configuraciones por defecto del sistema
- Seguir el patrón exacto del proyecto (Router → Service → UoW → Repository → Model)
- Migración Alembic `011` para crear la tabla

**Non-Goals:**
- No incluir UI frontend (se hace en el change siguiente `frontend-system-configuration-ui`)
- No implementar cache en memoria (las configuraciones se leen de BD en cada request — el volumen es bajo)
- No implementar versionado de configuraciones (el historial queda en `actualizado_en`)
- No implementar validación de tipos por clave (todo se almacena como string)

## Decisions

### Decision 1: Modelo centralizado en `core/models.py` (no módulo separado)

Seguimos el patrón del proyecto. Todos los modelos SQLModel están en `core/models.py`. La clase `Configuracion` se agrega ahí. El módulo `backend/configuracion/` contiene solo schemas, repository, service, router.

### Decision 2: Todo como string con validación en schemas

A diferencia de un sistema de configuración con tipos fuertes (boolean, number, etc.), almacenamos todo como `VARCHAR`. La validación semántica (e.g., "esto debe ser un número entero") se delega al frontend o al service. Esto mantiene el backend simple y flexible.

**Alternativa considerada**: columna `tipo` (string, number, boolean, json) con validación automática.
**Razón**: Complejidad innecesaria para este proyecto. Si se necesita en el futuro, es backward-compatible agregar la columna.

### Decision 3: Clave como string VARCHAR con UNIQUE

`clave` usa snake_case (e.g., `envio_gratis_umbral`, `token_expiracion_minutos`). UNIQUE constraint evita duplicados. Es legible, auto-documentada, y fácil de referenciar desde el código.

### Decision 4: Auditoría vía FK a Usuario + timestamp

Cada fila tiene `actualizado_por` (FK a `usuarios.id`) y `actualizado_en` (datetime). El service setea estos valores automáticamente al hacer PUT, usando el usuario autenticado del token JWT. No se necesita una tabla de historial separada.

### Decision 5: Protección exclusiva ADMIN

Ambos endpoints (`GET` y `PUT`) requieren `require_role(["ADMIN"])`. Las configuraciones del sistema son sensibles y solo el administrador principal debe poder verlas y modificarlas.

## Risks / Trade-offs

- **Sin cache**: Cada request lee de BD → latencia adicional comparado con variables de entorno en memoria. **Mitigación**: el volumen de requests a `/admin/configuracion` es bajo (solo ADMIN, no es endpoint de catálogo). Aceptable.
- **Sin tipos**: El frontend debe saber qué tipo espera cada clave. **Mitigación**: la `descripcion` documenta el formato esperado. El frontend puede parsear según convención.
- **Clave UNIQUE sensible a cambios**: Renombrar una clave requiere migración. **Mitigación**: las claves se definen en el seed inicial y no deberían cambiar. Para agregar nuevas, se agregan al seed.
