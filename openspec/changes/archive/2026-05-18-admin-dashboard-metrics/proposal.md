## Why

El panel de administración carece de métricas operativas. Los administradores no pueden ver KPIs de negocio (ventas totales, pedidos del día, productos activos, usuarios activos) ni analizar tendencias temporales de ventas sin consultar directamente la base de datos. Este change agrega 4 endpoints de métricas al módulo `admin/` existente para alimentar el dashboard administrativo.

## What Changes

- Nuevos 4 endpoints GET bajo `/api/v1/admin/metricas/`:
  - `GET /resumen` — KPIs generales: total ventas (SUM), pedidos hoy (COUNT), productos activos (COUNT), usuarios activos (COUNT). Rango de fechas opcional.
  - `GET /ventas` — Serie temporal de ventas con `DATE_TRUNC` por granularidad `dia|semana|mes`. Rango de fechas opcional.
  - `GET /top-productos` — Top 10 productos por cantidad total vendida (SUM `DetallePedido.cantidad`). Solo pedidos no cancelados. Rango opcional.
  - `GET /pedidos-por-estado` — COUNT GROUP BY estado para todos los estados posibles (incluso con 0 pedidos).
- Nuevos schemas Pydantic v2 en `backend/admin/schemas.py` para los responses de métricas.
- Nuevo método `get_metricas_*` en `backend/admin/repository.py` con queries SQL agregadas (sin loops Python).
- Nuevos métodos en `backend/admin/service.py` delegando al repository vía UoW.
- Nuevas rutas en `backend/admin/router.py` con `require_role(["ADMIN"])` y header `Cache-Control: max-age=300`.
- Tests en `backend/tests/test_admin_metricas.py` cubriendo datos, rangos de fecha, permisos y granularidades.

## Capabilities

### New Capabilities

- `admin-dashboard-metrics`: Endpoints de métricas agregadas para el panel de administración. Incluye resumen de KPIs, serie temporal de ventas, ranking de productos más vendidos y distribución de pedidos por estado. Todos los endpoints requieren rol ADMIN y responden con `Cache-Control: max-age=300`.

### Modified Capabilities

- `admin-users-management`: Se expanden los endpoints del módulo admin con el nuevo grupo `/metricas/`. No cambian los requisitos de los endpoints existentes de usuarios — solo se añaden nuevas rutas al mismo router.

## Impact

- **Backend**: `backend/admin/schemas.py`, `backend/admin/repository.py`, `backend/admin/service.py`, `backend/admin/router.py`
- **Tests**: `backend/tests/test_admin_metricas.py` (archivo nuevo)
- **Tablas consultadas (solo lectura)**: `pedido`, `detalle_pedido`, `producto`, `usuario`, `estado_pedido`
- **Sin migraciones**: no se modifica el esquema de BD
- **Sin cambios frontend**: solo backend
- **Dependencias**: sin dependencias nuevas — queries con SQLModel/asyncpg existentes
