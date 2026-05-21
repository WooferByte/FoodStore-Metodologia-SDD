import { useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { useUIStore } from '@/store/uiStore'
import { useDeleteIngredient } from '@/features/ingredients/admin/hooks/useDeleteIngredient'
import type { Ingredient } from '@/entities/product'

interface IngredientDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  ingredient: Ingredient | null
}

export function IngredientDeleteModal({ isOpen, onClose, ingredient }: IngredientDeleteModalProps) {
  const deleteMutation = useDeleteIngredient()
  const addToast = useUIStore((s) => s.addToast)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!ingredient) return

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await deleteMutation.mutateAsync(Number(ingredient.id))
      addToast({ message: 'Ingrediente eliminado correctamente', type: 'success' })
      onClose()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: Record<string, unknown> } }
        const status = axiosErr.response?.status
        const data = axiosErr.response?.data

        if (status === 409) {
          const detail = data?.detail
          const msg = typeof detail === 'string'
            ? detail
            : 'No se puede eliminar: el ingrediente está siendo usado por productos activos.'
          setErrorMessage(msg)
          return
        }

        let msg = 'Error al eliminar el ingrediente.'
        if (data && typeof data === 'object') {
          const detail = data.detail
          if (typeof detail === 'string') msg = detail
        }
        addToast({ message: msg, type: 'error' })
        onClose()
      } else {
        addToast({ message: 'Error al eliminar el ingrediente.', type: 'error' })
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Eliminar ingrediente"
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground">
          ¿Estás seguro de eliminar <strong>{ingredient?.nombre}</strong>?
        </p>
        <p className="text-sm text-muted-foreground">
          Esta acción no se puede deshacer.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={isSubmitting}
            onClick={handleDelete}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
