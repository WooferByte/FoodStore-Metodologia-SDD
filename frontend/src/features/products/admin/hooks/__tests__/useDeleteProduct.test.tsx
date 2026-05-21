import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useDeleteProduct } from '@/features/products/admin/hooks/useDeleteProduct'
import { PRODUCTS_API_PATH } from '@/features/products/admin/constants'

vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    delete: vi.fn(),
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

describe('useDeleteProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes product and returns success', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({})

    const { result } = renderHook(() => useDeleteProduct(), { wrapper: createWrapper() })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.delete).toHaveBeenCalledWith(`${PRODUCTS_API_PATH}/1`)
  })

  it('captures 409 error with specific message', async () => {
    const mockError = {
      response: {
        status: 409,
        data: { detail: 'El producto está en pedidos activos.' },
      },
    }
    vi.mocked(apiClient.delete).mockRejectedValueOnce(mockError)

    const { result } = renderHook(() => useDeleteProduct(), { wrapper: createWrapper() })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.status).toBe(409)
    expect(result.current.error?.message).toContain('pedidos activos')
  })

  it('captures 409 without detail field and uses default message', async () => {
    const mockError = {
      response: {
        status: 409,
        data: {},
      },
    }
    vi.mocked(apiClient.delete).mockRejectedValueOnce(mockError)

    const { result } = renderHook(() => useDeleteProduct(), { wrapper: createWrapper() })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.status).toBe(409)
    expect(result.current.error?.message).toBe(
      'No se puede eliminar: el producto está en pedidos activos. Desactivá el producto en su lugar.',
    )
  })
})
