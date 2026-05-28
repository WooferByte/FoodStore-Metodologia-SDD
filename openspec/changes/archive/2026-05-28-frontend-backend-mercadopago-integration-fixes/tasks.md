# Tasks: frontend-backend-mercadopago-integration-fixes

## 0. Skills

- [ ] 0.1 Leer `.agents/skills/web-payments/SKILL.md` — pagos MP, idempotencia, firma webhook, anti-patterns, PCI DSS
- [ ] 0.2 Leer `.agents/skills/python-fastapi-ddd-skill/SKILL.md` — arquitectura Router→Service→UoW→Repository, UoW context manager, HTTPException en service
- [ ] 0.3 Leer `.agents/skills/supabase-postgres-best-practices/SKILL.md` — queries PostgreSQL, constraints UNIQUE, JSONB, indices
- [ ] 0.4 Leer `.agents/skills/api-design/SKILL.md` — status codes (200 webhook, 201 preferencia, 400 firma, 409 conflicto), rate limiting
- [ ] 0.5 Leer `.agents/skills/rest-api-design-patterns/SKILL.md` — patrones de endpoint publico, error responses RFC 7807
- [ ] 0.6 Leer `.agents/skills/jwt-security/SKILL.md` — endpoints sin JWT (webhook publico), proteccion de endpoints cliente
- [ ] 0.7 Leer `.agents/skills/tailwind-design-system/SKILL.md` — componentes React con Tailwind v4, clases de estado (loading, disabled, error)
- [ ] 0.8 Leer `.agents/skills/ui-design-system/SKILL.md` — accesibilidad WCAG, dialog nativo, aria-live, focus trap
- [ ] 0.9 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — performance React, TanStack Query cache, code splitting lazy
- [ ] 0.10 Leer `.agents/skills/zustand-state-management/README.md` — Zustand v5 `create<T>()()`, ephemeral store sin persist, selectors granulares
- [ ] 0.11 Leer `.agents/skills/frontend-state-management/SKILL.md` — separacion Zustand (estado cliente) vs TanStack Query (estado servidor)
- [ ] 0.12 Leer `.agents/skills/testing-e2e-playwright/SKILL.md` — tests E2E con mocks FastAPI, auth JWT, query params, flujo checkout
- [ ] 0.13 Leer `.agents/skills/post-change-verification/SKILL.md` — health check post-change: pytest, vitest, tsc, build

---

## 1. Auditoria Backend

### 1.1 Auditar `backend/pagos/service.py` — `crear_preferencia()`

- [ ] 1.1.1 Verificar que `notification_url` usa `settings.mercadopago_webhook_url`
  - **Archivo**: `backend/pagos/service.py` lineas ~136-137
  - **Criterio**: La variable se usa (no hardcodeada). Hay warning si el valor esta vacio o es localhost.
  - **Resultado actual**: La variable se usa con fallback a `http://localhost:8000/api/v1/webhooks/mercadopago` — falta el warning.

- [ ] 1.1.2 Verificar que `back_urls` incluye `pedido_id` en todos los casos
  - **Archivo**: `backend/pagos/service.py` lineas ~151-156
  - **Criterio**: Todos los `back_urls` (success, failure, pending) tienen `?payment=X&pedido_id={pedido_id}`.
  - **Resultado actual**: Correcto — ya implementado con formato correcto.

- [ ] 1.1.3 Verificar que `external_reference` es el `pedido_id` como string
  - **Archivo**: `backend/pagos/service.py` linea ~134
  - **Criterio**: `external_reference = str(pedido_id)` — correcto.
  - **Resultado actual**: Correcto.

- [ ] 1.1.4 Verificar que el `unit_price` del item usa el precio real del pedido (snapshot)
  - **Archivo**: `backend/pagos/service.py` linea ~148
  - **Criterio**: `"unit_price": float(pedido.total)` — usa el total del pedido (snapshot ya guardado al crear pedido).
  - **Resultado actual**: Correcto — `pedido.total` es el snapshot persistido en BD.

- [ ] 1.1.5 Verificar que hay `logger.info()` al inicio y al exito
  - **Archivo**: `backend/pagos/service.py`
  - **Criterio**: Al menos un log al inicio con `pedido_id, usuario_id` y uno al exito con `preference_id, init_point[:50]`.
  - **Resultado actual**: Falta — solo hay `logger.error()` en el caso de fallo.

### 1.2 Auditar `backend/pagos/service.py` — `procesar_webhook()`

