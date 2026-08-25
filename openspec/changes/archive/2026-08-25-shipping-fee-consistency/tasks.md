# Tasks: shipping-fee-consistency

## 0. Skills

- [x] 0.1 Leer `.agents/skills/python-fastapi-ddd-skill/SKILL.md` — reglas de capas (Router→Service→UoW→Repo→Model), HTTPException desde service, service sin session.commit(), response_model explícito para `create_pedido`/`PedidoResponse`.
- [x] 0.2 Leer `.agents/skills/supabase-postgres-best-practices/SKILL.md` — migración Alembic de la columna `envio` (NUMERIC), defaults, backfill correcto sin tocar tablas directo.
- [x] 0.3 Leer `.agents/skills/api-design/SKILL.md` — contrato POST /pedidos con total computado por servidor (sin campo `total` en request) y `PedidoResponse.envio` como campo de respuesta.
- [x] 0.4 Leer `.agents/skills/tailwind-design-system/SKILL.md` — clases Tailwind v4 (solo tokens semánticos) para las filas Subtotal/Envío/Total en OrderSummary, CartDrawer y CheckoutPage.
- [x] 0.5 Leer `.agents/skills/ui-design-system/SKILL.md` — accesibilidad (WCAG 2.1 AA): labels/aria en footer del CartDrawer y resumen del checkout, jerarquía visual del Total.
- [x] 0.6 Leer `.agents/skills/zustand-state-management/README.md` — selectores granulares del cartStore (`totalPrice()`), derivar en render sin mutar; no duplicar datos de servidor en el store.
- [x] 0.7 Leer `.agents/skills/frontend-state-management/SKILL.md` — separación estado cliente (Zustand) vs estado servidor (TanStack Query): umbral/costo viven en `useSystemConfig`, no en el cartStore.
- [x] 0.8 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — cache de TanStack Query para `system-config`, invalidación en CheckoutPage (evitar config stale antes de crear pedido).
- [x] 0.9 Leer `.agents/skills/testing-e2e-playwright/SKILL.md` — helpers `loginAs`/`logout`, mocks de FastAPI (`page.route`) para el flujo de envío en /cart, CartDrawer y /checkout.
- [x] 0.10 Leer `.agents/skills/post-change-verification/SKILL.md` — checklist de health check completo (pytest, alembic, vitest, tsc, build) previo a opsx:archive.

## 1. Backend — seed + modelo + migración

- [x] 1.1 Agregar `("envio_costo", "500", "Costo de envío fijo (en pesos)")` a `configuraciones_spec` en `backend/scripts/seed.py` (junto a `envio_gratis_umbral`, línea ~415). Verificar idempotencia: rerun del seed no duplica la clave.
- [x] 1.2 Agregar campo `envio: Decimal = Field(decimal_places=2, max_digits=10, default=Decimal("0.00"))` al modelo `Pedido` en `backend/core/models.py`.
- [x] 1.3 Crear migración Alembic `backend/alembic/versions/012_add_pedido_envio.py` (`revision="012"`, `down_revision="011"`) que agrega `envio NUMERIC(10,2) NOT NULL DEFAULT 0` a la tabla `pedidos`. Ejecutar `backend/.venv/Scripts/alembic upgrade head` y verificar `alembic current` muestra `(head)`.

## 2. Backend — create_pedido + schemas (Strict TDD)

> Strict TDD: para cada comportamiento, escribir el test primero → verlo fallar → implementar → verlo pasar. Runner: `backend/.venv/Scripts/pytest`.

- [x] 2.1 Escribir tests en `backend/tests/test_orders_api.py` que fallan (rojos): (a) pedido con subtotal $2.800 < umbral → `envio=500`, `total=3300`, `PedidoResponse` incluye `envio`; (b) subtotal $3.000 ≥ umbral → `envio=0`, `total=3000`; (c) claves `envio_gratis_umbral`/`envio_costo` ausentes en `configuracion` → defaults 3000/500; (d) request a POST /pedidos con `total`/`envio` fabricados → ignorados, el backend recomputa (el pedido creado tiene el total correcto).
- [x] 2.2 Exponer `envio: Decimal` en `PedidoResponse` (`backend/pedidos/schemas.py`).
- [x] 2.3 Modificar `create_pedido` (`backend/pedidos/service.py:230`): renombrar el acumulador `total` a `subtotal`; leer `envio_gratis_umbral` (default 3000) y `envio_costo` (default 500) con el helper `_get_config_int`; calcular `envio = Decimal("0.00") if subtotal >= umbral else costo`; setear `pedido.envio = envio` y `pedido.total = subtotal + envio`. NO tocar `PedidoCreate` (sigue sin campo `total`).
- [x] 2.4 Correr tests backend → verdes: `backend/.venv/Scripts/pytest tests/test_orders_api.py tests/test_configuracion.py -x -q`. Sin regresiones en la suite: `backend/.venv/Scripts/pytest -x -q`.

## 3. Frontend — hook compartido useCartTotals (Strict TDD)

> Strict TDD: test primero → rojo → implementar → verde. Runner: `npx vitest run`.

