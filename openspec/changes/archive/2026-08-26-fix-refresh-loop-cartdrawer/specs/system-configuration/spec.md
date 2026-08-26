# system-configuration Delta

## ADDED Requirements

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
