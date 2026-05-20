## 0. Skills

- [x] 0.1 Leer `.agents/skills/tailwind-design-system/SKILL.md` — tokens semánticos Tailwind v4, responsive grid, animate-pulse skeleton
- [x] 0.2 Leer `.agents/skills/ui-design-system/SKILL.md` — accesibilidad WCAG AA, ARIA en gráficos, composición de componentes
- [x] 0.3 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — re-render optimization, memo, bundle, TanStack Query cache
- [x] 0.4 Leer `.agents/skills/zustand-state-management/README.md` — confirmar que métricas NO van a Zustand (solo TanStack Query)
- [x] 0.5 Leer `.agents/skills/frontend-state-management/SKILL.md` — separación Zustand (client) vs TanStack Query (server)
- [x] 0.6 Leer `.agents/skills/testing-e2e-playwright/SKILL.md` — loginAs() helper, route guards, mocks FastAPI para E2E
- [x] 0.7 Leer `.agents/skills/dashboard-crud-page/SKILL.md` — loading skeleton, hook patterns, ARIA labels en acciones
- [x] 0.8 Leer `.agents/skills/post-change-verification/SKILL.md` — checklist vitest + tsc + build antes de archivar

## 1. Tipos TypeScript

- [x] 1.1 Crear `frontend/src/features/metrics/types/index.ts` con interfaces: `MetricsSummary`, `VentasItem`, `VentasResponse`, `TopProductoItem`, `TopProductosResponse`, `PedidoEstadoItem`, `PedidosEstadoResponse` y `DateRange` (con `desde`, `hasta`, `preset: 'hoy' | 'semana' | 'mes' | 'custom'`)

## 2. Constantes

- [x] 2.1 Crear `frontend/src/features/metrics/constants/index.ts` con:
  - `GRANULARIDAD_MAP`: mapea preset + duración en días a `'dia' | 'semana' | 'mes'`
  - `DEFAULT_DATE_RANGE`: preset `'mes'` con `desde` = primer día del mes actual, `hasta` = hoy
  - `CHART_COLORS`: objeto con `primary`, `success`, `warning`, `error`, `muted` en valores `oklch(...)` compatibles con Tailwind v4 `@theme`
  - `PRESET_LABELS`: objeto con textos de los botones de preset

## 3. Hooks TanStack Query

- [x] 3.1 Crear `frontend/src/features/metrics/hooks/useMetricsSummary.ts` — hook con `queryKey: ['metrics', 'summary', { desde, hasta }]`, llama `GET /api/v1/admin/metricas/resumen`, `staleTime: 300_000`, `gcTime: 600_000`, `retry: 1`, retorna `{ data, isLoading, isError }`
- [x] 3.2 Crear `frontend/src/features/metrics/hooks/useMetricsVentas.ts` — hook con `queryKey: ['metrics', 'ventas', { granularidad, desde, hasta }]`, llama `GET /api/v1/admin/metricas/ventas`, mismos staleTime/gcTime, auto-computa `granularidad` usando `GRANULARIDAD_MAP`
- [x] 3.3 Crear `frontend/src/features/metrics/hooks/useMetricsTopProductos.ts` — hook con `queryKey: ['metrics', 'top-productos', { desde, hasta }]`, llama `GET /api/v1/admin/metricas/top-productos`, mismos staleTime/gcTime
- [x] 3.4 Crear `frontend/src/features/metrics/hooks/useMetricsPedidosPorEstado.ts` — hook con `queryKey: ['metrics', 'pedidos-por-estado']` (sin params de fecha), llama `GET /api/v1/admin/metricas/pedidos-por-estado`, `staleTime: 300_000`
- [x] 3.5 Crear `frontend/src/features/metrics/hooks/index.ts` con re-exportación de los 4 hooks

## 4. Componente DateRangeSelector

