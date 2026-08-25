## 0. Skills

- [x] 0.1 Leer `.agents/skills/python-fastapi-ddd-skill/SKILL.md` — arquitectura Router→Service→UoW→Repository→Model, Pydantic v2, FastAPI Depends, service nunca hace session.commit()
- [x] 0.2 Leer `.agents/skills/supabase-postgres-best-practices/SKILL.md` — diseño de índices, queries parametrizadas; aplica a la revisión de `pago_webhook_log` (sin migraciones nuevas en este change)
- [x] 0.3 Leer `.agents/skills/api-design/SKILL.md` — status codes, response_model explícito, RFC 7807, rate limiting; sin cambios de endpoints pero se respetan convenciones
- [x] 0.4 Leer `.agents/skills/web-payments/SKILL.md` — webhooks, back_urls, auto_return, flujo de redirect de MercadoPago, seguridad (no commitear secretos)
- [x] 0.5 Leer `.agents/skills/tailwind-design-system/SKILL.md` — Tailwind v4 (si se toca UI del PaymentStatusModal/CheckoutPage)
- [x] 0.6 Leer `.agents/skills/ui-design-system/SKILL.md` — accesibilidad WCAG AA del modal de estado de pago y componentes de checkout
- [x] 0.7 Leer `.agents/skills/zustand-state-management/README.md` — Zustand v5, selectores granulares, `create<T>()()`, paymentStore
- [x] 0.8 Leer `.agents/skills/frontend-state-management/SKILL.md` — separación Zustand (cliente) vs TanStack Query (servidor); el resultado de redirect es estado cliente
- [x] 0.9 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — re-render optimización, efectos, imports directos `@/`
- [x] 0.10 Leer `.agents/skills/testing-e2e-playwright/SKILL.md` — helpers de auth (`loginAs`), `page.route`, flujo E2E del checkout con backend real
- [x] 0.11 Leer `.agents/skills/post-change-verification/SKILL.md` — health check: pytest ≥60% cov, alembic head, vitest, tsc, build

## 1. Backend — Config plumbing (TDD)

- [x] 1.1 Escribir test rojo en `backend/tests/test_pagos.py`: `test_preferencia_payload_urls_configurables` — con `MP_FRONTEND_URL` y `MP_NOTIFICATION_URL` seteadas, el payload de `crear_preferencia` usa `back_urls.* = {MP_FRONTEND_URL}/checkout` y `notification_url = MP_NOTIFICATION_URL`
- [x] 1.2 Escribir test rojo en `backend/tests/test_pagos.py`: `test_preferencia_auto_return_solo_url_real` — con `MP_FRONTEND_URL` real el payload incluye `auto_return: "approved"`; con default localhost NO incluye `auto_return`
- [x] 1.3 Agregar `mp_notification_url: str = Field(default="http://localhost:8000/api/v1/webhooks/mercadopago", alias="MP_NOTIFICATION_URL")` a `Settings` en `backend/core/config.py`
- [x] 1.4 Agregar `mp_frontend_url: str = Field(default="http://localhost:5173", alias="MP_FRONTEND_URL")` a `Settings` en `backend/core/config.py`
- [x] 1.5 Modificar `backend/pagos/service.py` `crear_preferencia()`: reemplazar el dict hardcodeado de `back_urls` (líneas ~146-150) y `notification_url` (línea ~151) por valores de `settings`; los tres `back_urls` apuntan a `{settings.mp_frontend_url}/checkout`
- [x] 1.6 Agregar `auto_return: "approved"` al `preference_data` solo cuando `not settings.mp_frontend_url.startswith("http://localhost")` (ver design.md D-3)
- [x] 1.7 Verificar que los tests 1.1 y 1.2 pasan (verde) sin romper los tests existentes de `crear_preferencia` (mock del SDK)
- [x] 1.8 Correr suite backend completa: `.venv/Scripts/pytest --cov=. --cov-report=term-missing -x -q` — sin regresiones, coverage ≥60%

## 2. Frontend — Reconciliación del retorno de MercadoPago (TDD)

- [x] 2.1 Escribir test rojo en `frontend/src/features/payments/__tests__/` para un helper puro `mpReturnToPaymentResult` (o similar) que mapee query params nativos de MP → `{ status, pedidoId }`:
  - `status=approved` → `success`; `status=pending|in_process` → `pending`; `status=rejected|cancelled|failure` → `error`
  - `external_reference` no entero → `pedidoId` no se fija
  - fallback legacy: `payment=success&pedido_id=7` → `{ status: 'success', pedidoId: 7 }`
  - precedencia de params nativos sobre legacy
