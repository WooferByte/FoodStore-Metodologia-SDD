# payment-return-handling Specification

## Purpose
Define cómo el frontend detecta el resultado del redirect de MercadoPago en `/checkout` usando los query params nativos de MP, para mostrar el estado correcto del pago al comprador.

## Requirements

### Requirement: El checkout detecta el resultado del pago desde los query params nativos de MercadoPago
El sistema SHALL detectar, al cargar la ruta `/checkout`, el resultado del redirect de MercadoPago leyendo los query params nativos que MP adjunta al `back_url` (`status` y `external_reference`), y SHALL actualizar el estado del paymentStore y el `pedido_id` en consecuencia. Si `external_reference` no es un entero válido, el sistema SHALL ignorar ese valor sin fijar `pedido_id`.

#### Scenario: Redirect con pago aprobado
- **WHEN** el usuario vuelve a `/checkout` con `?status=approved&external_reference=42&payment_id=123456&preference_id=...`
- **THEN** el sistema fija `pedidoId=42` y `status='success'` en el paymentStore, mostrando el modal de pago exitoso

#### Scenario: Redirect con pago pendiente o en proceso
- **WHEN** el usuario vuelve a `/checkout` con `?status=pending&external_reference=42` o `?status=in_process&external_reference=42`
- **THEN** el sistema fija `pedidoId=42` y `status='pending'` en el paymentStore, mostrando el modal de pago en proceso

#### Scenario: Redirect con pago rechazado o cancelado
- **WHEN** el usuario vuelve a `/checkout` con `?status=rejected&external_reference=42`, `?status=cancelled&external_reference=42` o `?status=failure&external_reference=42`
- **THEN** el sistema fija `pedidoId=42` y `status='error'` en el paymentStore, mostrando el modal de error con opción de reintentar

#### Scenario: Redirect sin parámetros de resultado
- **WHEN** el usuario carga `/checkout` sin query params de MercadoPago
- **THEN** el sistema no altera el estado del paymentStore y continúa con el flujo normal de checkout (validación de carrito y formulario)

### Requirement: Se mantiene compatibilidad con el contrato legacy de retorno
El sistema SHALL seguir aceptando el contrato legacy `?payment=success|failure|pending&pedido_id=X` como fallback cuando los params nativos de MP no estén presentes, para no romper flujos existentes.

#### Scenario: Fallback al contrato legacy
- **WHEN** el usuario vuelve a `/checkout` con `?payment=success&pedido_id=7` (sin `status` ni `external_reference`)
- **THEN** el sistema fija `pedidoId=7` y `status='success'`, equivalente al comportamiento actual

#### Scenario: Precedencia de los params nativos de MP
- **WHEN** la URL contiene a la vez `status`/`external_reference` (nativos) y `payment`/`pedido_id` (legacy) en conflicto
- **THEN** el sistema prioriza los params nativos de MercadoPago
