# Design: frontend-backend-mercadopago-integration-fixes

## 1. Diagrama del Flujo Completo

```
Usuario en /checkout
       │
       ▼
[Step 1] handlePay()
  setStatus('creating_order')
  POST /api/v1/pedidos → { id: pedidoId }
       │
       ▼
[Step 2] onSuccess(orderData)
  setStatus('creating_preference')          ← BUG F-03: faltaba este set
  POST /api/v1/pagos/crear-preferencia → { init_point, preference_id, pago_id }
  setPreference(preference_id, pago_id, init_point)
  setStatus('idle')
       │
       ▼
[Step 3] MercadoPagoButton visible (initPoint disponible)
  handleClick()
  setStatus('waiting_payment')
  window.location.href = initPoint          ← page unload, store destruido
       │
       ▼ (usuario completa pago en MP sandbox)
       │
       ▼ (paralelo: MP envia webhook al backend)
[Webhook] POST /api/v1/webhooks/mercadopago
  1. INSERT pago_webhook_log (antes de procesar)
  2. Validar x-signature (produccion) / warn (development)
  3. SDK.payment().get(mp_id) → { status: "approved", external_reference: "pedidoId" }
  4. Crear/actualizar Pago con mp_payment_id
  5. confirmar_pedido_por_pago(pedido_id) → FSM: PENDIENTE → CONFIRMADO
  6. Marcar log como procesado=True
  Retornar 200
       │
       ▼ (MP redirige usuario de vuelta)
[MP Redirect] /checkout?payment=success&pedido_id=X
  useEffect detecta searchParams
  setPedidoId(X)
  setStatus('success')
       │
       ▼
PaymentStatusModal visible (status === 'success')
  handleViewOrder()
  navigate('/orders/{pedidoId}')            ← BUG F-02: era '/pedidos/{pedidoId}'
  reset() + clearCart()
       │
       ▼
/orders/{pedidoId} — detalle del pedido confirmado
```

## 2. Flujo del Webhook (Detalle)

```
MP Dashboard → ngrok → backend:8000/api/v1/webhooks/mercadopago
                                 │
                          Headers recibidos:
                          x-signature: ts=<ts>,v1=<hmac>
                          x-request-id: <uuid>
                          Content-Type: application/json
                                 │
                          payload: { "type": "payment", "data": { "id": "<mp_payment_id>" } }
                                 │
                         procesar_webhook()
                                 │
                    ┌────────────┴────────────┐
                    │  1. LOG INMEDIATO        │
                    │  INSERT pago_webhook_log │
                    │  procesado=False         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  2. VALIDAR FIRMA        │
                    │  ENV=production → 400    │
                    │  ENV=development → warn  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  3. SDK.payment().get()  │
                    │  Consultar estado real   │
                    │  status: "approved"      │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  4. IDEMPOTENCIA         │
                    │  get_by_mercadopago_id() │
                    │  ¿existe? → update       │
                    │  ¿no existe? → create    │
                    │  IntegrityError → retry  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  5. FSM TRANSITION       │
                    │  si approved:            │
                    │  confirmar_pedido_por_pago│
                    │  PENDIENTE → CONFIRMADO  │
                    │  409 → ya confirmado (ok)│
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  6. MARCAR PROCESADO     │
                    │  procesado=True          │
                    │  Retornar 200            │
                    └─────────────────────────┘
```

## 3. Decisiones Tecnicas

### 3.1 Redirect vs Modal SDK — Razon de la Eleccion

El SDK modal de MercadoPago (`new MercadoPago(publicKey).checkout({ preference })`) NO funciona correctamente en sandbox cuando el browser requiere autenticacion de usuario en MP. El popup se abre pero no cierra ni redirige despues de la autenticacion.

**Decision**: Usar redirect directo (`window.location.href = initPoint`). Esta decision ya fue tomada en el change anterior y NO se revierte.

**Consecuencia arquitectonica**: El store de Zustand es ephemeral (sin persist). Al redirigir, la pagina se destruye y el store se pierde. Al volver desde MP, el estado se reconstruye leyendo los query params (`?payment=success&pedido_id=X`). El polling (`usePaymentStatusPolling`) solo es util como fallback si el usuario no fue redirigido (ej: cierre prematuro del tab de MP).

