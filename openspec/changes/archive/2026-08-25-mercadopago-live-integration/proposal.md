## Why

La integración MercadoPago ya existe y funciona a nivel de código (SDK `mercadopago==2.2.0`, endpoints `crear-preferencia`, `webhooks/mercadopago`, `status`), pero está **hardcodeada a localhost** en `backend/pagos/service.py`: MercadoPago no puede alcanzar ni `http://localhost:8000/api/v1/webhooks/mercadopago` ni los `back_urls` apuntando a rutas que además **no existen** en el frontend. Con las credenciales de prueba reales (TEST) ya cargadas en los `.env`, la integración sigue sin poder funcionar en un entorno real. Este change es el **pase live/configuración** que convierte la integración existente en algo que opera con MercadoPago de verdad, más un E2E de pago real con tarjeta de prueba.

## What Changes

- **Backend — configuración de URLs** (`backend/pagos/service.py` + `backend/core/config.py`): reemplazar los valores hardcodeados por variables de entorno configurables:
  - `notification_url` ← `MP_NOTIFICATION_URL` (default dev: `http://localhost:8000/api/v1/webhooks/mercadopago`).
  - `back_urls.{success,failure,pending}` ← `${MP_FRONTEND_URL}/checkout` (default dev: `http://localhost:5173`).
- **Backend — `auto_return`**: habilitar `auto_return: "approved"` cuando la URL de retorno configurada **no** sea localhost (MercadoPago rechaza auto_return contra localhost). Con URL real el usuario vuelve automáticamente tras pago aprobado.
- **Frontend — reconciliación del retorno** (`frontend/src/pages/CheckoutPage.tsx`): el código actual lee `?payment=success|failure|pending&pedido_id=X`, parámetros que MercadoPago **nunca envía** (MP devuelve `status`, `payment_id`, `external_reference`). Se adapta la detección en `/checkout` para leer los parámetros nativos de MP (`status` + `external_reference`), con fallback al contrato legacy.
- **Config plumbing**: agregar `MP_NOTIFICATION_URL` y `MP_FRONTEND_URL` a `Settings` (pydantic-settings), documentarlas en `backend/.env.example` (sin valores, `.env` queda gitignored). Verificar CORS/`ENV` handling; se mantiene `ENV=development` (validación de firma de webhook sigue desactivada).
- **Tests**: backend pytest (configuraciones, payload de preferencia, auto_return condicional) + frontend vitest (mapeo de query params a estados del paymentStore).
- **E2E real** (apply): crear usuario test buyer vía MCP, configurar webhook vía MCP `save_webhook`, y correr flujo de pago completo con tarjeta de prueba MP `5031 7557 3453 0604` (APRO / DNI 12345678 → approved).

## Capabilities

### New Capabilities

- `payment-return-handling`: Detección del resultado del redirect de MercadoPago en `/checkout` (parámetros nativos `status` + `external_reference`), mapeo a los estados del paymentStore (success/error/pending) y al `pedido_id`, con fallback al contrato legacy `payment`+`pedido_id`.

### Modified Capabilities

- `payment-preference-creation`: La creación de preferencia pasa de URLs hardcodeadas a configuración por entorno (`MP_NOTIFICATION_URL`, `MP_FRONTEND_URL`) y habilita `auto_return: "approved"` para URLs reales (no localhost).

## Impact

- **Backend**: `backend/core/config.py` (2 nuevas settings), `backend/pagos/service.py` (payload de preferencia), `backend/.env.example` (2 variables documentadas). Sin cambios de modelo ni migraciones.
- **Frontend**: `frontend/src/pages/CheckoutPage.tsx` (detección de retorno), sin cambios de rutas (las 3 rutas inexistentes quedan eliminadas del contrato). Posibles helpers de mapeo en `frontend/src/features/payments/`.
- **Tests**: `backend/tests/test_pagos.py` (nuevos casos de payload/config), `frontend/src/pages/__tests__/` (mapeo de query params). Vitest para frontend, pytest para backend.
- **Seguridad**: las credenciales TEST no se commitean; `.env` permanece gitignored. Webhook: `ENV=development` mantiene firma off.
- **Infra/entorno**: para el E2E real se requiere una URL pública alcanzable por MP (túnel, p. ej. ngrok) para `notification_url` y `back_urls`; se gestiona en apply.
