import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useCreateCategory } from '@/features/categories/hooks/useCreateCategory'
import { useUpdateCategory } from '@/features/categories/hooks/useUpdateCategory'
import type { Category } from '@/features/categories/types'

interface CategoryEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  category?: Category
  allCategories: Category[]
}

export function CategoryEditModal({ isOpen, onClose, onSuccess, category, allCategories }: CategoryEditModalProps) {
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const isEditing = !!category

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [padreId, setPadreId] = useState<number | null | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ nombre?: string }>({})

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setNombre(category.nombre)
        setDescripcion(category.descripcion ?? '')
        setPadreId(category.padre_id ?? '')
      } else {
        setNombre('')
        setDescripcion('')
        setPadreId('')
      }
      setError(null)
      setFieldErrors({})

      setTimeout(() => {
        document.getElementById('category-nombre')?.focus()
      }, 100)
    }
  }, [isOpen, category])

  const parentOptions = useCallback(() => {
    return allCategories.filter((c) => c.id !== category?.id)
  }, [allCategories, category?.id])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!nombre.trim()) {
      setFieldErrors({ nombre: 'El nombre es obligatorio.' })
      return
    }

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      padre_id: padreId === '' ? null : (padreId as number),
    }

    try {
      if (isEditing && category) {
        await updateMutation.mutateAsync({ id: category.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onSuccess()
    } catch (err: unknown) {
      let msg = 'Error al guardar la categoría.'
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: Record<string, unknown> }; message?: string }
        const data = axiosErr.response?.data
        if (data && typeof data === 'object') {
          const detail = data.detail
          if (typeof detail === 'string') {
            msg = detail
          } else if (Array.isArray(detail)) {
            msg = detail.map((d: unknown) => typeof d === 'object' && d && 'msg' in d ? String(d.msg) : String(d)).join('; ')
          }
        }
        if (msg === 'Error al guardar la categoría.' && axiosErr.message) {
          msg = axiosErr.message
        }
      }
      setError(msg)
    }
  }, [nombre, descripcion, padreId, isEditing, category, createMutation, updateMutation, onSuccess])

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Categoría' : 'Nueva Categoría'}>
      <form onSubmit={handleSubmit} className="space-y-4" role="dialog" aria-labelledby="modal-title">
        <Input
          id="category-nombre"
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={fieldErrors.nombre}
          placeholder="Ej: Pizzas"
          required
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="category-descripcion" className="text-sm font-medium text-foreground">
            Descripción
          </label>
          <textarea
            id="category-descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción opcional de la categoría"
            rows={3}
            className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-150 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="category-padre" className="text-sm font-medium text-foreground">
            Categoría padre
          </label>
          <select
            id="category-padre"
            value={padreId === '' ? '' : String(padreId)}
            onChange={(e) => {
              const val = e.target.value
              setPadreId(val === '' ? '' : Number(val))
            }}
            className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-150"
          >
            <option value="">Sin padre (categoría raíz)</option>
            {parentOptions().map((c) => (
              <option key={c.id} value={String(c.id)}>
                {'—'.repeat(c.depth)} {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isPending}>
            {isEditing ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
