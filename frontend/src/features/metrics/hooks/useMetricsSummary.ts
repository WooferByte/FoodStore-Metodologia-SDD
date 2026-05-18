/**
 * useMetricsSummary — TanStack Query v5 hook.
 * Calls GET /api/v1/admin/metricas/resumen
 *
 * queryKey includes { desde, hasta } so the cache re-evaluates
 * automatically when the date range changes.
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import type { MetricsSummary } from '@/features/metrics/types'

export interface UseMetricsSummaryParams {
  desde?: string
  hasta?: string
}

export function useMetricsSummary({ desde, hasta }: UseMetricsSummaryParams = {}) {
  return useQuery<MetricsSummary>({
    queryKey: ['metrics', 'summary', { desde, hasta }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)
      const qs = params.toString()
      const url = `/api/v1/admin/metricas/resumen${qs ? `?${qs}` : ''}`
      const response = await apiClient.get<MetricsSummary>(url)
      return response.data
    },
    staleTime: 300_000,   // 5 minutes
    gcTime:    600_000,   // 10 minutes
    retry:     1,
  })
}
