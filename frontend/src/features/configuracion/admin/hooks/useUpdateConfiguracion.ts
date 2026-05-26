import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { useUIStore } from '@/store/uiStore'
import { CONFIGURACION_QUERY_KEY, CONFIGURACION_API_PATH } from '@/features/configuracion/admin/constants'
import type { Configuracion, ConfiguracionEditData } from '@/features/configuracion/admin/types'

export function useUpdateConfiguracion() {
  const queryClient = useQueryClient()

  return useMutation<Configuracion, Error, { clave: string; datos: ConfiguracionEditData }>({
    mutationFn: async ({ clave, datos }) => {
      const response = await apiClient.put<{ data: Configuracion }>(
        `${CONFIGURACION_API_PATH}/${clave}`,
        datos
      )
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONFIGURACION_QUERY_KEY], exact: true })
      useUIStore.getState().addToast({
        message: 'Configuración actualizada correctamente',
        type: 'success',
      })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      useUIStore.getState().addToast({
        message: `No se pudo actualizar la configuración: ${message}`,
        type: 'error',
      })
    },
  })
}
