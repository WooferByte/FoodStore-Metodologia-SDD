/**
 * AdminDashboardPage — main admin metrics dashboard.
 *
 * Renders:
 *   - DateRangeSelector  (local useState, no Zustand)
 *   - MetricsKPICards    (useMetricsSummary)
 *   - SalesChart         (useMetricsVentas — granularidad auto-computed)
 *   - TopProductsChart   (useMetricsTopProductos)
 *   - OrderStateChart    (useMetricsPedidosPorEstado — no date params)
 *
 * File keeps its original name Admin.tsx to avoid breaking the router import.
 */

import { useState } from 'react'

import {
  DateRangeSelector,
  MetricsKPICards,
  SalesChart,
  TopProductsChart,
  OrderStateChart,
} from '@/features/metrics/components'

import {
  useMetricsSummary,
  useMetricsVentas,
  useMetricsTopProductos,
  useMetricsPedidosPorEstado,
} from '@/features/metrics/hooks'

import { DEFAULT_DATE_RANGE } from '@/features/metrics/constants'
import type { DateRange } from '@/features/metrics/types'

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  // Date range is local state — not server state, not Zustand
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE)

  const { desde, hasta } = dateRange

  const summaryQuery        = useMetricsSummary({ desde, hasta })
  const ventasQuery         = useMetricsVentas({ desde, hasta })
  const topProductosQuery   = useMetricsTopProductos({ desde, hasta })
  const pedidosEstadoQuery  = useMetricsPedidosPorEstado()

  return (
    <div className="p-6 space-y-6">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
      </div>

      {/* Date range selector */}
      <section aria-label="Selector de rango de fechas">
        <DateRangeSelector dateRange={dateRange} onChange={setDateRange} />
      </section>

      {/* KPI cards */}
      <section aria-label="Indicadores clave">
        <MetricsKPICards
          data={summaryQuery.data}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
        />
      </section>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Sales chart — full width */}
        <section
          aria-label="Gráfico de ventas"
          className="rounded-lg border border-border bg-card p-4 shadow-sm"
        >
          <h2 className="text-base font-semibold text-foreground mb-4">Ventas por período</h2>
          <SalesChart
            data={ventasQuery.data?.items}
            isLoading={ventasQuery.isLoading}
          />
        </section>

        {/* Bottom row — 2 charts side by side on lg+ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section
            aria-label="Top productos"
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <h2 className="text-base font-semibold text-foreground mb-4">Top 10 productos</h2>
            <TopProductsChart
              data={topProductosQuery.data?.items}
              isLoading={topProductosQuery.isLoading}
            />
          </section>

          <section
            aria-label="Pedidos por estado"
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <h2 className="text-base font-semibold text-foreground mb-4">Pedidos por estado</h2>
            <OrderStateChart
              data={pedidosEstadoQuery.data?.items}
              isLoading={pedidosEstadoQuery.isLoading}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
