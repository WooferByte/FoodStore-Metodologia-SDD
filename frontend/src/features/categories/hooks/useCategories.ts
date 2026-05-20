import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { CATEGORIES_QUERY_KEY, CATEGORIES_STALE_TIME, CATEGORIES_API_PATH } from '@/features/categories/constants'
import type { Category } from '@/features/categories/types'

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: [CATEGORIES_QUERY_KEY],
    queryFn: async () => {
      const response = await apiClient.get<Category[]>(CATEGORIES_API_PATH)
      return response.data
    },
    staleTime: CATEGORIES_STALE_TIME,
    refetchOnMount: true,
    retry: 1,
  })
}
