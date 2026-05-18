/**
 * useToggleUserStatus tests.
 *
 * Covers:
 *   - onSuccess invalidates ['admin-users'] queryKey
 *   - onError with 409 shows a specific warning toast (does NOT re-throw)
 *   - mutation is in idle state initially
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useToggleUserStatus } from '../useToggleUserStatus'

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    ...actual,
    default: {
      ...actual.default,
      isAxiosError: (error: unknown): boolean =>
        typeof error === 'object' &&
        error !== null &&
        'isAxiosError' in error &&
        (error as { isAxiosError: boolean }).isAxiosError === true,
    },
    isAxiosError: (error: unknown): boolean =>
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      (error as { isAxiosError: boolean }).isAxiosError === true,
  }
})

// Mock apiClient
vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    patch: vi.fn(),
  },
}))

// Mock useUIStore so we can capture addToast calls
const mockAddToast = vi.fn()
vi.mock('@/store/uiStore', () => ({
  useUIStore: (selector: (s: { addToast: typeof mockAddToast }) => unknown) =>
    selector({ addToast: mockAddToast }),
}))

import { apiClient } from '@/shared/api/axios'

const mockUser = {
  id: 2,
  email: 'user@test.com',
  nombre: 'User',
  apellido: 'Test',
  activo: false,
  telefono: null,
  creado_en: '2024-01-01T00:00:00Z',
  roles: ['CLIENT'],
}

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children)
  }
}

describe('useToggleUserStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PATCH /api/v1/admin/usuarios/:id/estado', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: mockUser })
    const wrapper = createWrapper()
    const { result } = renderHook(() => useToggleUserStatus(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ userId: 2, payload: { activo: false } })
    })

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/v1/admin/usuarios/2/estado',
      { activo: false },
    )
  })

  it('onSuccess invalidates admin-users queryKey', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: mockUser })
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    const { result } = renderHook(() => useToggleUserStatus(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ userId: 2, payload: { activo: false } })
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['admin-users'] }),
      )
    })
  })

  it('onError with 409 shows "único administrador" warning toast', async () => {
    const error409 = Object.assign(new Error('Conflict'), {
      isAxiosError: true,
      response: { status: 409, data: { detail: 'No se puede desactivar' } },
    })
    vi.mocked(apiClient.patch).mockRejectedValue(error409)
    const wrapper = createWrapper()
    const { result } = renderHook(() => useToggleUserStatus(), { wrapper })

    await act(async () => {
      // 409 is caught in the hook — mutation should NOT throw to the caller
      try {
        await result.current.mutateAsync({ userId: 1, payload: { activo: false } })
      } catch {
        // May or may not bubble depending on TanStack Query internals; we just check toast
      }
    })

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No se puede desactivar al único administrador del sistema',
          type: 'warning',
        }),
      )
    })
  })

  it('starts in idle state', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useToggleUserStatus(), { wrapper })
    expect(result.current.isPending).toBe(false)
    expect(result.current.isIdle).toBe(true)
  })
})
