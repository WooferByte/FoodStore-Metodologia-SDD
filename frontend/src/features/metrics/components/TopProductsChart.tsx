/**
 * TopProductsChart — horizontal bar chart of top 10 products.
 *
 * Uses Recharts BarChart with layout="vertical".
 * Truncates product names to 12 chars.
 * ARIA: role="img" + aria-label on wrapper.
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { CHART_COLORS } from '@/features/metrics/constants'
import type { TopProductoItem } from '@/features/metrics/types'

function truncate(str: string, max = 12): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

// ── Component ──────────────────────────────────────────────────────────────

interface TopProductsChartProps {
  data: TopProductoItem[] | undefined
  isLoading: boolean
}

export function TopProductsChart({ data, isLoading }: TopProductsChartProps) {
  if (isLoading) {
    return <Skeleton variant="rect" className="h-64 rounded" />
  }

  if (!data || data.length === 0) {
    return (
      <div
        role="img"
        aria-label="Gráfico de top 10 productos vendidos"
        className="flex h-64 items-center justify-center rounded-lg border border-border bg-card"
      >
        <p className="text-muted-foreground text-sm">Sin datos para el período seleccionado</p>
      </div>
    )
  }

  const chartData = data.slice(0, 10).map((item) => ({
    ...item,
    nombre_corto: truncate(item.nombre),
  }))

  return (
    <div role="img" aria-label="Gráfico de top 10 productos vendidos">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.91 0.01 264)" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="nombre_corto"
            width={90}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => [`${value} unidades`, 'Vendidos']}
            labelFormatter={(label: string) => `Producto: ${label}`}
          />
          <Bar
            dataKey="cantidad_total"
            fill={CHART_COLORS.success}
            radius={[0, 4, 4, 0]}
            name="Vendidos"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
