import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useAdminStockProducts } from '@/features/stock/admin/hooks/useAdminStockProducts'
import { PRODUCTS_API_PATH, PAGE_SIZE } from '@/features/stock/admin/constants'
import type { StockProductListResponse } from '@/features/stock/admin/types'

vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useAdminStockProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches products and returns paginated data', async () => {
    const mockResponse: StockProductListResponse = {
      items: [
        {
          id: '1',
          nombre: 'Pizza',
          descripcion: 'Rica pizza',
          precio_base: 10,
          imagen_url: '',
          disponible: true,
          stock_cantidad: 20,
          categorias: [],
          ingredientes: [],
        },
      ],
      total: 1,
      page: 1,
      size: PAGE_SIZE,
      pages: 1,
    }

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse })

    const { result } = renderHook(
      () => useAdminStockProducts({ q: '', disponible: 'all', page: 1 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(apiClient.get).toHaveBeenCalled()
    const url: string = vi.mocked(apiClient.get).mock.calls[0][0] as string
    expect(url).toContain(PRODUCTS_API_PATH)
    expect(url).toContain('page=1')
    expect(url).toContain(`size=${PAGE_SIZE}`)
  })

  it('includes q and disponible params when set', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: PAGE_SIZE, pages: 0 } })

    const { result } = renderHook(
      () => useAdminStockProducts({ q: 'pizza', disponible: 'true', page: 2 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const url: string = vi.mocked(apiClient.get).mock.calls[0][0] as string
    expect(url).toContain('page=2')
    expect(url).toContain('disponible=true')
  })

  it('handles empty response', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, size: PAGE_SIZE, pages: 0 } })

    const { result } = renderHook(
      () => useAdminStockProducts({ q: '', disponible: 'all', page: 1 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.items).toHaveLength(0)
    expect(result.current.data?.total).toBe(0)
  })

  it('handles error response', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(
      () => useAdminStockProducts({ q: '', disponible: 'all', page: 1 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 })
  })
})
