import { useMemo, useCallback, useEffect } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { useDeleteCategory } from '@/features/categories/hooks/useDeleteCategory'
import type { Category } from '@/features/categories/types'

interface CategoryDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  category: Category | null
  allCategories: Category[]
}

export function CategoryDeleteModal({ isOpen, onClose, onSuccess, category, allCategories }: CategoryDeleteModalProps) {
  const deleteMutation = useDeleteCategory()

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const cancelBtn = document.querySelector('[data-cancel-btn]') as HTMLButtonElement
        cancelBtn?.focus()
      }, 100)
    }
  }, [isOpen])

  const childCategories = useMemo(() => {
    if (!category) return []
    return allCategories.filter((c) => c.padre_id === category.id)
  }, [category, allCategories])

  const handleDelete = useCallback(async () => {
    if (!category) return

    try {
      await deleteMutation.mutateAsync(category.id)
      onSuccess()
    } catch {
      // Error is handled by the mutation
    }
  }, [category, deleteMutation, onSuccess])

  const deleteError = deleteMutation.error
  const isPending = deleteMutation.isPending

  if (!category) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Categoría">
      <div className="space-y-4" role="dialog" aria-labelledby="modal-title">
        <p className="text-sm text-foreground">
          ¿Eliminar la categoría <strong>{category.nombre}</strong>?
        </p>

        {childCategories.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Subcategorías afectadas ({childCategories.length}):
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              {childCategories.map((child) => (
                <li key={child.id}>{child.nombre}</li>
              ))}
            </ul>
          </div>
        )}

        {deleteError && (
          <p role="alert" className="text-sm text-destructive">
            {deleteError.status === 409
              ? 'No se puede eliminar: la categoría tiene productos activos asociados.'
              : deleteError.message}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} data-cancel-btn>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={isPending}
            onClick={handleDelete}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
