/**
 * useToggleUserStatus — TanStack Query v5 mutation for toggling user active status.
 *
 * Calls PATCH /api/v1/admin/usuarios/:id/estado
 * Body: { activo: boolean }
 *
 * On success:
 *   - Invalidates ['admin-users'] queries
 *
 * On error 409 (last ADMIN deactivation):
 *   - Shows toast: "No se puede desactivar al único administrador del sistema"
 *   - Does NOT re-throw — the modal closes and the toast informs the user
 *     (design.md: modal's onSuccess closes, but 409 is handled at hook level)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { useUIStore } from '@/store/uiStore'
import { ADMIN_USERS_QUERY_KEY } from '@/features/users/hooks/useAdminUsers'
import type { AdminUser, ToggleUserStatusPayload } from '@/features/users/types'
import axios from 'axios'

export interface ToggleUserStatusParams {
  userId: number
  payload: ToggleUserStatusPayload
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((state) => state.addToast)

  return useMutation<AdminUser, Error, ToggleUserStatusParams>({
    mutationFn: async ({ userId, payload }: ToggleUserStatusParams) => {
      const response = await apiClient.patch<AdminUser>(
        `/api/v1/admin/usuarios/${userId}/estado`,
        payload,
      )
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        // Show a specific Spanish toast for the "last admin" constraint
        addToast({
          message: 'No se puede desactivar al único administrador del sistema',
          type: 'warning',
        })
        // Do NOT re-throw — error is handled, caller (modal) can close
      }
      // For non-409 errors: the axios interceptor already shows a toast
    },
  })
}
