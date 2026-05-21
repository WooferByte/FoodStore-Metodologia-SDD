import { Badge } from '@/shared/components/ui/Badge'

interface StockBadgeProps {
  stock: number
  size?: 'sm' | 'md'
}

function getStockVariant(stock: number): 'error' | 'warning' | 'success' {
  if (stock === 0) return 'error'
  if (stock <= 10) return 'warning'
  return 'success'
}

function getStockLabel(stock: number): string {
  if (stock === 0) return 'Sin stock'
  return `${stock} uds.`
}

export function StockBadge({ stock, size = 'md' }: StockBadgeProps) {
  return (
    <Badge variant={getStockVariant(stock)} className={size === 'sm' ? 'text-[10px] px-2 py-0' : undefined}>
      <span className="sr-only">Stock:</span>
      {getStockLabel(stock)}
    </Badge>
  )
}
