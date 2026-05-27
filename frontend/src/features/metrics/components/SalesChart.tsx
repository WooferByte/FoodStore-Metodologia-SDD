/**
 * SalesChart — line chart showing sales over time.
 *
 * Uses Recharts ResponsiveContainer + LineChart.
 * ARIA: role="img" + aria-label on wrapper.
 * States: loading → skeleton; empty → placeholder text.
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { memo } from 'react'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { CHART_COLORS } from '@/features/metrics/constants'
import type { VentasItem } from '@/features/metrics/types'

// ── Formatters ─────────────────────────────────────────────────────────────

function formatFecha(fecha: string): string {
  // ISO date "YYYY-MM-DD" → "MM/DD"
  return fecha.substring(5).replace('-', '/')
}

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

// ── Component ──────────────────────────────────────────────────────────────

interface SalesChartProps {
  data: VentasItem[] | undefined
  isLoading: boolean
}

export const SalesChart = memo(function SalesChart({ data, isLoading }: SalesChartProps) {
  if (isLoading) {
    return <Skeleton variant="rect" className="h-64 rounded" />
  }

  if (!data || data.length === 0) {
    return (
      <div
        role="img"
        aria-label="Gráfico de ventas por período"
        className="flex h-64 items-center justify-center rounded-lg border border-border bg-card"
      >
        <p className="text-muted-foreground text-sm">Sin datos para el período seleccionado</p>
      </div>
    )
  }

  return (
    <div role="img" aria-label="Gráfico de ventas por período">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 264)" />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatFecha}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12 }}
            width={55}
          />
          <Tooltip
            formatter={(value: number) =>
              new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
                minimumFractionDigits: 0,
              }).format(value)
            }
            labelFormatter={formatFecha}
          />
          <Line
            type="monotone"
            dataKey="total_ventas"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={data.length <= 3}
            name="Ventas"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})