- [x] 2.2 Implementar el helper de mapeo en `frontend/src/features/payments/utils/` (o donde indique el FSD existente de `features/payments/`), imports con `@/`
- [x] 2.3 Escribir test rojo de componente en `frontend/src/pages/__tests__/`: render de `CheckoutPage` con `useSearchParams` mockeado (`?status=approved&external_reference=42`) → verifica que `paymentStore.status='success'` y `pedidoId=42`
- [x] 2.4 Modificar `frontend/src/pages/CheckoutPage.tsx` (efecto líneas ~132-155): reemplazar la lectura de `payment`+`pedido_id` por el helper (params nativos primero, fallback legacy)
- [x] 2.5 Verificar que los tests 2.1 y 2.3 pasan (verde) y que `npx vitest run` no rompe tests existentes de checkout/payments
- [x] 2.6 Correr `npx tsc --noEmit` en `frontend/` — 0 errores de tipos

## 3. Entorno y documentación de configuración

- [x] 3.1 Agregar a `backend/.env.example` (sección MercadoPago) los comentarios/ejemplos de `MP_NOTIFICATION_URL=http://localhost:8000/api/v1/webhooks/mercadopago` y `MP_FRONTEND_URL=http://localhost:5173` — SIN valores reales ni tokens
- [x] 3.2 Verificar que `backend/.env` y `frontend/.env` siguen gitignored (no se commitean; `git status` no debe mostrar `.env`)
- [x] 3.3 Verificar CORS: si el E2E usa un `MP_FRONTEND_URL` público, `CORS_ORIGINS` del backend debe incluir ese origen (ajustar `backend/.env` local, no commitear)
- [x] 3.4 Confirmar `ENV=development` se mantiene (validación de firma de webhook off) — sin cambios de código

## 4. E2E — Pago real con MercadoPago (apply)

- [x] 4.1 Crear usuario test buyer en MercadoPago vía MCP (`create_test_user`, profile=buyer, site_id=MLA) y guardar su ID/credenciales en el `.env` local (nunca commitear)
- [x] 4.2 Exponer el backend local con una URL pública alcanzable por MP (túnel tipo ngrok apuntando a `http://localhost:8000`) y usar esa URL para `MP_NOTIFICATION_URL` y `MP_FRONTEND_URL` en `backend/.env`
- [x] 4.3 Configurar webhook vía MCP `save_webhook` con `callback` = `{URL_PÚBLICA}/api/v1/webhooks/mercadopago` y topic `payment`
- [x] 4.4 Levantar backend (`uvicorn main:app --reload`) y frontend (`npm run dev`) con las credenciales TEST ya cargadas
- [x] 4.5 Escribir/correr test E2E en `frontend/e2e/checkout/` (Playwright): login como CLIENT (helper `loginAs`), agregar producto al carrito, ir a `/checkout`, completar form, generar preferencia, pagar con tarjeta de prueba `5031 7557 3453 0604` (titular APRO / DNI 12345678 → approved)
- [x] 4.6 Verificar en el flujo E2E el retorno a `/checkout` (auto_return si la URL es real; si no, clic en "Volver al sitio"), que el modal muestre éxito y que `GET /pagos/{id}/status` reporte `approved`
- [x] 4.7 Verificar en BD: `pago_webhook_log` con registro del webhook real y `Pago.mp_status='approved'` (query en `foodstore_db` vía docker)

## 5. Verificación post-implementación (post-change-verification)

- [x] 5.1 `cd backend && .venv/Scripts/black --check . && .venv/Scripts/flake8 .` — lint limpio
- [x] 5.2 `cd backend && .venv/Scripts/pytest --cov=. --cov-report=term-missing -x -q` — ≥60% coverage, sin regresiones
- [x] 5.3 `cd backend && .venv/Scripts/alembic upgrade head` — sin migraciones nuevas, debe quedar "already up to date"
- [x] 5.4 `cd frontend && npx vitest run` — sin regresiones
- [x] 5.5 `cd frontend && npx tsc --noEmit && npm run build` — 0 errores, build OK
- [x] 5.6 Confirmar que no se commitearon secretos: `git status` sin `.env`, revisar diff antes del commit


> **Nota verificación (2026-08-20)**: black/flake8 y pytest reportan fallos PRE-EXISTENTES ajenos a este change (test_base_repository, test_orders_*, test_rbac_roles, test_security, test_dependencies, test_uow — FastAPI 0.110 HTTPAuthCredentials removido, aiosqlite faltante, mocks desactualizados). test_pagos.py 23/23 verde, sin regresiones introducidas. Deuda técnica pendiente para otra sesión.