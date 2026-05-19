## Context

The `admin-dashboard-metrics` backend change (commit `c9b23c0`) delivered four metrics endpoints protected by `require_role(["ADMIN"])`. No frontend consumes them yet. `frontend/src/pages/Admin.tsx` is a placeholder with a static `<h1>`.

**Existing relevant infrastructure:**
- `@/shared/api/axios` — `apiClient` Axios instance with JWT interceptor (no extra config needed)
- `@/features/orders/hooks/` — canonical TanStack Query v5 hook pattern to follow
- `@/features/payments/hooks/` — same pattern; confirms `staleTime` + `gcTime` convention
- `recharts` v2.10.3 — already installed; `LineChart`, `BarChart`, `PieChart`, `ResponsiveContainer` available
- `lucide-react` v0.294.0 — already installed; `TrendingUp`, `TrendingDown`, `ShoppingBag`, `Users`, `Package`, `DollarSign` available
- Tailwind v4 with CSS-first `@theme` config — semantic tokens (`bg-card`, `text-muted-foreground`, etc.) available

**Constraints:**
- FSD architecture: `Pages → Widgets → Features → Entities → Shared`. The new feature lives at `@/features/metrics/`. `Admin.tsx` (page layer) imports from there.
- TypeScript strict mode — all types must be explicit, no `any`.
- `staleTime: 300_000` (5 min) to match backend `Cache-Control: max-age=300`.
- No new npm dependencies may be installed.

## Goals / Non-Goals

**Goals:**
- Implement `frontend/src/features/metrics/` as a complete FSD feature module
- Replace `Admin.tsx` placeholder with a functional dashboard: date range selector + KPI cards + 3 charts
- All data from the four backend metrics endpoints — zero hardcoded values
- Loading skeletons for every async section
- Responsive layout (1-col mobile → 2-col → 4-col desktop grid for KPI cards; charts full-width stacked)
- ARIA: `role="img"` + `aria-label` on each Recharts wrapper
- Unit tests for all 4 hooks + MetricsKPICards + DateRangeSelector (vitest + @testing-library/react)
- E2E test covering ADMIN access to the dashboard page (Playwright)

**Non-Goals:**
- Real-time auto-refresh (staleTime 5 min is sufficient; no polling loop)
- Export to CSV/PDF
- Drill-down navigation from charts
- Dark mode toggle (Tailwind v4 tokens handle dark automatically via `.dark` class; no extra work needed in this change)
- Admin CRUD pages (separate changes)

## Decisions

### D1 — FSD feature module, not a widget

**Decision**: New code lives in `frontend/src/features/metrics/`, not `widgets/`.

**Rationale**: The metrics hooks, types, and components are cohesive around a single domain (metrics). A `widget` layer is for cross-feature compositions. Since the entire metrics slice is consumed only by `Admin.tsx`, there is no cross-feature need. Adding a `widgets/AdminDashboard/` layer would add indirection without benefit. Consistent with how `features/orders/` and `features/payments/` are structured.

**Alternative considered**: `widgets/metrics-dashboard/` — rejected because widgets should compose across features; this feature has no cross-feature dependency.

---

### D2 — Four separate TanStack Query hooks, not one combined hook

**Decision**: `useMetricsSummary`, `useMetricsVentas`, `useMetricsTopProductos`, `useMetricsPedidosPorEstado` — four independent hooks.

**Rationale**: Each endpoint has independent loading states and stale times. Splitting them allows each chart/card section to render independently as its data arrives, enabling Suspense-like incremental rendering via individual `isLoading` guards. A single combined hook would force all four sections to wait for the slowest endpoint.

**Cache key design**:
```
['metrics', 'summary', { desde, hasta }]
['metrics', 'ventas', { granularidad, desde, hasta }]
['metrics', 'top-productos', { desde, hasta }]
['metrics', 'pedidos-por-estado']
```
The `pedidos-por-estado` endpoint takes no date params, so its cache key is stable.

---

### D3 — DateRangeSelector drives all queries via lifted state in AdminPage

**Decision**: `AdminPage` (the page component) owns `{ desde, hasta }` state and passes it down as props to all four hooks and to `DateRangeSelector`.

**Rationale**: Date range is cross-cutting state shared by three of the four hooks. Lifting it to the page layer keeps each chart component stateless (pure data display). Using Zustand for this would violate the rule "NEVER duplicate server data params in Zustand" — date filters are query params, not client state.

