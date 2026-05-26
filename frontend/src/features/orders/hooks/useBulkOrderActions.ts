import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { useUIStore } from '@/store/uiStore'
import { ORDERS_QUERY_KEY } from '@/features/orders/hooks/useOrders'
import { useOrdersManagementStore } from '@/features/orders/store/ordersManagementStore'

export interface BulkResult {
  succeeded: number[]
  failed: number[]
}

interface BulkContext {
  previousOrders: unknown
}

export function useBulkOrderActions() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)
  const setIsBulkPending = useOrdersManagementStore((s) => s.setIsBulkPending)
  const clearAll = useOrdersManagementStore((s) => s.clearAll)

  const cancelMutation = useMutation<BulkResult, Error, number[], BulkContext>({
    mutationFn: async (ids) => {
      const results = await Promise.allSettled(
        ids.map((id) => apiClient.delete(`/api/v1/pedidos/${id}`)),
      )
      const succeeded: number[] = []
      const failed: number[] = []
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          succeeded.push(ids[index])
        } else {
          failed.push(ids[index])
        }
      })
      return { succeeded, failed }
    },
    onMutate: async () => {
      setIsBulkPending(true)
      await queryClient.cancelQueries({ queryKey: [ORDERS_QUERY_KEY] })
      const previousOrders = queryClient.getQueryData([ORDERS_QUERY_KEY])
      return { previousOrders }
    },
    onError: (_error, _ids, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData([ORDERS_QUERY_KEY], context.previousOrders)
      }
    },
    onSuccess: (data) => {
      if (data.failed.length === 0) {
        addToast({
          message: `${data.succeeded.length} ${data.succeeded.length === 1 ? 'pedido cancelado' : 'pedidos cancelados'} correctamente`,
          type: 'success',
        })
      } else if (data.succeeded.length === 0) {
        addToast({
          message: `No se pudo cancelar ningún pedido (${data.failed.length} fallidos)`,
          type: 'error',
        })
      } else {
        addToast({
          message: `${data.succeeded.length} cancelados, ${data.failed.length} fallidos`,
          type: 'error',
        })
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] })
      setIsBulkPending(false)
      clearAll()
    },
  })

  const advanceMutation = useMutation<BulkResult, Error, { ids: number[]; nuevoEstadoId: number }, BulkContext>({
    mutationFn: async ({ ids, nuevoEstadoId }) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          apiClient.patch(`/api/v1/pedidos/${id}/estado`, { nuevo_estado_id: nuevoEstadoId }),
        ),
      )
      const succeeded: number[] = []
      const failed: number[] = []
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          succeeded.push(ids[index])
        } else {
          failed.push(ids[index])
        }
      })
      return { succeeded, failed }
    },
    onMutate: async () => {
      setIsBulkPending(true)
      await queryClient.cancelQueries({ queryKey: [ORDERS_QUERY_KEY] })
      const previousOrders = queryClient.getQueryData([ORDERS_QUERY_KEY])
      return { previousOrders }
    },
    onError: (_error, _params, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData([ORDERS_QUERY_KEY], context.previousOrders)
      }
    },
    onSuccess: (data) => {
      if (data.failed.length === 0) {
        addToast({
          message: `Estado actualizado en ${data.succeeded.length} ${data.succeeded.length === 1 ? 'pedido' : 'pedidos'}`,
          type: 'success',
        })
      } else if (data.succeeded.length === 0) {
        addToast({
          message: `No se pudo actualizar ningún estado (${data.failed.length} fallidos)`,
          type: 'error',
        })
      } else {
        addToast({
          message: `${data.succeeded.length} actualizados, ${data.failed.length} fallidos`,
          type: 'error',
        })
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] })
      setIsBulkPending(false)
      clearAll()
    },
  })

  async function bulkCancel(ids: number[]): Promise<BulkResult> {
    return cancelMutation.mutateAsync(ids)
  }

  async function bulkAdvanceState(ids: number[], nuevoEstadoId: number): Promise<BulkResult> {
    return advanceMutation.mutateAsync({ ids, nuevoEstadoId })
  }

  return { bulkCancel, bulkAdvanceState }
}
