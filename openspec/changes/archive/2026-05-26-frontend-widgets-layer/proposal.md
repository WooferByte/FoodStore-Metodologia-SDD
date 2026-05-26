## Why

Actualmente la capa `widgets/` de FSD está parcialmente implementada: Navbar, Sidebar, Footer y CartDrawer están en su lugar, pero hay componentes compositivos clave que siguen en `features/` cuando por definición FSD deberían estar en `widgets/`. Además hay un archivo duplicado muerto (`shared/components/Navbar.tsx`) y la documentación en AGENTS.md no refleja el estado real de entities/ y widgets/.

## What Changes

- Mover `ProductGrid` de `features/products/components/` a `widgets/ProductGrid/`
- Mover `FilterBar` de `features/products/components/` a `widgets/FilterBar/`
- Mover `OrderTimeline` de `features/orders/components/detail/` a `widgets/OrderTimeline/`
- Mover `OrdersManagementTable` de `features/orders/components/management/` a `widgets/OrdersManagementTable/`
- Eliminar `shared/components/Navbar.tsx` (duplicado muerto de `widgets/Navbar/`)
- Actualizar todos los imports en pages/ y otros archivos que referencien las rutas viejas
- Actualizar AGENTS.md para reflejar el estado real de entities/ y widgets/

## Capabilities

### New Capabilities
- `frontend-widgets-layer`: Capa `widgets/` FSD completa con todos los componentes compositivos movidos desde `features/`. Incluye barrel exports y paths actualizados.

### Modified Capabilities
- *(ninguna — es refactor de estructura, no cambian requisitos)*

## Impact

- **Frontend**: 4 widgets movidos de features/ a widgets/
- **Frontend**: imports actualizados en Catalog.tsx, OrderDetailPage.tsx, OrdersPanelPage.tsx
- **Frontend**: barrel exports index.ts en cada widget
- **Frontend**: 1 archivo stale eliminado
- **Docs**: AGENTS.md actualizado con estado real
- **Tests**: mover tests junto con los componentes, verificar que no se rompan
