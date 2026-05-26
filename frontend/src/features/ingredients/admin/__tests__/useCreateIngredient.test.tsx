import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useCreateIngredient } from '@/features/ingredients/admin/hooks/useCreateIngredient'
import { INGREDIENTS_API_PATH } from '@/features/ingredients/admin/constants'

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

describe('useCreateIngredient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates ingredient successfully', async () => {
    const mockCreated = { id: '3', nombre: 'Nuevo', es_alergeno: true }
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockCreated })

    const { result } = renderHook(() => useCreateIngredient(), { wrapper: createWrapper() })

    const mutationResult = await result.current.mutateAsync({ nombre: 'Nuevo', es_alergeno: true })

    expect(mutationResult).toEqual(mockCreated)
    expect(apiClient.post).toHaveBeenCalledWith(`${INGREDIENTS_API_PATH}/`, { nombre: 'Nuevo', es_alergeno: true })
  })

  it('rejects with 409 on duplicate name', async () => {
    const error409 = { response: { status: 409, data: { detail: 'Ya existe un ingrediente con ese nombre.' } } }
    vi.mocked(apiClient.post).mockRejectedValueOnce(error409)

    const { result } = renderHook(() => useCreateIngredient(), { wrapper: createWrapper() })

    await expect(
      result.current.mutateAsync({ nombre: 'Queso', es_alergeno: false }),
    ).rejects.toMatchObject(error409)
  })
})
