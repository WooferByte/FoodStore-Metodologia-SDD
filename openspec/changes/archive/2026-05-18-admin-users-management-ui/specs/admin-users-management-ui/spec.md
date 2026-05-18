## ADDED Requirements

### Requirement: Admin can view a paginated list of users in a table
The system SHALL render a `/admin/usuarios` page that displays all non-deleted users in a paginated semantic table on desktop (`md+`) and as stacked cards on mobile. The page SHALL only be accessible to authenticated users with the ADMIN role.

#### Scenario: ADMIN visits /admin/usuarios
- **WHEN** an authenticated ADMIN navigates to `/admin/usuarios`
- **THEN** the page renders a table of users with columns: email, nombre + apellido, roles (badges), activo (badge), and acciones

#### Scenario: Non-admin is redirected
- **WHEN** a user without ADMIN role navigates to `/admin/usuarios`
- **THEN** the route guard redirects to `/403`

#### Scenario: Unauthenticated user is redirected
- **WHEN** an unauthenticated user navigates to `/admin/usuarios`
- **THEN** the route guard redirects to `/login`

#### Scenario: Skeleton shown while loading
- **WHEN** the user list is being fetched
- **THEN** the table shows a skeleton loading state instead of an empty table

#### Scenario: Pagination controls are visible
- **WHEN** the total number of users exceeds 20
- **THEN** pagination controls (previous/next page) are rendered below the table

#### Scenario: Mobile layout shows cards instead of table
- **WHEN** the viewport width is below the `md` breakpoint
- **THEN** each user is rendered as a card instead of a table row

### Requirement: Admin can filter users by search, rol, and active status
The system SHALL provide a filter panel with a debounced search input (300ms), a rol select, and an activo select. Filter state SHALL be stored in Zustand and SHALL persist when the admin navigates away and returns to the page.

#### Scenario: Search filters by email
- **WHEN** the admin types "juan" in the search field
- **THEN** after 300ms the table shows only users whose email or nombre contains "juan" (the API handles case-insensitive matching)

#### Scenario: Rol filter narrows results
- **WHEN** the admin selects "STOCK" in the rol filter
- **THEN** the table shows only users with the STOCK role

#### Scenario: Activo filter shows only active users
- **WHEN** the admin selects "Activos" in the activo filter
- **THEN** the table shows only users where `activo = true`

#### Scenario: Filters default state shows all users
- **WHEN** the admin opens the page with no prior filter state
- **THEN** the search input is empty, rol is "Todos los roles", and activo is "Todos"

#### Scenario: Filter state persists on navigation
- **WHEN** the admin sets search="juan", rol="CLIENT", navigates to another page, and returns to `/admin/usuarios`
- **THEN** the filters are restored to search="juan" and rol="CLIENT"

#### Scenario: Changing a filter resets pagination to page 1
- **WHEN** the admin is on page 3 and then changes the rol filter
- **THEN** the list resets to page 1 (offset=0)

### Requirement: Admin can edit a user's data and roles
The system SHALL provide a `UserEditModal` that allows an ADMIN to update a user's nombre, apellido, email, and roles. The modal SHALL validate fields client-side before submitting. A 409 error from the backend SHALL be shown as an inline error in the modal.

#### Scenario: Admin opens edit modal
- **WHEN** the admin clicks the edit action button for a user
- **THEN** a modal opens with the user's current nombre, apellido, email, and role checkboxes pre-filled

#### Scenario: Client-side validation rejects empty email
- **WHEN** the admin clears the email field and clicks Save
- **THEN** the modal shows an inline "Email requerido" error and does not submit

#### Scenario: Client-side validation rejects invalid email format
- **WHEN** the admin enters "not-an-email" and clicks Save
- **THEN** the modal shows an inline "Email inválido" error and does not submit

#### Scenario: Client-side validation rejects no roles selected
- **WHEN** the admin unchecks all role checkboxes and clicks Save
- **THEN** the modal shows an inline "El usuario debe tener al menos un rol" error

#### Scenario: Successful edit closes modal and refreshes list
- **WHEN** the admin changes the user's nombre and clicks Save
- **THEN** the PUT request is sent, the modal closes, and the user list is refetched

#### Scenario: 409 email duplicate shown as inline error
- **WHEN** the backend returns HTTP 409 with detail "Email ya en uso"
- **THEN** the modal stays open and shows the 409 detail as an inline error below the email field

#### Scenario: 409 last-admin protection shown as inline error
- **WHEN** the backend returns HTTP 409 with detail "No se puede quitar el rol ADMIN al único administrador"
- **THEN** the modal stays open and shows the error inline, not as a generic toast

### Requirement: Admin can toggle a user's active status with confirmation
The system SHALL require a confirmation step before activating or deactivating a user. A `UserStatusModal` SHALL display the user's nombre and the action to be taken. A 409 error from the backend (last ADMIN protection) SHALL be shown as a descriptive error toast.

#### Scenario: Admin opens status confirmation for active user
- **WHEN** the admin clicks the status toggle for an active user
- **THEN** `UserStatusModal` opens showing "¿Desactivar a [nombre]?" with Confirm and Cancel buttons

#### Scenario: Admin opens status confirmation for inactive user
- **WHEN** the admin clicks the status toggle for an inactive user
- **THEN** `UserStatusModal` opens showing "¿Activar a [nombre]?" with Confirm and Cancel buttons

#### Scenario: Cancel closes modal without action
- **WHEN** the admin clicks Cancel in `UserStatusModal`
- **THEN** the modal closes and no PATCH request is sent

#### Scenario: Confirm sends PATCH and refreshes list
- **WHEN** the admin clicks Confirm in `UserStatusModal`
- **THEN** the PATCH request is sent, the modal closes, and the user list is refetched

#### Scenario: 409 last-admin deactivation shows descriptive toast
- **WHEN** the backend returns HTTP 409 with detail "Cannot deactivate the last admin"
- **THEN** the modal closes and a descriptive error toast is shown: "No se puede desactivar al único administrador del sistema"

### Requirement: Role badges use distinct colors per role
The system SHALL render role badges with the following color scheme: ADMIN=red, STOCK=blue, PEDIDOS=orange, CLIENT=green. Each badge SHALL include a visually hidden label for screen readers.

#### Scenario: ADMIN badge is red
- **WHEN** a user with the ADMIN role is displayed
- **THEN** the ADMIN badge uses red color styling

#### Scenario: STOCK badge is blue
- **WHEN** a user with the STOCK role is displayed
- **THEN** the STOCK badge uses blue color styling

#### Scenario: PEDIDOS badge is orange
- **WHEN** a user with the PEDIDOS role is displayed
- **THEN** the PEDIDOS badge uses orange color styling

#### Scenario: CLIENT badge is green
- **WHEN** a user with the CLIENT role is displayed
- **THEN** the CLIENT badge uses green color styling

### Requirement: Active status uses a color-coded badge
The system SHALL render the `activo` field as a green badge ("Activo") when `activo=true` and a red badge ("Inactivo") when `activo=false`. The badge SHALL include a visually hidden prefix for screen readers.

#### Scenario: Active user shows green badge
- **WHEN** a user with `activo=true` is displayed
- **THEN** a green "Activo" badge is shown in the activo column

#### Scenario: Inactive user shows red badge
- **WHEN** a user with `activo=false` is displayed
- **THEN** a red "Inactivo" badge is shown in the activo column
