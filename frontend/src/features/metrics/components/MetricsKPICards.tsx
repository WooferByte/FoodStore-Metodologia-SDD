/**
 * MetricsKPICards — displays 4 KPI summary cards.
 *
 * States:
 *   isLoading → skeleton placeholders
 *   isError   → error message per card
 *   data      → formatted values with icons
 */

import { DollarSign, ShoppingBag, Package, Users } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import type { MetricsSummary } from '@/features/metrics/types'

// ── Formatter ──────────────────────────────────────────────────────────────

const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const intFormatter = new Intl.NumberFormat('es-AR')

// ── KPI config ─────────────────────────────────────────────────────────────

interface KPIConfig {
  label: string
  key: keyof MetricsSummary
  Icon: React.ElementType
  format: (v: number) => string
  iconClass: string
}

const KPI_CONFIGS: KPIConfig[] = [
  {
    label: 'Total Ventas',
    key: 'total_ventas',
    Icon: DollarSign,
    format: (v) => arsFormatter.format(v),
    iconClass: 'text-primary',
  },
  {
    label: 'Pedidos Hoy',
    key: 'pedidos_hoy',
    Icon: ShoppingBag,
    format: (v) => intFormatter.format(v),
    iconClass: 'text-warning',
  },
  {
    label: 'Productos Activos',
    key: 'productos_activos',
    Icon: Package,
    format: (v) => intFormatter.format(v),
    iconClass: 'text-success',
  },
  {
    label: 'Usuarios Activos',
    key: 'usuarios_activos',
    Icon: Users,
    format: (v) => intFormatter.format(v),
    iconClass: 'text-info',
  },
]

// ── Component ──────────────────────────────────────────────────────────────

interface MetricsKPICardsProps {
  data: MetricsSummary | undefined
  isLoading: boolean
  isError: boolean
}

export function MetricsKPICards({ data, isLoading, isError }: MetricsKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rect" className="h-28 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      aria-live="polite"
    >
      {KPI_CONFIGS.map(({ label, key, Icon, format, iconClass }) => {
        const value = data?.[key]
        return (
          <div
            key={key}
            className="rounded-lg border border-border bg-card p-5 shadow-sm flex items-center gap-4"
          >
            <div
              className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted', iconClass)}
              aria-hidden="true"
            >
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground truncate">{label}</p>
              {isError || value === undefined ? (
                <p className="text-sm text-destructive mt-1">Error al cargar</p>
              ) : (
                <p className="text-2xl font-bold text-foreground mt-0.5 tabular-nums">
                  {format(value as number)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
