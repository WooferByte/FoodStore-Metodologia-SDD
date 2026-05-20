## ADDED Requirements

### Requirement: Admin metrics resumen endpoint
The system SHALL expose `GET /api/v1/admin/metricas/resumen` returning KPI aggregates for the admin dashboard. This endpoint SHALL require ADMIN role, respond with `Cache-Control: max-age=300`, and support optional date range filters `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`.

#### Scenario: Successful resumen without date filter
- **WHEN** an ADMIN sends `GET /api/v1/admin/metricas/resumen`
- **THEN** the system returns HTTP 200 with `{ total_ventas, pedidos_hoy, productos_activos, usuarios_activos }` where each field is a non-negative number computed via SQL aggregate functions (SUM/COUNT)

#### Scenario: Successful resumen with date range
- **WHEN** an ADMIN sends `GET /api/v1/admin/metricas/resumen?desde=2025-01-01&hasta=2025-01-31`
- **THEN** the system returns HTTP 200 with totals filtered to pedidos created within the given date range (inclusive)

#### Scenario: Non-ADMIN access denied
- **WHEN** a non-ADMIN user sends `GET /api/v1/admin/metricas/resumen`
- **THEN** the system returns HTTP 403 Forbidden

#### Scenario: Unauthenticated access denied
- **WHEN** an unauthenticated request is sent to `GET /api/v1/admin/metricas/resumen`
- **THEN** the system returns HTTP 401 Unauthorized

#### Scenario: Cache-Control header present
- **WHEN** an ADMIN sends any request to `/api/v1/admin/metricas/resumen`
- **THEN** the response SHALL include header `Cache-Control: max-age=300`

### Requirement: Admin metrics ventas serie temporal
The system SHALL expose `GET /api/v1/admin/metricas/ventas` returning a time series of sales aggregated by `?granularidad=dia|semana|mes`. The endpoint SHALL use `DATE_TRUNC` in PostgreSQL to group records. Results SHALL be ordered ascending by date. An optional date range `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` SHALL be supported. The endpoint SHALL require ADMIN role and respond with `Cache-Control: max-age=300`.

#### Scenario: Ventas por dia
- **WHEN** an ADMIN sends `GET /api/v1/admin/metricas/ventas?granularidad=dia`
- **THEN** the system returns HTTP 200 with an array of `{ fecha, total_ventas, cantidad_pedidos }` objects grouped by day, ordered ascending by fecha

#### Scenario: Ventas por mes with date range
- **WHEN** an ADMIN sends `GET /api/v1/admin/metricas/ventas?granularidad=mes&desde=2025-01-01&hasta=2025-12-31`
- **THEN** the system returns HTTP 200 with monthly aggregates filtered to the given year

#### Scenario: Invalid granularidad returns 422
- **WHEN** an ADMIN sends `GET /api/v1/admin/metricas/ventas?granularidad=hora`
- **THEN** the system returns HTTP 422 with a RFC 7807 error body indicating the invalid parameter value

#### Scenario: Non-ADMIN access denied
- **WHEN** a non-ADMIN user sends `GET /api/v1/admin/metricas/ventas?granularidad=dia`
- **THEN** the system returns HTTP 403 Forbidden

### Requirement: Admin metrics top productos
The system SHALL expose `GET /api/v1/admin/metricas/top-productos` returning the top 10 products by total quantity sold (SUM of `detalle_pedido.cantidad`) across non-cancelled orders. The endpoint SHALL support optional `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` filters and SHALL require ADMIN role with `Cache-Control: max-age=300`.

#### Scenario: Top productos without filter
- **WHEN** an ADMIN sends `GET /api/v1/admin/metricas/top-productos`
- **THEN** the system returns HTTP 200 with an array of at most 10 items, each with `{ producto_id, nombre, cantidad_total }`, ordered descending by `cantidad_total`

#### Scenario: Top productos excludes cancelled orders
- **WHEN** there are pedidos with `estado.nombre = 'CANCELADO'`
- **THEN** the quantities from those pedidos SHALL NOT be counted in `cantidad_total`

#### Scenario: Top productos with date range
- **WHEN** an ADMIN sends `GET /api/v1/admin/metricas/top-productos?desde=2025-06-01&hasta=2025-06-30`
- **THEN** the system returns top products filtered to pedidos created within June 2025

#### Scenario: Non-ADMIN access denied
- **WHEN** a non-ADMIN user sends `GET /api/v1/admin/metricas/top-productos`
- **THEN** the system returns HTTP 403 Forbidden

### Requirement: Admin metrics pedidos por estado
The system SHALL expose `GET /api/v1/admin/metricas/pedidos-por-estado` returning a count of pedidos for each possible `estado_pedido`, including states with zero pedidos. No date range filter is required for this endpoint. The endpoint SHALL require ADMIN role and respond with `Cache-Control: max-age=300`.

#### Scenario: All states included even with zero pedidos
- **WHEN** an ADMIN sends `GET /api/v1/admin/metricas/pedidos-por-estado`
- **THEN** the system returns HTTP 200 with an array containing one entry per `estado_pedido` row, with `{ estado, cantidad }` where `cantidad` is 0 for states with no active pedidos

#### Scenario: Non-ADMIN access denied
- **WHEN** a non-ADMIN user sends `GET /api/v1/admin/metricas/pedidos-por-estado`
- **THEN** the system returns HTTP 403 Forbidden

#### Scenario: Cache-Control header present
- **WHEN** an ADMIN sends any request to `/api/v1/admin/metricas/pedidos-por-estado`
- **THEN** the response SHALL include header `Cache-Control: max-age=300`
