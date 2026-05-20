import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { ADMIN_INGREDIENTS_QUERY_KEY, INGREDIENTS_API_PATH } from '@/features/ingredients/admin/constants'
import type { Ingredient } from '@/entities/product'

export function useDeleteIngredient() {
  const queryClient = useQueryClient()

  return useMutation<Ingredient, Error, number>({
    mutationFn: async (id) => {
      const response = await apiClient.delete<Ingredient>(`${INGREDIENTS_API_PATH}/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_INGREDIENTS_QUERY_KEY], exact: false })
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
    },
  })
}
