## Purpose

Regla de envío de Food Store: envío gratis si el subtotal del carrito alcanza un umbral configurable, si no se cobra un costo fijo de envío. La regla se aplica en backend al crear pedidos y se comparte en frontend para que carrito, drawer y checkout muestren totales idénticos.

## ADDED Requirements

### Requirement: Backend computa el envío al crear el pedido
El sistema SHALL calcular el costo de envío al crear un pedido (`POST /api/v1/pedidos`) leyendo las configuraciones `envio_gratis_umbral` y `envio_costo`. El subtotal SHALL ser la suma de `precio_snapshot × cantidad` de los ítems. Si el subtotal es mayor o igual al umbral, el envío SHALL ser $0; si no, SHALL ser `envio_costo`. El `total` del pedido SHALL ser `subtotal + envío` y el monto de envío SHALL persistirse en el pedido. El cliente NO SHALL poder determinar el total ni el envío: el request de creación NO acepta esos campos y, si el cliente los enviara, el backend los ignorará y recomputará desde configuración.

#### Scenario: Envío cobrado cuando el subtotal es menor al umbral
- **WHEN** CLIENT crea un pedido con subtotal $2.800 y la configuración es `envio_gratis_umbral=3000`, `envio_costo=500`
- **THEN** el pedido se crea con `envio=500` y `total=3300`

#### Scenario: Envío gratis cuando el subtotal alcanza el umbral
- **WHEN** CLIENT crea un pedido con subtotal $3.000 y la configuración es `envio_gratis_umbral=3000`, `envio_costo=500`
- **THEN** el pedido se crea con `envio=0` y `total=3000`

#### Scenario: Umbral y costo ausentes en configuración usan defaults
- **WHEN** CLIENT crea un pedido y las claves `envio_gratis_umbral` o `envio_costo` no existen en la tabla `configuracion`
- **THEN** el sistema usa los defaults `3000` y `500` respectivamente

#### Scenario: El total enviado por el cliente es ignorado
- **WHEN** CLIENT envía un request a `POST /api/v1/pedidos` que incluye campos `total` o `envio` fabricados
- **THEN** el sistema los ignora y computa `envio` y `total` a partir de la configuración y de los precios snapshot en BD

### Requirement: Frontend muestra totales de envío consistentes en carrito, drawer y checkout
El frontend SHALL exponer una única lógica compartida de totales de carrito que lea `envio_gratis_umbral` y `envio_costo` desde la configuración del sistema y derive `subtotal`, `deliveryFee`, `total`, `isFreeDelivery` y `missingForFree`. `OrderSummary` (página `/cart`), el footer y CTA del `CartDrawer` y la columna de resumen de `CheckoutPage` DEBEN usar esa misma lógica, de modo que un mismo carrito muestre el mismo desglose y el mismo total en los tres lugares.

#### Scenario: Consistencia con envío cobrado
- **WHEN** un carrito tiene subtotal $2.800 y la configuración es umbral $3.000 / costo $500
- **THEN** `OrderSummary`, `CartDrawer` y `CheckoutPage` muestran Envío $500 y Total $3.300

#### Scenario: Consistencia con envío gratis
- **WHEN** un carrito tiene subtotal $3.000 y la configuración es umbral $3.000 / costo $500
- **THEN** los tres componentes muestran Envío $0 (gratis) y Total $3.000

#### Scenario: Fallback mientras la configuración carga
- **WHEN** la configuración del sistema aún no ha cargado
- **THEN** la lógica compartida usa umbral `3000` y costo `500` como fallback, mostrando un total coherente

### Requirement: Checkout no envía totales al backend
El payload de `POST /api/v1/pedidos` desde `CheckoutPage` SHALL seguir enviando únicamente `direccion_entrega_id`, `forma_pago_id`, `observacion` e `items`. El total mostrado en el resumen de checkout SHALL coincidir con el que el backend persiste, porque ambos derivan de los mismos valores de configuración.

#### Scenario: Request sin total y pedido con total correcto
- **WHEN** CLIENT completa el checkout con un carrito de subtotal $2.800
- **THEN** el request a `POST /api/v1/pedidos` no contiene `total` ni `envio`, y el pedido devuelto tiene `total=3300`

### Requirement: La preferencia de MercadoPago cobra el total con envío
Cuando se crea la preferencia de pago (`POST /api/v1/pagos/crear-preferencia`) para un pedido en estado PENDIENTE, el `unit_price` del ítem de la preferencia SHALL ser el `total` del pedido (que ya incluye el envío).

#### Scenario: Preferencia cobra el total con envío
- **WHEN** CLIENT crea una preferencia para un pedido con `total=3300` (subtotal $2.800 + envío $500)
- **THEN** la preferencia en MercadoPago se crea con `unit_price=3300`