- [x] 3.1 Escribir `frontend/src/features/cart/__tests__/useCartTotals.test.tsx` (rojo): subtotal $2.800 + config umbral 3000/costo 500 → `{ subtotal: 2800, deliveryFee: 500, total: 3300, isFreeDelivery: false, missingForFree: 200 }`; subtotal $3.000 → `{ deliveryFee: 0, total: 3000, isFreeDelivery: true }`; config sin cargar → fallbacks 3000/500.
- [x] 3.2 Crear `frontend/src/features/cart/hooks/useCartTotals.ts`: compone `useCartStore((s) => s.totalPrice())` + `useSystemConfig('envio_gratis_umbral')` + `useSystemConfig('envio_costo')` (cache compartido, una sola request) y devuelve `{ subtotal, deliveryFee, total, isFreeDelivery, missingForFree }`. Exportar desde `frontend/src/features/cart/hooks/index.ts`.
- [x] 3.3 Correr `npx vitest run src/features/cart/__tests__/useCartTotals.test.tsx` → verde.

## 4. Frontend — CartDrawer

- [x] 4.1 En `frontend/src/widgets/CartDrawer/CartDrawer.tsx`: reemplazar el footer (líneas ~161-166) para usar `useCartTotals()` — fila "Envío" ($500 o $0/¡Gratis!) + fila "Total" con `total` (3.300); CTA (línea ~185) → `Proceder al pago · {formatCurrency(total)}`.
- [x] 4.2 Agregar/actualizar test vitest del footer del CartDrawer (en `frontend/src/widgets/__tests__/` o el patrón existente): con subtotal $2.800 muestra "Envío" $500 y Total $3.300; con subtotal $3.000 muestra envío gratis.

## 5. Frontend — CheckoutPage

- [x] 5.1 En `frontend/src/pages/CheckoutPage.tsx`: columna de resumen (líneas ~591-599) usa `useCartTotals()` — filas Subtotal + Envío ($500 o gratis) + Total (3.300). Al montar la página, invalidar la query `system-config` (`queryClient.invalidateQueries(['system-config'])`) para evitar config stale antes de crear el pedido.
- [x] 5.2 Mantener el payload a `POST /pedidos` (líneas ~216-226) sin `total`/`envio` (solo items) — el backend computa. Verificar que el total mostrado coincide con `pedido.total` devuelto.
- [x] 5.3 Test vitest del resumen de checkout si el harness lo permite; si no, cubrirlo en el E2E (grupo 8).

## 6. Frontend — OrderSummary refactor

- [x] 6.1 Refactor `frontend/src/features/cart/components/OrderSummary.tsx`: eliminar `DELIVERY_FEE` (línea 22) y el cálculo local; usar `useCartTotals()`. Conservar badge "¡Gratis!", barra "Te faltan $X", subtotal y CTA con `total`.
- [x] 6.2 Actualizar `frontend/src/features/cart/__tests__/OrderSummary.test.tsx` para los nuevos casos: subtotal $2.800 → Envío $500 + Total $3.300; subtotal $3.000 → gratis. Correr `npx vitest run` de la feature.

## 7. Frontend — suite completa

- [x] 7.1 Correr `npx tsc --noEmit` → 0 errores.
- [x] 7.2 Correr `npx vitest run` → todos verdes, cobertura ≥ 40%.

## 8. E2E — consistencia de envío (Playwright)

- [x] 8.1 Crear `frontend/e2e/shipping/shipping-fee.spec.ts` con `loginAs(page, 'CLIENT')` y mocks de FastAPI (`page.route`): GET `/api/v1/admin/configuracion` (umbral 3000, costo 500) y POST `/api/v1/pedidos`. Verificar que para un carrito de subtotal $2.800: `/cart` (OrderSummary) muestra Total $3.300; el footer y CTA del CartDrawer muestran $3.300; `/checkout` muestra Subtotal $2.800 + Envío $500 + Total $3.300.
- [x] 8.2 Assert del payload/respuesta: el POST `/pedidos` devuelve `{ total: 3300, envio: 500 }`; el mock de `POST /pagos/crear-preferencia` recibe un pedido con `unit_price=3300`.
- [x] 8.3 Correr `npx playwright test e2e/shipping/` → verde (con `npm run dev` levantado).

## 9. Post-change verification

- [x] 9.1 Ejecutar el checklist de `post-change-verification`: backend `.venv/Scripts/pytest --cov=. --cov-report=term-missing -x -q` (≥60%), `.venv/Scripts/alembic upgrade head` + `alembic current` (head), uvicorn arranca y Swagger OK, frontend `npx tsc --noEmit`, `npx vitest run` (≥40%), `npm run build` OK.
- [x] 9.2 Guía de testing manual (Regla 3 de AGENTS.md) con PASO 4 específico: carrito subtotal $2.800 → los 3 puntos muestran Total $3.300; pedido real devuelve `total=3300, envio=500`; preferencia MP cobra $3.300. Validar BD: `SELECT id, subtotal, envio, total FROM pedidos` (o el equivalente real).
- [x] 9.3 Responder con el bloque de confirmación exacto: "✅ pytest: X/X passing · alembic: at head · vitest: X/X passing · tsc: 0 errors · build: compiled successfully" antes de pedir aprobación para `opsx:archive`.
