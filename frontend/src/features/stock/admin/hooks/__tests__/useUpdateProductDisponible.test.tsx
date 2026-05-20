import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useUpdateProductDisponible } from '@/features/stock/admin/hooks/useUpdateProductDisponible'
import { PRODUCTS_API_PATH } from '@/features/stock/admin/constants'

vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    put: vi.fn(),
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

describe('useUpdateProductDisponible', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends PUT to products endpoint with disponible and succeeds', async () => {
    const updatedProduct = {
      id: '1',
      nombre: 'Pizza',
      descripcion: '',
      precio_base: 10,
      imagen_url: '',
      disponible: false,
      stock_cantidad: 20,
      categorias: [],
      ingredientes: [],
    }

    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: updatedProduct })

    const { result } = renderHook(() => useUpdateProductDisponible(), { wrapper: createWrapper() })

    result.current.mutate({ id: 1, disponible: false })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.put).toHaveBeenCalledWith(
      `${PRODUCTS_API_PATH}/1`,
      { disponible: false },
    )
  })

  it('handles error response', async () => {
    vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Error del servidor'))

    const { result } = renderHook(() => useUpdateProductDisponible(), { wrapper: createWrapper() })

    result.current.mutate({ id: 1, disponible: true })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
