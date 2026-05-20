import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useDeleteCategory } from '@/features/categories/hooks/useDeleteCategory'
import { CATEGORIES_API_PATH } from '@/features/categories/constants'

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

describe('useDeleteCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes category and returns success', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({})

    const { result } = renderHook(() => useDeleteCategory(), { wrapper: createWrapper() })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.delete).toHaveBeenCalledWith(`${CATEGORIES_API_PATH}/1`)
  })

  it('captures 409 error with specific message', async () => {
    const mockError = {
      response: {
        status: 409,
        data: { detail: 'La categoría tiene productos activos asociados.' },
      },
    }
    vi.mocked(apiClient.delete).mockRejectedValueOnce(mockError)

    const { result } = renderHook(() => useDeleteCategory(), { wrapper: createWrapper() })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.status).toBe(409)
    expect(result.current.error?.message).toContain('productos activos')
  })

  it('captures 409 without detail field and uses default message', async () => {
    const mockError = {
      response: {
        status: 409,
        data: {},
      },
    }
    vi.mocked(apiClient.delete).mockRejectedValueOnce(mockError)

    const { result } = renderHook(() => useDeleteCategory(), { wrapper: createWrapper() })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.status).toBe(409)
    expect(result.current.error?.message).toBe('No se puede eliminar: la categoría tiene productos activos asociados.')
  })
})
