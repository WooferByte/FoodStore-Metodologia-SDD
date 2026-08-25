## MODIFIED Requirements

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
