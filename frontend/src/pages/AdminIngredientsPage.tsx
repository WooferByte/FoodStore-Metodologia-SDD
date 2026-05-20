import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useIngredientsFiltersStore } from '@/store/ingredientsFiltersStore'
import { useAdminIngredients } from '@/features/ingredients/admin/hooks/useAdminIngredients'
import { IngredientsTable } from '@/features/ingredients/admin/components/IngredientsTable'
import { IngredientFormModal } from '@/features/ingredients/admin/components/IngredientFormModal'
import { IngredientDeleteModal } from '@/features/ingredients/admin/components/IngredientDeleteModal'
import { Button } from '@/shared/components/ui/Button'
import type { Ingredient } from '@/entities/product'

export default function AdminIngredientsPage() {
  const { es_alergeno, setEsAlergeno } = useIngredientsFiltersStore()

  const { data: ingredients, isLoading, isError } = useAdminIngredients({ es_alergeno })

  const [formIngredient, setFormIngredient] = useState<Ingredient | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteIngredient, setDeleteIngredient] = useState<Ingredient | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const openCreate = useCallback(() => {
    setFormIngredient(null)
    setIsFormOpen(true)
  }, [])

  const openEdit = useCallback((ingredient: Ingredient) => {
    setFormIngredient(ingredient)
    setIsFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setIsFormOpen(false)
    setFormIngredient(null)
  }, [])

  const openDelete = useCallback((ingredient: Ingredient) => {
    setDeleteIngredient(ingredient)
    setIsDeleteOpen(true)
  }, [])

  const closeDelete = useCallback(() => {
    setIsDeleteOpen(false)
    setDeleteIngredient(null)
  }, [])

  return (
    <>
      <title>Gestión de Ingredientes | Food Store Admin</title>
      <meta name="description" content="Panel de administración de ingredientes" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Ingredientes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Administrá los ingredientes del catálogo de productos
            </p>
          </div>
          <Button onClick={openCreate} aria-label="Crear nuevo ingrediente">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo ingrediente
          </Button>
        </div>

        {/* Error banner */}
        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Error al cargar los ingredientes. Verificá que el backend esté corriendo.
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="p-4">
            <IngredientsTable
              ingredients={ingredients ?? []}
              isLoading={isLoading}
              isError={isError}
              esAlergenoFilter={es_alergeno}
              onEsAlergenoFilterChange={setEsAlergeno}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <IngredientFormModal
        isOpen={isFormOpen}
        onClose={closeForm}
        ingredient={formIngredient}
      />

      {/* Delete Modal */}
      <IngredientDeleteModal
        isOpen={isDeleteOpen}
        onClose={closeDelete}
        ingredient={deleteIngredient}
      />
    </>
  )
}
