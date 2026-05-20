import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useAdminIngredients } from '@/features/ingredients/admin/hooks/useAdminIngredients'
import { INGREDIENTS_API_PATH } from '@/features/ingredients/admin/constants'
import type { Ingredient } from '@/entities/product'

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

const mockIngredients: Ingredient[] = [
  { id: '1', nombre: 'Queso', es_alergeno: false },
  { id: '2', nombre: 'Gluten', es_alergeno: true },
]

describe('useAdminIngredients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches all ingredients when filter is all', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockIngredients })

    const { result } = renderHook(
      () => useAdminIngredients({ es_alergeno: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockIngredients)
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    const url: string = vi.mocked(apiClient.get).mock.calls[0][0] as string
    expect(url).toContain(INGREDIENTS_API_PATH)
    expect(url).not.toContain('es_alergeno')
  })

  it('includes es_alergeno=true param when filtering allergens', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockIngredients[1]] })

    const { result } = renderHook(
      () => useAdminIngredients({ es_alergeno: 'true' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const url: string = vi.mocked(apiClient.get).mock.calls[0][0] as string
    expect(url).toContain('es_alergeno=true')
  })

  it('handles empty response', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] })

    const { result } = renderHook(
      () => useAdminIngredients({ es_alergeno: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(0)
  })

  it('handles error response', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(
      () => useAdminIngredients({ es_alergeno: 'all' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 })
  })
})
