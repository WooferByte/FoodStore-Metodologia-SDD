import { useCallback, useEffect } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { useDeleteProduct } from '@/features/products/admin/hooks/useDeleteProduct'
import type { Product } from '@/entities/product'

interface ProductDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  product: Product | null
}

export function ProductDeleteModal({ isOpen, onClose, onSuccess, product }: ProductDeleteModalProps) {
  const deleteMutation = useDeleteProduct()

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const cancelBtn = document.querySelector('[data-cancel-btn]') as HTMLButtonElement
        cancelBtn?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleDelete = useCallback(async () => {
    if (!product) return

    try {
      await deleteMutation.mutateAsync(Number(product.id))
      onSuccess()
    } catch {
      // Error is handled by the mutation
    }
  }, [product, deleteMutation, onSuccess])

  const deleteError = deleteMutation.error
  const isPending = deleteMutation.isPending

  if (!product) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Producto">
      <div className="space-y-4" role="dialog" aria-labelledby="modal-title">
        <p className="text-sm text-foreground">
          ¿Eliminar el producto <strong>{product.nombre}</strong>?
        </p>

        {deleteError && (
          <p role="alert" className="text-sm text-destructive">
            {deleteError.status === 409
              ? 'No se puede eliminar: el producto está en pedidos activos. Desactivá el producto en su lugar.'
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
