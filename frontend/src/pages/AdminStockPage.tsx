import { useState, useCallback } from 'react'
import { useStockFiltersStore } from '@/store/stockFiltersStore'
import { useAdminStockProducts } from '@/features/stock/admin/hooks/useAdminStockProducts'
import { AdminStockTable } from '@/features/stock/admin/components/AdminStockTable'
import { StockEditModal } from '@/features/stock/admin/components/StockEditModal'
import type { Product } from '@/entities/product'

export default function AdminStockPage() {
  const { q, disponible, page, setQ, setDisponible, setPage } = useStockFiltersStore()

  const { data, isLoading, isError } = useAdminStockProducts({ q, disponible, page })

  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const products = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.pages ?? 1

  const openEdit = useCallback((prod: Product) => {
    setEditProduct(prod)
    setIsEditOpen(true)
  }, [])

  const closeEdit = useCallback(() => {
    setIsEditOpen(false)
    setEditProduct(null)
  }, [])

  const handleEditSuccess = useCallback(() => {
    closeEdit()
  }, [closeEdit])

  return (
    <>
      <title>Gestión de Stock | Food Store Admin</title>
      <meta name="description" content="Panel de administración de stock de productos" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Stock</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Actualizá el stock y la disponibilidad de los productos
            </p>
          </div>
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
            value={disponible}
            onChange={(e) => setDisponible(e.target.value as 'all' | 'true' | 'false')}
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
          <AdminStockTable
            products={products}
            isLoading={isLoading}
            isError={isError}
            total={total}
            page={page}
            totalPages={totalPages}
            onEdit={openEdit}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Modal */}
      <StockEditModal
        isOpen={isEditOpen}
        onClose={closeEdit}
        onSuccess={handleEditSuccess}
        product={editProduct}
      />
    </>
  )
}
