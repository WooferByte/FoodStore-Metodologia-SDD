/**
 * useMetricsVentas tests.
 *
 * Verifies:
 *   - granularidad is auto-computed correctly:
 *       'hoy' preset (same day) → 'dia'
 *       'mes' preset (> 7 days) → 'semana' or 'mes' based on range
 *   - queryKey includes { granularidad, desde, hasta }
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useMetricsVentas } from '../useMetricsVentas'

vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

import { apiClient } from '@/shared/api/axios'

const MOCK_VENTAS = { items: [{ fecha: '2026-05-18', total_ventas: 1000, cantidad_pedidos: 5 }] }

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useMetricsVentas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: MOCK_VENTAS })
  })

  it('uses granularidad "dia" when desde === hasta (same day)', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    renderHook(
      () => useMetricsVentas({ desde: '2026-05-18', hasta: '2026-05-18' }),
      { wrapper },
    )

    await waitFor(() => {
      const cache = qc.getQueryCache().findAll()
      const key = cache[0]?.queryKey as unknown[]
      expect(key).toEqual([
        'metrics',
        'ventas',
        { granularidad: 'dia', desde: '2026-05-18', hasta: '2026-05-18' },
      ])
    })
  })

  it('uses granularidad "semana" for 8–90 day range', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    renderHook(
      () => useMetricsVentas({ desde: '2026-05-01', hasta: '2026-05-18' }),
      { wrapper },
    )

    await waitFor(() => {
      const cache = qc.getQueryCache().findAll()
      const key = cache[0]?.queryKey as unknown[]
      expect(key).toEqual([
        'metrics',
        'ventas',
        { granularidad: 'semana', desde: '2026-05-01', hasta: '2026-05-18' },
      ])
    })
  })

  it('uses granularidad "mes" for > 90 day range', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    renderHook(
      () => useMetricsVentas({ desde: '2026-01-01', hasta: '2026-05-18' }),
      { wrapper },
    )

    await waitFor(() => {
      const cache = qc.getQueryCache().findAll()
      const key = cache[0]?.queryKey as unknown[]
      expect(key).toEqual([
        'metrics',
        'ventas',
        { granularidad: 'mes', desde: '2026-01-01', hasta: '2026-05-18' },
      ])
    })
  })

  it('returns data when API resolves', async () => {
    const { result } = renderHook(
      () => useMetricsVentas({ desde: '2026-05-01', hasta: '2026-05-18' }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(MOCK_VENTAS)
  })
})
