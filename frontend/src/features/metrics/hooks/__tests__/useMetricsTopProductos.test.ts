/**
 * useMetricsTopProductos tests.
 *
 * Verifies:
 *   - queryKey includes { desde, hasta }
 *   - data is returned when mock resolves
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useMetricsTopProductos } from '../useMetricsTopProductos'

vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

import { apiClient } from '@/shared/api/axios'

const MOCK_TOP = {
  items: [
    { producto_id: 1, nombre: 'Pizza Napolitana', cantidad_total: 120 },
    { producto_id: 2, nombre: 'Empanadas', cantidad_total: 95 },
  ],
}

describe('useMetricsTopProductos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: MOCK_TOP })
  })

  it('queryKey includes { desde, hasta }', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    renderHook(
      () => useMetricsTopProductos({ desde: '2026-05-01', hasta: '2026-05-18' }),
      { wrapper },
    )

    await waitFor(() => {
      const cache = qc.getQueryCache().findAll()
      expect(cache[0]?.queryKey).toEqual([
        'metrics',
        'top-productos',
        { desde: '2026-05-01', hasta: '2026-05-18' },
      ])
    })
  })

  it('returns data when API resolves', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    const { result } = renderHook(
      () => useMetricsTopProductos({ desde: '2026-05-01', hasta: '2026-05-18' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(MOCK_TOP)
  })
})
