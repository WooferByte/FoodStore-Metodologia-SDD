# Proposal: frontend-backend-mercadopago-integration-fixes

## What & Why

### Problema

El flujo de pago con MercadoPago no funciona end-to-end en sandbox con ngrok. Al navegar por el checkout, las redirecciones de vuelta desde MP no activan correctamente el polling de estado, el modal de confirmacion no navega al pedido correcto, y hay varios gaps de seguridad y logging que bloquean el debug en produccion.

Este change debe completarse **antes del deploy** porque:
1. El flujo de pago es la unica via de ingresos del sistema.
2. Los bugs actuales impiden confirmar pedidos via webhook, dejando pedidos en PENDIENTE indefinidamente.
3. Sin logging adecuado en el webhook, es imposible debuguear fallos con ngrok o en produccion.

### Bugs Identificados por Capa

#### Backend

**B-01 — Signature validation en development**
- **Archivo**: `backend/pagos/service.py` — `_validate_mp_signature()`
- **Problema**: El metodo usa `hmac.new()` pero la API correcta de Python es `hmac.new()`. Al revisar el codigo, la funcion usa `hmac.new(key, manifest.encode("utf-8"), hashlib.sha256).hexdigest()` — esto es correcto en Python stdlib. Sin embargo, en development cuando la firma es invalida solo se logea un warning y se continua, lo cual puede causar que webhooks falsos pasen silenciosamente.
- **Impacto**: Medio — en development no hay riesgo, pero el comportamiento debe estar documentado.

**B-02 — CORS no incluye el dominio de ngrok**
- **Archivo**: `backend/core/config.py` — `cors_origins`
- **Problema**: `CORS_ORIGINS` en `.env` solo tiene `http://localhost:3000,http://localhost:5173`. MercadoPago envia webhooks desde sus propios servidores (no browser), por lo que CORS no aplica al webhook. Pero el frontend (servido desde ngrok o localhost) necesita poder llamar al backend; si el backend corre en una URL distinta o ngrok expone ambos, el CORS puede bloquear.
- **Impacto**: Bajo para el webhook (MP envia server-to-server), Medio para el frontend si se accede via ngrok.

**B-03 — Logging insuficiente en `crear_preferencia`**
- **Archivo**: `backend/pagos/service.py` — `crear_preferencia()`
- **Problema**: No hay `logger.info()` al inicio de la funcion ni al exito de crear la preferencia. Solo hay `logger.error()` en caso de excepcion del SDK. Esto hace dificil confirmar que la preferencia se creo con los datos correctos (notification_url, back_urls, external_reference).
- **Impacto**: Bajo en produccion, Alto para debugging con ngrok.

**B-04 — `notification_url` con fallback a hardcode**
- **Archivo**: `backend/pagos/service.py` — `crear_preferencia()` linea ~137
- **Problema**: `notification_url = settings.mercadopago_webhook_url or "http://localhost:8000/api/v1/webhooks/mercadopago"`. Si `MERCADOPAGO_WEBHOOK_URL` esta vacio en `.env`, la URL de webhook apunta a localhost, que MP no puede alcanzar.
- **Impacto**: Alto — si la env var no esta seteada, ninguna notificacion de pago llega al backend.

**B-05 — `back_urls` apuntan a `/checkout` pero polling requiere `pedido_id`**
- **Archivo**: `backend/pagos/service.py` — `preference_data["back_urls"]`
- **Estado**: Ya implementado correctamente — las URLs incluyen `?payment=success&pedido_id={pedido_id}`. No hay bug aqui.

**B-06 — Webhook retorna 400 en firma invalida en desarrollo**
- **Archivo**: `backend/pagos/service.py` — `procesar_webhook()`, paso 9.2c
- **Problema**: En `ENV=development`, si llega una firma invalida se logea warning y se continua procesando. Esto es correcto para desarrollo. Sin embargo, si `ENV` no esta seteado (string vacio o None), `settings.env` podria no ser `"production"`, pasando silenciosamente. La validacion depende del string exacto `"production"`.
- **Impacto**: Bajo — el `.env` siempre debe tener `ENV=development`.

**B-07 — `confirmar_pedido_por_pago` import circular potencial**
- **Archivo**: `backend/pagos/service.py` — linea `from pedidos.service import confirmar_pedido_por_pago`
- **Problema**: Este import esta dentro de la funcion `procesar_webhook()` para evitar circular import. Esto funciona pero es fragil y dificulta el testing.
- **Impacto**: Bajo — funciona, pero debe ser auditado.

#### Frontend

**F-01 — `usePaymentStatusPolling` activa con `status === 'waiting_payment'` pero el redirect a MP cambia la pagina**
- **Archivo**: `frontend/src/features/payments/hooks/usePaymentStatusPolling.ts`
- **Problema**: El polling solo activa cuando `storeStatus === 'waiting_payment'`. Pero cuando el usuario hace click en "Pagar", se setea `waiting_payment` y se redirige con `window.location.href = initPoint`. Esto destruye el componente React. Cuando MP redirige de vuelta a `/checkout?payment=success&pedido_id=X`, el store fue reseteado por recarga de pagina (el store es ephemeral, sin persist). El polling nunca activa post-redirect porque el status se setea a `'success'` directamente desde los query params (no a `'waiting_payment'`).
- **Impacto**: Alto — el polling nunca funciona en el flujo redirect. Esto es arquitecturalmente correcto (el redirect borra el store), pero el `usePaymentStatusPolling` es inutil en el flujo actual.

