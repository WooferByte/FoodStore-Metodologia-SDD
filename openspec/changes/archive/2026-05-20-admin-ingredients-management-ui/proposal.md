## Why

El admin de productos permite asociar ingredientes a productos, pero no hay una interfaz dedicada para gestionar el catálogo de ingredientes (crear, editar, soft-delete). Actualmente hay que manejar ingredientes directamente por base de datos. Se necesita un CRUD admin completo para ingredientes con flag de alérgeno, siguiendo el mismo patrón FSD que los demás admin CRUDs del proyecto.

## What Changes

- Nueva feature FSD `features/ingredients/admin/` con tabla, formulario y confirmación de borrado
- Nueva página `/admin/ingredientes` lazy-loaded en el Router
- Nuevo link en el sidebar del admin bajo la sección de productos (rol `STOCK` | `ADMIN`)
- Hooks TanStack Query para listar, crear, actualizar y soft-delete ingredientes

## Capabilities

### New Capabilities
- `admin-ingredients-ui`: Interfaz de administración de ingredientes — tabla paginada con filtro por alérgeno, modal de crear/editar con nombre y toggle es_alergeno, confirmación de soft-delete con protección 409.

### Modified Capabilities
- *(ninguna — es frontend-only, no cambian requisitos de backend)*

## Impact

- **Frontend**: nuevo feature `features/ingredients/admin/` con types, constants, hooks, components
- **Frontend**: nueva página `AdminIngredientsPage.tsx` en `pages/`
- **Frontend**: nuevo import lazy en `app/Router.tsx`
- **Frontend**: nuevo link en sidebar bajo sección de productos
- **Backend**: sin cambios (endpoints CRUD ya existen en `GET/POST/PUT/DELETE /api/v1/ingredientes/`)
- **Tests**: ~10-12 tests nuevos con vitest para hooks y componentes
