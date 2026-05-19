/**
 * useMetricsPedidosPorEstado — TanStack Query v5 hook.
 * Calls GET /api/v1/admin/metricas/pedidos-por-estado
 *
 * No date params — always returns the current distribution.
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import type { PedidosEstadoResponse } from '@/features/metrics/types'

export function useMetricsPedidosPorEstado() {
  return useQuery<PedidosEstadoResponse>({
    queryKey: ['metrics', 'pedidos-por-estado'],
    queryFn: async () => {
      const response = await apiClient.get<PedidosEstadoResponse>(
        '/api/v1/admin/metricas/pedidos-por-estado',
      )
      return response.data
    },
    staleTime: 300_000,
    gcTime:    600_000,
    retry:     1,
  })
}
