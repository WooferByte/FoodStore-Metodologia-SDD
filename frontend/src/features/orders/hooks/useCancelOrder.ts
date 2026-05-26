import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { useUIStore } from '@/store/uiStore'
import { useOrderDetailStore } from '@/features/orders/store/orderDetailStore'
import { ORDERS_QUERY_KEY } from '@/features/orders/hooks/useOrders'
import { ORDER_DETAIL_QUERY_KEY } from '@/features/orders/hooks/useOrderDetail'
import type { Order } from '@/entities/order'

interface CancelContext {
  previousOrders: unknown
  previousDetail: unknown
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)
  const closeCancelModal = useOrderDetailStore((state) => state.closeCancelModal)

  return useMutation<Order, Error, number, CancelContext>({
    mutationFn: async (orderId: number) => {
      const response = await apiClient.delete<Order>(`/api/v1/pedidos/${orderId}`)
      return response.data
    },
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey: [ORDERS_QUERY_KEY] })
      await queryClient.cancelQueries({ queryKey: [ORDER_DETAIL_QUERY_KEY, orderId] })

      const previousOrders = queryClient.getQueryData([ORDERS_QUERY_KEY])
      const previousDetail = queryClient.getQueryData([ORDER_DETAIL_QUERY_KEY, orderId])

      return { previousOrders, previousDetail }
    },
    onError: (_error, orderId, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData([ORDERS_QUERY_KEY], context.previousOrders)
      }
      if (context?.previousDetail) {
        queryClient.setQueryData([ORDER_DETAIL_QUERY_KEY, orderId], context.previousDetail)
      }
      addToast({ message: 'Error al cancelar el pedido', type: 'error' })
    },
    onSuccess: () => {
      closeCancelModal()
      addToast({ message: 'Pedido cancelado correctamente', type: 'success' })
    },
    onSettled: (_data, _error, orderId) => {
      void queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [ORDER_DETAIL_QUERY_KEY, orderId] })
    },
  })
}
