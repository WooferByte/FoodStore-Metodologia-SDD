## ADDED Requirements

### Requirement: Admin can list users with pagination and filters
The system SHALL provide a `GET /api/v1/admin/usuarios` endpoint that returns a paginated list of non-deleted users. The response SHALL include `items`, `total`, `limit`, and `offset` fields.

#### Scenario: List users without filters
- **WHEN** an authenticated ADMIN sends `GET /api/v1/admin/usuarios`
- **THEN** the system returns HTTP 200 with a paginated list of users, `total` count, and default `limit=20`, `offset=0`

#### Scenario: Pagination with limit and offset
- **WHEN** an authenticated ADMIN sends `GET /api/v1/admin/usuarios?limit=5&offset=10`
- **THEN** the system returns at most 5 users starting from position 10, with the correct `total` count

#### Scenario: Search by email case-insensitive
- **WHEN** an authenticated ADMIN sends `GET /api/v1/admin/usuarios?q=ADMIN@`
- **THEN** the system returns only users whose email contains "admin@" (case-insensitive match)

#### Scenario: Search by nombre case-insensitive
- **WHEN** an authenticated ADMIN sends `GET /api/v1/admin/usuarios?q=juan`
- **THEN** the system returns users whose nombre contains "juan" regardless of case

#### Scenario: Filter by rol
- **WHEN** an authenticated ADMIN sends `GET /api/v1/admin/usuarios?rol=STOCK`
- **THEN** the system returns only users who have the STOCK role

#### Scenario: Combination of search and rol filter
- **WHEN** an authenticated ADMIN sends `GET /api/v1/admin/usuarios?q=test&rol=CLIENT`
- **THEN** the system returns users whose email or nombre contains "test" AND who have the CLIENT role

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request without Authorization header is sent to `GET /api/v1/admin/usuarios`
- **THEN** the system returns HTTP 401

#### Scenario: Non-admin is rejected
- **WHEN** a user with CLIENT role sends `GET /api/v1/admin/usuarios`
- **THEN** the system returns HTTP 403

### Requirement: Admin can update user data and roles
The system SHALL provide a `PUT /api/v1/admin/usuarios/:id` endpoint that allows an ADMIN to update a user's `nombre`, `email`, `apellido`, and `roles` list. If `roles` changes, the system SHALL revoke all active refresh tokens for that user.

#### Scenario: Successful full update
- **WHEN** an authenticated ADMIN sends `PUT /api/v1/admin/usuarios/42` with `{"nombre": "Juan", "email": "juan@test.com", "roles": ["STOCK"]}`
- **THEN** the system updates the user and returns HTTP 200 with the updated user including new roles

#### Scenario: Role change triggers refresh token revocation
- **WHEN** an authenticated ADMIN changes a user's role via `PUT /api/v1/admin/usuarios/:id`
- **THEN** all active refresh tokens for that user SHALL have `revoked_at` set to the current timestamp

#### Scenario: No role change does not revoke tokens
- **WHEN** an authenticated ADMIN updates only `nombre` without changing roles
- **THEN** the user's refresh tokens SHALL NOT be revoked

#### Scenario: Duplicate email is rejected
- **WHEN** an authenticated ADMIN tries to update a user's email to one already used by another user
- **THEN** the system returns HTTP 409 with RFC 7807 error body

#### Scenario: User not found
- **WHEN** an authenticated ADMIN sends `PUT /api/v1/admin/usuarios/99999`
- **THEN** the system returns HTTP 404 with RFC 7807 error body

#### Scenario: Last admin role protection in update
- **WHEN** an authenticated ADMIN attempts to remove the ADMIN role from the only ADMIN user
- **THEN** the system returns HTTP 409 with RFC 7807 error body

#### Scenario: Non-admin cannot update users
- **WHEN** a user without ADMIN role sends `PUT /api/v1/admin/usuarios/:id`
- **THEN** the system returns HTTP 403

### Requirement: Admin can toggle user account status
The system SHALL provide a `PATCH /api/v1/admin/usuarios/:id/estado` endpoint that toggles the `activo` field of a user. When a user is deactivated, all their active refresh tokens SHALL be revoked.

#### Scenario: Deactivate active user
- **WHEN** an authenticated ADMIN sends `PATCH /api/v1/admin/usuarios/42/estado` with `{"activo": false}`
- **THEN** the system sets `activo=false` on the user and returns HTTP 200 with the updated user

#### Scenario: Deactivation revokes refresh tokens
- **WHEN** an authenticated ADMIN deactivates a user
- **THEN** all active refresh tokens for that user SHALL have `revoked_at` set to the current timestamp

#### Scenario: Reactivate inactive user
- **WHEN** an authenticated ADMIN sends `PATCH /api/v1/admin/usuarios/42/estado` with `{"activo": true}`
- **THEN** the system sets `activo=true` on the user and returns HTTP 200 (no token revocation)

#### Scenario: Deactivating the last ADMIN is forbidden
- **WHEN** an authenticated ADMIN attempts to deactivate a user who is the only active ADMIN
- **THEN** the system returns HTTP 409 with RFC 7807 error body indicating "Cannot deactivate the last admin"

#### Scenario: User not found
- **WHEN** an authenticated ADMIN sends `PATCH /api/v1/admin/usuarios/99999/estado`
- **THEN** the system returns HTTP 404 with RFC 7807 error body

#### Scenario: Non-admin cannot toggle status
- **WHEN** a user without ADMIN role sends `PATCH /api/v1/admin/usuarios/:id/estado`
- **THEN** the system returns HTTP 403
