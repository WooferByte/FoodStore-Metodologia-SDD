/**
 * UsersTable — semantic HTML table for the admin users panel.
 *
 * Design decisions:
 *   - Uses <table role="grid"> with <th scope="col"> for screen readers
 *   - Badges for roles and status use sr-only prefix for accessibility
 *   - Responsive: table hidden on mobile (md:hidden cards shown instead)
 *   - Skeleton shown while isLoading is true
 *
 * Columns: Email | Nombre | Roles | Estado | Acciones
 *
 * All colors reference semantic @theme tokens — zero hardcoded colors.
 */

import { Pencil, UserCheck, UserX } from 'lucide-react'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { Button } from '@/shared/components/ui/Button'
import { ROLE_COLORS, ROLES_LIST } from '@/features/users/constants'
import type { AdminUser } from '@/features/users/types'

export interface UsersTableProps {
  users: AdminUser[]
  isLoading: boolean
  onEdit: (user: AdminUser) => void
  onToggleStatus: (user: AdminUser) => void
}

/** Format ISO datetime to locale date string */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

/** Role badge with sr-only prefix */
function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] ?? { bg: 'bg-muted', text: 'text-muted-foreground' }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text}`}
    >
      <span className="sr-only">Rol:</span>
      {role}
    </span>
  )
}

/** Loading skeleton rows */
function TableSkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
        </tr>
      ))}
    </>
  )
}

/** Desktop table view */
function DesktopTable({ users, isLoading, onEdit, onToggleStatus }: UsersTableProps) {
  return (
    <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-border">
      <table
        role="grid"
        className="w-full border-collapse text-sm"
        aria-label="Lista de usuarios"
      >
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nombre
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Roles
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estado
            </th>
            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <TableSkeletonRows count={5} />
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                No hay usuarios que coincidan con los filtros
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
              >
                {/* Email */}
                <td className="px-4 py-3 text-sm text-foreground">
                  {user.email}
                </td>

                {/* Nombre */}
                <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                  {user.nombre} {user.apellido ?? ''}
                </td>

                {/* Roles */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      user.roles.map((role) => (
                        <RoleBadge key={role} role={role} />
                      ))
                    )}
                  </div>
                </td>

                {/* Estado */}
                <td className="px-4 py-3">
                  {user.activo ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-success/15 text-success">
                      <span className="sr-only">Estado:</span>
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-destructive/15 text-destructive">
                      <span className="sr-only">Estado:</span>
                      Inactivo
                    </span>
                  )}
                </td>

                {/* Acciones */}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(user)}
                      aria-label={`Editar ${user.nombre} ${user.apellido ?? ''}`.trim()}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleStatus(user)}
                      aria-label={user.activo ? `Desactivar ${user.nombre}` : `Activar ${user.nombre}`}
                    >
                      {user.activo ? (
                        <UserX className="h-4 w-4 text-destructive" aria-hidden="true" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-success" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

/** Mobile card view */
function MobileCards({ users, isLoading, onEdit, onToggleStatus }: UsersTableProps) {
  if (isLoading) {
    return (
      <div className="md:hidden flex flex-col gap-3" role="status" aria-label="Cargando usuarios...">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="md:hidden py-12 text-center text-sm text-muted-foreground">
        No hay usuarios que coincidan con los filtros
      </div>
    )
  }

  return (
    <div className="md:hidden flex flex-col gap-3">
      {users.map((user) => (
        <article
          key={user.id}
          className="rounded-xl border border-border p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {user.nombre} {user.apellido ?? ''}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(user)}
                aria-label={`Editar ${user.nombre}`}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleStatus(user)}
                aria-label={user.activo ? `Desactivar ${user.nombre}` : `Activar ${user.nombre}`}
              >
                {user.activo ? (
                  <UserX className="h-4 w-4 text-destructive" aria-hidden="true" />
                ) : (
                  <UserCheck className="h-4 w-4 text-success" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {user.roles.map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {user.activo ? (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-success/15 text-success">
                  <span className="sr-only">Estado:</span>Activo
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-destructive/15 text-destructive">
                  <span className="sr-only">Estado:</span>Inactivo
                </span>
              )}
            </span>
            <time dateTime={user.creado_en}>{formatDate(user.creado_en)}</time>
          </div>
        </article>
      ))}
    </div>
  )
}

export function UsersTable(props: UsersTableProps) {
  return (
    <>
      <DesktopTable {...props} />
      <MobileCards {...props} />
    </>
  )
}

// Keep ROLES_LIST import used for ordering validation in tests
export { ROLES_LIST }
