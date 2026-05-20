import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useUpdateIngredient } from '@/features/ingredients/admin/hooks/useUpdateIngredient'
import { INGREDIENTS_API_PATH } from '@/features/ingredients/admin/constants'

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

describe('useUpdateIngredient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates ingredient successfully', async () => {
    const mockUpdated = { id: '1', nombre: 'Queso Actualizado', es_alergeno: true }
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: mockUpdated })

    const { result } = renderHook(() => useUpdateIngredient(), { wrapper: createWrapper() })

    const mutationResult = await result.current.mutateAsync({
      id: 1,
      data: { nombre: 'Queso Actualizado', es_alergeno: true },
    })

    expect(mutationResult).toEqual(mockUpdated)
    expect(apiClient.put).toHaveBeenCalledWith(`${INGREDIENTS_API_PATH}/1`, { nombre: 'Queso Actualizado', es_alergeno: true })
  })

  it('rejects with 409 on duplicate name', async () => {
    const error409 = { response: { status: 409, data: { detail: 'Ya existe un ingrediente con ese nombre.' } } }
    vi.mocked(apiClient.put).mockRejectedValueOnce(error409)

    const { result } = renderHook(() => useUpdateIngredient(), { wrapper: createWrapper() })

    await expect(
      result.current.mutateAsync({ id: 1, data: { nombre: 'Queso', es_alergeno: false } }),
    ).rejects.toMatchObject(error409)
  })
})