- [ ] 1.2.1 Verificar INSERT en `pago_webhook_log` antes del procesamiento
  - **Archivo**: `backend/pagos/service.py` paso 9.2b
  - **Criterio**: El log se inserta SIEMPRE antes de cualquier procesamiento.
  - **Resultado actual**: Correcto — se inserta antes de la validacion de firma.

- [ ] 1.2.2 Verificar validacion de firma HMAC-SHA256
  - **Archivo**: `backend/pagos/service.py` paso 9.2c
  - **Criterio**: En `ENV=production`, firma invalida → HTTP 400. En `ENV=development`, firma invalida → warning y continua.
  - **Resultado actual**: Correcto. Verificar que el manifest es `id:{data_id};request-id:{request_id};ts:{ts};`

- [ ] 1.2.3 Verificar que no hay doble creacion de Pago (idempotencia)
  - **Archivo**: `backend/pagos/service.py` paso 9.2f
  - **Criterio**: `get_by_mercadopago_id()` primero; si existe → update. Si no → create con `IntegrityError` fallback.
  - **Resultado actual**: Correcto.

- [ ] 1.2.4 Verificar que el webhook siempre retorna 200 (excepto firma invalida en produccion)
  - **Archivo**: `backend/pagos/router.py` + `service.py`
  - **Criterio**: Todas las excepciones dentro de `procesar_webhook` son capturadas y loggeadas, no re-raised (excepto `HTTPException` de firma invalida).
  - **Resultado actual**: Correcto — el try-except externo captura todo.

- [ ] 1.2.5 Verificar logging en cada paso del webhook
  - **Archivo**: `backend/pagos/service.py`
  - **Criterio**: Al menos: entrada (topic, mp_id), firma validada/skip, pago obtenido del SDK, pago creado/actualizado, pedido confirmado.
  - **Resultado actual**: Logging parcial — falta log al inicio con resumen del payload.

- [ ] 1.2.6 Verificar que `confirmar_pedido_por_pago` transiciona PENDIENTE → CONFIRMADO
  - **Archivo**: `backend/pedidos/service.py`
  - **Criterio**: `confirmar_pedido_por_pago(pedido_id)` llama `uow.pedidos.update_estado(pedido_id, 2)` y appends a `historial_estado_pedido`.
  - **Resultado actual**: Ver tests existentes — cubierto en `test_confirmar_pedido_por_pago_success`.

### 1.3 Auditar `backend/pagos/router.py`

- [ ] 1.3.1 Verificar que el webhook endpoint esta bajo `/api/v1/webhooks/` (no `/api/v1/pagos/`)
  - **Archivo**: `backend/pagos/router.py`
  - **Criterio**: `webhooks_router = APIRouter(prefix="/webhooks", ...)` — separado del `pagos_router`.
  - **Resultado actual**: Correcto — dos routers separados.

- [ ] 1.3.2 Verificar que el endpoint de webhook acepta `content-type: application/json` de MP
  - **Archivo**: `backend/pagos/router.py` — `WebhookMPPayload` schema
  - **Criterio**: `WebhookMPPayload` tiene `extra="allow"` para tolerar campos adicionales que MP puede enviar.
  - **Resultado actual**: Correcto.

- [ ] 1.3.3 Verificar que el endpoint de crear-preferencia tiene rate limiting
  - **Archivo**: `backend/pagos/router.py`
  - **Criterio**: `@limiter.limit("5/minute")` aplicado.
  - **Resultado actual**: Correcto.

### 1.4 Auditar CORS para compatibilidad con ngrok

- [ ] 1.4.1 Verificar que CORS no bloquea llamadas del frontend cuando se accede via ngrok
  - **Archivo**: `backend/core/config.py`, `backend/main.py` (o donde se configura CORS)
  - **Criterio**: `CORS_ORIGINS` en `.env` debe incluir la URL de ngrok si el frontend se sirve desde ahi. Para desarrollo con frontend en localhost, `http://localhost:5173` es suficiente.
  - **Resultado actual**: El webhook de MP es server-to-server — CORS no aplica. El frontend en localhost:5173 esta en `CORS_ORIGINS` por defecto.

- [ ] 1.4.2 Verificar que el endpoint de webhook NO requiere preflight CORS
  - **Archivo**: `backend/main.py`
  - **Criterio**: El endpoint POST del webhook debe aceptar requests sin el header `Origin` (MP no envia CORS).
  - **Resultado actual**: Verificar configuracion de FastAPI CORS middleware.

### 1.5 Auditar `.env.example` backend

