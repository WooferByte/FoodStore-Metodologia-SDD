import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { ADMIN_INGREDIENTS_QUERY_KEY, ADMIN_INGREDIENTS_STALE_TIME, INGREDIENTS_API_PATH } from '@/features/ingredients/admin/constants'
import type { IngredientFilters, IngredientsApiResponse } from '@/features/ingredients/admin/types'

function buildQueryParams(filters: IngredientFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.es_alergeno !== 'all') {
    p.set('es_alergeno', filters.es_alergeno)
  }
  return p
}

export function useAdminIngredients(filters: IngredientFilters) {
  const params = buildQueryParams(filters)

  return useQuery<IngredientsApiResponse>({
    queryKey: [ADMIN_INGREDIENTS_QUERY_KEY, { es_alergeno: filters.es_alergeno }],
    queryFn: async () => {
      const response = await apiClient.get<IngredientsApiResponse>(
        `${INGREDIENTS_API_PATH}/?${params.toString()}`,
      )
      return response.data
    },
    staleTime: ADMIN_INGREDIENTS_STALE_TIME,
    gcTime: 5 * 60_000,
    retry: 1,
  })
}
