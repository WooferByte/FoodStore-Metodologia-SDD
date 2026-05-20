/**
 * Admin Users feature — TypeScript type definitions.
 *
 * Aligned with backend schema (backend-admin-users-endpoints):
 *   GET  /api/v1/admin/usuarios → { items: AdminUser[], total, limit, offset }
 *   PUT  /api/v1/admin/usuarios/:id → AdminUser
 *   PATCH /api/v1/admin/usuarios/:id/estado → AdminUser
 */

/** Single admin user from the backend API */
export interface AdminUser {
  id: number
  email: string
  nombre: string
  apellido: string | null
  activo: boolean
  telefono: string | null
  creado_en: string           // ISO 8601 datetime string
  roles: string[]             // ["ADMIN", "CLIENT"]
}

/**
 * Paginated users response — matches backend PaginatedResponse schema:
 * { items, total, limit, offset }
 */
export interface UsersListResponse {
  items: AdminUser[]
  total: number
  limit: number
  offset: number
}

/** Query parameters / filter state for the admin users list */
export interface UserFilters {
  q: string
  rol: string
  activo: string    // "all" | "true" | "false"
  page: number
}

/** Payload for PUT /api/v1/admin/usuarios/:id */
export interface UpdateUserPayload {
  nombre?: string
  apellido?: string
  email?: string
  telefono?: string
  roles?: string[]
}

/** Payload for PATCH /api/v1/admin/usuarios/:id/estado */
export interface ToggleUserStatusPayload {
  activo: boolean
}
