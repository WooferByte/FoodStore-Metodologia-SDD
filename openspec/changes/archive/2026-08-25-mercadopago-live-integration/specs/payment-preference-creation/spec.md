## ADDED Requirements

### Requirement: Cliente autenticado puede crear preferencia de pago para su pedido
El sistema SHALL permitir que un usuario autenticado con rol CLIENT cree una preferencia de pago en MercadoPago para un pedido propio en estado PENDIENTE. La preferencia SHALL incluir `external_reference` con el `pedido_id`, un ítem por el total del pedido, los `back_urls` de éxito/fallo/pendiente apuntando a la ruta `/checkout` de la app (base configurable) y el `notification_url` configurable del webhook. El sistema SHALL persistir el registro `Pago` en la BD con `estado=pending` y retornar el `init_point` (URL de redirección a MP) y el `preference_id`.

#### Scenario: Creación exitosa de preferencia para pedido propio en PENDIENTE
- **WHEN** un CLIENT autenticado envía `POST /api/v1/pagos/crear-preferencia` con `{ "pedido_id": <id_propio> }` y el pedido existe y está en PENDIENTE
- **THEN** el sistema crea la preferencia en MP SDK con `back_urls.success|failure|pending` apuntando a `{MP_FRONTEND_URL}/checkout` y `notification_url` = `MP_NOTIFICATION_URL`, persiste `Pago(pedido_id, preference_id, estado="pending", monto=total_pedido)` y retorna `{ "init_point": "https://...", "preference_id": "...", "pago_id": <id> }` con HTTP 201

#### Scenario: Rechazo si el pedido no pertenece al usuario autenticado
- **WHEN** un CLIENT autenticado envía `POST /api/v1/pagos/crear-preferencia` con `pedido_id` de otro usuario
- **THEN** el sistema retorna HTTP 403 con RFC 7807 `{ "type": "about:blank", "title": "Forbidden", "status": 403, "detail": "No tenés permisos para pagar este pedido." }`

#### Scenario: Rechazo si el pedido no está en estado PENDIENTE
- **WHEN** un CLIENT envía `POST /api/v1/pagos/crear-preferencia` con un `pedido_id` que existe pero cuyo estado no es PENDIENTE (e.g., CONFIRMADO, CANCELADO)
- **THEN** el sistema retorna HTTP 409 con RFC 7807 `{ "status": 409, "title": "Estado inválido", "detail": "Solo se puede pagar un pedido en estado PENDIENTE." }`

#### Scenario: Rechazo si el pedido no existe
- **WHEN** un CLIENT envía `POST /api/v1/pagos/crear-preferencia` con un `pedido_id` inexistente
- **THEN** el sistema retorna HTTP 404 con RFC 7807

#### Scenario: Rate limiting en crear-preferencia
- **WHEN** un mismo CLIENT autenticado realiza más de 5 requests a `POST /api/v1/pagos/crear-preferencia` en 60 segundos
- **THEN** el sistema retorna HTTP 429 con header `Retry-After`

### Requirement: Preferencia usa URLs configurables por entorno
El sistema SHALL construir `notification_url` y `back_urls` a partir de variables de entorno configurables (`MP_NOTIFICATION_URL` y `MP_FRONTEND_URL`), con defaults de desarrollo que apuntan a localhost. Ninguna URL de MercadoPago SHALL estar hardcodeada en el código.

#### Scenario: URLs configuradas en el entorno
- **WHEN** la aplicación corre con `MP_NOTIFICATION_URL=https://app.example.com/api/v1/webhooks/mercadopago` y `MP_FRONTEND_URL=https://app.example.com`
- **THEN** la preferencia creada usa `notification_url=https://app.example.com/api/v1/webhooks/mercadopago` y `back_urls.*=https://app.example.com/checkout`

#### Scenario: Defaults de desarrollo con localhost
- **WHEN** la aplicación corre sin esas variables (defaults)
- **THEN** la preferencia usa `notification_url=http://localhost:8000/api/v1/webhooks/mercadopago` y `back_urls.*=http://localhost:5173/checkout`

### Requirement: auto_return habilitado solo cuando la URL de retorno es real
El sistema SHALL incluir `auto_return: "approved"` en la preferencia únicamente cuando la URL base de retorno configurada NO sea localhost, para que el comprador vuelva automáticamente a `/checkout` tras un pago aprobado. Con URL localhost, `auto_return` SHALL estar ausente.

#### Scenario: auto_return presente con URL real
- **WHEN** `MP_FRONTEND_URL` está configurada con un dominio real (no localhost)
- **THEN** el payload de la preferencia incluye `auto_return: "approved"`

#### Scenario: auto_return ausente con localhost
- **WHEN** `MP_FRONTEND_URL` es `http://localhost:5173` (default de desarrollo)
- **THEN** el payload de la preferencia NO incluye `auto_return`
