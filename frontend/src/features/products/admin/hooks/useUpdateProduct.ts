import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import {
  ADMIN_PRODUCTS_QUERY_KEY,
  PRODUCTS_API_PATH,
} from '@/features/products/admin/constants'
import type { Product } from '@/entities/product'
import type { UpdateProductPayload } from '@/features/products/admin/types'

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation<Product, Error, { id: number; data: UpdateProductPayload }>({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Product>(`${PRODUCTS_API_PATH}/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_PRODUCTS_QUERY_KEY], exact: false })
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['productDetail'], exact: false })
      // Invalidar también stock — si se cambió disponible, la tabla de stock debe reflejarlo
      queryClient.invalidateQueries({ queryKey: ['admin-stock-products'], exact: false })
    },
  })
}
