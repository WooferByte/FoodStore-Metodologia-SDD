import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { ADMIN_INGREDIENTS_QUERY_KEY, INGREDIENTS_API_PATH } from '@/features/ingredients/admin/constants'
import type { Ingredient } from '@/entities/product'
import type { IngredientFormData } from '@/features/ingredients/admin/types'

export function useUpdateIngredient() {
  const queryClient = useQueryClient()

  return useMutation<Ingredient, Error, { id: number; data: IngredientFormData }>({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Ingredient>(`${INGREDIENTS_API_PATH}/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_INGREDIENTS_QUERY_KEY], exact: false })
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
    },
  })
}
