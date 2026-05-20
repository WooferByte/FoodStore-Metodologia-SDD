## ADDED Requirements

### Requirement: Admin metrics dashboard page renders at /admin

The system SHALL render a full metrics dashboard at the `/admin` route for authenticated users with the ADMIN role. The page SHALL include a date range selector, four KPI cards, a sales line chart, a top products bar chart, and an orders-by-state pie chart. All data SHALL be fetched exclusively from the backend metrics endpoints — no hardcoded values.

#### Scenario: ADMIN user sees dashboard
- **WHEN** an authenticated ADMIN user navigates to `/admin`
- **THEN** the page renders the date range selector, KPI cards section, and three chart sections

#### Scenario: Non-ADMIN user is blocked
- **WHEN** a non-ADMIN authenticated user navigates to `/admin`
- **THEN** the route protection redirects them to `/403`

#### Scenario: Unauthenticated user is redirected
- **WHEN** an unauthenticated user navigates to `/admin`
- **THEN** the route protection redirects them to `/login`

---

### Requirement: Date range selector with presets and custom range

The system SHALL provide a `DateRangeSelector` component with four preset buttons — **Hoy**, **Esta Semana**, **Este Mes** — and a **Custom** option. Selecting **Custom** SHALL reveal two `<input type="date">` fields for start and end dates. Changing any date range SHALL immediately re-fetch all dependent metrics queries.

#### Scenario: Preset "Hoy" selected
- **WHEN** the user clicks the "Hoy" preset button
- **THEN** `desde` is set to today's ISO date and `hasta` is set to today's ISO date

#### Scenario: Preset "Esta Semana" selected
- **WHEN** the user clicks the "Esta Semana" preset button
- **THEN** `desde` is set to the Monday of the current week and `hasta` is set to today's ISO date

#### Scenario: Preset "Este Mes" selected
- **WHEN** the user clicks the "Este Mes" preset button
- **THEN** `desde` is set to the first day of the current month and `hasta` is set to today's ISO date

#### Scenario: Custom range inputs appear
- **WHEN** the user clicks the "Custom" preset button
- **THEN** two date input fields are displayed, allowing the user to set `desde` and `hasta` freely

#### Scenario: Date range change triggers re-fetch
- **WHEN** the user changes the active date range (preset or custom)
- **THEN** TanStack Query invalidates the cache keys for `summary`, `ventas`, and `top-productos` queries and re-fetches them

---

### Requirement: KPI cards display four summary metrics

The system SHALL render a `MetricsKPICards` component displaying four cards: **Total Ventas** (formatted as currency ARS), **Pedidos Hoy** (integer count), **Productos Activos** (integer count), and **Usuarios Activos** (integer count). Each card SHALL show a trending indicator (up or down icon) when trend data is available. While loading, each card SHALL display an animated skeleton placeholder.

#### Scenario: KPI cards render with data
- **WHEN** `GET /api/v1/admin/metricas/resumen` returns successfully
- **THEN** the four KPI card values are populated with the response data

#### Scenario: KPI cards show loading skeleton
- **WHEN** the summary query is in loading state
- **THEN** each card renders an animated skeleton (`animate-pulse`) instead of values

#### Scenario: KPI cards show error state
- **WHEN** the summary query returns an error
- **THEN** each card renders a fallback error message without crashing the page

---

### Requirement: Sales line chart shows ventas por período

The system SHALL render a `SalesChart` component using a Recharts `LineChart` inside a `ResponsiveContainer`. The X axis SHALL display dates; the Y axis SHALL display total sales (ARS). The chart SHALL include a `Tooltip` showing date and total on hover. Granularidad SHALL be auto-selected from `GRANULARIDAD_MAP` based on the active date range. The chart SHALL have `role="img"` and `aria-label="Gráfico de ventas por período"`.

#### Scenario: Sales chart renders with data
- **WHEN** `GET /api/v1/admin/metricas/ventas` returns items
- **THEN** the LineChart renders with one data point per item in the response

#### Scenario: Sales chart shows skeleton while loading
- **WHEN** the ventas query is loading
- **THEN** the chart area renders a skeleton rectangle of equal height

