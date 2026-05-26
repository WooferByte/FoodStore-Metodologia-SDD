## ADDED Requirements

### Requirement: ProductGrid migrado a widgets/ProductGrid
El componente ProductGrid SHALL ser movido de `features/products/components/ProductGrid.tsx` a `widgets/ProductGrid/ProductGrid.tsx`. SHALL mantener su API pública exacta (props, exports). SHALL tener un barrel export `index.ts`. Su test SHALL ser movido junto al componente. El import en `pages/Catalog.tsx` SHALL ser actualizado.

#### Scenario: Import actualizado en Catalog.tsx
- **WHEN** se busca `from '@/features/products/components/ProductGrid'` en Catalog.tsx
- **THEN** no hay resultados (import viejo eliminado)
- **WHEN** se busca `from '@/widgets/ProductGrid'` en Catalog.tsx
- **THEN** hay exactamente 1 resultado (import nuevo)

#### Scenario: Tests pasan post-migración
- **WHEN** se ejecuta `vitest run`
- **THEN** todos los tests de ProductGrid pasan sin errores

### Requirement: FilterBar migrado a widgets/FilterBar
El componente FilterBar SHALL ser movido de `features/products/components/FilterBar.tsx` a `widgets/FilterBar/FilterBar.tsx`. Mismas reglas que ProductGrid.

### Requirement: OrderTimeline migrado a widgets/OrderTimeline
El componente OrderTimeline SHALL ser movido de `features/orders/components/detail/OrderTimeline.tsx` a `widgets/OrderTimeline/OrderTimeline.tsx`. El sub-componente OrderTimelineItem SHALL permanecer en `features/orders/components/detail/`.

### Requirement: OrdersManagementTable migrado a widgets/OrdersManagementTable
El componente OrdersManagementTable SHALL ser movido de `features/orders/components/management/OrdersManagementTable.tsx` a `widgets/OrdersManagementTable/OrdersManagementTable.tsx`.

### Requirement: shared/components/Navbar.tsx eliminado
El archivo `frontend/src/shared/components/Navbar.tsx` SHALL ser eliminado por ser un duplicado de `widgets/Navbar/Navbar.tsx`. Ningún archivo en el proyecto SHALL importar desde `@/shared/components/Navbar`.

#### Scenario: Archivo eliminado
- **WHEN** se verifica la existencia de `frontend/src/shared/components/Navbar.tsx`
- **THEN** el archivo NO existe

#### Scenario: Sin referencias al archivo eliminado
- **WHEN** se busca `from '@/shared/components/Navbar'` en todo el proyecto
- **THEN** no hay resultados

### Requirement: AGENTS.md actualizado
El archivo `.agents/AGENTS.md` SHALL ser actualizado para reflejar que `entities/` y `widgets/` ya NO están vacíos, listando los componentes existentes en cada capa.
