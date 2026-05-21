import React from 'react'
import { Pencil, Trash2, PackageSearch } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import type { Product } from '@/entities/product'

interface AdminProductsTableProps {
  products: Product[]
  isLoading: boolean
  isError: boolean
  total: number
  page: number
  totalPages: number
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onPageChange: (page: number) => void
}

function formatPrice(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `$${num.toFixed(2)}`
}

function getStockBadge(stock: number) {
  if (stock === 0) return { variant: 'error' as const, label: 'Sin stock' }
  if (stock <= 10) return { variant: 'warning' as const, label: `${stock} uds.` }
  return { variant: 'success' as const, label: `${stock} uds.` }
}

function getThumbnailUrl(product: Product): string | null {
  if (product.imagen_url && product.imagen_url.trim() !== '') {
    return product.imagen_url
  }
  return null
}

interface TableRowProps {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

const TableRow = React.memo(function TableRow({ product, onEdit, onDelete }: TableRowProps) {
  const stockBadge = getStockBadge(product.stock_cantidad)
  const thumbnail = getThumbnailUrl(product)

  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors" role="row">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={product.nombre}
              className="h-8 w-8 rounded-md object-cover bg-muted"
              loading="lazy"
            />
          ) : (
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
              <PackageSearch className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <span className="font-medium text-foreground text-sm">{product.nombre}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-foreground font-medium">
        {formatPrice(product.precio_base)}
      </td>
      <td className="px-4 py-3">
        <Badge variant={stockBadge.variant}>{stockBadge.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant={product.disponible ? 'success' : 'error'}>
          <span className="sr-only">Disponible:</span>
          {product.disponible ? 'Sí' : 'No'}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {product.categorias?.length > 0 ? (
            product.categorias.slice(0, 2).map((cat) => (
              <Badge key={cat.id} variant="info" className="text-[10px]">
                {cat.nombre}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {(product.categorias?.length ?? 0) > 2 && (
            <span className="text-xs text-muted-foreground">+{product.categorias.length - 2}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(product)}
            aria-label={`Editar ${product.nombre}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(product)}
            className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
            aria-label={`Eliminar ${product.nombre}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
  )
})

const MemoizedTableRow = TableRow

function TableSkeletonRows() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-4 w-36" />
            </div>
          </td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-12 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
        </tr>
      ))}
    </tbody>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <PackageSearch className="h-12 w-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
      <p className="text-muted-foreground text-sm">No se encontraron productos</p>
    </div>
  )
}

interface MobileCardProps {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

const MobileCard = React.memo(function MobileCard({ product, onEdit, onDelete }: MobileCardProps) {
  const stockBadge = getStockBadge(product.stock_cantidad)
  const thumbnail = getThumbnailUrl(product)

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={product.nombre}
              className="h-10 w-10 rounded-md object-cover bg-muted"
              loading="lazy"
            />
          ) : (
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
              <PackageSearch className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <div>
            <span className="font-medium text-foreground text-sm block">{product.nombre}</span>
            <span className="text-sm text-muted-foreground">{formatPrice(product.precio_base)}</span>
          </div>
        </div>
        <Badge variant={product.disponible ? 'success' : 'error'}>
          <span className="sr-only">Disponible:</span>
          {product.disponible ? 'Sí' : 'No'}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <Badge variant={stockBadge.variant}>{stockBadge.label}</Badge>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(product)}
            aria-label={`Editar ${product.nombre}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(product)}
            className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
            aria-label={`Eliminar ${product.nombre}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
})

export function AdminProductsTable({
  products,
  isLoading,
  isError,
  total,
  page,
  totalPages,
  onEdit,
  onDelete,
  onPageChange,
}: AdminProductsTableProps) {
  const hasPrev = page > 1
  const hasNext = page < totalPages

  if (isLoading) {
    return (
      <>
        <div className="hidden md:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Precio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Disponible</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categorías</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <TableSkeletonRows />
          </table>
        </div>
        <div className="md:hidden"><CardSkeleton /></div>
      </>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive text-sm">Error al cargar los productos.</p>
      </div>
    )
  }

  if (products.length === 0) {
    return <EmptyState />
  }

  return (
    <>
      {/* Desktop: table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse" aria-label="Productos">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Precio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Disponible</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categorías</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <MemoizedTableRow
                key={product.id}
                product={product}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-3">
        {products.map((product) => (
          <MobileCard
            key={product.id}
            product={product}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} ({total} productos)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => onPageChange(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
