## Why

The backend `admin-users-management` API is fully implemented and archived, but there is no admin UI to manage users. Administrators currently have no visual interface to list, filter, edit, or toggle the status of platform users, creating a gap in the admin panel that blocks day-to-day operations.

## What Changes

- Add `frontend/src/features/users/` — new FSD feature module with hooks, components, types, and constants
- Add `frontend/src/pages/UsersPage.tsx` — lazy-loaded page that composes the feature into `/admin/usuarios`
- Add `frontend/src/features/users/store/usersFiltersStore.ts` — Zustand v5 slice for filter state (search query, rol filter, activo filter) persisted across navigations
- Add `frontend/src/features/users/hooks/useAdminUsers.ts` — TanStack Query v5 hook for paginated user list (`staleTime: 60_000`)
- Add `frontend/src/features/users/hooks/useUpdateUser.ts` — mutation hook for `PUT /api/v1/admin/usuarios/:id`
- Add `frontend/src/features/users/hooks/useToggleUserStatus.ts` — mutation hook for `PATCH /api/v1/admin/usuarios/:id/estado`
- Add `frontend/src/features/users/components/UsersTable.tsx` — semantic `<table>` with ARIA, responsive (table on `md+`, cards on mobile)
- Add `frontend/src/features/users/components/UserEditModal.tsx` — modal to edit nombre/email/roles with client-side validation and 409 error handling
- Add `frontend/src/features/users/components/UserStatusModal.tsx` — confirmation dialog before activating/deactivating a user
- Add `frontend/src/features/users/components/UserFiltersPanel.tsx` — debounced (300ms) search input + rol select + activo select
- Update `frontend/src/app/Router.tsx` — register `/admin/usuarios` → `<UsersPage />` (lazy)
- Add unit tests in `frontend/src/features/users/hooks/__tests__/`, `constants/__tests__/`, and `store/__tests__/`

## Capabilities

### New Capabilities
- `admin-users-management-ui`: Frontend CRUD page for managing platform users — list with pagination and live filters, edit user data and roles, activate/deactivate with confirmation, role badges with color coding, responsive layout (table/cards).

### Modified Capabilities
- `admin-users-management`: Backend requirements remain unchanged. The frontend consumes the existing endpoints without modifying backend behavior.

## Impact

- **Frontend routes**: `/admin/usuarios` — requires ADMIN role guard (already enforced by `ProtectedRoute`)
- **New dependencies**: None — all required packages (React, TanStack Query v5, Zustand v5, Tailwind v4, lucide-react) are already installed
- **API consumed**: `GET /api/v1/admin/usuarios`, `PUT /api/v1/admin/usuarios/:id`, `PATCH /api/v1/admin/usuarios/:id/estado`
- **Zustand store**: `usersFiltersStore` stores UI-only filter state (search, rol, activo) — NO duplication of server data
- **Testing**: vitest unit tests for hooks (mocked TanStack Query), constants, and store slices
