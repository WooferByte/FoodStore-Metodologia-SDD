## Why

El admin de productos ya permite crear y editar productos completos, pero no hay una vista dedicada para que el encargado de stock pueda ver rápidamente el stock actual de todos los productos y actualizarlo de forma masiva. Actualmente hay que entrar producto por producto vía `admin-products-management-ui` para editar el stock. Se necesita una interfaz ágil y focalizada en la gestión de stock, accesible con rol `STOCK`.

## What Changes

- Nueva feature FSD `features/stock/admin/` con tabla de productos, filtros, y modal de edición de stock
- Nueva página `/admin/stock` lazy-loaded en el Router
- Nuevo link en el sidebar del admin bajo la sección de productos (rol `STOCK` | `ADMIN`)
- Hook `useUpdateStock` que consume `PATCH /api/v1/productos/{id}/stock` (endpoint ya existente)

## Capabilities

### New Capabilities
- `admin-stock-ui`: Interfaz de administración de stock — tabla de productos con stock actual, búsqueda y filtros, modal de actualización de cantidad, y toggle de disponibilidad.

### Modified Capabilities
- *(ninguna — es frontend-only, no cambian requisitos de backend)*

## Impact

- **Frontend**: nuevo feature `features/stock/admin/` con types, constants, hooks, components
- **Frontend**: nueva página `AdminStockPage.tsx` en `pages/`
- **Frontend**: nuevo import lazy en `app/Router.tsx`
- **Frontend**: nuevo link en constantes del sidebar (`ADMIN_LINKS` o similar)
- **Backend**: sin cambios (endpoint `PATCH /api/v1/productos/{id}/stock` ya existe y funciona)
- **Tests**: ~8-10 tests nuevos con vitest para hooks y componentes
