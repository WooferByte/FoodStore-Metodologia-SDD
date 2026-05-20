import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import {
  ADMIN_PRODUCTS_QUERY_KEY,
  PRODUCTS_API_PATH,
} from '@/features/products/admin/constants'
import type { Product } from '@/entities/product'
import type { CreateProductPayload } from '@/features/products/admin/types'

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation<Product, Error, CreateProductPayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<Product>(PRODUCTS_API_PATH, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_PRODUCTS_QUERY_KEY], exact: false })
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['productDetail'], exact: false })
    },
  })
}
