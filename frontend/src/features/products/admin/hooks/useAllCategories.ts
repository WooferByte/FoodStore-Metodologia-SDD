import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { CATEGORIES_QUERY_KEY } from '@/features/categories/constants'
import { CATEGORIES_API_PATH } from '@/features/products/admin/constants'
import type { Category } from '@/features/categories/types'

export function useAllCategories() {
  return useQuery<Category[]>({
    queryKey: [CATEGORIES_QUERY_KEY],
    queryFn: async () => {
      const response = await apiClient.get<Category[]>(CATEGORIES_API_PATH)
      return response.data
    },
    staleTime: 120_000,
    refetchOnMount: true,
    retry: 1,
  })
}
