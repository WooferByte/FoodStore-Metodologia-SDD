import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { CATEGORIES_QUERY_KEY, CATEGORIES_API_PATH } from '@/features/categories/constants'

export interface DeleteCategoryError {
  status: number
  message: string
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation<void, DeleteCategoryError, number>({
    mutationFn: async (id) => {
      try {
        await apiClient.delete(`${CATEGORIES_API_PATH}/${id}`)
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number; data?: { detail?: string } } }
        const status = axiosError?.response?.status ?? 0
        const detail = axiosError?.response?.data?.detail

        if (status === 409) {
          throw {
            status: 409,
            message: detail ?? 'No se puede eliminar: la categoría tiene productos activos asociados.',
          } satisfies DeleteCategoryError
        }

        throw {
          status,
          message: detail ?? 'Error al eliminar la categoría.',
        } satisfies DeleteCategoryError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] })
    },
  })
}