**Alternative considered**: Context inside the feature — rejected as over-engineering for a single page with shallow component tree.

---

### D4 — Granularidad auto-computed from date range

**Decision**: `GRANULARIDAD_MAP` constant maps date range presets to the correct `granularidad` param:

| Preset | granularidad |
|--------|-------------|
| Hoy | `dia` |
| Esta Semana | `dia` |
| Este Mes | `semana` |
| Custom ≤ 31 días | `dia` |
| Custom > 31 días | `mes` |

**Rationale**: The backend accepts `granularidad=dia|semana|mes`. Auto-computing it from the date range gives sensible resolution without exposing implementation detail to the admin user.

---

### D5 — Loading skeletons via conditional render, not Suspense

**Decision**: Each component checks `isLoading` from its hook and renders a skeleton div (`animate-pulse bg-muted rounded`). No `React.Suspense` boundaries.

**Rationale**: TanStack Query v5 does not require Suspense. Using `isLoading` is simpler and consistent with how `frontend/src/features/orders/components/` handles it. Suspense would require `useSuspenseQuery` (different import) and would block the entire component tree on the first render.

---

### D6 — Recharts charts are client-rendered, no SSR concern

**Decision**: No dynamic import needed for Recharts components.

**Rationale**: This is a Vite SPA (no SSR). Recharts does not cause hydration mismatches. `bundle-dynamic-imports` rule from vercel-react-best-practices applies to Next.js pages; irrelevant here.

---

### D7 — Chart colors from semantic CSS tokens, not hardcoded hex

**Decision**: Define a `CHART_COLORS` constant using `oklch` values consistent with the project's Tailwind v4 `@theme`:

```ts
export const CHART_COLORS = {
  primary:  'oklch(45% 0.2 260)',   // blue — sales line
  success:  'oklch(52% 0.18 145)',  // green — top products bar
  warning:  'oklch(68% 0.18 85)',   // amber — pending state
  error:    'oklch(53% 0.22 27)',   // destructive — cancelled state
  muted:    'oklch(46% 0.02 264)',  // gray — other states
}
```

**Rationale**: Recharts does not read CSS variables at paint time — it needs string values. Using OKLCH values consistent with the design system's `@theme` tokens avoids a separate color system.

## Risks / Trade-offs

**[Risk] Backend not running during development** → The four hooks return `isLoading: false, data: undefined` on network error; each component must handle `!data` gracefully with an empty state message. Mitigation: add `isError` guard in every component rendering a fallback `<p>Error al cargar datos</p>`.

**[Risk] `pedidos-por-estado` returns estado names in Spanish from the DB** → Chart labels are backend-driven strings. No translation needed, but label truncation in PieChart may occur with long names. Mitigation: use `label` prop on `Pie` with ellipsis truncation at 15 chars.

**[Risk] `staleTime: 300_000` means stale data for up to 5 minutes** → Acceptable for admin reporting. The date range selector re-queries immediately on date change (new cache key), so manual refresh is available by changing and restoring dates. Mitigation: document this in component JSDoc.

**[Risk] `Admin.tsx` rename** → Current file is `Admin.tsx` but the spec refers to it as `AdminDashboardPage`. Keep filename as `Admin.tsx` to avoid breaking the router import. Update the exported function name to `AdminDashboardPage` internally.

## Migration Plan

1. Create `frontend/src/features/metrics/` directory structure (no migrations, pure frontend)
2. Implement types → constants → hooks → components in that order (dependency chain)
3. Replace `Admin.tsx` body — the router already imports it, no route changes needed
4. Run `npx tsc --noEmit` — verify zero TypeScript errors
5. Run `npx vitest run` — verify new tests pass, existing tests unaffected
6. Run `npm run build` — verify bundle compiles (chunk size warning OK, ERROR not OK)
7. Manual verification: log in as ADMIN, navigate to `/admin`, confirm all 4 sections render

**Rollback**: Revert `Admin.tsx` to placeholder content. No DB changes, no API changes.

## Open Questions

- None. All endpoint shapes are documented in the backend spec `openspec/specs/admin-dashboard-metrics/spec.md` and confirmed by the `admin-dashboard-metrics` change implementation.