### 3.2 Firma HMAC-SHA256 del Webhook

MercadoPago envia el header `x-signature: ts=<timestamp>,v1=<hmac_sha256>`.

El manifest para calcular el HMAC es:
```
id:<data.id>;request-id:<x-request-id>;ts:<ts>;
```

La clave es `MP_ACCESS_TOKEN` (no `MERCADOPAGO_WEBHOOK_SECRET` — MP usa el access token como clave de firma).

**En production**: firma invalida → 400, MP reintenta.
**En development**: firma invalida → warning, se continua procesando (para facilitar debugging con ngrok).

### 3.3 Idempotencia del Webhook

MP puede enviar el mismo webhook multiples veces. La idempotencia se garantiza en dos niveles:

1. **A nivel de Pago**: `UNIQUE(mp_payment_id)` en la tabla `pagos`. Si ya existe un Pago con ese `mp_payment_id`, se actualiza el status sin crear uno nuevo.
2. **A nivel de FSM**: `confirmar_pedido_por_pago()` lanza 409 si el pedido ya esta en CONFIRMADO. El webhook maneja este 409 silenciosamente (log info, no re-raise).
3. **Race condition**: `IntegrityError` al crear Pago → rollback → segundo `get_by_mercadopago_id()` → procesar con el Pago existente.

### 3.4 Polling Post-Redirect

El `usePaymentStatusPolling` con `POLL_INTERVAL_MS = 30_000` es arquitecturalmente correcto pero no se activa en el flujo principal (redirect destruye el store). 

**Decision**: Reducir `POLL_INTERVAL_MS` a `5_000` (5 segundos) para que sea util cuando el usuario llega a `/checkout?payment=pending` — en ese caso el pedido puede estar pendiente de confirmacion y el polling es necesario.

El polling activa cuando:
- `pedidoId !== null` (seteado desde query params)
- `storeStatus === 'waiting_payment'`

**Problema F-06**: Para el caso `pending`, el status se setea a `'pending'` (no `'waiting_payment'`), por lo que el polling nunca activa. La solucion es: cuando `?payment=pending`, setear el status a `'waiting_payment'` en lugar de `'pending'`, y dejar que el polling determine el estado real.

### 3.5 Navegacion Post-Pago

`PaymentStatusModal.handleViewOrder()` debe navegar a la ruta correcta del detalle de pedido.

**Auditoria necesaria**: Verificar en `frontend/src/shared/routing/Router.tsx` cual es la ruta exacta: `/orders/:id` o `/pedidos/:id`.

**Decision provisional**: Cambiar a `/orders/${pedidoId}` si la ruta esta en ingles, o verificar y corregir segun la ruta real.

### 3.6 Status Intermedio `creating_preference`

En `CheckoutPage.handlePay()`, cuando `createOrderMutation` tiene exito, se llama `createPreferenceMutation.mutate()` pero el status sigue siendo `'creating_order'`. El boton muestra "Creando pedido..." en vez de "Generando pago...".

**Fix**: Agregar `setStatus('creating_preference')` al inicio del `onSuccess` del pedido, antes de llamar a `createPreferenceMutation`.

### 3.7 Validacion de `MERCADOPAGO_WEBHOOK_URL`

Si `MERCADOPAGO_WEBHOOK_URL` esta vacio, el fallback es `http://localhost:8000/api/v1/webhooks/mercadopago`. MP no puede enviar webhooks a localhost.

**Fix**: Agregar `logger.warning()` en `crear_preferencia` cuando `notification_url` es el fallback, para alertar al desarrollador.

**No agregar startup validation** (que levantaria error al iniciar el backend con `.env` de desarrollo sin ngrok configurado) — esto bloquearia el desarrollo local sin ngrok.

## 4. Cambios por Archivo

### Backend

