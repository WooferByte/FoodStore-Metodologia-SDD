## MODIFIED Requirements

### Requirement: Last admin protection
The system SHALL prevent the removal of the ADMIN role from the last active administrator in the system. This protection SHALL apply both to the legacy `PUT /api/v1/admin/users/{user_id}/role` endpoint AND to the new `PUT /api/v1/admin/usuarios/:id` and `PATCH /api/v1/admin/usuarios/:id/estado` endpoints.

#### Scenario: Last admin cannot lose admin role via role endpoint
- **WHEN** an ADMIN who is the only ADMIN in the system attempts to change their own role to a non-ADMIN role via `PUT /api/v1/admin/users/{user_id}/role`
- **THEN** the system returns HTTP 409 Conflict with RFC 7807 error body indicating "Cannot remove the last admin"

#### Scenario: Last admin cannot have roles changed to non-ADMIN via admin update
- **WHEN** an ADMIN sends `PUT /api/v1/admin/usuarios/:id` with `{"roles": ["CLIENT"]}` for the last ADMIN user
- **THEN** the system returns HTTP 409 Conflict with RFC 7807 error body

#### Scenario: Last admin cannot be deactivated
- **WHEN** an ADMIN sends `PATCH /api/v1/admin/usuarios/:id/estado` with `{"activo": false}` for the only active ADMIN user
- **THEN** the system returns HTTP 409 Conflict with RFC 7807 error body indicating "Cannot deactivate the last admin"

#### Scenario: Admin can change role of other admin when multiple admins exist
- **WHEN** there are two or more users with the ADMIN role and an ADMIN changes another admin's role to a non-ADMIN role
- **THEN** the system performs the role change and returns HTTP 200
