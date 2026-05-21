import React from 'react'
import { Pencil, PackageSearch } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { StockBadge } from '@/features/stock/admin/components/StockBadge'
import type { Product } from '@/entities/product'

interface AdminStockTableProps {
  products: Product[]
  isLoading: boolean
  isError: boolean
  total: number
  page: number
  totalPages: number
  onEdit: (product: Product) => void
  onPageChange: (page: number) => void
}

function formatPrice(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `$${num.toFixed(2)}`
}

interface TableRowProps {
  product: Product
  onEdit: (product: Product) => void
}

const TableRow = React.memo(function TableRow({ product, onEdit }: TableRowProps) {
  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors" role="row">
      <td className="px-4 py-3">
        <span className="font-medium text-foreground text-sm">{product.nombre}</span>
      </td>
      <td className="px-4 py-3 text-sm text-foreground font-medium">
        {formatPrice(product.precio_base)}
      </td>
      <td className="px-4 py-3">
        <StockBadge stock={product.stock_cantidad} />
      </td>
      <td className="px-4 py-3">
        <Badge variant={product.disponible ? 'success' : 'error'}>
          <span className="sr-only">Disponible:</span>
          {product.disponible ? 'Sí' : 'No'}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(product)}
          aria-label={`Editar stock de ${product.nombre}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
      </td>
    </tr>
  )
})

interface MobileCardProps {
  product: Product
  onEdit: (product: Product) => void
}

const MobileCard = React.memo(function MobileCard({ product, onEdit }: MobileCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-foreground text-sm block">{product.nombre}</span>
          <span className="text-sm text-muted-foreground">{formatPrice(product.precio_base)}</span>
        </div>
        <Badge variant={product.disponible ? 'success' : 'error'}>
          <span className="sr-only">Disponible:</span>
          {product.disponible ? 'Sí' : 'No'}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <StockBadge stock={product.stock_cantidad} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(product)}
          aria-label={`Editar stock de ${product.nombre}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
})

function TableSkeletonRows() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-12 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
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
          <Skeleton className="h-5 w-40" />
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

export function AdminStockTable({
  products,
  isLoading,
  isError,
  total,
  page,
  totalPages,
  onEdit,
  onPageChange,
}: AdminStockTableProps) {
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
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse" aria-label="Productos en stock">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Precio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Disponible</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <TableRow
                key={product.id}
                product={product}
                onEdit={onEdit}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {products.map((product) => (
          <MobileCard
            key={product.id}
            product={product}
            onEdit={onEdit}
          />
        ))}
      </div>

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
