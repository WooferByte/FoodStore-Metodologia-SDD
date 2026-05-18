/**
 * useAdminUsers — TanStack Query v5 hook for fetching the admin users list.
 *
 * Design decisions from design.md:
 * - D2: User list is server state → TanStack Query, NOT Zustand
 * - D3: Debounce in the hook, not the component — keeps component dumb and
 *       makes debounce testable in isolation
 *
 * Debounce: `q` is debounced 300ms internally before being passed to the
 * queryKey and to the API. Zustand immediately reflects what the user typed.
 *
 * Endpoint: GET /api/v1/admin/usuarios
 * Query params: limit, offset, q (optional), rol (optional), activo (optional)
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { apiClient } from '@/shared/api/axios'
import { PAGE_SIZE } from '@/features/users/constants'
import type { UserFilters, UsersListResponse } from '@/features/users/types'

export const ADMIN_USERS_QUERY_KEY = 'admin-users'

/**
 * Builds URLSearchParams from filter values, omitting empty/default values.
 */
function buildQueryParams(filters: UserFilters & { debouncedQ: string }): URLSearchParams {
  const p = new URLSearchParams()
  p.set('limit', String(PAGE_SIZE))
  p.set('offset', String((filters.page - 1) * PAGE_SIZE))

  if (filters.debouncedQ.trim()) {
    p.set('q', filters.debouncedQ.trim())
  }
  if (filters.rol) {
    p.set('rol', filters.rol)
  }
  if (filters.activo !== 'all') {
    p.set('activo', filters.activo)
  }

  return p
}

/**
 * Fetches paginated users for the admin panel.
 *
 * @param filters - Filter state from usersFiltersStore (q is debounced internally)
 */
export function useAdminUsers(filters: UserFilters) {
  // Debounce q internally — 300ms (Design decision D3)
  const [debouncedQ, setDebouncedQ] = useState(filters.q)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(filters.q)
    }, 300)
    return () => clearTimeout(timer)
  }, [filters.q])

  const params = buildQueryParams({ ...filters, debouncedQ })

  return useQuery<UsersListResponse>({
    queryKey: [ADMIN_USERS_QUERY_KEY, { q: debouncedQ, rol: filters.rol, activo: filters.activo, page: filters.page }],
    queryFn: async () => {
      const response = await apiClient.get<UsersListResponse>(
        `/api/v1/admin/usuarios?${params.toString()}`,
      )
      return response.data
    },
    // Keep previous data during filter changes to avoid content flash
    placeholderData: keepPreviousData,
    staleTime: 60_000,   // 1 minute — admin user data changes infrequently
    gcTime: 5 * 60_000,
    retry: 1,
  })
}
