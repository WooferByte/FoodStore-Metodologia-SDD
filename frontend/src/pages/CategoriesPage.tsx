import { useState, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { CategoriesTable } from '@/features/categories/components/CategoriesTable'
import { CategoryEditModal } from '@/features/categories/components/CategoryEditModal'
import { CategoryDeleteModal } from '@/features/categories/components/CategoryDeleteModal'
import { Button } from '@/shared/components/ui/Button'
import type { Category } from '@/features/categories/types'

export default function CategoriesPage() {
  const { data: categories = [], isLoading, isError } = useCategories()

  const [searchQuery, setSearchQuery] = useState('')
  const [editCategory, setEditCategory] = useState<Category | undefined>(undefined)
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase()
    return categories.filter((c) => c.nombre.toLowerCase().includes(q))
  }, [categories, searchQuery])

  const openCreate = useCallback(() => {
    setEditCategory(undefined)
    setIsEditOpen(true)
  }, [])

  const openEdit = useCallback((cat: Category) => {
    setEditCategory(cat)
    setIsEditOpen(true)
  }, [])

  const openDelete = useCallback((cat: Category) => {
    setDeleteCategory(cat)
    setIsDeleteOpen(true)
  }, [])

  const closeEdit = useCallback(() => {
    setIsEditOpen(false)
    setEditCategory(undefined)
  }, [])

  const closeDelete = useCallback(() => {
    setIsDeleteOpen(false)
    setDeleteCategory(null)
  }, [])

  const handleEditSuccess = useCallback(() => {
    closeEdit()
  }, [closeEdit])

  const handleDeleteSuccess = useCallback(() => {
    closeDelete()
  }, [closeDelete])

  return (
    <>
      <title>Gestión de Categorías | Food Store Admin</title>
      <meta name="description" content="Panel de administración de categorías de productos" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Categorías</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Administrá las categorías jerárquicas de productos
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva Categoría
          </Button>
        </div>

        {/* Search */}
        <div className="max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre..."
            aria-label="Buscar categorías por nombre"
            className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-150"
          />
        </div>

        {/* Error state */}
        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Error al cargar las categorías. Verificá que el backend esté corriendo.
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <CategoriesTable
            categories={filteredCategories}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={openDelete}
          />
        </div>
      </div>

      {/* Modals */}
      <CategoryEditModal
        isOpen={isEditOpen}
        onClose={closeEdit}
        onSuccess={handleEditSuccess}
        category={editCategory}
        allCategories={categories}
      />

      <CategoryDeleteModal
        isOpen={isDeleteOpen}
        onClose={closeDelete}
        onSuccess={handleDeleteSuccess}
        category={deleteCategory}
        allCategories={categories}
      />
    </>
  )
}
