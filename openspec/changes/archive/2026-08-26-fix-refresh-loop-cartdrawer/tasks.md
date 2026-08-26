## 0. Skills

- [x] 0.1 Leer `.agents/skills/frontend-state-management/SKILL.md` — decisión Zustand vs TanStack Query: el fix es un gate de `enabled` en `useQuery`, nunca duplicar server state en Zustand
- [x] 0.2 Leer `.agents/skills/zustand-state-management/README.md` — selectores granulares de `useAuthStore` (`isAuthenticated`) sin object refs (evita re-renders/loops)
- [x] 0.3 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — `enabled` en `useQuery` y evitar requests/fetches innecesarios
- [x] 0.4 Leer `.agents/skills/jwt-security/SKILL.md` — interceptor refresh: nunca llamar `/auth/refresh` sin token, manejo seguro de tokens en memoria
- [x] 0.5 Leer `.agents/skills/testing-e2e-playwright/SKILL.md` — cómo testear flujo anónimo (sin loop de reload) vs autenticado con sesión seeded

## 1. Gate de configuración por autenticación

- [x] 1.1 En `frontend/src/features/configuracion/hooks/useSystemConfig.ts`: leer `isAuthenticated` de `useAuthStore` con selector granular y agregar `enabled: isAuthenticated` en `useSystemConfig` y `useAllSystemConfigs`
- [x] 1.2 Verificar consumidores (`useCartTotals.ts`, `OrderSummary`, `CheckoutPage`, admin): con `data` undefined (query disabled) siguen usando los fallbacks existentes (umbral 3000 / costo 500) sin errores
- [x] 1.3 Confirmar que NO se duplica server state en Zustand (el gate es exclusivamente `enabled` de TanStack Query sobre un selector de Zustand)

## 2. Trailing slash en el API path

- [x] 2.1 En `frontend/src/features/configuracion/admin/constants/index.ts`: cambiar `CONFIGURACION_API_PATH` a `/api/v1/admin/configuracion/` (ruta real del backend, evita el 307 de FastAPI)
- [x] 2.2 Verificar que `useAdminConfiguraciones` y todos los usos de la constante siguen compilando y funcionando

## 3. Guardas en el interceptor axios

- [x] 3.1 En `frontend/src/shared/api/axios.ts`: en el bloque 401, si `!useAuthStore.getState().refreshToken` → rechazar el error directo, sin `POST /auth/refresh`, sin logout y sin redirect
- [x] 3.2 En el catch del refresh fallido: condicionar `window.location.href = '/login'` a `window.location.pathname !== '/login'`; `authStore.logout()` se ejecuta siempre

## 4. Tests unitarios (vitest)

- [x] 4.1 En `frontend/src/shared/api/__tests__/axios.test.ts`: caso anónimo — 401 con `refreshToken` null → rechaza sin llamar a `/auth/refresh` ni setear `window.location.href`
- [x] 4.2 En `frontend/src/shared/api/__tests__/axios.test.ts`: caso refresh fallido estando en `/login` → `logout()` ejecutado pero sin navegación
- [x] 4.3 Test de `useSystemConfig`: con `isAuthenticated=false` la query no dispara el fetch; con `true` sí
- [x] 4.4 En `frontend/src/features/cart/__tests__/useCartTotals.test.tsx`: usuario anónimo usa fallbacks sin realizar fetch de configuración

## 5. E2E (Playwright)

- [x] 5.1 Agregar spec E2E de flujo anónimo: sin sesión, navegar el catálogo → NO redirige a `/login`, no hay loop de reload y no se llama a `/api/v1/auth/refresh` (mockear la red y verificar ausencia de requests)
- [x] 5.2 Verificar flujo autenticado: con sesión seeded (helper `e2e/helpers/auth.ts`), el drawer muestra envío/total correctos (la config se fetchea)

## 6. Verificación final

- [x] 6.1 `npx vitest run` sin regresiones
- [x] 6.2 `npm run lint` y `npm run build` (tsc + vite) sin errores
- [x] 6.3 `openspec validate --change "fix-refresh-loop-cartdrawer"` pasa
