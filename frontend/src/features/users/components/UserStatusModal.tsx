/**
 * UserStatusModal — confirmation dialog for toggling a user's active status.
 *
 * Design decisions (design.md):
 *   - Shows "¿Desactivar a [nombre]?" or "¿Activar a [nombre]?" based on current status
 *   - Calls useToggleUserStatus with { activo: !user.activo }
 *   - onSuccess: closes modal (via mutation.onSuccess callback)
 *   - 409 error handling lives in the hook (toast) — modal does NOT duplicate it
 *   - Confirm button shows loading state while mutation is in flight
 *
 * Accessibility:
 *   - Native <dialog> role="dialog" with aria-modal="true"
 *   - Descriptive title explains the action
 *   - Confirm button has loading state and is disabled while pending
 */

import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { useToggleUserStatus } from '@/features/users/hooks/useToggleUserStatus'
import type { AdminUser } from '@/features/users/types'

export interface UserStatusModalProps {
  user: AdminUser | null
  isOpen: boolean
  onClose: () => void
}

export function UserStatusModal({ user, isOpen, onClose }: UserStatusModalProps) {
  const mutation = useToggleUserStatus()

  if (!user) return null

  const isActivating = !user.activo
  const actionLabel  = isActivating ? 'Activar' : 'Desactivar'

  async function handleConfirm() {
    if (!user) return
    try {
      await mutation.mutateAsync({
        userId: user.id,
        payload: { activo: !user.activo },
      })
      // Success: close the modal
      onClose()
    } catch {
      // 409 toast is shown by the hook; close modal for non-retriable errors
      // The hook does NOT re-throw 409, so we only reach here for other errors
      // Axios interceptor already showed a toast — just close
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${actionLabel} usuario`}
    >
      <div className="space-y-6">
        <p className="text-sm text-foreground">
          {isActivating
            ? `¿Activar a ${user.nombre} ${user.apellido ?? ''}?`
            : `¿Desactivar a ${user.nombre} ${user.apellido ?? ''}?`}
        </p>
        <p className="text-xs text-muted-foreground">
          {isActivating
            ? 'El usuario podrá volver a iniciar sesión en el sistema.'
            : 'El usuario no podrá iniciar sesión hasta ser reactivado.'}
        </p>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant={isActivating ? 'primary' : 'destructive'}
            loading={mutation.isPending}
            disabled={mutation.isPending}
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
