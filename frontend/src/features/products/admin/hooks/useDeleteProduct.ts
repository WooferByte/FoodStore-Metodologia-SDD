import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import {
  ADMIN_PRODUCTS_QUERY_KEY,
  PRODUCTS_API_PATH,
} from '@/features/products/admin/constants'
import type { DeleteProductError } from '@/features/products/admin/types'

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation<void, DeleteProductError, number>({
    mutationFn: async (id) => {
      try {
        await apiClient.delete(`${PRODUCTS_API_PATH}/${id}`)
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number; data?: { detail?: string } } }
        const status = axiosError?.response?.status ?? 0
        const detail = axiosError?.response?.data?.detail

        if (status === 409) {
          throw {
            status: 409,
            message: detail ?? 'No se puede eliminar: el producto está en pedidos activos. Desactivá el producto en su lugar.',
          } satisfies DeleteProductError
        }

        throw {
          status,
          message: detail ?? 'Error al eliminar el producto.',
        } satisfies DeleteProductError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_PRODUCTS_QUERY_KEY], exact: false })
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['productDetail'], exact: false })
    },
  })
}
