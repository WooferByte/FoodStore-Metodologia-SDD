import { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useCreateProduct } from '@/features/products/admin/hooks/useCreateProduct'
import { useUpdateProduct } from '@/features/products/admin/hooks/useUpdateProduct'
import { useSetProductCategories } from '@/features/products/admin/hooks/useSetProductCategories'
import { useSetProductIngredients } from '@/features/products/admin/hooks/useSetProductIngredients'
import type { Product } from '@/entities/product'
import type { Category } from '@/features/categories/types'
import type { Ingredient } from '@/entities/product'

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  product?: Product
  allCategories: Category[]
  allIngredients: Ingredient[]
}

interface FormState {
  nombre: string
  descripcion: string
  precio_base: string
  stock_cantidad: string
  imagen_url: string
  disponible: boolean
  categoria_ids: number[]
  ingredientes: Array<{ ingrediente_id: number; es_removible: boolean }>
}

function parseIngredientId(id: string | number): number {
  return typeof id === 'string' ? parseInt(id, 10) : id
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  product,
  allCategories,
  allIngredients,
}: ProductFormModalProps) {
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const setCategoriesMutation = useSetProductCategories()
  const setIngredientsMutation = useSetProductIngredients()

  const isEditing = !!product

  const [form, setForm] = useState<FormState>({
    nombre: '',
    descripcion: '',
    precio_base: '',
    stock_cantidad: '',
    imagen_url: '',
    disponible: true,
    categoria_ids: [],
    ingredientes: [],
  })
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [catSearch, setCatSearch] = useState('')

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    setCategoriesMutation.isPending ||
    setIngredientsMutation.isPending

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setForm({
          nombre: product.nombre ?? '',
          descripcion: product.descripcion ?? '',
          precio_base: String(product.precio_base ?? ''),
          stock_cantidad: String(product.stock_cantidad ?? ''),
          imagen_url: product.imagen_url ?? '',
          disponible: product.disponible ?? true,
          categoria_ids: (product.categorias ?? []).map((c) => parseIngredientId(c.id)),
          ingredientes: (product.ingredientes ?? []).map((i) => ({
            ingrediente_id: parseIngredientId(i.id),
            es_removible: i.es_removible ?? false,
          })),
        })
      } else {
        setForm({
          nombre: '',
          descripcion: '',
          precio_base: '',
          stock_cantidad: '',
          imagen_url: '',
          disponible: true,
          categoria_ids: [],
          ingredientes: [],
        })
      }
      setError(null)
      setFieldErrors({})
      setCatSearch('')

      setTimeout(() => {
        document.getElementById('product-nombre')?.focus()
      }, 100)
    }
  }, [isOpen, product])

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return allCategories
    const q = catSearch.toLowerCase()
    return allCategories.filter((c) => c.nombre.toLowerCase().includes(q))
  }, [allCategories, catSearch])

  const ingredientToggle = useCallback((ingredienteId: number) => {
    setForm((prev) => {
      const exists = prev.ingredientes.find((i) => i.ingrediente_id === ingredienteId)
      if (exists) {
        return {
          ...prev,
          ingredientes: prev.ingredientes.filter((i) => i.ingrediente_id !== ingredienteId),
        }
      }
      return {
        ...prev,
        ingredientes: [...prev.ingredientes, { ingrediente_id: ingredienteId, es_removible: false }],
      }
    })
  }, [])

  const ingredientToggleRemovible = useCallback((ingredienteId: number) => {
    setForm((prev) => ({
      ...prev,
      ingredientes: prev.ingredientes.map((i) =>
        i.ingrediente_id === ingredienteId ? { ...i, es_removible: !i.es_removible } : i,
      ),
    }))
  }, [])

  const isIngredientSelected = useCallback(
    (id: number) => form.ingredientes.some((i) => i.ingrediente_id === id),
    [form.ingredientes],
  )

  const getIngredientRemovible = useCallback(
    (id: number) => form.ingredientes.find((i) => i.ingrediente_id === id)?.es_removible ?? false,
    [form.ingredientes],
  )

  const categoryToggle = useCallback((catId: number) => {
    setForm((prev) => {
      const exists = prev.categoria_ids.includes(catId)
      return {
        ...prev,
        categoria_ids: exists
          ? prev.categoria_ids.filter((id) => id !== catId)
          : [...prev.categoria_ids, catId],
      }
    })
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setFieldErrors({})

      const errors: Record<string, string> = {}
      if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio.'
      const precio = parseFloat(form.precio_base)
      if (!form.precio_base || isNaN(precio) || precio <= 0) {
        errors.precio_base = 'El precio debe ser mayor a 0.'
      }
      const stock = parseInt(form.stock_cantidad, 10)
      if (form.stock_cantidad === '' || isNaN(stock) || stock < 0) {
        errors.stock_cantidad = 'El stock debe ser 0 o mayor.'
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }

      try {
        const payload = {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
          precio_base: precio,
          stock_cantidad: stock,
          disponible: form.disponible,
          imagen_url: form.imagen_url.trim() || undefined,
        }

        if (isEditing && product) {
          await updateMutation.mutateAsync({ id: Number(product.id), data: payload })
          await setCategoriesMutation.mutateAsync({
            id: Number(product.id),
            categoria_ids: form.categoria_ids,
          })
          await setIngredientsMutation.mutateAsync({
            id: Number(product.id),
            ingredientes: form.ingredientes,
          })
        } else {
          const created = await createMutation.mutateAsync(payload)
          const createdId = Number(created.id)
          if (form.categoria_ids.length > 0) {
            await setCategoriesMutation.mutateAsync({
              id: createdId,
              categoria_ids: form.categoria_ids,
            })
          }
          if (form.ingredientes.length > 0) {
            await setIngredientsMutation.mutateAsync({
              id: createdId,
              ingredientes: form.ingredientes,
            })
          }
        }
        onSuccess()
      } catch (err: unknown) {
        let msg = 'Error al guardar el producto.'
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: Record<string, unknown> }; message?: string }
          const data = axiosErr.response?.data
          if (data && typeof data === 'object') {
            const detail = data.detail
            if (typeof detail === 'string') {
              msg = detail
            } else if (Array.isArray(detail)) {
              msg = detail.map((d: unknown) => (typeof d === 'object' && d && 'msg' in d ? String(d.msg) : String(d))).join('; ')
            }
          }
          if (msg === 'Error al guardar el producto.' && axiosErr.message) {
            msg = axiosErr.message
          }
        }
        setError(msg)
      }
    },
    [
      form,
      isEditing,
      product,
      createMutation,
      updateMutation,
      setCategoriesMutation,
      setIngredientsMutation,
      onSuccess,
    ],
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}
      className="max-w-2xl w-full"
    >
      <form onSubmit={handleSubmit} className="space-y-4" role="dialog" aria-labelledby="modal-title">
        <Input
          id="product-nombre"
          label="Nombre"
          value={form.nombre}
          onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
          error={fieldErrors.nombre}
          placeholder="Ej: Pizza Margherita"
          required
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="product-descripcion" className="text-sm font-medium text-foreground">
            Descripción
          </label>
          <textarea
            id="product-descripcion"
            value={form.descripcion}
            onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Descripción opcional del producto"
            rows={3}
            className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-150 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="product-precio"
            label="Precio base"
            type="number"
            step="0.01"
            min="0.01"
            value={form.precio_base}
            onChange={(e) => setForm((prev) => ({ ...prev, precio_base: e.target.value }))}
            error={fieldErrors.precio_base}
            placeholder="0.00"
            required
          />
          <Input
            id="product-stock"
            label="Cantidad en stock"
            type="number"
            min="0"
            value={form.stock_cantidad}
            onChange={(e) => setForm((prev) => ({ ...prev, stock_cantidad: e.target.value }))}
            error={fieldErrors.stock_cantidad}
            placeholder="0"
            required
          />
        </div>

        <Input
          id="product-imagen"
          label="URL de imagen"
          type="url"
          value={form.imagen_url}
          onChange={(e) => setForm((prev) => ({ ...prev, imagen_url: e.target.value }))}
          placeholder="https://ejemplo.com/imagen.jpg"
        />

        <div className="flex items-center gap-2">
          <input
            id="product-disponible"
            type="checkbox"
            checked={form.disponible}
            onChange={(e) => setForm((prev) => ({ ...prev, disponible: e.target.checked }))}
            className="h-4 w-4 rounded border-border bg-background text-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
          <label htmlFor="product-disponible" className="text-sm font-medium text-foreground">
            Producto disponible
          </label>
        </div>

        {/* Categorías */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">Categorías</label>
          {allCategories.length > 10 && (
            <input
              type="text"
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Buscar categorías..."
              aria-label="Buscar categorías"
              className="mb-2 flex h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
          <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
            {filteredCategories.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {catSearch ? 'Sin resultados' : 'No hay categorías disponibles'}
              </p>
            )}
            {filteredCategories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-2 text-sm text-foreground cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
              >
                <input
                  type="checkbox"
                  checked={form.categoria_ids.includes(cat.id)}
                  onChange={() => categoryToggle(cat.id)}
                  className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
                />
                {cat.nombre}
              </label>
            ))}
          </div>
        </div>

        {/* Ingredientes */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">Ingredientes</label>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
            {allIngredients.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No hay ingredientes disponibles</p>
            )}
            {allIngredients.map((ing) => {
              const selected = isIngredientSelected(parseIngredientId(ing.id))
              return (
                <div key={ing.id} className="flex items-center gap-2 text-sm">
                  <label className="flex items-center gap-2 text-foreground cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 flex-1">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => ingredientToggle(parseIngredientId(ing.id))}
                      className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {ing.nombre}
                    {ing.es_alergeno && (
                      <span className="text-[10px] text-destructive font-medium">(ALÉRGENO)</span>
                    )}
                  </label>
                  {selected && (
                    <label className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <input
                        type="checkbox"
                        checked={getIngredientRemovible(parseIngredientId(ing.id))}
                        onChange={() => ingredientToggleRemovible(parseIngredientId(ing.id))}
                        className="h-3 w-3 rounded border-border text-primary"
                      />
                      Removible
                    </label>
                  )}
                </div>
              )
            })}
          </div>
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
