/**
 * UsersPage — Admin panel page for managing users.
 *
 * Lazy-loaded via React.lazy in Router.tsx.
 * Only accessible to ADMIN role (guarded by ProtectedRoute in Router.tsx).
 *
 * Architecture:
 *   - Reads filter state from usersFiltersStore (Zustand — client state)
 *   - Fetches users with useAdminUsers (TanStack Query — server state)
 *   - Manages selectedUser (edit modal) and statusUser (status modal) via useState
 *
 * Features:
 *   - Search + filter panel (UserFiltersPanel)
 *   - Responsive table/cards (UsersTable)
 *   - Pagination with Anterior / Siguiente controls
 *   - Edit modal (UserEditModal)
 *   - Status toggle confirmation modal (UserStatusModal)
 */

import { useState, useCallback } from 'react'
import { UserFiltersPanel } from '@/features/users/components/UserFiltersPanel'
import { UsersTable } from '@/features/users/components/UsersTable'
import { UserEditModal } from '@/features/users/components/UserEditModal'
import { UserStatusModal } from '@/features/users/components/UserStatusModal'
import { useAdminUsers } from '@/features/users/hooks/useAdminUsers'
import { useUsersFiltersStore } from '@/features/users/store/usersFiltersStore'
import { PAGE_SIZE } from '@/features/users/constants'
import { Button } from '@/shared/components/ui/Button'
import type { AdminUser } from '@/features/users/types'

export default function UsersPage() {
  // ── Zustand filter state ─────────────────────────────────────────
  const q      = useUsersFiltersStore((s) => s.q)
  const rol    = useUsersFiltersStore((s) => s.rol)
  const activo = useUsersFiltersStore((s) => s.activo)
  const page   = useUsersFiltersStore((s) => s.page)
  const setPage = useUsersFiltersStore((s) => s.setPage)

  // ── TanStack Query — server state ────────────────────────────────
  const { data, isLoading } = useAdminUsers({ q, rol, activo, page })
  const users = data?.items ?? []
  const total = data?.total ?? 0

  // ── Pagination calculations ──────────────────────────────────────
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  // ── Modal state (local UI state — not server data) ────────────────
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [editOpen,     setEditOpen]     = useState(false)
  const [statusUser,   setStatusUser]   = useState<AdminUser | null>(null)
  const [statusOpen,   setStatusOpen]   = useState(false)

  const handleEdit = useCallback((user: AdminUser) => {
    setSelectedUser(user)
    setEditOpen(true)
  }, [])

  const handleToggleStatus = useCallback((user: AdminUser) => {
    setStatusUser(user)
    setStatusOpen(true)
  }, [])

  function handleEditClose() {
    setEditOpen(false)
    // Keep selectedUser briefly so the closing animation completes cleanly
  }

  function handleStatusClose() {
    setStatusOpen(false)
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Gestión de usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Administrá los usuarios registrados en la plataforma.
        </p>
      </div>

      {/* Filters */}
      <UserFiltersPanel />

      {/* Table / cards */}
      <UsersTable
        users={users}
        isLoading={isLoading}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
      />

      {/* Pagination */}
      {!isLoading && total > 0 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages || 1}{' '}
            <span className="text-muted-foreground/60">({total} usuarios)</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => setPage(page - 1)}
              aria-label="Página anterior"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => setPage(page + 1)}
              aria-label="Página siguiente"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      <UserEditModal
        user={selectedUser}
        isOpen={editOpen}
        onClose={handleEditClose}
      />

      {/* Status toggle modal */}
      <UserStatusModal
        user={statusUser}
        isOpen={statusOpen}
        onClose={handleStatusClose}
      />
    </div>
  )
}
