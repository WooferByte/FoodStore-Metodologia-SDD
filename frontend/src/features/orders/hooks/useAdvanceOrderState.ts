import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { useUIStore } from '@/store/uiStore'
import { ORDERS_QUERY_KEY } from '@/features/orders/hooks/useOrders'
import { ORDER_DETAIL_QUERY_KEY } from '@/features/orders/hooks/useOrderDetail'
import type { Order } from '@/entities/order'

export interface AdvanceOrderStateParams {
  orderId: number
  nuevoEstadoId: number
}

interface AdvanceContext {
  previousOrders: unknown
  previousDetail: unknown
}

export function useAdvanceOrderState() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation<Order, Error, AdvanceOrderStateParams, AdvanceContext>({
    mutationFn: async ({ orderId, nuevoEstadoId }: AdvanceOrderStateParams) => {
      const response = await apiClient.patch<Order>(
        `/api/v1/pedidos/${orderId}/estado`,
        { nuevo_estado_id: nuevoEstadoId },
      )
      return response.data
    },
    onMutate: async ({ orderId }) => {
      await queryClient.cancelQueries({ queryKey: [ORDERS_QUERY_KEY] })
      await queryClient.cancelQueries({ queryKey: [ORDER_DETAIL_QUERY_KEY, orderId] })

      const previousOrders = queryClient.getQueryData([ORDERS_QUERY_KEY])
      const previousDetail = queryClient.getQueryData([ORDER_DETAIL_QUERY_KEY, orderId])

      return { previousOrders, previousDetail }
    },
    onError: (_error, { orderId }, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData([ORDERS_QUERY_KEY], context.previousOrders)
      }
      if (context?.previousDetail) {
        queryClient.setQueryData([ORDER_DETAIL_QUERY_KEY, orderId], context.previousDetail)
      }
      addToast({ message: 'Error al actualizar el estado del pedido', type: 'error' })
    },
    onSuccess: () => {
      addToast({ message: 'Estado del pedido actualizado', type: 'success' })
    },
    onSettled: (_data, _error, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [ORDER_DETAIL_QUERY_KEY, orderId] })
    },
  })
}
