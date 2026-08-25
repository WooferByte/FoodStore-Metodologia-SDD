## MODIFIED Requirements

### Requirement: CLIENT puede crear un pedido
El sistema SHALL permitir a un usuario autenticado con rol CLIENT crear un nuevo pedido a través de `POST /api/v1/pedidos`. La creación decrementa stock atómicamente, registra snapshots de precio y dirección, computa el envío desde la configuración del sistema (`envio_gratis_umbral` y `envio_costo`), persiste `envio` y `total = subtotal + envio`, y crea una entrada de historial FSM. El request SHALL NO aceptar `total` ni `envio` (el backend los computa; si el cliente los envía, son ignorados).

#### Scenario: Creación exitosa de pedido
- **WHEN** CLIENT envía `POST /api/v1/pedidos` con `direccion_entrega_id`, `forma_pago_id`, `items` válidos
- **THEN** el sistema retorna HTTP 201 con el pedido creado (`PedidoResponse` incluyendo `envio` y `total` con envío) y header `Location: /api/v1/pedidos/{id}`

#### Scenario: Envío cobrado cuando el subtotal es menor al umbral
- **WHEN** CLIENT crea un pedido cuyo subtotal ($2.800) es menor a `envio_gratis_umbral` ($3.000) y `envio_costo` es $500
- **THEN** el pedido se persiste con `envio=500` y `total=3300`

#### Scenario: Envío gratis cuando el subtotal alcanza el umbral
- **WHEN** CLIENT crea un pedido cuyo subtotal ($3.000) es mayor o igual a `envio_gratis_umbral` ($3.000)
- **THEN** el pedido se persiste con `envio=0` y `total=subtotal`

#### Scenario: Rate limit excedido
- **WHEN** CLIENT envía más de 10 requests a `POST /api/v1/pedidos` en una hora
- **THEN** el sistema retorna HTTP 429 con RFC 7807 `{ type, title: "Too Many Requests", status: 429, detail, instance }`

#### Scenario: Usuario no autenticado
- **WHEN** se envía `POST /api/v1/pedidos` sin JWT válido
- **THEN** el sistema retorna HTTP 401

#### Scenario: Rol insuficiente
- **WHEN** usuario con rol ADMIN intenta crear pedido (sin rol CLIENT)
- **THEN** el sistema retorna HTTP 403

#### Scenario: Stock insuficiente al crear
- **WHEN** se solicita más stock del disponible para algún producto
- **THEN** el sistema retorna HTTP 409 con RFC 7807 indicando producto_id, stock_actual, cantidad_solicitada

#### Scenario: Dirección de otro usuario
- **WHEN** se usa una `direccion_entrega_id` que pertenece a otro usuario
- **THEN** el sistema retorna HTTP 403 con RFC 7807

---

## ADDED Requirements

### Requirement: Pedido expone el envío persistido en sus respuestas
El sistema SHALL incluir el campo `envio` (Decimal) en `PedidoResponse`, presente en creación (`POST /api/v1/pedidos`), listado (`GET /api/v1/pedidos`) y detalle (`GET /api/v1/pedidos/{id}`). Los pedidos históricos creados antes de esta regla SHALL tener `envio = 0`.

#### Scenario: Creación devuelve el envío
- **WHEN** CLIENT crea un pedido con envío cobrado ($500)
- **THEN** el `PedidoResponse` de la respuesta incluye `envio: 500` y `total` incluyendo el envío

#### Scenario: Detalle y listado exponen el envío
- **WHEN** CLIENT o ADMIN consulta `GET /api/v1/pedidos/{id}` o `GET /api/v1/pedidos`
- **THEN** cada pedido devuelto incluye el campo `envio` con el valor persistido

#### Scenario: Pedido histórico con envío en cero
- **WHEN** se consulta un pedido creado antes de que existiera el cálculo de envío
- **THEN** el campo `envio` es `0`