- [ ] 1.5.1 Verificar que `MERCADOPAGO_WEBHOOK_URL` esta documentado en `.env.example`
  - **Archivo**: `backend/.env.example`
  - **Criterio**: La variable existe con comentario explicando que debe ser la URL publica (ngrok en development, dominio real en produccion).
  - **Resultado actual**: Verificar si existe.

- [ ] 1.5.2 Verificar que `FRONTEND_URL` esta documentado
  - **Archivo**: `backend/.env.example`
  - **Criterio**: `FRONTEND_URL=http://localhost:5173` como valor por defecto.
  - **Resultado actual**: Verificar si existe.

---

## 2. Correcciones Backend

- [ ] 2.1 Agregar `logger.info()` al inicio de `crear_preferencia()`
  - **Archivo**: `backend/pagos/service.py` — al inicio de `crear_preferencia()`, despues de los checks de ownership/estado
  - **Implementacion**:
    ```python
    logger.info(
        "crear_preferencia: pedido_id=%s usuario_id=%s total=%s",
        pedido_id, usuario_id, pedido.total
    )
    ```
  - **Criterio de exito**: El log aparece en la consola del backend cuando se llama al endpoint.

- [ ] 2.2 Agregar `logger.info()` al exito de `crear_preferencia()`
  - **Archivo**: `backend/pagos/service.py` — despues del `return CrearPreferenciaResponse(...)`
  - **Implementacion**:
    ```python
    logger.info(
        "crear_preferencia OK: preference_id=%s pago_id=%s init_point=%.80s",
        preference_id, pago.id, init_point
    )
    ```
  - **Criterio de exito**: El log muestra el `preference_id` y los primeros 80 chars del `init_point`.

- [ ] 2.3 Agregar `logger.warning()` cuando `notification_url` usa el fallback
  - **Archivo**: `backend/pagos/service.py` — despues de calcular `notification_url`
  - **Implementacion**:
    ```python
    if not settings.mercadopago_webhook_url:
        logger.warning(
            "MERCADOPAGO_WEBHOOK_URL no configurado — usando fallback %s. "
            "MP no podra enviar webhooks a esta URL en produccion.",
            notification_url
        )
    ```
  - **Criterio de exito**: El warning aparece en consola cuando `MERCADOPAGO_WEBHOOK_URL` esta vacio.

- [ ] 2.4 Agregar `logger.info()` al inicio de `procesar_webhook()` con resumen del payload
  - **Archivo**: `backend/pagos/service.py` — al inicio de `procesar_webhook()`, despues de extraer `topic` y `data_id`
  - **Implementacion**:
    ```python
    logger.info(
        "procesar_webhook: topic=%s mp_id=%s request_id=%s",
        topic, data_id, request_id
    )
    ```
  - **Criterio de exito**: Cada webhook recibido genera un log al inicio con identificadores unicos para correlacionar con el ngrok dashboard.

- [ ] 2.5 Agregar `logger.info()` cuando se crea o actualiza un `Pago` en el webhook
  - **Archivo**: `backend/pagos/service.py` — paso 9.2f, despues de create o update
  - **Implementacion**: Dos lineas — una para create, una para update.
  - **Criterio de exito**: Se puede ver en logs si el pago fue creado o actualizado.

- [ ] 2.6 Agregar `logger.info()` al aprobar la firma HMAC en development
  - **Archivo**: `backend/pagos/service.py` — en el bloque `else` de la validacion de firma
  - **Implementacion**:
    ```python
    logger.info("Webhook signature: development mode — processing without strict validation")
    ```
  - **Criterio de exito**: Log visible en development para confirmar que el skip de firma fue intencional.

- [ ] 2.7 Verificar y actualizar `backend/.env.example` con variables MP faltantes
  - **Archivo**: `backend/.env.example`
  - **Criterio**: Las siguientes variables deben estar documentadas:
    - `MERCADOPAGO_WEBHOOK_URL=` (con comentario: URL publica de ngrok/produccion)
    - `FRONTEND_URL=http://localhost:5173`
  - **Si no existen**: Agregarlas con comentario explicativo.

---

## 3. Tests Backend

- [ ] 3.1 Verificar que los tests existentes en `backend/tests/test_pagos.py` pasan
  - **Comando**: `cd backend && pytest tests/test_pagos.py -v`
  - **Criterio de exito**: Todos los tests pasan sin errores.

