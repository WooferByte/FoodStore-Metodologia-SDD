## Context

The `backend-admin-users-endpoints` change is archived. The three backend endpoints are live:
- `GET /api/v1/admin/usuarios` — paginated list with optional `q`, `rol`, `activo` query params
- `PUT /api/v1/admin/usuarios/:id` — update user name, email, and roles
- `PATCH /api/v1/admin/usuarios/:id/estado` — toggle activo status

The admin panel already has a working dashboard (`/admin/dashboard`). The next gap is `/admin/usuarios`. The project uses FSD (Feature Sliced Design), Zustand v5 for client state, TanStack Query v5 for server state, Tailwind v4, and lucide-react icons. No new dependencies are needed.

## Goals / Non-Goals

**Goals:**
- Paginated, filterable user table at `/admin/usuarios` (ADMIN-only, guarded by existing `ProtectedRoute`)
- Edit user name, email, and roles via a modal with client-side validation and 409 error surfacing
- Activate/deactivate users via a confirmation dialog before issuing the PATCH
- Filter state (search, rol, activo) persisted in Zustand so navigating away and back restores the view
- Responsive layout: semantic `<table>` on `md+` breakpoint, stacked cards on mobile
- Role badges with distinct colors: ADMIN=red, STOCK=blue, PEDIDOS=orange, CLIENT=green
- Debounced (300ms) search across email and nombre
- Tests for hooks (mocked TanStack Query), constants, and store slice

**Non-Goals:**
- Create new users from the admin panel (no POST endpoint in backend)
- Hard-delete users (backend enforces soft delete with `eliminado_en`)
- Password reset from admin panel
- Bulk actions (select multiple, batch edit)
- Server-side sorting (backend does not support it)

## Decisions

### Decision 1: Filter state in Zustand, not URL params
**Chosen**: Zustand `usersFiltersStore` (client-only slice, no `persist`)  
**Alternatives considered**:
- URL search params (`?q=&rol=&page=`) — better for shareable links but adds URL encoding complexity and breaks the "navigate away and back" use case without extra logic
- `useState` local to `UsersPage` — simpler but state is lost on navigation

**Rationale**: The requirement explicitly says "filters persist when navigating". Zustand is the project-standard for client UI state. No persistence to `localStorage` is needed — state only survives within the same session tab, which matches the UX expectation. URL params would require syncing Zustand ↔ URL on mount, adding unnecessary complexity.

### Decision 2: TanStack Query for user list, NOT Zustand
**Chosen**: `useAdminUsers` hook with `useQuery`, `staleTime: 60_000`  
**Rationale**: User list data is server state. Storing it in Zustand would violate the project's strict rule against duplicating server data in client stores. TanStack Query handles caching, refetching, and background updates automatically. `staleTime: 60_000` avoids hammering the API on every keystroke while still keeping data fresh after 1 minute.

### Decision 3: Debounce in the hook, not the component
**Chosen**: The `useAdminUsers` hook accepts raw filter values and debounces the `q` param internally before passing it to the query key  
**Alternatives**: Debounce in `UserFiltersPanel` before updating Zustand  
**Rationale**: Debouncing in the hook keeps the component dumb and makes the behavior testable in isolation. Zustand immediately reflects what the user typed (controlled input), but the API call waits 300ms.

### Decision 4: Edit modal uses uncontrolled local state (not Zustand)
**Chosen**: `UserEditModal` manages its form fields with `useState` internally  
**Rationale**: Form state is transient and modal-scoped. It does not need to survive navigation or be shared across components. Putting it in Zustand would be over-engineering. The modal resets its state when unmounted (on close).

### Decision 5: `UserStatusModal` is a separate component from `UserEditModal`
**Chosen**: Two distinct modal components  
**Rationale**: Status toggle is a confirmation dialog (simple yes/no with user name shown), not an edit form. Mixing them would complicate both. Separation follows single-responsibility and makes each component independently testable.

### Decision 6: Responsive strategy — table + cards, no virtualization
**Chosen**: CSS-only responsive switch (`hidden md:table` / `md:hidden`)  
**Rationale**: Admin user lists are unlikely to exceed a few hundred rows. Virtualization (e.g., TanStack Virtual) adds complexity not justified at this scale. Pagination (20 per page from API) keeps the DOM size bounded. The table uses semantic `<table>` with full ARIA on desktop; cards use `<article>` with `role="row"` equivalent on mobile.

### Decision 7: Role checkboxes in edit modal, not a multi-select dropdown
**Chosen**: Checkbox group for roles  
**Rationale**: There are exactly 4 roles (ADMIN, STOCK, PEDIDOS, CLIENT). A checkbox group is more accessible and easier to implement than a custom multi-select. Each checkbox has an explicit `<label>` with the role name and a color indicator matching the table badge.

## Risks / Trade-offs

- **409 on last ADMIN deactivation**: Backend returns HTTP 409 with RFC 7807 body. The frontend must parse `detail` from the error response and show it as a toast — not just a generic error message. Risk: if Axios interceptor swallows the error before the mutation callback sees it, the toast will be generic. Mitigation: ensure `useToggleUserStatus` catches the error in its `onError` callback BEFORE the interceptor, or that the interceptor re-throws structured errors.

- **Debounce + pagination reset**: When the user types in the search field, pagination must reset to `offset=0` to avoid showing page 3 of a new filtered result. Mitigation: the `useAdminUsers` hook resets `offset` to 0 whenever `q`, `rol`, or `activo` filter changes.

- **Stale data after mutations**: After a successful `PUT` or `PATCH`, the user list must reflect the change. Mitigation: both mutation hooks call `queryClient.invalidateQueries({ queryKey: ['admin-users'] })` in `onSuccess`, which triggers a background refetch.

- **Role removal protection on edit**: The backend returns 409 if the edited user is the last ADMIN and the ADMIN role is being removed. The frontend cannot know this client-side without an extra API call. Mitigation: surface the 409 `detail` message in the edit modal as an inline error (not just a toast) so the user understands what happened without closing the modal.

## Migration Plan

1. Create `frontend/src/features/users/` directory structure and all files
2. Register `/admin/usuarios` in `Router.tsx` with `React.lazy` + `Suspense`
3. Verify the existing `ProtectedRoute` wrapping admin routes already enforces ADMIN role — no new route guard needed
4. Run `npx vitest run` to confirm all new tests pass and no regressions
5. Run `npx tsc --noEmit` to verify TypeScript compiles cleanly
6. Run `npm run build` to confirm production bundle has no errors

Rollback: the route registration is the only change to existing files. Reverting `Router.tsx` is sufficient to disable the feature without affecting any other admin pages.

## Open Questions

- Should the `activo` filter default to "todos" (show all users including inactive) or "activos" (show only active)? **Decision**: Default to "todos" — admins managing users need to see inactive accounts to reactivate them.
- Should editing a user's own account be blocked in the UI? **Decision**: No — the backend allows it and the UI should not add restrictions not present in the spec.