| Archivo | Cambio | Justificacion |
|---------|--------|---------------|
| `backend/pagos/service.py` | Agregar `logger.info()` en `crear_preferencia` al inicio y al exito | Debugging con ngrok |
| `backend/pagos/service.py` | Agregar `logger.warning()` cuando `notification_url` usa fallback | Alertar configuracion incorrecta |
| `backend/pagos/service.py` | Agregar `logger.info()` al inicio de `procesar_webhook` con payload summary | Debugging de webhooks |
| `backend/pagos/service.py` | Agregar `logger.info()` en cada paso del webhook (firma validada, pago obtenido, pago creado/actualizado, pedido confirmado) | Visibilidad del flujo |
| `backend/tests/test_pagos.py` | Agregar test para `notification_url` fallback warning | Cobertura del warning |

### Frontend

| Archivo | Cambio | Justificacion |
|---------|--------|---------------|
| `frontend/src/features/payments/components/PaymentStatusModal.tsx` | Verificar que la navegacion a `/pedidos/${pedidoId}` es correcta (si, la ruta existe en Router.tsx) | Bug F-02: confirmado correcto, no requiere cambio |
| `frontend/src/pages/CheckoutPage.tsx` | Agregar `setStatus('creating_preference')` en `onSuccess` del pedido | Bug F-03: status intermedio |
| `frontend/src/features/payments/hooks/usePaymentStatusPolling.ts` | Reducir `POLL_INTERVAL_MS` de 30000 a 5000 | Polling util para `pending` |
| `frontend/src/pages/CheckoutPage.tsx` | Cambiar `setStatus('pending')` a `setStatus('waiting_payment')` en query params | Bug F-06: habilitar polling para `pending` |
| `frontend/src/features/payments/components/PaymentStatusModal.tsx` | Agregar seccion visible para `waiting_payment` con spinner de "Verificando pago..." | Bug F-06: feedback visual para pending |

## 5. Consideraciones de Seguridad

- **No agregar `MERCADOPAGO_WEBHOOK_SECRET` como clave de firma** — MP usa `MP_ACCESS_TOKEN` como clave. El campo `mercadopago_webhook_secret` en `Settings` existe pero no se usa para firma.
- **Webhook endpoint publico** — sin JWT, sin rate limiting. Correcto segun diseno: MP envia desde sus servidores, no puede autenticar con JWT. La firma HMAC es la autenticacion.
- **No exponer `gateway_response` completo en APIs publicas** — `PagoStatusResponse` no incluye `gateway_response` (respuesta cruda de MP). Correcto por diseno.
- **`initPoint` no se persiste en localStorage** — el store de Zustand es ephemeral. Si el usuario refresca antes de hacer click, pierde el initPoint y debe volver a generar la preferencia. Correcto segun la decision de seguridad de pagos del proyecto.

## 6. Diagrama de Estado del Pago (Zustand Store)

```
idle
  │
  ├─ handlePay() → creating_order
  │                    │
  │           onSuccess(pedido) → creating_preference (FIX F-03)
  │                                    │
  │                           onSuccess(preference) → idle
  │                                                    │
  │                                         MercadoPagoButton click → waiting_payment
  │                                                                         │
  │                                                                  window.location.href (page reload)
  │
  ├─ ?payment=success → success → modal visible → navigate('/pedidos/:id') → reset → idle
  ├─ ?payment=failure → error → modal visible → retry o cancel → idle
  └─ ?payment=pending → waiting_payment (FIX F-06) → polling activo → success | error
```

## 7. Configuracion ngrok Requerida

Para que el flujo funcione end-to-end con sandbox:

```bash
# .env backend (no commitear)
ENV=development
MP_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxx-xxxx-xxxx-xxxx
MERCADOPAGO_WEBHOOK_URL=https://envy-abruptly-grievance.ngrok-free.dev/api/v1/webhooks/mercadopago
FRONTEND_URL=http://localhost:5173
```

**Validacion en MP Dashboard**:
- Ir a Notificaciones → Configurar URL de webhook → `https://envy-abruptly-grievance.ngrok-free.dev/api/v1/webhooks/mercadopago`
- Eventos: `payment.created`, `payment.updated`
- Verificar que ngrok esta corriendo y forwarding al backend local

**Tarjeta de test para sandbox**:
- Numero: `4111 1111 1111 1111` o `4509953566233704`
- Fecha: cualquier fecha futura
- CVV: cualquier 3 digitos
- Nombre: cualquier nombre