**F-02 — `PaymentStatusModal` navega a `/pedidos/{pedidoId}` — confirmar ruta correcta**
- **Archivo**: `frontend/src/features/payments/components/PaymentStatusModal.tsx` — `handleViewOrder()`
- **Estado**: `navigate('/pedidos/${pedidoId}')` — auditando el Router, la ruta correcta ES `/pedidos/:id`. La navegacion es correcta. No hay bug.
- **Accion**: Verificar que `OrderDetailPage` esta implementada y renderiza correctamente el detalle del pedido dado el id.

**F-03 — `CheckoutPage` llama `createPreferenceMutation.mutate()` dentro del `onSuccess` de `createOrderMutation`**
- **Archivo**: `frontend/src/pages/CheckoutPage.tsx` — `handlePay()` linea ~235
- **Problema**: El comentario dice "createPreference is triggered inside useCreateOrder via onSuccess", pero `useCreateOrder` no tiene ese comportamiento — solo crea el pedido. La mutacion de crear preferencia se llama despues correctamente. Sin embargo, si falla la preferencia, el status queda en `'creating_preference'` pero se setea a `'idle'` en el `onError`. El flujo parece correcto pero el status intermedio `'creating_preference'` nunca se setea explicitamente en `handlePay` — solo se setea `'creating_order'` y luego la preferencia va directo de `'creating_order'` sin pasar por `'creating_preference'`.
- **Impacto**: Medio — visual: el boton no muestra "Generando pago..." durante la creacion de la preferencia.

**F-04 — `forma_pago_id: 1` hardcodeado**
- **Archivo**: `frontend/src/pages/CheckoutPage.tsx` — `handlePay()` linea ~226
- **Problema**: `forma_pago_id: 1` esta hardcodeado con el comentario "MercadoPago = 1 (verify with backend seed)". Este ID debe coincidir con el seed de la BD.
- **Impacto**: Medio — si el seed no tiene `forma_pago_id=1` para MercadoPago, el pedido falla.

**F-05 — Polling con interval de 30s es demasiado largo para el flujo con redirect**
- **Archivo**: `frontend/src/features/payments/hooks/usePaymentStatusPolling.ts` — `POLL_INTERVAL_MS = 30_000`
- **Problema**: En el flujo actual, cuando MP redirige de vuelta con `?payment=success`, el estado se setea directamente a `'success'` sin polling. El polling es para el caso donde el usuario ya pago pero la pagina aun muestra `waiting_payment`. Como el redirect destruye el store, el polling de 30s es irrelevante para el flujo principal.
- **Impacto**: Bajo — el polling funciona como fallback pero el intervalo deberia ser 5-10s para ser util.

**F-06 — `PaymentStatusModal` muestra `isPolling` solo cuando `status === 'waiting_payment'` pero el modal solo es visible con `success | error | pending`**
- **Archivo**: `frontend/src/features/payments/components/PaymentStatusModal.tsx` — linea 40 y 211
- **Problema**: `usePaymentStatusPolling(pedidoId)` activa solo si `storeStatus === 'waiting_payment'`, pero el modal solo es visible con `success | error | pending`. Por lo tanto `isPolling` siempre sera `false` cuando el modal este visible. El indicador de "Verificando pago..." nunca se muestra.
- **Impacto**: Medio — UI confusa: el modal de `pending` no tiene feedback de que algo esta pasando.

### Criterios de Aceptacion

El flujo completo debe funcionar con tarjeta de test `4111 1111 1111 1111` (sandbox MP):

1. Usuario en `/checkout` — selecciona metodo MercadoPago, hace click "Preparar pago"
2. Backend crea preferencia — `POST /api/v1/pagos/crear-preferencia` retorna 201 con `init_point` valido
3. Usuario hace click "Pagar con MercadoPago" — redirect a `init_point`
4. Usuario completa pago en sandbox MP con tarjeta de test
5. MP envia webhook a ngrok URL — backend recibe y procesa correctamente
6. Backend confirma pedido via FSM — pedido pasa de PENDIENTE a CONFIRMADO
7. MP redirige usuario a `?payment=success&pedido_id=X`
8. Frontend detecta query params — muestra modal de exito
9. Usuario hace click "Ver mi pedido" — navega a la ruta correcta del detalle del pedido
10. BD muestra: `pagos.mp_status = 'approved'`, `pedidos.estado_pedido_id = 2 (CONFIRMADO)`, `pago_webhook_log.procesado = true`

### Scope

**En scope:**
- Auditar y corregir `backend/pagos/service.py`, `router.py`, `schemas.py`
- Agregar logging en `crear_preferencia` y `procesar_webhook`
- Verificar `MERCADOPAGO_WEBHOOK_URL` en `.env.example` y agregar validacion
- Corregir ruta de navegacion post-pago en `PaymentStatusModal`
- Corregir `status` intermedio `creating_preference` en `CheckoutPage`
- Agregar tests de integracion para el flujo completo (pytest + vitest)
- Guia de testing manual con ngrok

**Fuera de scope:**
- Cambiar el flujo de redirect a modal SDK (ya fue decidido — redirect es correcto para sandbox)
- Implementar pagos en efectivo (change separado)
- Implementar notificaciones push al usuario cuando se confirma el pago