- [x] 4.1 Crear `frontend/src/features/metrics/components/DateRangeSelector.tsx` — componente con props `{ dateRange: DateRange; onChange: (range: DateRange) => void }`. Renderiza 3 botones preset + 1 botón "Custom". Al seleccionar "Custom" muestra dos `<input type="date">`. El botón activo recibe estilos distintos (`bg-primary text-primary-foreground`). Usa Tailwind v4 tokens.
- [x] 4.2 Verificar que cambiar preset o fechas custom llama `onChange` inmediatamente (no hay botón "Aplicar")

## 5. Componente MetricsKPICards

- [x] 5.1 Crear `frontend/src/features/metrics/components/MetricsKPICards.tsx` — componente con props `{ data: MetricsSummary | undefined; isLoading: boolean; isError: boolean }`. Renderiza 4 cards: Total Ventas (ARS formateado con `Intl.NumberFormat`), Pedidos Hoy, Productos Activos, Usuarios Activos. Cada card tiene ícono de lucide-react (`DollarSign`, `ShoppingBag`, `Package`, `Users`), número grande, y trending indicator (`TrendingUp` verde / `TrendingDown` rojo) si aplica.
- [x] 5.2 Cuando `isLoading` es true: renderizar 4 skeleton cards con `animate-pulse bg-muted rounded-lg h-28`
- [x] 5.3 Cuando `isError` es true: renderizar mensaje de error en cada card con `text-destructive`
- [x] 5.4 Grid responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`

## 6. Componente SalesChart

- [x] 6.1 Crear `frontend/src/features/metrics/components/SalesChart.tsx` — componente con props `{ data: VentasItem[] | undefined; isLoading: boolean }`. Usa Recharts `ResponsiveContainer` + `LineChart` + `Line` + `XAxis` + `YAxis` + `CartesianGrid` + `Tooltip`. Color de línea: `CHART_COLORS.primary`.
- [x] 6.2 Wrapper div con `role="img"` y `aria-label="Gráfico de ventas por período"`
- [x] 6.3 `XAxis` muestra campo `fecha` (truncar a `MM/DD` con `substring`); `YAxis` tickFormatter con `Intl.NumberFormat` abreviado (K/M)
- [x] 6.4 Cuando `isLoading`: renderizar skeleton `animate-pulse bg-muted rounded h-64`
- [x] 6.5 Cuando `!data || data.length === 0`: renderizar estado vacío `<p>Sin datos para el período seleccionado</p>`

## 7. Componente TopProductsChart

- [x] 7.1 Crear `frontend/src/features/metrics/components/TopProductsChart.tsx` — componente con props `{ data: TopProductoItem[] | undefined; isLoading: boolean }`. Usa Recharts `ResponsiveContainer` + `BarChart` + `Bar` + `XAxis` + `YAxis` + `Tooltip`. Limitar a primeros 10 items con `.slice(0, 10)`. Color de barras: `CHART_COLORS.success`.
- [x] 7.2 `XAxis` muestra `nombre` truncado a 12 chars (`str.slice(0,12) + (str.length > 12 ? '…' : '')`)
- [x] 7.3 Wrapper div con `role="img"` y `aria-label="Gráfico de top 10 productos vendidos"`
- [x] 7.4 Skeleton y estado vacío análogos al SalesChart

## 8. Componente OrderStateChart

- [x] 8.1 Crear `frontend/src/features/metrics/components/OrderStateChart.tsx` — componente con props `{ data: PedidoEstadoItem[] | undefined; isLoading: boolean }`. Usa Recharts `ResponsiveContainer` + `PieChart` + `Pie` + `Cell` + `Legend` + `Tooltip`. Asignar colores de `CHART_COLORS` por índice (cyclic).
- [x] 8.2 Etiquetas de estado truncadas a 15 chars
- [x] 8.3 Wrapper div con `role="img"` y `aria-label="Distribución de pedidos por estado"`
- [x] 8.4 Skeleton con `animate-pulse bg-muted rounded-full h-64 w-64 mx-auto` y estado vacío análogos

## 9. Componente índice de la feature

- [x] 9.1 Crear `frontend/src/features/metrics/components/index.ts` con re-exportación de los 5 componentes

## 10. Actualizar AdminDashboardPage

- [x] 10.1 Reemplazar el body de `frontend/src/pages/Admin.tsx` — importar los 5 componentes de `@/features/metrics/components` y los 4 hooks de `@/features/metrics/hooks`
- [x] 10.2 El componente exportado se renombra internamente a `AdminDashboardPage` (el archivo sigue llamándose `Admin.tsx` para no romper el router)
- [x] 10.3 Estado local `dateRange: DateRange` inicializado con `DEFAULT_DATE_RANGE`, manejado con `useState`
- [x] 10.4 Pasar `dateRange.desde` y `dateRange.hasta` a los 3 hooks que los requieren; el hook `useMetricsPedidosPorEstado` no los recibe
- [x] 10.5 Layout: `<div className="p-6 space-y-6">` > título `<h1>Panel de Administración</h1>` > `<DateRangeSelector>` > `<MetricsKPICards>` > grid `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">` con `<SalesChart>` (full-width, `col-span-full`) y luego `<TopProductsChart>` + `<OrderStateChart>` en 2 columnas > `<OrderStateChart>` si se prefiere full-width. Ajustar a criterio visual mientras se respeta la estructura de datos.