- [ ] 3.2 Agregar test para verificar que `logger.warning` se lanza cuando `MERCADOPAGO_WEBHOOK_URL` esta vacio
  - **Archivo**: `backend/tests/test_pagos.py`
  - **Implementacion**: Mockear `settings.mercadopago_webhook_url = ""` y capturar logs con `caplog`.
  - **Criterio de exito**: El test verifica que el string "MERCADOPAGO_WEBHOOK_URL no configurado" aparece en los logs.

- [ ] 3.3 Agregar test para verificar que `crear_preferencia` logea al inicio con pedido_id
  - **Archivo**: `backend/tests/test_pagos.py`
  - **Implementacion**: Usar `caplog` de pytest para capturar logs en nivel INFO.
  - **Criterio de exito**: El log contiene `pedido_id=100` al llamar `crear_preferencia`.

- [ ] 3.4 Agregar test de integracion superficial: verificar que el endpoint de webhook retorna 200 para payload vacio
  - **Archivo**: `backend/tests/test_pagos.py`
  - **Nota**: Este test requiere `TestClient` de FastAPI o mock del UoW completo. Evaluar si aplica al patron del proyecto (tests planos con mocks de UoW).
  - **Criterio de exito**: `POST /api/v1/webhooks/mercadopago` con `{"type": "test"}` retorna 200.

- [ ] 3.5 Correr tests completos del backend para verificar no hay regresiones
  - **Comando**: `cd backend && pytest --cov=. --cov-report=term-missing -q`
  - **Criterio de exito**: Coverage >= 60% y todos los tests pasan.

---

## 4. Auditoria Frontend

### 4.1 Auditar `MercadoPagoButton.tsx`

- [ ] 4.1.1 Verificar que `initPoint` se lee desde el store y se usa directamente
  - **Archivo**: `frontend/src/features/payments/components/MercadoPagoButton.tsx`
  - **Criterio**: `const initPoint = usePaymentStore((state) => state.initPoint)` y `window.location.href = initPoint`.
  - **Resultado actual**: Correcto — redirect directo sin SDK modal.

- [ ] 4.1.2 Verificar que el boton esta deshabilitado si no hay `initPoint`
  - **Archivo**: `frontend/src/features/payments/components/MercadoPagoButton.tsx`
  - **Criterio**: `isDisabled = !initPoint || isLoading || status === 'waiting_payment'`.
  - **Resultado actual**: Correcto.

- [ ] 4.1.3 Verificar que `setStatus('waiting_payment')` se llama antes del redirect
  - **Archivo**: `frontend/src/features/payments/components/MercadoPagoButton.tsx`
  - **Criterio**: El status se actualiza antes de `window.location.href = initPoint` para que el store refleje el estado correcto aunque sea brevemente.
  - **Resultado actual**: Correcto.

### 4.2 Auditar `CheckoutPage.tsx` — deteccion de query params

- [ ] 4.2.1 Verificar que `?payment=success&pedido_id=X` setea `pedidoId` y `status='success'`
  - **Archivo**: `frontend/src/pages/CheckoutPage.tsx` — `useEffect` lineas ~144-167
  - **Criterio**: `setPedidoId(id)` y `setStatus('success')` se llaman con el id parseado.
  - **Resultado actual**: Correcto.

- [ ] 4.2.2 Verificar que `?payment=pending` activa el polling
  - **Archivo**: `frontend/src/pages/CheckoutPage.tsx`
  - **Problema identificado (F-06)**: `setStatus('pending')` se llama, pero `usePaymentStatusPolling` solo activa con `status === 'waiting_payment'`. El polling nunca activa para el caso `pending`.
  - **Criterio de exito tras el fix**: `?payment=pending` debe setear `status = 'waiting_payment'` para que el polling se active y determine el estado real del pedido.

- [ ] 4.2.3 Verificar que la validacion del carrito se omite cuando vienen query params de MP
  - **Archivo**: `frontend/src/pages/CheckoutPage.tsx` — segundo `useEffect` lineas ~172-185
  - **Criterio**: `if (paymentResult) return` evita `validateCart()` cuando se viene de MP.
  - **Resultado actual**: Correcto.

### 4.3 Auditar `useCreatePreference.ts`

- [ ] 4.3.1 Verificar que en `onSuccess` setea `idle` (no `waiting_payment`)
  - **Archivo**: `frontend/src/features/payments/hooks/useCreatePreference.ts`
  - **Criterio**: `setStatus('idle')` en `onSuccess` — el status `waiting_payment` lo setea `MercadoPagoButton` al hacer click.
  - **Resultado actual**: Correcto — flujo de dos pasos: generar preferencia → boton visible → click → redirect.

