import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import {
  ADMIN_PRODUCTS_QUERY_KEY,
  PRODUCTS_API_PATH,
} from '@/features/products/admin/constants'
import type { IngredientFormItem } from '@/features/products/admin/types'

export function useSetProductIngredients() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: number; ingredientes: IngredientFormItem[] }>({
    mutationFn: async ({ id, ingredientes }) => {
      await apiClient.put(`${PRODUCTS_API_PATH}/${id}/ingredientes`, { ingredientes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_PRODUCTS_QUERY_KEY], exact: false })
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['productDetail'], exact: false })
    },
  })
}
