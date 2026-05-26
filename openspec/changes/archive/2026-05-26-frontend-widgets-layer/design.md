# Design: frontend-widgets-layer

## Context

FSD (Feature-Sliced Design) define 7 capas: `app > pages > widgets > features > entities > shared`. Actualmente `widgets/` tiene Navbar, Sidebar, Footer y CartDrawer, pero varios componentes compositivos clave están en `features/` cuando por definición pertenecen a `widgets/`.

## Goals / Non-Goals

**Goals:**
- Migrar 4 componentes compositivos de `features/` a `widgets/` con barrels exports
- Actualizar todos los imports de pages/ que referencien las rutas viejas
- Eliminar el archivo duplicado `shared/components/Navbar.tsx`
- Actualizar AGENTS.md con el estado real

**Non-Goals:**
- NO cambiar lógica de negocio ni estilos
- NO modificar la API pública de los componentes (props, exports)
- NO mover componentes atómicos de features/ (ProductCard, CartItemRow, etc.)
- NO crear widgets admin nuevos

## Migration Plan

### Widget 1: ProductGrid
```
FROM: features/products/components/ProductGrid.tsx
TO:   widgets/ProductGrid/ProductGrid.tsx
       widgets/ProductGrid/index.ts (barrel)
       widgets/ProductGrid/__tests__/ProductGrid.test.tsx (mover tests)
```
Actualizar imports en: `pages/Catalog.tsx`

### Widget 2: FilterBar  
```
FROM: features/products/components/FilterBar.tsx
TO:   widgets/FilterBar/FilterBar.tsx
       widgets/FilterBar/index.ts (barrel)
       widgets/FilterBar/__tests__/FilterBar.test.tsx (si existe)
```
Actualizar imports en: `pages/Catalog.tsx`

### Widget 3: OrderTimeline
```
FROM: features/orders/components/detail/OrderTimeline.tsx
TO:   widgets/OrderTimeline/OrderTimeline.tsx
       widgets/OrderTimeline/index.ts (barrel)
       widgets/OrderTimeline/__tests__/OrderTimeline.test.tsx (mover tests)
```
Actualizar imports en: `pages/OrderDetailPage.tsx`
Nota: `OrderTimelineItem` se queda en `features/orders/` (es componente atómico de feature, no widget)

### Widget 4: OrdersManagementTable
```
FROM: features/orders/components/management/OrdersManagementTable.tsx
TO:   widgets/OrdersManagementTable/OrdersManagementTable.tsx
       widgets/OrdersManagementTable/index.ts (barrel)
       widgets/OrdersManagementTable/__tests__/OrdersManagementTable.test.tsx (mover tests)
```
Actualizar imports en: `pages/OrdersPanelPage.tsx`

### Cleanup
- Eliminar `shared/components/Navbar.tsx` (duplicado de `widgets/Navbar/Navbar.tsx` — sin imports)
- Verificar con grep que ningún archivo lo importe

### Docs
- AGENTS.md: actualizar líneas sobre entities/ y widgets/ para reflejar estado real

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Import olvidado**: alguna page sigue importando de la ruta vieja | `grep -r "features/products/components/ProductGrid"` post-migración para verificar 0 resultados |
| **Test roto**: los tests referencian paths relativos que cambian | Mover tests junto con el componente. Verificar con `vitest run` post-migración |
| **Feature barrel export**: si `features/products/components/index.ts` re-exportaba ProductGrid, hay que actualizarlo | Remover del barrel de features. Si no existe barrel, no hay problema |