- [ ] 4.3.2 Verificar que el status intermedio `creating_preference` se setea en `handlePay`
  - **Archivo**: `frontend/src/pages/CheckoutPage.tsx` — `handlePay()` → `onSuccess` del pedido
  - **Problema identificado (F-03)**: El status va de `creating_order` directamente a `idle` (cuando la preferencia exito). Durante la creacion de la preferencia, el status es `creating_order` en vez de `creating_preference`.
  - **Criterio de exito tras el fix**: El boton muestra "Generando pago..." durante la creacion de la preferencia.

### 4.4 Auditar `usePaymentStatusPolling.ts`

- [ ] 4.4.1 Verificar la condicion de activacion del polling
  - **Archivo**: `frontend/src/features/payments/hooks/usePaymentStatusPolling.ts`
  - **Criterio**: `shouldPoll = pedidoId !== null && storeStatus === 'waiting_payment'`
  - **Resultado actual**: Correcto. El polling solo activa con `waiting_payment`.

- [ ] 4.4.2 Verificar el intervalo de polling
  - **Archivo**: `frontend/src/features/payments/hooks/usePaymentStatusPolling.ts`
  - **Problema identificado (F-05)**: `POLL_INTERVAL_MS = 30_000` (30 segundos). Para el caso `pending`, el usuario espera 30 segundos antes de ver el primer update.
  - **Criterio de exito tras el fix**: `POLL_INTERVAL_MS = 5_000` (5 segundos).

- [ ] 4.4.3 Verificar el manejo de `rejected` vs `cancelled` en el polling
  - **Archivo**: `frontend/src/features/payments/hooks/usePaymentStatusPolling.ts`
  - **Criterio**: `data.estado === 'rejected' || data.estado === 'cancelled'` → `setStatus('error')`.
  - **Resultado actual**: Correcto.

### 4.5 Auditar `PaymentStatusModal.tsx`

- [ ] 4.5.1 Verificar que el modal es visible con `success | error | pending`
  - **Archivo**: `frontend/src/features/payments/components/PaymentStatusModal.tsx`
  - **Criterio**: `isVisible = status === 'success' || status === 'error' || status === 'pending'`.
  - **Resultado actual**: Correcto.

- [ ] 4.5.2 Verificar la navegacion en `handleViewOrder()`
  - **Archivo**: `frontend/src/features/payments/components/PaymentStatusModal.tsx`
  - **Criterio**: `navigate('/pedidos/${pedidoId}')` — verificado en Router.tsx que la ruta correcta es `/pedidos/:id`.
  - **Resultado actual**: Correcto.

- [ ] 4.5.3 Verificar que `handleViewOrders()` navega a `/orders` (lista de pedidos)
  - **Archivo**: `frontend/src/features/payments/components/PaymentStatusModal.tsx`
  - **Criterio**: `navigate('/orders')` — verificado en Router.tsx que la ruta es `/orders`.
  - **Resultado actual**: Correcto.

- [ ] 4.5.4 Verificar que `handleRetry()` crea una nueva preferencia para el mismo pedido
  - **Archivo**: `frontend/src/features/payments/components/PaymentStatusModal.tsx`
  - **Criterio**: `createPreference({ pedido_id: pedidoId })` — reutiliza el pedido existente sin crear uno nuevo.
  - **Resultado actual**: Correcto — el pedido ya existe y esta en PENDIENTE para reintentar.

- [ ] 4.5.5 Verificar que el indicador de polling (`isPolling`) se muestra en el modal
  - **Archivo**: `frontend/src/features/payments/components/PaymentStatusModal.tsx`
  - **Problema identificado (F-06)**: `usePaymentStatusPolling(pedidoId)` solo activa con `waiting_payment`, pero el modal es visible con `success | error | pending`. El spinner de "Verificando pago..." nunca se muestra.
  - **Criterio de exito tras el fix**: Con `pending` seteado a `waiting_payment`, el polling activa y `isPolling=true` muestra el spinner.

---

## 5. Correcciones Frontend

- [ ] 5.1 Fix F-03: Setear `status = 'creating_preference'` al inicio del `onSuccess` del pedido
  - **Archivo**: `frontend/src/pages/CheckoutPage.tsx` — `handlePay()` → callback `onSuccess`
  - **Implementacion**: Agregar `setStatus('creating_preference')` como primera linea del `onSuccess`:
    ```typescript
    onSuccess: (orderData) => {
      setStatus('creating_preference')  // FIX F-03
      setPedidoId(orderData.id)
      createPreferenceMutation.mutate(...)
    }
    ```
  - **Criterio de exito**: El boton muestra "Generando pago..." mientras se crea la preferencia.

