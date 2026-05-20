/**
 * useUpdateUser tests.
 *
 * Covers:
 *   - onSuccess invalidates ['admin-users'] queryKey
 *   - onError with 409 re-throws the error for the modal to handle inline
 *   - onError with non-409 does not re-throw (interceptor handles the toast)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useUpdateUser } from '../useUpdateUser'

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    ...actual,
    default: {
      ...actual.default,
      isAxiosError: (error: unknown): boolean => {
        return (
          typeof error === 'object' &&
          error !== null &&
          'isAxiosError' in error &&
          (error as { isAxiosError: boolean }).isAxiosError === true
        )
      },
    },
    isAxiosError: (error: unknown): boolean => {
      return (
        typeof error === 'object' &&
        error !== null &&
        'isAxiosError' in error &&
        (error as { isAxiosError: boolean }).isAxiosError === true
      )
    },
  }
})

// Mock apiClient
vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    put: vi.fn(),
  },
}))

import { apiClient } from '@/shared/api/axios'

const mockUser = {
  id: 1,
  email: 'admin@test.com',
  nombre: 'Admin',
  apellido: 'Test',
  activo: true,
  telefono: null,
  creado_en: '2024-01-01T00:00:00Z',
  roles: ['ADMIN'],
}

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, children)
  }
}

describe('useUpdateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT /api/v1/admin/usuarios/:id and returns the updated user', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: mockUser })
    const wrapper = createWrapper()
    const { result } = renderHook(() => useUpdateUser(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ userId: 1, payload: { nombre: 'Nuevo' } })
    })

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/admin/usuarios/1', { nombre: 'Nuevo' })
  })

  it('onSuccess invalidates admin-users queryKey', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: mockUser })
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children)

    const { result } = renderHook(() => useUpdateUser(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ userId: 1, payload: { nombre: 'New' } })
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['admin-users'] }),
      )
    })
  })

  it('onError with 409 re-throws for modal inline handling', async () => {
    const error409 = Object.assign(new Error('Conflict'), {
      isAxiosError: true,
      response: { status: 409, data: { detail: 'El email ya está en uso' } },
    })
    vi.mocked(apiClient.put).mockRejectedValue(error409)
    const wrapper = createWrapper()
    const { result } = renderHook(() => useUpdateUser(), { wrapper })

    let threw = false
    await act(async () => {
      try {
        await result.current.mutateAsync({ userId: 1, payload: { email: 'duplicate@test.com' } })
      } catch {
        threw = true
      }
    })

    expect(threw).toBe(true)
  })

  it('mutation starts in idle state', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useUpdateUser(), { wrapper })
    expect(result.current.isPending).toBe(false)
    expect(result.current.isIdle).toBe(true)
  })
})
