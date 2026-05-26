import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { CONFIGURACION_QUERY_KEY, CONFIGURACION_API_PATH, CONFIG_STALE_TIME } from '@/features/configuracion/admin/constants'
import type { Configuracion } from '@/features/configuracion/admin/types'

export function useAdminConfiguraciones() {
  return useQuery({
    queryKey: [CONFIGURACION_QUERY_KEY],
    queryFn: async () => {
      const response = await apiClient.get<Configuracion[]>(CONFIGURACION_API_PATH)
      return response.data
    },
    staleTime: CONFIG_STALE_TIME,
  })
}