- [ ] 5.2 Fix F-06: Cambiar `setStatus('pending')` a `setStatus('waiting_payment')` en query params
  - **Archivo**: `frontend/src/pages/CheckoutPage.tsx` — `useEffect` que detecta query params
  - **Implementacion**:
    ```typescript
    } else if (paymentResult === 'pending') {
      if (pedidoIdParam) {
        const id = parseInt(pedidoIdParam, 10)
        if (!isNaN(id)) setPedidoId(id)
      }
      setStatus('waiting_payment')  // FIX F-06: activa polling
    }
    ```
  - **Criterio de exito**: Al llegar con `?payment=pending`, el polling se activa y el modal muestra el spinner de "Verificando pago...".

- [ ] 5.3 Fix F-05: Reducir `POLL_INTERVAL_MS` de 30000 a 5000
  - **Archivo**: `frontend/src/features/payments/hooks/usePaymentStatusPolling.ts`
  - **Implementacion**:
    ```typescript
    const POLL_INTERVAL_MS = 5_000  // FIX F-05: era 30_000
    ```
  - **Criterio de exito**: El polling consulta el estado cada 5 segundos en vez de 30.

- [ ] 5.4 Fix F-06 (complemento): Agregar seccion `waiting_payment` al modal para mostrar spinner de verificacion
  - **Archivo**: `frontend/src/features/payments/components/PaymentStatusModal.tsx`
  - **Problema**: El modal solo es visible con `success | error | pending`. Con el fix F-06, `pending` se convierte en `waiting_payment`. Necesitamos mostrar el modal tambien para `waiting_payment`.
  - **Implementacion**:
    ```typescript
    // Cambiar la condicion de visibilidad:
    const isVisible = status === 'success' || status === 'error' || status === 'waiting_payment'
    
    // Agregar seccion para waiting_payment (similar a pending pero con spinner prominente):
    {status === 'waiting_payment' && (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-9 w-9 animate-spin text-amber-600" ...spinner... />
        </div>
        <h2 id={titleId} className="text-xl font-bold text-foreground">
          Verificando tu pago...
        </h2>
        <p className="text-sm text-muted-foreground">
          Estamos confirmando tu pago con MercadoPago. Esto puede tomar unos segundos.
        </p>
        {retryCount > 0 && (
          <p className="text-xs text-muted-foreground">Reintento {retryCount}/{MAX_RETRIES}...</p>
        )}
      </div>
    )}
    ```
  - **Criterio de exito**: El modal muestra spinner animado mientras el polling esta activo en estado `pending`.

- [ ] 5.5 Verificar que `setPedidoId` se llama al crear el pedido (no solo en query params)
  - **Archivo**: `frontend/src/pages/CheckoutPage.tsx` — `handlePay()` → `onSuccess` del pedido
  - **Criterio**: `setPedidoId(orderData.id)` debe llamarse al crear el pedido para que el polling funcione si el usuario cierra la ventana y vuelve.
  - **Implementacion**: Agregar `setPedidoId(orderData.id)` en el `onSuccess` del pedido junto con el fix 5.1.

---

## 6. Tests Frontend / E2E

### 6.1 Tests unitarios (vitest)

- [ ] 6.1.1 Actualizar test de `usePaymentStatusPolling` para `POLL_INTERVAL_MS = 5000`
  - **Archivo**: `frontend/src/features/payments/hooks/__tests__/usePaymentStatusPolling.test.ts`
  - **Criterio**: Los tests de timing usan `5000` en vez de `30000`.

- [ ] 6.1.2 Agregar test para el caso `waiting_payment` activando el polling
  - **Archivo**: `frontend/src/features/payments/hooks/__tests__/usePaymentStatusPolling.test.ts`
  - **Criterio**: Con `storeStatus = 'waiting_payment'` y `pedidoId = 100`, el polling se activa y llama a `GET /api/v1/pagos/100/status`.

- [ ] 6.1.3 Agregar test para `PaymentStatusModal` en estado `waiting_payment`
  - **Archivo**: `frontend/src/features/payments/components/__tests__/PaymentStatusModal.test.tsx`
  - **Criterio**: El modal es visible y muestra "Verificando tu pago..." cuando `status === 'waiting_payment'`.

