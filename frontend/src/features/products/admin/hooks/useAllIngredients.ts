import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { INGREDIENTS_API_PATH } from '@/features/products/admin/constants'
import type { Ingredient } from '@/entities/product'

export function useAllIngredients() {
  return useQuery<Ingredient[]>({
    queryKey: ['admin-ingredients'],
    queryFn: async () => {
      const response = await apiClient.get<Ingredient[]>(INGREDIENTS_API_PATH)
      return response.data
    },
    staleTime: 120_000,
    refetchOnMount: true,
    retry: 1,
  })
}
