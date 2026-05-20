import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { ADMIN_INGREDIENTS_QUERY_KEY, INGREDIENTS_API_PATH } from '@/features/ingredients/admin/constants'
import type { Ingredient } from '@/entities/product'
import type { IngredientFormData } from '@/features/ingredients/admin/types'

export function useCreateIngredient() {
  const queryClient = useQueryClient()

  return useMutation<Ingredient, Error, IngredientFormData>({
    mutationFn: async (data) => {
      const response = await apiClient.post<Ingredient>(`${INGREDIENTS_API_PATH}/`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_INGREDIENTS_QUERY_KEY], exact: false })
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
    },
  })
}
