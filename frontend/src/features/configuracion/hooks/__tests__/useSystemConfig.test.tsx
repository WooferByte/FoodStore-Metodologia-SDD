/**
 * useSystemConfig / useAllSystemConfigs auth-gating tests
 *
 * fix-refresh-loop-cartdrawer D-1: the config fetch is only enabled when
 * authStore.isAuthenticated is true. Anonymous sessions must NOT hit
 * GET /api/v1/admin/configuracion.
 *
 * Scenarios:
 * - anon (isAuthenticated=false) → no fetch, data undefined
 * - authenticated (isAuthenticated=true) → fetch fires, select works
 * - reactive gate: enabling auth after mount starts the fetch
 */

import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useSystemConfig,
  useAllSystemConfigs,
} from '@/features/configuracion/hooks'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/shared/api/axios'
import type { Configuracion } from '@/features/configuracion/admin/types'

vi.mock('@/shared/api/axios', () => ({
  apiClient: { get: vi.fn() },
}))

const CONFIGS: Configuracion[] = [
  {
    id: 1,
    clave: 'envio_costo',
    valor: '500',
    descripcion: null,
    actualizado_por: 1,
    actualizado_en: '2026-01-01T00:00:00Z',
    creado_en: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    clave: 'envio_gratis_umbral',
    valor: '3000',
    descripcion: null,
    actualizado_por: 1,
    actualizado_en: '2026-01-01T00:00:00Z',
    creado_en: '2026-01-01T00:00:00Z',
  },
]

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
}

function renderWithClient<TResult>(ui: () => TResult) {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(ui, { wrapper })
}

describe('useSystemConfig — auth-gated fetch (D-1)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    })
    vi.mocked(apiClient.get).mockReset()
  })

  it('does NOT fetch config when isAuthenticated=false', async () => {
    const { result } = renderWithClient(() => useSystemConfig('envio_costo'))

    await waitFor(() => expect(result.current.isFetching).toBe(false))

    expect(vi.mocked(apiClient.get)).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('fetches config and selects the value when isAuthenticated=true', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'token' })
    vi.mocked(apiClient.get).mockResolvedValue({
      data: CONFIGS,
    } as never)

    const { result } = renderWithClient(() => useSystemConfig('envio_costo'))

    await waitFor(() => expect(result.current.data?.valor).toBe('500'))
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith(
      '/api/v1/admin/configuracion/',
    )
  })

  it('starts fetching reactively once isAuthenticated becomes true', async () => {
    const { result, rerender } = renderWithClient(() =>
      useSystemConfig('envio_gratis_umbral'),
    )

    // anon → idle, no fetch
    await waitFor(() => expect(result.current.isFetching).toBe(false))
    expect(vi.mocked(apiClient.get)).not.toHaveBeenCalled()

    // login → enabled flips true → fetch fires
    vi.mocked(apiClient.get).mockResolvedValue({ data: CONFIGS } as never)
    act(() => {
      useAuthStore.setState({ isAuthenticated: true, accessToken: 'token' })
    })
    rerender()

    await waitFor(() => expect(result.current.data?.valor).toBe('3000'))
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledTimes(1)
  })
})

describe('useAllSystemConfigs — auth-gated fetch (D-1)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    })
    vi.mocked(apiClient.get).mockReset()
  })

  it('does NOT fetch when anonymous', async () => {
    const { result } = renderWithClient(() => useAllSystemConfigs())

    await waitFor(() => expect(result.current.isFetching).toBe(false))

    expect(vi.mocked(apiClient.get)).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('fetches all configs when authenticated', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'token' })
    vi.mocked(apiClient.get).mockResolvedValue({ data: CONFIGS } as never)

    const { result } = renderWithClient(() => useAllSystemConfigs())

    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledTimes(1)
  })
})
