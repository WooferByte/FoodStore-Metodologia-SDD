import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useDeleteIngredient } from '@/features/ingredients/admin/hooks/useDeleteIngredient'
import { INGREDIENTS_API_PATH } from '@/features/ingredients/admin/constants'

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

describe('useDeleteIngredient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes ingredient successfully', async () => {
    const mockDeleted = { id: '1', nombre: 'Queso', es_alergeno: false }
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: mockDeleted })

    const { result } = renderHook(() => useDeleteIngredient(), { wrapper: createWrapper() })

    const mutationResult = await result.current.mutateAsync(1)

    expect(mutationResult).toEqual(mockDeleted)
    expect(apiClient.delete).toHaveBeenCalledWith(`${INGREDIENTS_API_PATH}/1`)
  })

  it('rejects with 409 when ingredient is in active products', async () => {
    const error409 = { response: { status: 409, data: { detail: 'No se puede eliminar: el ingrediente está siendo usado por productos activos.' } } }
    vi.mocked(apiClient.delete).mockRejectedValueOnce(error409)

    const { result } = renderHook(() => useDeleteIngredient(), { wrapper: createWrapper() })

    await expect(
      result.current.mutateAsync(1),
    ).rejects.toMatchObject(error409)
  })
})
