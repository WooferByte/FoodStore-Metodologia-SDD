import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useAdminProducts } from '@/features/products/admin/hooks/useAdminProducts'
import { PRODUCTS_API_PATH, PAGE_SIZE } from '@/features/products/admin/constants'
import type { AdminProductsListResponse } from '@/features/products/admin/types'

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

describe('useAdminProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches products with filters and returns paginated data', async () => {
    const mockResponse: AdminProductsListResponse = {
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
      () => useAdminProducts({ q: '', categoriaId: null, disponible: 'all', page: 1 }),
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

  it('builds query params with categoria_id and disponible filters', async () => {
    const mockResponse: AdminProductsListResponse = {
      items: [],
      total: 0,
      page: 1,
      size: PAGE_SIZE,
      pages: 0,
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse })

    const { result } = renderHook(
      () => useAdminProducts({ q: '', categoriaId: 3, disponible: 'true', page: 2 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const url: string = vi.mocked(apiClient.get).mock.calls[0][0] as string
    expect(url).toContain('categoria_id=3')
    expect(url).toContain('disponible=true')
    expect(url).toContain('page=2')
  })
})
