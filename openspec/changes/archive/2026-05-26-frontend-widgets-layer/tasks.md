# Tasks: frontend-widgets-layer

## 0. Skills

- [ ] 0.1 Leer `.agents/skills/tailwind-design-system/SKILL.md` — estilos de componentes
- [ ] 0.2 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — patrones de performance

## 1. Migrar ProductGrid

- [ ] 1.1 Crear `widgets/ProductGrid/ProductGrid.tsx` moviendo el contenido de `features/products/components/ProductGrid.tsx`
- [ ] 1.2 Crear `widgets/ProductGrid/index.ts` con barrel export
- [ ] 1.3 Mover tests de ProductGrid a `widgets/ProductGrid/__tests__/`
- [ ] 1.4 Actualizar import en `pages/Catalog.tsx`

## 2. Migrar FilterBar

- [ ] 2.1 Crear `widgets/FilterBar/FilterBar.tsx` moviendo el contenido de `features/products/components/FilterBar.tsx`
- [ ] 2.2 Crear `widgets/FilterBar/index.ts` con barrel export
- [ ] 2.3 Mover tests de FilterBar a `widgets/FilterBar/__tests__/` (si existen)
- [ ] 2.4 Actualizar import en `pages/Catalog.tsx`

## 3. Migrar OrderTimeline

- [ ] 3.1 Crear `widgets/OrderTimeline/OrderTimeline.tsx` moviendo de `features/orders/components/detail/OrderTimeline.tsx`
- [ ] 3.2 Crear `widgets/OrderTimeline/index.ts` con barrel export
- [ ] 3.3 Mover tests a `widgets/OrderTimeline/__tests__/`
- [ ] 3.4 Actualizar import en `pages/OrderDetailPage.tsx`

## 4. Migrar OrdersManagementTable

- [ ] 4.1 Crear `widgets/OrdersManagementTable/OrdersManagementTable.tsx` moviendo de `features/orders/components/management/OrdersManagementTable.tsx`
- [ ] 4.2 Crear `widgets/OrdersManagementTable/index.ts` con barrel export
- [ ] 4.3 Mover tests a `widgets/OrdersManagementTable/__tests__/`
- [ ] 4.4 Actualizar import en `pages/OrdersPanelPage.tsx`

## 5. Cleanup

- [ ] 5.1 Eliminar `shared/components/Navbar.tsx` (duplicado muerto)
- [ ] 5.2 Verificar con grep que ningún archivo importe de las rutas viejas

## 6. Docs

- [ ] 6.1 Actualizar `.agents/AGENTS.md` para reflejar estado real de entities/ y widgets/
- [ ] 6.2 Ejecutar `vitest run` para verificar 0 regresiones
