/**
 * useUpdateUser — TanStack Query v5 mutation for updating a user.
 *
 * Calls PUT /api/v1/admin/usuarios/:id
 * Body: { nombre?, apellido?, email?, telefono?, roles?: string[] }
 *
 * On success:
 *   - Invalidates ['admin-users'] queries to refresh the list
 *
 * On error 409 (last ADMIN removal protection):
 *   - Re-throws the error so the modal can surface it as inline error
 *   - Does NOT show a toast — the modal handles the 409 inline (design.md Risks)
 *
 * On other errors:
 *   - The axios interceptor already shows a toast — mutation does not duplicate it
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/axios'
import { ADMIN_USERS_QUERY_KEY } from '@/features/users/hooks/useAdminUsers'
import type { AdminUser, UpdateUserPayload } from '@/features/users/types'

export interface UpdateUserParams {
  userId: number
  payload: UpdateUserPayload
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation<AdminUser, Error, UpdateUserParams>({
    mutationFn: async ({ userId, payload }: UpdateUserParams) => {
      const response = await apiClient.put<AdminUser>(
        `/api/v1/admin/usuarios/${userId}`,
        payload,
      )
      return response.data
    },
    onSuccess: () => {
      // Invalidate all admin-users queries to refresh the list
      void queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })
    },
    onError: (_error) => {
      // Do NOT re-throw here — throwing from onError causes an unhandled rejection
      // in TanStack Query's internal machinery. mutateAsync already rejects when
      // mutationFn throws, so the 409 error naturally bubbles up to the await caller.
      //
      // For 409: the modal catches it from the mutateAsync rejection and shows inline error.
      // For non-409: the axios interceptor already showed a toast — nothing else needed.
    },
  })
}
