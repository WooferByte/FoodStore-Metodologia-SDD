## 0. Skills

- [ ] 0.1 Leer `.agents/skills/tailwind-design-system/SKILL.md` — componentes React con Tailwind v4, badges con colores OKLCH, tabla semántica responsiva
- [ ] 0.2 Leer `.agents/skills/ui-design-system/SKILL.md` — accesibilidad WCAG, ARIA en tabla y modales, badges con sr-only
- [ ] 0.3 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — React.lazy, bundle-dynamic-imports, rerender-memo, rerender-derived-state
- [ ] 0.4 Leer `.agents/skills/zustand-state-management/README.md` — store tipado v5 para filtros de usuarios (no persist)
- [ ] 0.5 Leer `.agents/skills/frontend-state-management/SKILL.md` — separación Zustand (client) vs TanStack Query (server), evitar duplicación
- [ ] 0.6 Leer `.agents/skills/dashboard-crud-page/SKILL.md` — estructura de página CRUD admin: tabla + modal + confirmation dialog
- [ ] 0.7 Leer `.agents/skills/testing-e2e-playwright/SKILL.md` — guard de ruta `/admin/usuarios` por rol ADMIN, loginAs helper
- [ ] 0.8 Leer `.agents/skills/post-change-verification/SKILL.md` — checklist vitest + tsc + build antes de archivar

## 1. Types y Constants

- [ ] 1.1 Crear `frontend/src/features/users/types/index.ts` — interfaces `AdminUser`, `UserFilters`, `UsersListResponse`, `UpdateUserPayload`, `ToggleUserStatusPayload`
- [ ] 1.2 Crear `frontend/src/features/users/constants/index.ts` — `ROLE_COLORS` (ADMIN=red, STOCK=blue, PEDIDOS=orange, CLIENT=green), `ROLES_LIST`, `PAGE_SIZE = 20`
- [ ] 1.3 Crear `frontend/src/features/users/constants/__tests__/constants.test.ts` — verificar que ROLE_COLORS tiene las 4 claves y PAGE_SIZE es 20

## 2. Zustand Store — Filtros

- [ ] 2.1 Crear `frontend/src/features/users/store/usersFiltersStore.ts` — store Zustand v5 con `q: string`, `rol: string`, `activo: string`, `page: number` y acciones `setQ`, `setRol`, `setActivo`, `setPage`, `resetFilters`. Sin persist — solo sobrevive en sesión. Sintaxis `create<T>()()`.
- [ ] 2.2 Crear `frontend/src/features/users/store/__tests__/usersFiltersStore.test.ts` — verificar estado inicial, setQ, setRol, resetFilters, y que setQ y setRol resetean page a 1

## 3. TanStack Query Hooks

- [ ] 3.1 Crear `frontend/src/features/users/hooks/useAdminUsers.ts` — `useQuery` con queryKey `['admin-users', filters]`, `staleTime: 60_000`, debounce interno 300ms en `q` antes de pasar al query key. Llama `GET /api/v1/admin/usuarios?limit=20&offset=X&q=&rol=&activo=`.
- [ ] 3.2 Crear `frontend/src/features/users/hooks/useUpdateUser.ts` — `useMutation` para `PUT /api/v1/admin/usuarios/:id`. `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['admin-users'] })`. `onError`: capturar 409 y relanzar para que el modal lo maneje inline.
- [ ] 3.3 Crear `frontend/src/features/users/hooks/useToggleUserStatus.ts` — `useMutation` para `PATCH /api/v1/admin/usuarios/:id/estado`. `onSuccess`: invalidar `['admin-users']`. `onError`: si HTTP 409, mostrar toast descriptivo "No se puede desactivar al único administrador del sistema".
- [ ] 3.4 Crear `frontend/src/features/users/hooks/__tests__/useAdminUsers.test.ts` — verificar queryKey incluye filters, staleTime=60000, y que debounce no llama al endpoint inmediatamente
- [ ] 3.5 Crear `frontend/src/features/users/hooks/__tests__/useUpdateUser.test.ts` — verificar que onSuccess invalida el queryKey y que onError con 409 relanza el error
- [ ] 3.6 Crear `frontend/src/features/users/hooks/__tests__/useToggleUserStatus.test.ts` — verificar que 409 muestra toast y no relanza, y que onSuccess invalida el queryKey

## 4. Componente UserFiltersPanel

- [ ] 4.1 Crear `frontend/src/features/users/components/UserFiltersPanel.tsx` — input de búsqueda controlado (lee Zustand, llama `setQ`), select de rol (opciones: "Todos los roles" + 4 roles), select de activo (opciones: "Todos", "Activos", "Inactivos"). Todas las opciones en español. Labels con `<label>` explícito o `aria-label`. Path alias `@/`.

## 5. Componente UsersTable

