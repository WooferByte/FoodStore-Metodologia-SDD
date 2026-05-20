import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '@/shared/api/axios'
import { useCreateCategory } from '@/features/categories/hooks/useCreateCategory'
import { CATEGORIES_API_PATH } from '@/features/categories/constants'
import type { Category } from '@/features/categories/types'

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

describe('useCreateCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends POST to categories endpoint and succeeds', async () => {
    const newCategory: Category = {
      id: 3,
      nombre: 'Nueva Cat',
      descripcion: null,
      padre_id: null,
      depth: 0,
      activa: true,
      creado_en: '2024-01-01',
    }

    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: newCategory })

    const { result } = renderHook(() => useCreateCategory(), { wrapper: createWrapper() })

    result.current.mutate({ nombre: 'Nueva Cat' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.post).toHaveBeenCalledWith(CATEGORIES_API_PATH, { nombre: 'Nueva Cat' })
  })
})
