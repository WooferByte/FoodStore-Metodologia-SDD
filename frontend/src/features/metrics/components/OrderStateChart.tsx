/**
 * OrderStateChart — pie chart showing orders distribution by state.
 *
 * Uses Recharts PieChart + Pie + Cell + Legend + Tooltip.
 * Colors assigned from CHART_PALETTE cyclically.
 * ARIA: role="img" + aria-label on wrapper.
 */

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from 'recharts'
import { memo } from 'react'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { CHART_PALETTE } from '@/features/metrics/constants'
import type { PedidoEstadoItem } from '@/features/metrics/types'

function truncateLabel(str: string, max = 15): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

// ── Component ──────────────────────────────────────────────────────────────

interface OrderStateChartProps {
  data: PedidoEstadoItem[] | undefined
  isLoading: boolean
}

export const OrderStateChart = memo(function OrderStateChart({ data, isLoading }: OrderStateChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton variant="circle" className="h-64 w-64 rounded-full animate-pulse" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div
        role="img"
        aria-label="Distribución de pedidos por estado"
        className="flex h-64 items-center justify-center rounded-lg border border-border bg-card"
      >
        <p className="text-muted-foreground text-sm">Sin datos disponibles</p>
      </div>
    )
  }

  const chartData = data.map((item) => ({
    name: truncateLabel(item.estado),
    value: item.cantidad,
  }))

  return (
    <div role="img" aria-label="Distribución de pedidos por estado">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_PALETTE[index % CHART_PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${value}`, 'Pedidos']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
})
