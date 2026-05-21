import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { CATEGORIES_QUERY_KEY, CATEGORIES_API_PATH } from '@/features/categories/constants'
import type { Category, UpdateCategoryPayload } from '@/features/categories/types'

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation<Category, Error, { id: number; data: UpdateCategoryPayload }>({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Category>(`${CATEGORIES_API_PATH}/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] })
    },
  })
}