- [ ] 6.1.4 Agregar test para `CheckoutPage` — deteccion de `?payment=pending` activa `waiting_payment`
  - **Archivo**: `frontend/src/pages/__tests__/CheckoutPage.test.tsx` (crear si no existe)
  - **Criterio**: Al renderizar con `?payment=pending&pedido_id=42`, el store tiene `status === 'waiting_payment'` y `pedidoId === 42`.

- [ ] 6.1.5 Agregar test para el status intermedio `creating_preference`
  - **Archivo**: `frontend/src/pages/__tests__/CheckoutPage.test.tsx`
  - **Criterio**: En el `onSuccess` del pedido, el status cambia a `'creating_preference'` antes de que la mutacion de preferencia complete.

### 6.2 Tests E2E (Playwright) — flujo completo con mocks

- [ ] 6.2.1 Test E2E: flujo completo de pago exitoso con mock de MP
  - **Archivo**: `frontend/e2e/checkout-payment.spec.ts` (crear si no existe)
  - **Escenario**: Usuario autenticado en `/checkout` → selecciona MercadoPago → click "Preparar pago" → backend mock retorna `init_point` → click "Pagar con MercadoPago" → mock de redirect → URL cambia a `?payment=success&pedido_id=1` → modal de exito visible.
  - **Criterio**: `data-testid="payment-status-modal"` visible con texto "Pago exitoso".

- [ ] 6.2.2 Test E2E: flujo de pago pendiente activa polling
  - **Archivo**: `frontend/e2e/checkout-payment.spec.ts`
  - **Escenario**: URL con `?payment=pending&pedido_id=1` → modal con spinner visible → GET `/api/v1/pagos/1/status` mock retorna `estado: "approved"` → modal cambia a exito.
  - **Criterio**: El modal de spinner desaparece y se muestra el modal de exito.

- [ ] 6.2.3 Test E2E: flujo de pago fallido muestra opciones de retry
  - **Archivo**: `frontend/e2e/checkout-payment.spec.ts`
  - **Escenario**: URL con `?payment=failure&pedido_id=1` → modal de error visible → click "Intentar de nuevo" → nuevo `POST /api/v1/pagos/crear-preferencia` mock ejecutado.
  - **Criterio**: `data-testid="modal-retry-btn"` visible y al clickear llama al endpoint de preferencia.

---

## 7. Verificacion Manual con ngrok

- [ ] 7.1 Verificar configuracion del entorno

  **PASO 1: Entorno**
  ```bash
  docker ps
  docker exec foodstore-postgres pg_isready
  # Verificar que ngrok esta corriendo:
  curl -s https://envy-abruptly-grievance.ngrok-free.dev/api/v1/pagos/1/status
  ```
  - Criterio: PostgreSQL aceptando conexiones. ngrok responde (puede ser 404 o 401 — lo importante es que la URL resuelve).

  **PASO 2: Backend con logs habilitados**
  ```bash
  cd backend
  uvicorn main:app --reload --log-level info
  ```
  - Criterio: "Application startup complete" visible. Swagger en http://localhost:8000/docs

  **PASO 3: Frontend**
  ```bash
  cd frontend
  npm run dev
  ```
  - Criterio: "Local: http://localhost:5173"

- [ ] 7.2 Verificar que `crear-preferencia` logea correctamente

  ```bash
  # En Swagger: POST /api/v1/pagos/crear-preferencia
  # Authorization: Bearer <token de usuario CLIENT>
  # Body: { "pedido_id": 1 }
  ```
  - Criterio: En consola del backend aparece:
    - `INFO crear_preferencia: pedido_id=1 usuario_id=X total=...`
    - `INFO crear_preferencia OK: preference_id=... init_point=https://...`

- [ ] 7.3 Verificar flujo completo de checkout

  ```
  1. Login con usuario CLIENT en http://localhost:5173/login
  2. Agregar producto al carrito
  3. Ir a /checkout
  4. Seleccionar direccion de entrega
  5. Completar datos del comprador
  6. Seleccionar "MercadoPago"
  7. Click "Preparar pago" — verificar logs del backend
  8. Click "Pagar con MercadoPago" — redirect a init_point de MP sandbox
  9. En MP sandbox: usar tarjeta 4111 1111 1111 1111 (o 4509953566233704)
  10. Completar pago en sandbox
  ```
  - Criterio: MP redirige de vuelta a `http://localhost:5173/checkout?payment=success&pedido_id=X`

