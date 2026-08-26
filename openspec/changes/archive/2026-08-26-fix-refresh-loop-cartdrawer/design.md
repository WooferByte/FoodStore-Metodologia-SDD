# Design — fix-refresh-loop-cartdrawer

## Context

Ver `proposal.md → Why` para la motivación. Estado actual verificado en código:

- `frontend/src/app/App.tsx` (líneas 50-53) monta `CartDrawer` globalmente, fuera de `<Routes>`, en todas las páginas.
- `frontend/src/widgets/CartDrawer/CartDrawer.tsx:46` llama `useCartTotals()`, que compone `useSystemConfig('envio_gratis_umbral')` y `useSystemConfig('envio_costo')` (`useCartTotals.ts:24-25`).
- `useSystemConfig`/`useAllSystemConfigs` (`features/configuracion/hooks/useSystemConfig.ts`) consultan `GET <CONFIGURACION_API_PATH>` **sin condición**: no hay `enabled`, no se checa sesión.
- `CONFIGURACION_API_PATH = '/api/v1/admin/configuracion'` (sin trailing slash). El backend define `router = APIRouter(prefix="/configuracion")` + `@router.get("/")` → ruta real `/api/v1/admin/configuracion/`. Sin slash → FastAPI responde 307.
- El interceptor (`shared/api/axios.ts:218-240`): ante 401 toma `refreshToken` del store (null en anónimo), hace `POST /api/v1/auth/refresh` con `{ refresh_token: null }` → 422 → catch → `logout()` + `window.location.href = '/login'` → reload → el ciclo recomienza.
- `authStore` NO persiste `refreshToken` (seguridad, `partialize` solo guarda accessToken/user/isAuthenticated), por lo que tras un reload el store queda con `refreshToken: null` aunque haya accessToken persistido.

## Goals / Non-Goals

**Goals:**
- Usuarios anónimos navegan el catálogo y el drawer sin ningún request a `/admin/configuracion`, sin 401, sin refresh y sin reload loop.
- El flujo de refresh 401 para sesiones autenticadas queda intacto (concurrencia, queue, retry).
- Sesiones autenticadas siguen obteniendo envío/total desde config del servidor.

**Non-Goals:**
- No cambiar la API backend (el 307 y el 401 son comportamiento correcto del server).
- No cambiar la política de persistencia de tokens (refreshToken NO se persiste por diseño).
- No cambiar el fallback local (umbral 3000 / costo 500) ya existente en `useCartTotals`.
- No mover `CartDrawer` de su montaje global.

## Decisions

### D-1: Gatear el fetch a nivel de hook con `enabled` de TanStack Query

`useSystemConfig` y `useAllSystemConfigs` agregan `enabled: isAuthenticated`, con `isAuthenticated` leído vía selector granular de `useAuthStore((s) => s.isAuthenticated)`.

- **Por qué**: un solo punto de control corrige a TODOS los consumidores (`CartDrawer`, `OrderSummary`, `CheckoutPage`) sin repetir condicionales en cada render. Cuando `enabled=false`, TanStack Query mantiene la query idle y `data` queda `undefined` → los fallbacks de `useCartTotals` operan solos. Al hacer login, la query se dispara sola.
- **Alternativa descartada**: gatear en `CartDrawer` (fetch solo si drawer abierto + autenticado). Rechazada: deja `OrderSummary`/`CheckoutPage` con el mismo bug y duplica lógica.
- **Regla FSD**: no se duplica server state en Zustand — el gate es solo `enabled` de TanStack Query (estado servidor) sobre un selector de Zustand (estado cliente).

### D-2: Trailing slash en `CONFIGURACION_API_PATH`

Cambiar la constante a `/api/v1/admin/configuracion/` para alinear con la ruta real del backend y eliminar el 307 intermedio.

- **Por qué**: defensa en profundidad. El gate (D-1) y el guard del interceptor (D-3) ya matan el loop; el slash elimina un round-trip extra innecesario y hace el request 200/401 directo. Beneficia también al admin (`useAdminConfiguraciones` usa la misma constante).
- **Alternativa**: cambiar el backend a ruta sin slash. Rechazada: requiere migración backend innecesaria para un fix 100% frontend.

### D-3: Interceptor — short-circuit cuando no hay refresh token

En el bloque 401, antes de iniciar refresh: si `!useAuthStore.getState().refreshToken` → `return Promise.reject(error)` directo (sin POST, sin logout, sin redirect).

- **Por qué**: sin refresh token no hay sesión recuperable; el POST con null solo produce 422 y alimenta el loop. Preserva la serialización de 401 concurrentes (queue) para el caso autenticado.

### D-4: Interceptor — no hard reload si ya estás en `/login`

En el catch de refresh fallido, condicionar la navegación: `if (window.location.pathname !== '/login') window.location.href = '/login'`. El `logout()` siempre se ejecuta.

- **Por qué**: estando en `/login`, recargar solo reinicia el ciclo. React Router ya está en la página correcta; no hace falta navegación a full-page.
- **Alternativa descartada**: usar `useNavigate`. El interceptor vive fuera del árbol React (módulo de Axios); requeriría un mecanismo de navegación imperativo extra. El chequeo de pathname es mínimo y suficiente.

## Risks / Trade-offs

- [Anónimos con 401 de un endpoint mal diseñado lo reciben en silencio (sin redirect)] → Aceptable: una sesión anónima no tiene nada que refrescar; el requisito es NO loop. Los toasts existentes siguen informando el error.
- [El guard de `/login` podría ocultar un fallo de auth real en esa página] → El flujo de login maneja su propio error; el interceptor no debe interferir con reload en la página de login.
- [Con el gate (D-1), la config no se fetcha hasta el primer login] → Esperado y deseado: la config es server state de sesión; el cache de TanStack Query la materializa tras login.

## Migration Plan

- **Deploy**: sin backend, sin migraciones, sin cambios de DB. Solo frontend (4 archivos + tests). Se aplica con el deploy normal de `npm run build`.
- **Rollback**: revertir los cambios de `useSystemConfig.ts`, `constants/index.ts`, `axios.ts` y los tests. Sin estado intermedio.

## Open Questions

Ninguna. Las decisiones que faltaban (gate a nivel hook vs consumidor, slash en frontend vs backend, navegación por pathname) se resolvieron acá y no cambian specs ni task breakdown.
