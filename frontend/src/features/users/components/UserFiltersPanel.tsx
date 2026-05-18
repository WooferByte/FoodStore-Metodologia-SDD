/**
 * UserFiltersPanel — search + filter controls for the admin users list.
 *
 * Reads filter state from usersFiltersStore and dispatches setQ / setRol /
 * setActivo on every change. Page is reset to 1 by the store actions.
 *
 * Accessibility:
 *   - Each input/select has an associated <label> or aria-label
 *   - WCAG AA: visible labels + contrast via semantic tokens
 */

import { useUsersFiltersStore } from '@/features/users/store/usersFiltersStore'
import { ROLES_LIST } from '@/features/users/constants'

export function UserFiltersPanel() {
  const q       = useUsersFiltersStore((s) => s.q)
  const rol     = useUsersFiltersStore((s) => s.rol)
  const activo  = useUsersFiltersStore((s) => s.activo)
  const setQ      = useUsersFiltersStore((s) => s.setQ)
  const setRol    = useUsersFiltersStore((s) => s.setRol)
  const setActivo = useUsersFiltersStore((s) => s.setActivo)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      {/* Search */}
      <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
        <label
          htmlFor="users-search"
          className="text-sm font-medium text-foreground"
        >
          Buscar
        </label>
        <input
          id="users-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre, apellido o email…"
          className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-150"
        />
      </div>

      {/* Rol filter */}
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label
          htmlFor="users-rol"
          className="text-sm font-medium text-foreground"
        >
          Rol
        </label>
        <select
          id="users-rol"
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-150"
        >
          <option value="">Todos los roles</option>
          {ROLES_LIST.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Estado filter */}
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label
          htmlFor="users-activo"
          className="text-sm font-medium text-foreground"
        >
          Estado
        </label>
        <select
          id="users-activo"
          value={activo}
          onChange={(e) => setActivo(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-150"
        >
          <option value="all">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>
    </div>
  )
}