- [ ] 7.4 Verificar que el webhook se recibio y proceso correctamente

  ```bash
  # En ngrok dashboard (http://localhost:4040) verificar:
  # - POST /api/v1/webhooks/mercadopago con status 200
  
  # En logs del backend verificar:
  # - "procesar_webhook: topic=payment mp_id=XXXX"
  # - "Pedido id=X confirmed via payment mp_id=XXXX"
  
  # En BD verificar:
  docker exec -it foodstore-postgres psql -U postgres -d foodstore_db -c "
    SELECT p.id, p.mp_payment_id, p.mp_status, pe.estado_pedido_id
    FROM pagos p
    JOIN pedidos pe ON pe.id = p.pedido_id
    ORDER BY p.id DESC LIMIT 5;
  "
  ```
  - Criterio: `mp_status = 'approved'`, `estado_pedido_id = 2 (CONFIRMADO)`

- [ ] 7.5 Verificar el modal de pago exitoso y navegacion

  ```
  1. Despues del redirect con ?payment=success&pedido_id=X:
     - Modal "Pago exitoso" visible
     - Texto "Tu pedido #X fue procesado correctamente"
  2. Click "Ver mi pedido"
     - Navega a /pedidos/X
     - Pagina muestra detalles del pedido confirmado
  ```
  - Criterio: La ruta `/pedidos/X` renderiza `OrderDetailPage` con el pedido.

- [ ] 7.6 Verificar audit trail en BD

  ```bash
  docker exec -it foodstore-postgres psql -U postgres -d foodstore_db -c "
    SELECT pwl.id, pwl.topic, pwl.procesado, pwl.error_msg, pwl.creado_en
    FROM pago_webhook_log pwl
    ORDER BY pwl.id DESC LIMIT 10;
  "
  ```
  - Criterio: Al menos un registro con `procesado=true` y `error_msg=null`.

- [ ] 7.7 Verificar que el historial de estados del pedido fue actualizado

  ```bash
  docker exec -it foodstore-postgres psql -U postgres -d foodstore_db -c "
    SELECT hep.pedido_id, hep.estado_pedido_id, hep.creado_en
    FROM historial_estado_pedido hep
    WHERE hep.pedido_id = <pedido_id>
    ORDER BY hep.id;
  "
  ```
  - Criterio: Dos registros — uno con `estado_pedido_id=1` (PENDIENTE) y otro con `estado_pedido_id=2` (CONFIRMADO).

**Checklist final de verificacion manual:**
- [ ] PostgreSQL corriendo ✅
- [ ] Backend con logs info activos ✅
- [ ] Frontend corriendo ✅
- [ ] `crear_preferencia` logea al inicio y al exito ✅
- [ ] Warning cuando `MERCADOPAGO_WEBHOOK_URL` esta vacio ✅
- [ ] Flujo completo de pago con tarjeta de test ✅
- [ ] Webhook recibido con status 200 (ngrok dashboard) ✅
- [ ] Pedido en CONFIRMADO despues del webhook ✅
- [ ] Modal de exito visible y navegacion correcta ✅
- [ ] `pago_webhook_log.procesado = true` ✅

**Cuando todo sea ✅, responder exactamente:**
> **"✅ Todo funciona. Aprobado para archivar CHANGE frontend-backend-mercadopago-integration-fixes"**

---

## 8. Post-Change Verification (post-change-verification skill)

- [ ] 8.1 Backend: correr pytest completo
  ```bash
  cd backend && pytest --cov=. --cov-report=term-missing -q
  ```
  - Criterio: Todos los tests pasan. Coverage >= 60%.

- [ ] 8.2 Backend: verificar linting
  ```bash
  cd backend && black --check . && flake8 .
  ```
  - Criterio: Sin errores de formato ni estilo.

- [ ] 8.3 Frontend: correr vitest
  ```bash
  cd frontend && npx vitest run
  ```
  - Criterio: Todos los tests pasan.

- [ ] 8.4 Frontend: verificar TypeScript
  ```bash
  cd frontend && npx tsc --noEmit
  ```
  - Criterio: Sin errores de tipos.

- [ ] 8.5 Frontend: verificar build
  ```bash
  cd frontend && npm run build
  ```
  - Criterio: Build exitoso sin errores.

- [ ] 8.6 Verificar que Alembic no tiene migraciones pendientes
  ```bash
  cd backend && alembic current && alembic check
  ```
  - Criterio: Head revision sin migraciones pendientes. (Este change no agrega modelos nuevos, solo logging — no requiere migracion.)
