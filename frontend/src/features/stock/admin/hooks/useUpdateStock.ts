import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { ADMIN_STOCK_QUERY_KEY, PRODUCTS_API_PATH } from '@/features/stock/admin/constants'
import type { Product } from '@/entities/product'

export function useUpdateStock() {
  const queryClient = useQueryClient()

  return useMutation<Product, Error, { id: number; stock_cantidad: number }>({
    mutationFn: async ({ id, stock_cantidad }) => {
      const response = await apiClient.patch<Product>(
        `${PRODUCTS_API_PATH}/${id}/stock`,
        { stock_cantidad },
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_STOCK_QUERY_KEY], exact: false })
      queryClient.invalidateQueries({ queryKey: ['admin-products'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['productDetail'], exact: false })
      // La invalidación + refetchOnMount=true (default) se encargan del catálogo.
      // NO usar refetchQueries aquí — refetchearía TODAS las combinaciones de
      // filtros del catálogo simultáneamente, saturando la conexión.
    },
  })
}
