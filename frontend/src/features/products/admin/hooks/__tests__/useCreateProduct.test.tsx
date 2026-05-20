import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useCreateProduct } from '@/features/products/admin/hooks/useCreateProduct'
import { PRODUCTS_API_PATH } from '@/features/products/admin/constants'

vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    post: vi.fn(),
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

describe('useCreateProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends POST to products endpoint and succeeds', async () => {
    const newProduct = {
      id: '1',
      nombre: 'Pizza Nueva',
      descripcion: 'Descripción',
      precio_base: 15,
      stock_cantidad: 10,
      disponible: true,
      imagen_url: '',
      categorias: [],
      ingredientes: [],
    }

    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: newProduct })

    const { result } = renderHook(() => useCreateProduct(), { wrapper: createWrapper() })

    result.current.mutate({
      nombre: 'Pizza Nueva',
      descripcion: 'Descripción',
      precio_base: 15,
      stock_cantidad: 10,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.post).toHaveBeenCalledWith(PRODUCTS_API_PATH, {
      nombre: 'Pizza Nueva',
      descripcion: 'Descripción',
      precio_base: 15,
      stock_cantidad: 10,
    })
  })
})
