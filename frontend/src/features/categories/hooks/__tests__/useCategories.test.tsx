import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { CATEGORIES_API_PATH } from '@/features/categories/constants'
import type { Category } from '@/features/categories/types'

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

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches categories and returns data', async () => {
    const mockCategories: Category[] = [
      { id: 1, nombre: 'Pizzas', descripcion: null, padre_id: null, depth: 0, activa: true, creado_en: '2024-01-01' },
      { id: 2, nombre: 'Bebidas', descripcion: 'Bebidas sin alcohol', padre_id: null, depth: 0, activa: true, creado_en: '2024-01-01' },
    ]

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockCategories })

    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockCategories)
    expect(apiClient.get).toHaveBeenCalledWith(CATEGORIES_API_PATH)
  })
})
