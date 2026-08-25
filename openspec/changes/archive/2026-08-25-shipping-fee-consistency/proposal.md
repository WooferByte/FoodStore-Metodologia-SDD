# Proposal: shipping-fee-consistency

## Why

La regla de envío de Food Store — *envío gratis si subtotal ≥ umbral configurable (`envio_gratis_umbral`, seed "3000"), si no +$500* — existe SOLO como cálculo local en `frontend/src/features/cart/components/OrderSummary.tsx` (usado únicamente en `/cart`). Como el backend nunca computa ni persiste el envío, hay **3 inconsistencias verificadas en vivo (2026-08-25)**: el CartDrawer muestra el subtotal como "Total" ($2.800), el resumen de CheckoutPage y el payload a `POST /pedidos` ignoran el envío (el backend calcula `total = subtotal`), y la preferencia de MercadoPago cobra $2.800 en vez de $3.300. El usuario ve un precio distinto según dónde mire y paga menos de lo que el carrito le muestra.

## What Changes

- **Backend = fuente de verdad del envío**:
  - Agregar clave de configuración `envio_costo = "500"` al seed (`backend/scripts/seed.py`, junto a `envio_gratis_umbral`) — idempotente.
  - `create_pedido` (`backend/pedidos/service.py`) lee `envio_gratis_umbral` y `envio_costo` desde la tabla `configuracion` (helper `_get_config_int` existente), calcula `envio = 0 si subtotal >= umbral else costo` y persiste `total = subtotal + envio`. El cliente NO puede overridear el total: `PedidoCreate` no tiene campo `total` (se mantiene).
  - Agregar columna `envio` al modelo `Pedido` (Numeric(10,2) NOT NULL default 0) + **migración Alembic** (revisión `012`, down_revision `011`). Filas históricas quedan en 0 (coherente con lo que realmente se cobró).
  - Exponer `envio` en `PedidoResponse` (`backend/pedidos/schemas.py`).
  - `pagos/service.py` NO cambia: la preferencia MP ya cobra `float(pedido.total)` (línea 142) y ahora recibirá el total correcto.
- **Frontend = fuente de verdad única para mostrar**:
  - Nuevo hook compartido `useCartTotals` en `frontend/src/features/cart/hooks/` que compone `cartStore` (estado cliente) + `useSystemConfig` (estado servidor) y devuelve `{ subtotal, deliveryFee, total, isFreeDelivery, missingForFree }`.
  - `OrderSummary`, `CartDrawer` (footer + CTA) y `CheckoutPage` (columna de resumen) usan el hook compartido — los 3 muestran $3.300 para subtotal $2.800.
  - CheckoutPage mantiene el payload a `POST /pedidos` enviando solo `items` (sin total): el backend lo computa.

## Capabilities

### New Capabilities
- `orders-shipping`: Regla de envío (umbral de envío gratis + costo fijo de envío desde configuración), aplicada en backend (`create_pedido` la computa y la persiste en `Pedido.envio`/`total`) y compartida en frontend vía `useCartTotals` por `OrderSummary`, `CartDrawer` y `CheckoutPage`.

### Modified Capabilities
- `orders-api`: El requerimiento de creación de pedido cambia — `create_pedido` ahora computa y persiste el envío (`envio` + `total` incluye envío) y `PedidoResponse` expone `envio`.
- `system-configuration`: El requerimiento de seed data cambia — se agrega la clave `envio_costo = "500"` a las configuraciones por defecto.

## Impact

- **Backend**: `backend/pedidos/service.py` (create_pedido), `backend/pedidos/schemas.py` (PedidoResponse), `backend/core/models.py` (Pedido.envio), `backend/alembic/versions/012_*.py` (nueva migración), `backend/scripts/seed.py` (nuevo config seed), `backend/tests/test_orders_api.py`, `backend/tests/test_configuracion.py`.
- **Frontend**: `frontend/src/features/cart/hooks/useCartTotals.ts` (nuevo), `OrderSummary.tsx` (refactor a hook compartido), `frontend/src/widgets/CartDrawer/CartDrawer.tsx`, `frontend/src/pages/CheckoutPage.tsx`, tests vitest en `frontend/src/features/cart/__tests__/`.
- **E2E**: `frontend/e2e/` — flujo checkout con envío correcto ($3.300).
- **Sin cambios**: `pagos/service.py` (MP cobra `pedido.total` automáticamente), contrato `POST /pedidos` (el cliente no manda total).
