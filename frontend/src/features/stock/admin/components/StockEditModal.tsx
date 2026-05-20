import { useState, useEffect } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useUIStore } from '@/store/uiStore'
import { useUpdateStock } from '@/features/stock/admin/hooks/useUpdateStock'
import { useUpdateProductDisponible } from '@/features/stock/admin/hooks/useUpdateProductDisponible'
import type { Product } from '@/entities/product'

interface StockEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  product: Product | null
}

export function StockEditModal({ isOpen, onClose, onSuccess, product }: StockEditModalProps) {
  const updateStockMutation = useUpdateStock()
  const updateDisponibleMutation = useUpdateProductDisponible()
  const addToast = useUIStore((s) => s.addToast)

  const [stockCantidad, setStockCantidad] = useState('')
  const [disponible, setDisponible] = useState(true)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && product) {
      setStockCantidad(String(product.stock_cantidad))
      setDisponible(product.disponible)
      setFieldError(null)
    }
  }, [isOpen, product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    setFieldError(null)

    const newStock = parseInt(stockCantidad, 10)
    if (isNaN(newStock) || newStock < 0) {
      setFieldError('El stock no puede ser negativo')
      return
    }

    const stockChanged = newStock !== product.stock_cantidad
    const disponibleChanged = disponible !== product.disponible

    if (!stockChanged && !disponibleChanged) {
      onClose()
      return
    }

    setIsSubmitting(true)

    try {
      const productId = Number(product.id)

      if (stockChanged) {
        await updateStockMutation.mutateAsync({ id: productId, stock_cantidad: newStock })
      }

      if (disponibleChanged) {
        await updateDisponibleMutation.mutateAsync({ id: productId, disponible })
      }

      addToast({ message: 'Stock actualizado correctamente', type: 'success' })
      onSuccess()
    } catch (err: unknown) {
      let msg = 'Error al actualizar el stock.'
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: Record<string, unknown> }; message?: string }
        const data = axiosErr.response?.data
        if (data && typeof data === 'object') {
          const detail = data.detail
          if (typeof detail === 'string') msg = detail
        }
        if (msg === 'Error al actualizar el stock.' && axiosErr.message) {
          msg = axiosErr.message
        }
      }
      addToast({ message: msg, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? `Stock: ${product.nombre}` : 'Editar Stock'}
    >
      <form onSubmit={handleSubmit} className="space-y-4" role="dialog" aria-labelledby="modal-title">
        <Input
          id="stock-cantidad"
          label="Cantidad en stock"
          type="number"
          min="0"
          value={stockCantidad}
          onChange={(e) => {
            setStockCantidad(e.target.value)
            setFieldError(null)
          }}
          error={fieldError ?? undefined}
          placeholder="0"
          required
          disabled={isSubmitting}
        />

        <div className="flex items-center gap-2">
          <input
            id="stock-disponible"
            type="checkbox"
            checked={disponible}
            onChange={(e) => setDisponible(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-background text-primary focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isSubmitting}
          />
          <label htmlFor="stock-disponible" className="text-sm font-medium text-foreground">
            Producto disponible
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
