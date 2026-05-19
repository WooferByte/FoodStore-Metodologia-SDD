/**
 * useMetricsTopProductos — TanStack Query v5 hook.
 * Calls GET /api/v1/admin/metricas/top-productos
 *
 * queryKey includes { desde, hasta } for automatic re-fetch on range change.
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import type { TopProductosResponse } from '@/features/metrics/types'

export interface UseMetricsTopProductosParams {
  desde?: string
  hasta?: string
}

export function useMetricsTopProductos({
  desde,
  hasta,
}: UseMetricsTopProductosParams = {}) {
  return useQuery<TopProductosResponse>({
    queryKey: ['metrics', 'top-productos', { desde, hasta }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)
      const qs = params.toString()
      const url = `/api/v1/admin/metricas/top-productos${qs ? `?${qs}` : ''}`
      const response = await apiClient.get<TopProductosResponse>(url)
      return response.data
    },
    staleTime: 300_000,
    gcTime:    600_000,
    retry:     1,
  })
}