#### Scenario: Sales chart is accessible
- **WHEN** a screen reader focuses the chart container
- **THEN** the element has `role="img"` and `aria-label="Gráfico de ventas por período"`

#### Scenario: Granularidad auto-computed for "Hoy"
- **WHEN** the active date range is "Hoy"
- **THEN** the ventas query is called with `granularidad=dia`

#### Scenario: Granularidad auto-computed for "Este Mes"
- **WHEN** the active date range is "Este Mes"
- **THEN** the ventas query is called with `granularidad=semana`

---

### Requirement: Top products bar chart shows top 10 productos

The system SHALL render a `TopProductsChart` component using a Recharts `BarChart` inside a `ResponsiveContainer`. The X axis SHALL display product names (truncated at 12 chars); the Y axis SHALL display total units sold. The chart SHALL include a `Tooltip`. The chart SHALL have `role="img"` and `aria-label="Gráfico de top 10 productos vendidos"`.

#### Scenario: Top products chart renders with data
- **WHEN** `GET /api/v1/admin/metricas/top-productos` returns items
- **THEN** the BarChart renders with one bar per item in the response (maximum 10)

#### Scenario: Top products chart shows skeleton while loading
- **WHEN** the top-productos query is loading
- **THEN** the chart area renders a skeleton rectangle of equal height

---

### Requirement: Orders-by-state pie chart shows distribution

The system SHALL render an `OrderStateChart` component using a Recharts `PieChart` inside a `ResponsiveContainer`. Each slice SHALL represent an order state with its count as the value. The chart SHALL include a `Legend` and `Tooltip`. Long state labels SHALL be truncated to 15 characters. The chart SHALL have `role="img"` and `aria-label="Distribución de pedidos por estado"`. This chart SHALL NOT be filtered by date range (the endpoint takes no date params).

#### Scenario: Orders state chart renders with data
- **WHEN** `GET /api/v1/admin/metricas/pedidos-por-estado` returns items
- **THEN** the PieChart renders with one slice per item in the response

#### Scenario: Orders state chart shows skeleton while loading
- **WHEN** the pedidos-por-estado query is loading
- **THEN** the chart area renders a skeleton circle of equal size

---

### Requirement: TanStack Query hooks use 5-minute stale time

All four metrics hooks SHALL set `staleTime: 300_000` (5 minutes) to align with the backend `Cache-Control: max-age=300` header. Query keys SHALL include all relevant params so that changing the date range produces a fresh fetch.

#### Scenario: Same date range does not re-fetch within 5 minutes
- **WHEN** the user navigates away and returns to `/admin` within 5 minutes without changing the date range
- **THEN** TanStack Query serves cached data without making a new network request

#### Scenario: Different date range triggers a new fetch
- **WHEN** the user changes the date range selection
- **THEN** TanStack Query detects a new cache key and performs a network request

---

### Requirement: Dashboard layout is responsive

The system SHALL render the KPI cards in a responsive grid: 1 column on mobile (< 640px), 2 columns on small screens (≥ 640px), and 4 columns on large screens (≥ 1024px). Charts SHALL stack vertically on all screen sizes. All components SHALL use `@/` path alias in imports.

#### Scenario: KPI grid is 4 columns on desktop
- **WHEN** the viewport width is ≥ 1024px
- **THEN** the four KPI cards render in a single horizontal row

#### Scenario: KPI grid is 1 column on mobile
- **WHEN** the viewport width is < 640px
- **THEN** each KPI card renders in its own full-width row

---

### Requirement: Feature module follows FSD structure

The metrics feature SHALL be organized at `frontend/src/features/metrics/` with subdirectories: `types/`, `constants/`, `hooks/`, and `components/`. All tests SHALL live in `__tests__/` subdirectories within each layer. The page component `Admin.tsx` SHALL import exclusively from `@/features/metrics/`.

#### Scenario: FSD import direction is respected
- **WHEN** any file inside `features/metrics/` is examined
- **THEN** it does not import from `pages/` or `widgets/` (FSD downward-only imports)

#### Scenario: Tests are co-located with their layer
- **WHEN** the `features/metrics/hooks/__tests__/` directory is examined
- **THEN** it contains one test file per hook
