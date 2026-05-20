/**
 * useMetricsPedidosPorEstado tests.
 *
 * Verifies:
 *   - queryKey is static — ['metrics', 'pedidos-por-estado'] (no date params)
 *   - data is returned when mock resolves
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useMetricsPedidosPorEstado } from '../useMetricsPedidosPorEstado'

vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

import { apiClient } from '@/shared/api/axios'

const MOCK_ESTADOS = {
  items: [
    { estado: 'pendiente', cantidad: 10 },
    { estado: 'confirmado', cantidad: 5 },
    { estado: 'entregado', cantidad: 30 },
  ],
}

describe('useMetricsPedidosPorEstado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: MOCK_ESTADOS })
  })

  it('has static queryKey without date params', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    renderHook(() => useMetricsPedidosPorEstado(), { wrapper })

    await waitFor(() => {
      const cache = qc.getQueryCache().findAll()
      expect(cache[0]?.queryKey).toEqual(['metrics', 'pedidos-por-estado'])
    })
  })

  it('returns data when API resolves', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    const { result } = renderHook(() => useMetricsPedidosPorEstado(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(MOCK_ESTADOS)
  })

  it('calls the correct endpoint', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    renderHook(() => useMetricsPedidosPorEstado(), { wrapper })

    await waitFor(() => expect(vi.mocked(apiClient.get)).toHaveBeenCalled())

    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith(
      '/api/v1/admin/metricas/pedidos-por-estado',
    )
  })
})
