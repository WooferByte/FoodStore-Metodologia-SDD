/**
 * useMetricsVentas — TanStack Query v5 hook.
 * Calls GET /api/v1/admin/metricas/ventas
 *
 * granularidad is auto-computed from the date range using computeGranularidad.
 * queryKey includes { granularidad, desde, hasta } for automatic re-fetch.
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { computeGranularidad } from '@/features/metrics/constants'
import type { VentasResponse } from '@/features/metrics/types'

export interface UseMetricsVentasParams {
  desde?: string
  hasta?: string
}

export function useMetricsVentas({ desde, hasta }: UseMetricsVentasParams = {}) {
  // Auto-compute granularidad from range; default to 'mes' when range unknown
  const granularidad =
    desde && hasta ? computeGranularidad(desde, hasta) : 'mes'

  return useQuery<VentasResponse>({
    queryKey: ['metrics', 'ventas', { granularidad, desde, hasta }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('granularidad', granularidad)
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)
      const response = await apiClient.get<VentasResponse>(
        `/api/v1/admin/metricas/ventas?${params.toString()}`,
      )
      return response.data
    },
    staleTime: 300_000,
    gcTime:    600_000,
    retry:     1,
  })
}
