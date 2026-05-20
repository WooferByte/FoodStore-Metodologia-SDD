import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import {
  ADMIN_PRODUCTS_QUERY_KEY,
  PRODUCTS_API_PATH,
} from '@/features/products/admin/constants'

export function useSetProductCategories() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: number; categoria_ids: number[] }>({
    mutationFn: async ({ id, categoria_ids }) => {
      await apiClient.put(`${PRODUCTS_API_PATH}/${id}/categorias`, { categoria_ids })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_PRODUCTS_QUERY_KEY], exact: false })
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['productDetail'], exact: false })
    },
  })
}
