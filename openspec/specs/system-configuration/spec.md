# Specification: System Configuration

Key-value configuration store for Food Store system parameters, persisted in database and accessible via admin REST API.

## Purpose

The system SHALL provide a key-value configuration store that allows administrators to view and update system parameters without restarting the server or modifying code. All changes SHALL be tracked with audit trail (who modified what and when).

## Requirements

### Requirement: Configuration Model

The system SHALL provide a `Configuracion` model to store system configuration as key-value pairs with audit trail.

#### Scenario: Configuracion table structure
- **WHEN** the database migration `011` is applied
- **THEN** a `configuracion` table SHALL exist with columns: `id` (PK, auto-increment), `clave` (VARCHAR, UNIQUE, NOT NULL), `valor` (VARCHAR, NOT NULL), `descripcion` (VARCHAR, nullable), `actualizado_por` (FK to `usuarios.id`, NOT NULL), `actualizado_en` (DATETIME, NOT NULL), `creado_en` (DATETIME, NOT NULL)
- **AND** a UNIQUE constraint SHALL exist on `clave`

#### Scenario: Model inherits SQLModel table=True
- **WHEN** the application starts
- **THEN** `Configuracion` SHALL be defined as a `SQLModel` class with `table=True` and `__tablename__ = "configuracion"` in `core/models.py`

### Requirement: List All Configurations

The system SHALL provide a `GET /api/v1/admin/configuracion` endpoint that returns all system configurations.

#### Scenario: Admin lists all configs
- **WHEN** an authenticated ADMIN user sends `GET /api/v1/admin/configuracion`
- **THEN** the response SHALL return HTTP 200 with a JSON array of all configuration entries
- **AND** each entry SHALL include: `id`, `clave`, `valor`, `descripcion`, `actualizado_por`, `actualizado_en`, `creado_en`

#### Scenario: Non-admin gets 403
- **WHEN** a non-ADMIN authenticated user (STOCK, PEDIDOS, CLIENT) sends `GET /api/v1/admin/configuracion`
- **THEN** the response SHALL be HTTP 403 Forbidden (RFC 7807)

#### Scenario: Unauthenticated gets 401
- **WHEN** an unauthenticated request sends `GET /api/v1/admin/configuracion`
- **THEN** the response SHALL be HTTP 401 Unauthorized

### Requirement: Update Configuration Value

The system SHALL provide a `PUT /api/v1/admin/configuracion/{clave}` endpoint to update a configuration value, with automatic audit trail.

#### Scenario: Admin updates existing config
- **WHEN** an authenticated ADMIN user sends `PUT /api/v1/admin/configuracion/envio_gratis_umbral` with body `{"valor": "5000"}`
- **THEN** the system SHALL update the `valor` field
- **AND** SHALL set `actualizado_por` to the authenticated user's ID
- **AND** SHALL set `actualizado_en` to the current timestamp
- **AND** SHALL return HTTP 200 with the updated configuration entry

#### Scenario: Update non-existent key returns 404
- **WHEN** an ADMIN user sends `PUT /api/v1/admin/configuracion/no_existe` with any body
- **THEN** the response SHALL be HTTP 404 Not Found (RFC 7807)

#### Scenario: Update without valor field returns 422
- **WHEN** an ADMIN user sends `PUT /api/v1/admin/configuracion/envio_gratis_umbral` with empty body `{}`
- **THEN** the response SHALL be HTTP 422 Unprocessable Entity with validation error detail

### Requirement: Initial Seed Data

The system SHALL include a seed with default system configurations.

#### Scenario: Seed creates default configs
- **WHEN** the seed script (`backend/scripts/seed.py`) runs
- **THEN** the following configurations SHALL be created:
  - `envio_gratis_umbral` = "3000" — "Monto mínimo para envío gratis (en pesos)"
  - `envio_costo` = "500" — "Costo de envío fijo (en pesos)"
  - `token_expiracion_minutos` = "30" — "Tiempo de expiración del access token en minutos"
  - `refresh_token_expiracion_dias` = "7" — "Tiempo de expiración del refresh token en días"
  - `pedidos_rate_limit_por_hora` = "10" — "Máximo de pedidos por usuario por hora"
  - `productos_por_pagina` = "12" — "Cantidad de productos por página en catálogo"
- **AND** all seeds SHALL be idempotent (rerunning seed does not duplicate entries)
- **AND** `actualizado_por` SHALL reference the admin user ID

### Requirement: Configuración Repository

The system SHALL provide a `ConfiguracionRepository` extending `BaseRepository[Configuracion]`.

#### Scenario: Repository exists in configuracion module
- **WHEN** the application starts
- **THEN** `ConfiguracionRepository` SHALL be defined in `backend/configuracion/repository.py`
- **AND** SHALL inherit from `BaseRepository[Configuracion]`
- **AND** SHALL accept an async session in `__init__` and pass it to `super().__init__(session, Configuracion)`

### Requirement: Unit of Work Integration

The system SHALL expose the `Configuracion` repository through the Unit of Work.

#### Scenario: UoW has configuracion repository property
- **WHEN** the `UnitOfWork` class is instantiated
- **THEN** it SHALL have a `configuracion` property that lazy-loads `ConfiguracionRepository`
- **AND** `ConfiguracionRepository` SHALL be imported in `infrastructure/uow.py`

### Requirement: API Router Registration

The configuracion router SHALL be registered in the FastAPI application.

#### Scenario: Router mounted under /api/v1/admin prefix
- **WHEN** the application starts
- **THEN** `configuracion.router` SHALL be included in `main.py` with prefix `/api/v1/admin`
- **AND** the router tag SHALL be "Configuración del Sistema"

### Requirement: Frontend configuration consumption is auth-gated

The frontend SHALL NOT fetch system configuration via `GET /api/v1/admin/configuracion` while the user is not authenticated. The fetch SHALL only be enabled once `authStore.isAuthenticated` is true.

#### Scenario: Anonymous browsing does not call the config endpoint

- **WHEN** an anonymous user loads any page that renders cart totals (e.g., CartDrawer, OrderSummary) without a session
- **THEN** no HTTP request is made to `/api/v1/admin/configuracion`
- **AND** the frontend uses its local fallback values for delivery fee and free-delivery threshold

#### Scenario: Authenticated sessions fetch config for cart totals

- **WHEN** an authenticated user loads a page that renders cart totals
- **THEN** the frontend fetches the configuration
- **AND** the delivery fee and free-delivery threshold are computed from the server configuration values
