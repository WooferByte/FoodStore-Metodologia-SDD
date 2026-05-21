import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useUpdateStock } from '@/features/stock/admin/hooks/useUpdateStock'
import { PRODUCTS_API_PATH } from '@/features/stock/admin/constants'

vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    patch: vi.fn(),
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

describe('useUpdateStock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends PATCH to stock endpoint and succeeds', async () => {
    const updatedProduct = {
      id: '1',
      nombre: 'Pizza',
      descripcion: '',
      precio_base: 10,
      imagen_url: '',
      disponible: true,
      stock_cantidad: 25,
      categorias: [],
      ingredientes: [],
    }

    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: updatedProduct })

    const { result } = renderHook(() => useUpdateStock(), { wrapper: createWrapper() })

    result.current.mutate({ id: 1, stock_cantidad: 25 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.patch).toHaveBeenCalledWith(
      `${PRODUCTS_API_PATH}/1/stock`,
      { stock_cantidad: 25 },
    )
  })

  it('handles error response', async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error('Producto no encontrado'))

    const { result } = renderHook(() => useUpdateStock(), { wrapper: createWrapper() })

    result.current.mutate({ id: 999, stock_cantidad: 10 })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
