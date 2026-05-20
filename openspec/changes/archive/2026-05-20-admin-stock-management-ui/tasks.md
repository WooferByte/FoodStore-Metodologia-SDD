# Tasks: admin-stock-management-ui

## 0. Skills

- [x] 0.1 Leer `.agents/skills/python-fastapi-ddd-skill/SKILL.md` — entender contrato del backend (modelo Producto, endpoint PATCH stock)
- [x] 0.2 Leer `.agents/skills/tailwind-design-system/SKILL.md` — estilos de componentes, badges, variantes
- [x] 0.3 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — patrones de performance React, memoización
- [x] 0.4 Leer `.agents/skills/dashboard-crud-page/SKILL.md` — patrones de página admin CRUD (evaluar aplicabilidad al proyecto FSD)

## 1. Feature Scaffold

- [x] 1.1 Crear estructura de carpetas `features/stock/admin/` con types, constants, hooks, components
- [x] 1.2 Definir `features/stock/admin/types/index.ts` — `StockProductFilters`, `StockEditPayload`
- [x] 1.3 Definir `features/stock/admin/constants/index.ts` — `ADMIN_STOCK_QUERY_KEY`, `STOCK_API_PATH`, `PAGE_SIZE`, `STALE_TIME`
- [x] 1.4 Crear store Zustand `store/stockFiltersStore.ts` — estado de filtros (q, disponible, page) con setter que resetea page a 1

## 2. Hooks (TanStack Query)

- [x] 2.1 Implementar `useAdminStockProducts(filters)` — hook `useQuery` con key `['admin-stock-products', filters]`, consume `GET /api/v1/productos`, staleTime 60s, keepPreviousData
- [x] 2.2 Implementar `useUpdateStock()` — hook `useMutation` que hace `PATCH /api/v1/productos/{id}/stock`, onSuccess invalida `['admin-stock-products']`, `['admin-products']`, `['products']`, `['productDetail']`
- [x] 2.3 Implementar `useUpdateProductDisponible()` — hook `useMutation` que hace `PUT /api/v1/productos/{id}` (solo cambia disponible), onSuccess invalida mismas query keys
- [x] 2.4 Crear barrel export `features/stock/admin/hooks/index.ts`

## 3. Components

- [x] 3.1 Implementar `StockBadge.tsx` — badge con variante `error` (stock 0), `warning` (1-10), `success` (>10), props: `stock: number`, `size?: 'sm' | 'md'`
- [x] 3.2 Implementar `AdminStockTable.tsx` — tabla responsive con columnas nombre, precio, stock (con StockBadge), disponible (badge), acciones. Estados: loading (skeleton), error, vacío. Paginación condicional. Mobile: cards
- [x] 3.3 Implementar `StockEditModal.tsx` — modal con campo `stock_cantidad` (input number, min 0) y toggle `disponible`. Precarga con datos actuales. Submit: useUpdateStock y/o useUpdateProductDisponible. Manejo de errores con toast

## 4. Page & Routing

- [x] 4.1 Implementar `pages/AdminStockPage.tsx` — página lazy-loaded que integra: stockFiltersStore, useAdminStockProducts, AdminStockTable, StockEditModal
- [x] 4.2 Agregar ruta `<Route path="/admin/stock" element={<AdminStockPage />} />` en `app/Router.tsx` bajo `ProtectedRoute` con roles `['STOCK', 'ADMIN']`
- [x] 4.3 Agregar link "Stock" en el sidebar/admin links con icono `Package` de lucide-react, visible para roles STOCK y ADMIN

## 5. Tests

- [x] 5.1 Escribir tests para `useAdminStockProducts` (fetch, loading, error, empty, paginación)
- [x] 5.2 Escribir tests para `useUpdateStock` (mutación exitosa, invalidación de queries, error)
- [x] 5.3 Escribir tests para `useUpdateProductDisponible` (mutación exitosa, invalidación)
- [x] 5.4 Escribir tests para `AdminStockTable` (render, loading skeleton, empty state, error state, paginación, responsive)
- [x] 5.5 Escribir tests para `StockEditModal` (apertura, precarga, validación stock >= 0, submit exitoso, error toast)
- [x] 5.6 Escribir tests para `stockFiltersStore` (setters, reset, page reset al cambiar filtro)
