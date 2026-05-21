import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useProductsAdminFiltersStore } from '@/store/productsAdminFiltersStore'
import { useAdminProducts } from '@/features/products/admin/hooks/useAdminProducts'
import { useAllCategories } from '@/features/products/admin/hooks/useAllCategories'
import { useAllIngredients } from '@/features/products/admin/hooks/useAllIngredients'
import { AdminProductsTable } from '@/features/products/admin/components/AdminProductsTable'
import { ProductFormModal } from '@/features/products/admin/components/ProductFormModal'
import { ProductDeleteModal } from '@/features/products/admin/components/ProductDeleteModal'
import { Button } from '@/shared/components/ui/Button'
import type { Product } from '@/entities/product'

export default function AdminProductsPage() {
  const { q, categoriaId, disponible, page, setQ, setCategoriaId, setDisponible, setPage } =
    useProductsAdminFiltersStore()

  const { data, isLoading, isError } = useAdminProducts({ q, categoriaId, disponible, page })
  const { data: categories = [] } = useAllCategories()
  const { data: ingredients = [] } = useAllIngredients()

  const [editProduct, setEditProduct] = useState<Product | undefined>(undefined)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const products = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.pages ?? 1

  const openCreate = useCallback(() => {
    setEditProduct(undefined)
    setIsEditOpen(true)
  }, [])

  const openEdit = useCallback((prod: Product) => {
    setEditProduct(prod)
    setIsEditOpen(true)
  }, [])

  const openDelete = useCallback((prod: Product) => {
    setDeleteProduct(prod)
    setIsDeleteOpen(true)
  }, [])

  const closeEdit = useCallback(() => {
    setIsEditOpen(false)
    setEditProduct(undefined)
  }, [])

  const closeDelete = useCallback(() => {
    setIsDeleteOpen(false)
    setDeleteProduct(null)
  }, [])

  const handleEditSuccess = useCallback(() => {
    closeEdit()
  }, [closeEdit])

  const handleDeleteSuccess = useCallback(() => {
    closeDelete()
  }, [closeDelete])

  return (
    <>
      <title>Gestión de Productos | Food Store Admin</title>
      <meta name="description" content="Panel de administración de productos" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Productos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Administrá el catálogo de productos, stock y disponibilidad
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo Producto
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre..."
              aria-label="Buscar productos por nombre"
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-150"
            />
          </div>
          <select
            value={categoriaId ?? ''}
            onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : null)}
            aria-label="Filtrar por categoría"
            className="flex h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-[160px]"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.nombre}
              </option>
            ))}
          </select>
          <select
            value={disponible}
            onChange={(e) => setDisponible(e.target.value)}
            aria-label="Filtrar por disponibilidad"
            className="flex h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-[140px]"
          >
            <option value="all">Todos</option>
            <option value="true">Disponibles</option>
            <option value="false">No disponibles</option>
          </select>
        </div>

        {/* Error state */}
        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Error al cargar los productos. Verificá que el backend esté corriendo.
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <AdminProductsTable
            products={products}
            isLoading={isLoading}
            isError={isError}
            total={total}
            page={page}
            totalPages={totalPages}
            onEdit={openEdit}
            onDelete={openDelete}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={isEditOpen}
        onClose={closeEdit}
        onSuccess={handleEditSuccess}
        product={editProduct}
        allCategories={categories}
        allIngredients={ingredients}
      />

      <ProductDeleteModal
        isOpen={isDeleteOpen}
        onClose={closeDelete}
        onSuccess={handleDeleteSuccess}
        product={deleteProduct}
      />
    </>
  )
}