- [ ] 5.1 Crear `frontend/src/features/users/components/UsersTable.tsx` — tabla semántica `<table role="grid" aria-label="Lista de usuarios">` con `<thead>`, `<tbody>`, `<th scope="col">` para cada columna. Columnas: Email, Nombre, Roles, Estado, Acciones.
- [ ] 5.2 En `UsersTable`: columna Roles renderiza un badge por cada rol usando `ROLE_COLORS`. Cada badge con `<span className="sr-only">Rol:</span>` antes del nombre del rol.
- [ ] 5.3 En `UsersTable`: columna Estado renderiza badge verde "Activo" si `activo=true`, badge rojo "Inactivo" si `activo=false`. Cada badge con `<span className="sr-only">Estado:</span>`.
- [ ] 5.4 En `UsersTable`: columna Acciones con botón Editar (icono `Pencil` de lucide-react) y botón de toggle estado (icono `UserCheck`/`UserX`). Ambos con `aria-label` descriptivo ("Editar [nombre]", "Desactivar [nombre]" / "Activar [nombre]").
- [ ] 5.5 En `UsersTable`: layout responsivo — `<table>` visible solo en `md+` (clase `hidden md:table`). Cards de usuario visibles solo en mobile (`md:hidden`), cada card como `<article>` con la misma información.
- [ ] 5.6 En `UsersTable`: mostrar `<TableSkeleton>` o skeleton nativo mientras `isLoading=true`. No mostrar tabla vacía.

## 6. Componente UserEditModal

- [ ] 6.1 Crear `frontend/src/features/users/components/UserEditModal.tsx` — modal con `useState` local para `nombre`, `apellido`, `email`, `roles: string[]`. Props: `user: AdminUser | null`, `isOpen: boolean`, `onClose: () => void`.
- [ ] 6.2 En `UserEditModal`: validación client-side antes de llamar al hook — email requerido (no vacío), formato email válido (regex básico), al menos un rol seleccionado. Mostrar errores inline bajo cada campo.
- [ ] 6.3 En `UserEditModal`: checkboxes para los 4 roles (ADMIN, STOCK, PEDIDOS, CLIENT) con `<label>` asociado y un dot de color correspondiente a `ROLE_COLORS`.
- [ ] 6.4 En `UserEditModal`: llamar `useUpdateUser`. En `onSuccess` cerrar modal. En error 409: mostrar el `detail` del error RFC 7807 como error inline (no toast). En error no-409: mostrar toast genérico.
- [ ] 6.5 En `UserEditModal`: estado de loading en botón "Guardar" mientras la mutación está en vuelo (`isPending`). Deshabilitar botón durante loading.
- [ ] 6.6 En `UserEditModal`: reset de estado local cuando el modal se abre (useEffect con `isOpen` y `user` como deps).

## 7. Componente UserStatusModal

- [ ] 7.1 Crear `frontend/src/features/users/components/UserStatusModal.tsx` — diálogo de confirmación. Props: `user: AdminUser | null`, `isOpen: boolean`, `onClose: () => void`. Mostrar "¿Desactivar a [nombre]?" si `user.activo=true`, "¿Activar a [nombre]?" si `user.activo=false`.
- [ ] 7.2 En `UserStatusModal`: botones "Cancelar" (llama `onClose`) y "Confirmar" (llama `useToggleUserStatus` con `{ activo: !user.activo }`). Confirmar con estado de loading.
- [ ] 7.3 En `UserStatusModal`: en `onSuccess` cerrar modal. El manejo del toast 409 está en el hook `useToggleUserStatus` — no duplicar lógica en el modal.

## 8. Página UsersPage

- [ ] 8.1 Crear `frontend/src/pages/UsersPage.tsx` — orquesta todos los componentes. Lee filtros de `usersFiltersStore`, pasa offset calculado a `useAdminUsers`. Gestiona `selectedUser` (para edit) y `statusUser` (para toggle) con `useState`. Renderiza: `<UserFiltersPanel>`, `<UsersTable>`, controles de paginación, `<UserEditModal>`, `<UserStatusModal>`.
- [ ] 8.2 En `UsersPage`: paginación — calcular `totalPages = Math.ceil(total / PAGE_SIZE)`. Botones "Anterior" / "Siguiente" con `disabled` cuando corresponde. Mostrar "Página X de Y".
- [ ] 8.3 En `UsersPage`: pasar `onEdit` y `onToggleStatus` callbacks a `UsersTable` — `onEdit(user)` setea `selectedUser` y abre `UserEditModal`; `onToggleStatus(user)` setea `statusUser` y abre `UserStatusModal`.

## 9. Registro de Ruta

- [ ] 9.1 Actualizar `frontend/src/app/Router.tsx` — importar `UsersPage` con `React.lazy(() => import('@/pages/UsersPage'))`. Registrar ruta `/admin/usuarios` dentro del bloque `ProtectedRoute` con `requiredRole="ADMIN"` (o el mecanismo existente de guard). Envolver en `<Suspense fallback={<PageSkeleton />}>`.

## 10. Verificación Post-Change

- [ ] 10.1 Correr `npx tsc --noEmit` desde `frontend/` — 0 errores TypeScript
- [ ] 10.2 Correr `npx vitest run` desde `frontend/` — todos los tests pasan (incluyendo los nuevos de `features/users/`)
- [ ] 10.3 Correr `npm run build` desde `frontend/` — build de producción sin errores (warnings de chunk size son OK)
- [ ] 10.4 Levantar `npm run dev` y verificar manualmente: navegar a `/admin/usuarios` como ADMIN, verificar tabla, abrir modal de edición, abrir modal de estado
- [ ] 10.5 Verificar que CLIENT redirige a `/403` al intentar acceder a `/admin/usuarios`
