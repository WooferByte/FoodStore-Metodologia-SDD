import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { CATEGORIES_QUERY_KEY, CATEGORIES_API_PATH } from '@/features/categories/constants'
import type { Category, CreateCategoryPayload } from '@/features/categories/types'

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation<Category, Error, CreateCategoryPayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<Category>(CATEGORIES_API_PATH, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] })
    },
  })
}
