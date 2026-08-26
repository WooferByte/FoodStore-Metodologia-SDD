/**
 * Hook: useSystemConfig
 *
 * Fetches a specific system configuration value by key from the backend.
 * Uses React Query with long stale time since configs change infrequently.
 *
 * Usage:
 * ```tsx
 * const { data: threshold } = useSystemConfig('envio_gratis_umbral')
 * // threshold?.valor === '3000'
 * ```
 *
 * Multiple calls with different keys share the same cache — only ONE
 * network request to GET /api/v1/admin/configuracion.
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { useAuthStore } from '@/store/authStore'
import type { Configuracion } from '@/features/configuracion/admin/types'
import { CONFIGURACION_API_PATH } from '@/features/configuracion/admin/constants'

const CONFIG_QUERY_KEY = 'system-config'
const CONFIG_STALE_TIME = 5 * 60 * 1000 // 5 min — configs change infrequently

/**
 * Fetch all system configs. Used internally and by useAllSystemConfigs.
 */
async function fetchAllConfigs(): Promise<Configuracion[]> {
  const response = await apiClient.get<Configuracion[]>(CONFIGURACION_API_PATH)
  return response.data
}

/**
 * Fetch a single config value by key.
 * Returns the full Configuracion object, or undefined if not found.
 *
 * Auth-gated (fix-refresh-loop-cartdrawer D-1): the fetch is only enabled
 * once authStore.isAuthenticated is true. Anonymous sessions stay idle with
 * data undefined — consumers fall back to local defaults.
 */
export function useSystemConfig(clave: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<Configuracion[], Error, Configuracion | undefined>({
    queryKey: [CONFIG_QUERY_KEY],
    queryFn: fetchAllConfigs,
    staleTime: CONFIG_STALE_TIME,
    enabled: isAuthenticated,
    select: (data) => data.find((c) => c.clave === clave),
  })
}

/**
 * Fetch all system configs at once.
 * Useful when multiple components need different values (shared cache).
 * Auth-gated like useSystemConfig (D-1).
 */
export function useAllSystemConfigs() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<Configuracion[]>({
    queryKey: [CONFIG_QUERY_KEY],
    queryFn: fetchAllConfigs,
    staleTime: CONFIG_STALE_TIME,
    enabled: isAuthenticated,
  })
}