## 11. Tests unitarios — hooks

- [x] 11.1 Crear `frontend/src/features/metrics/hooks/__tests__/useMetricsSummary.test.ts` — mock `apiClient.get`, verificar queryKey, staleTime, y que retorna `data` cuando el mock resuelve
- [x] 11.2 Crear `frontend/src/features/metrics/hooks/__tests__/useMetricsVentas.test.ts` — verificar que `granularidad` se auto-computa correctamente para presets 'hoy' y 'mes'
- [x] 11.3 Crear `frontend/src/features/metrics/hooks/__tests__/useMetricsTopProductos.test.ts` — mock y verificar queryKey con `{ desde, hasta }`
- [x] 11.4 Crear `frontend/src/features/metrics/hooks/__tests__/useMetricsPedidosPorEstado.test.ts` — verificar queryKey estático (sin fecha params)

## 12. Tests unitarios — componentes

- [x] 12.1 Crear `frontend/src/features/metrics/components/__tests__/MetricsKPICards.test.tsx` — verificar: renderiza 4 skeletons cuando `isLoading=true`; renderiza valores cuando `data` tiene datos; renderiza mensaje error cuando `isError=true`
- [x] 12.2 Crear `frontend/src/features/metrics/components/__tests__/DateRangeSelector.test.tsx` — verificar: preset buttons renderizan; click "Hoy" llama `onChange` con `preset='hoy'`; click "Custom" muestra date inputs

## 13. Test E2E

- [x] 13.1 Crear `frontend/e2e/admin/dashboard-metrics.spec.ts` — usando `loginAs(page, 'ADMIN')` del helper; navegar a `/admin`; verificar que aparecen los 4 KPI cards (mock las 4 APIs con `page.route`); verificar que cambiar a preset "Hoy" dispara re-fetch (interceptar requests)
- [x] 13.2 Agregar test de acceso denegado: `loginAs(page, 'CLIENT')` → navegar a `/admin` → `expect(page).toHaveURL('/403')`

## 14. Verificación post-change

- [x] 14.1 Ejecutar `cd frontend && npx tsc --noEmit` — cero errores TypeScript
- [x] 14.2 Ejecutar `npx vitest run` — todos los tests pasan, sin regresiones en tests existentes
- [ ] 14.3 Ejecutar `npm run build` — compila sin errores (warning de chunk size es OK)
- [ ] 14.4 Verificación manual: levantar backend + frontend, loguearse como ADMIN, navegar a `/admin`, confirmar que los 4 KPI cards y los 3 gráficos renderizan con datos reales del backend
