import { useState, useEffect } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useUIStore } from '@/store/uiStore'
import { useCreateIngredient } from '@/features/ingredients/admin/hooks/useCreateIngredient'
import { useUpdateIngredient } from '@/features/ingredients/admin/hooks/useUpdateIngredient'
import type { Ingredient } from '@/entities/product'

interface IngredientFormModalProps {
  isOpen: boolean
  onClose: () => void
  ingredient: Ingredient | null
}

export function IngredientFormModal({ isOpen, onClose, ingredient }: IngredientFormModalProps) {
  const createMutation = useCreateIngredient()
  const updateMutation = useUpdateIngredient()
  const addToast = useUIStore((s) => s.addToast)

  const [nombre, setNombre] = useState('')
  const [esAlergeno, setEsAlergeno] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (ingredient) {
        setNombre(ingredient.nombre)
        setEsAlergeno(ingredient.es_alergeno)
      } else {
        setNombre('')
        setEsAlergeno(false)
      }
      setFieldError(null)
    }
  }, [isOpen, ingredient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)

    const trimmed = nombre.trim()
    if (!trimmed) {
      setFieldError('El nombre es requerido')
      return
    }

    setIsSubmitting(true)

    try {
      if (ingredient) {
        await updateMutation.mutateAsync({
          id: Number(ingredient.id),
          data: { nombre: trimmed, es_alergeno: esAlergeno },
        })
        addToast({ message: 'Ingrediente actualizado correctamente', type: 'success' })
      } else {
        await createMutation.mutateAsync({ nombre: trimmed, es_alergeno: esAlergeno })
        addToast({ message: 'Ingrediente creado correctamente', type: 'success' })
      }
      onClose()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: Record<string, unknown> }; message?: string }
        const status = axiosErr.response?.status
        const data = axiosErr.response?.data

        if (status === 409) {
          const detail = data?.detail
          const msg = typeof detail === 'string' ? detail : 'Ya existe un ingrediente con ese nombre.'
          setFieldError(msg)
          return
        }

        let msg = 'Error al guardar el ingrediente.'
        if (data && typeof data === 'object') {
          const detail = data.detail
          if (typeof detail === 'string') msg = detail
        }
        if (msg === 'Error al guardar el ingrediente.' && axiosErr.message) {
          msg = axiosErr.message
        }
        addToast({ message: msg, type: 'error' })
      } else {
        addToast({ message: 'Error al guardar el ingrediente.', type: 'error' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={ingredient ? `Editar ingrediente: ${ingredient.nombre}` : 'Nuevo ingrediente'}
    >
      <form onSubmit={handleSubmit} className="space-y-4" role="dialog" aria-labelledby="modal-title">
        <Input
          id="ingredient-nombre"
          label="Nombre"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value)
            setFieldError(null)
          }}
          error={fieldError ?? undefined}
          placeholder="Nombre del ingrediente"
          required
          disabled={isSubmitting}
        />

        <div className="flex items-center gap-2">
          <input
            id="ingredient-es-alergeno"
            type="checkbox"
            checked={esAlergeno}
            onChange={(e) => setEsAlergeno(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-background text-primary focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isSubmitting}
          />
          <label htmlFor="ingredient-es-alergeno" className="text-sm font-medium text-foreground">
            Es alérgeno
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {ingredient ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
