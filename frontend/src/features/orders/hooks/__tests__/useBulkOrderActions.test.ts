/**
 * useBulkOrderActions tests.
 *
 * Covers:
 *   - bulkCancel: calls DELETE for each ID, returns { succeeded, failed }
 *   - bulkAdvanceState: calls PATCH for each ID, returns { succeeded, failed }
 *   - Partial failure: correctly separates succeeded and failed IDs
 *   - isBulkPending is set true during execution and false after
 *   - clearAll is called after each bulk operation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useBulkOrderActions } from '../useBulkOrderActions'
import { useOrdersManagementStore } from '@/features/orders/store/ordersManagementStore'

// Mock apiClient
vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))

// Mock useUIStore
vi.mock('@/store/uiStore', () => ({
  useUIStore: (selector: (s: { addToast: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ addToast: vi.fn() }),
}))

import { apiClient } from '@/shared/api/axios'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('useBulkOrderActions', () => {
  beforeEach(() => {
    useOrdersManagementStore.setState({
      selectedIds: new Set([1, 2, 3]),
      isBulkPending: false,
    })
    vi.clearAllMocks()
  })

  describe('bulkCancel', () => {
    it('calls DELETE for each ID and returns all succeeded when all succeed', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} })

      const { result } = renderHook(() => useBulkOrderActions(), { wrapper })

      let bulkResult: Awaited<ReturnType<typeof result.current.bulkCancel>> | undefined
      await act(async () => {
        bulkResult = await result.current.bulkCancel([1, 2, 3])
      })

      expect(apiClient.delete).toHaveBeenCalledTimes(3)
      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/pedidos/1')
      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/pedidos/2')
      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/pedidos/3')
      expect(bulkResult?.succeeded).toEqual([1, 2, 3])
      expect(bulkResult?.failed).toEqual([])
    })

    it('returns partial failure when some DELETE calls fail', async () => {
      vi.mocked(apiClient.delete)
        .mockResolvedValueOnce({ data: {} })         // id 1 succeeds
        .mockRejectedValueOnce(new Error('fail'))   // id 2 fails
        .mockResolvedValueOnce({ data: {} })         // id 3 succeeds

      const { result } = renderHook(() => useBulkOrderActions(), { wrapper })

      let bulkResult: Awaited<ReturnType<typeof result.current.bulkCancel>> | undefined
      await act(async () => {
        bulkResult = await result.current.bulkCancel([1, 2, 3])
      })

      expect(bulkResult?.succeeded).toEqual([1, 3])
      expect(bulkResult?.failed).toEqual([2])
    })

    it('sets isBulkPending to false after completion', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} })
      const { result } = renderHook(() => useBulkOrderActions(), { wrapper })

      await act(async () => {
        await result.current.bulkCancel([1])
      })

      expect(useOrdersManagementStore.getState().isBulkPending).toBe(false)
    })

    it('clears selection after bulk cancel', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} })
      useOrdersManagementStore.setState({ selectedIds: new Set([1, 2]) })

      const { result } = renderHook(() => useBulkOrderActions(), { wrapper })
      await act(async () => {
        await result.current.bulkCancel([1, 2])
      })

      expect(useOrdersManagementStore.getState().selectedIds.size).toBe(0)
    })
  })

  describe('bulkAdvanceState', () => {
    it('calls PATCH for each ID with correct body', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })

      const { result } = renderHook(() => useBulkOrderActions(), { wrapper })

      await act(async () => {
        await result.current.bulkAdvanceState([1, 2], 3)
      })

      expect(apiClient.patch).toHaveBeenCalledTimes(2)
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/pedidos/1/estado', { nuevo_estado_id: 3 })
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/pedidos/2/estado', { nuevo_estado_id: 3 })
    })

    it('returns partial failure when some PATCH calls fail', async () => {
      vi.mocked(apiClient.patch)
        .mockResolvedValueOnce({ data: {} })
        .mockRejectedValueOnce(new Error('forbidden'))

      const { result } = renderHook(() => useBulkOrderActions(), { wrapper })

      let bulkResult: Awaited<ReturnType<typeof result.current.bulkAdvanceState>> | undefined
      await act(async () => {
        bulkResult = await result.current.bulkAdvanceState([1, 2], 3)
      })

      expect(bulkResult?.succeeded).toEqual([1])
      expect(bulkResult?.failed).toEqual([2])
    })

    it('clears selection after bulk state advance', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
      useOrdersManagementStore.setState({ selectedIds: new Set([5, 6]) })

      const { result } = renderHook(() => useBulkOrderActions(), { wrapper })
      await act(async () => {
        await result.current.bulkAdvanceState([5, 6], 4)
      })

      expect(useOrdersManagementStore.getState().selectedIds.size).toBe(0)
    })
  })
})
