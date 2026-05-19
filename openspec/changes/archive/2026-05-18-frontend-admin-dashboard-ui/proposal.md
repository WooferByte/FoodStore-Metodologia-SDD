## Why

The `admin-dashboard-metrics` backend change delivered four metrics endpoints (`/api/v1/admin/metricas/*`) but no frontend consumes them yet. Administrators currently have no visual overview of business performance — sales totals, daily orders, active products, and user counts must be retrieved via raw API calls. This change closes that gap by building the metrics dashboard UI that makes the backend data actionable.

## What Changes

- New `frontend/src/features/metrics/` FSD feature module with:
  - `types/index.ts` — TypeScript interfaces for all four metrics endpoint response shapes
  - `constants/index.ts` — `GRANULARIDAD_MAP`, preset date ranges (Hoy / Esta Semana / Este Mes), semantic chart color palette
  - `hooks/useMetricsSummary.ts` — TanStack Query v5 hook for `GET /api/v1/admin/metricas/resumen`
  - `hooks/useMetricsVentas.ts` — TanStack Query v5 hook for `GET /api/v1/admin/metricas/ventas`
  - `hooks/useMetricsTopProductos.ts` — TanStack Query v5 hook for `GET /api/v1/admin/metricas/top-productos`
  - `hooks/useMetricsPedidosPorEstado.ts` — TanStack Query v5 hook for `GET /api/v1/admin/metricas/pedidos-por-estado`
  - `components/MetricsKPICards.tsx` — 4-card KPI strip with trending indicators
  - `components/DateRangeSelector.tsx` — preset buttons + custom date range inputs
  - `components/SalesChart.tsx` — responsive Recharts LineChart for ventas por período
  - `components/TopProductsChart.tsx` — responsive Recharts BarChart for top 10 productos
  - `components/OrderStateChart.tsx` — responsive Recharts PieChart for distribución de estados
- Updated `frontend/src/pages/AdminDashboardPage.tsx` — replaces placeholder with full dashboard layout using the new feature
- Unit tests in `frontend/src/features/metrics/hooks/__tests__/` and `frontend/src/features/metrics/components/__tests__/`
- E2E test `frontend/e2e/admin/dashboard-metrics.spec.ts`

## Capabilities

### New Capabilities

- `admin-metrics-dashboard-ui`: Complete frontend dashboard for administrator metrics visualization. Includes KPI cards, date range selector, and three Recharts-powered charts (line, bar, pie) consuming the four admin metrics endpoints with TanStack Query v5 (`staleTime: 300_000`), loading skeletons, responsive layout, and ARIA accessibility.

### Modified Capabilities

- `admin-dashboard-metrics`: Backend spec — no requirement changes. The frontend now consumes the endpoints defined in this spec; implementation detail only, no spec-level behavior change.

## Impact

- **New files**: `frontend/src/features/metrics/` (entire module), plus `frontend/e2e/admin/dashboard-metrics.spec.ts`
- **Modified files**: `frontend/src/pages/AdminDashboardPage.tsx` (placeholder replaced)
- **Dependencies**: No new npm packages needed — `recharts`, `@tanstack/react-query`, `lucide-react`, and `axios` are already installed
- **API dependency**: All four `GET /api/v1/admin/metricas/*` endpoints must be running (provided by `admin-dashboard-metrics` backend change)
- **Auth dependency**: `ProtectedRoute` with `requiredRole="ADMIN"` must be wrapping the dashboard page (provided by `route-protection-rbac` change)
- **No breaking changes**: Existing pages and features are unaffected
