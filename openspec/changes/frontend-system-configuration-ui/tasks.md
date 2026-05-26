## 0. Skills

- [x] 0.1 Leer `.agents/skills/tailwind-design-system/SKILL.md` — diseño responsive, tokens semánticos, dark mode
- [x] 0.2 Leer `.agents/skills/ui-design-system/SKILL.md` — modales accesibles, focus trap, ARIA
- [x] 0.3 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — lazy loading, code splitting, TanStack Query
- [x] 0.4 Leer `.agents/skills/dashboard-crud-page/SKILL.md` — patrón tabla admin, formularios inline, notificaciones

## 1. Feature: types y constants

- [x] 1.1 Crear `frontend/src/features/configuracion/admin/types/index.ts` — `Configuracion`, `ConfiguracionEditData`
- [x] 1.2 Crear `frontend/src/features/configuracion/admin/constants/index.ts` — `CONFIGURACION_QUERY_KEY`, `CONFIGURACION_API_PATH`

## 2. Feature: hooks

- [x] 2.1 Crear `frontend/src/features/configuracion/admin/hooks/useAdminConfiguraciones.ts` — `useQuery` para `GET /api/v1/admin/configuracion`
- [x] 2.2 Crear `frontend/src/features/configuracion/admin/hooks/useUpdateConfiguracion.ts` — `useMutation` para `PUT /api/v1/admin/configuracion/{clave}` con invalidación de caché y toast
- [x] 2.3 Crear `frontend/src/features/configuracion/admin/hooks/index.ts` — re-export

## 3. Feature: componentes

- [x] 3.1 Crear `frontend/src/features/configuracion/admin/components/ConfigTable.tsx` — tabla responsive con skeleton, empty state, error state, badges de tipo
- [x] 3.2 Crear `frontend/src/features/configuracion/admin/components/ConfigEditModal.tsx` — modal de edición con input para valor, validación, toast

## 4. Página y Router

- [x] 4.1 Crear `frontend/src/pages/AdminConfiguracionPage.tsx` — orquesta tabla + modal, estado local con useState
- [x] 4.2 Actualizar `frontend/src/app/Router.tsx` — reemplazar placeholder inline por `lazy(() => import(...))` con `<AdminConfiguracionPage />`

## 5. Tests y validación

- [x] 5.1 Crear tests unitarios para hooks y componentes (`__tests__/`)
- [x] 5.2 Ejecutar `npx vitest run` y verificar que no hay regresiones (658 tests passed)
- [x] 5.3 Ejecutar `npx tsc --noEmit` y verificar 0 errores (0 errors in new code)
- [x] 5.4 `git status` y verificar archivos involucrados (committed)
