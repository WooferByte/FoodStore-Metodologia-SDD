## Why

La app es **inutilizable para usuarios anónimos**: hay un loop infinito de reload. `CartDrawer` se monta globalmente (fuera de `<Routes>`) y su `useCartTotals()` → `useSystemConfig()` dispara `GET /api/v1/admin/configuracion` **incondicionalmente** incluso sin sesión. El request anónimo recibe 307 (trailing slash) → 401, y el interceptor axios intenta un refresh con `refreshToken` null (no se persiste), obtiene 422 y hace `window.location.href = '/login'` → reload → el ciclo se repite para siempre. El bug lo introdujo `shipping-fee-consistency` (d5213af) al cablear `useSystemConfig` en `CartDrawer`.

## What Changes

- Gatear `useSystemConfig` / `useAllSystemConfigs` por autenticación: `enabled` en `useQuery` reactivo vía selector de `useAuthStore` (`isAuthenticated`).
- Agregar trailing slash a `CONFIGURACION_API_PATH` (`/api/v1/admin/configuracion/`) para eliminar el 307 de FastAPI (la ruta backend es `GET /configuracion/`).
- Interceptor axios: si `!refreshToken` → rechazar el 401 directo, sin hacer `POST /api/v1/auth/refresh` (hoy envía body con null → 422).
- Interceptor axios: en el catch de refresh fallido, NO recargar (`location.href`) si ya estás en `/login`.

## Capabilities

### New Capabilities
<!-- Ninguna: el fix es 100% frontend y no introduce una capacidad nueva del sistema. -->

### Modified Capabilities
- `axios-jwt-interceptor`: el flujo de refresh solo se dispara cuando existe `refreshToken`; el fallback de auth limpia estado sin hard reload cuando ya se está en `/login`. Cambia comportamiento observable para sesiones anónimas (ya no hay 401 → refresh 422 → loop).
- `system-configuration`: consumo frontend auth-gateado — el cliente NO debe consultar `GET /api/v1/admin/configuracion` sin sesión. Cambia comportamiento observable del cliente para anónimos.

## Impact

- **Frontend** (única capa afectada):
  - `frontend/src/features/configuracion/hooks/useSystemConfig.ts`
  - `frontend/src/features/configuracion/admin/constants/index.ts`
  - `frontend/src/shared/api/axios.ts`
  - Consumidores indirectos: `frontend/src/widgets/CartDrawer/CartDrawer.tsx`, `frontend/src/features/cart/hooks/useCartTotals.ts`, `OrderSummary`, `CheckoutPage`.
- **Backend**: sin cambios (el 307/401 es comportamiento esperado de FastAPI; el fix es del cliente).
- **Tests**: `frontend/src/shared/api/__tests__/axios.test.ts`, `errorInterceptor.test.ts`, tests de `useSystemConfig` / `useCartTotals`, spec E2E de flujo anónimo.
- **Dependencias / DB / API**: ninguna.
