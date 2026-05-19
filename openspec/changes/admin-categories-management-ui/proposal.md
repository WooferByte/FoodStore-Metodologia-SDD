## Why

El backend de categorías jerárquicas (`categories-crud-hierarchical`) ya está implementado y archivado. El panel de administración carece de una interfaz para gestionar categorías: los administradores no pueden crear, editar ni eliminar categorías desde la UI, lo que bloquea la operación del catálogo. Este change cierra esa brecha entregando la página `/admin/categorias` con CRUD completo.

## What Changes

- Nueva página `CategoriesPage` en `/admin/categorias` con búsqueda en tiempo real
- Nuevo componente `CategoriesTable` — tabla expandible con subcategorías anidadas, indentación visual por nivel (`pl-6` × depth) y botón ▶/▼ para expandir/colapsar
- Nuevo componente `CategoryEditModal` — modal create/edit con campos nombre, descripción y `categoria_padre_id` (select de categorías existentes como opciones de padre)
- Nuevo componente `CategoryDeleteModal` — modal de confirmación con preview de subcategorías afectadas (cascade) antes de confirmar el borrado
- Cuatro custom hooks TanStack Query v5: `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`
- Tipos TypeScript en `features/categories/types/index.ts` y constantes en `features/categories/constants/index.ts`
- Registro de la ruta `/admin/categorias` en el router

## Capabilities

### New Capabilities

- `admin-categories-management-ui`: Interfaz de administración de categorías jerárquicas — tabla expandible, CRUD completo con modales, búsqueda y preview de cascada al eliminar.

### Modified Capabilities

<!-- Sin cambios de requisitos en specs existentes. La spec categories-crud cubre el contrato backend que este change consume. -->

## Impact

- **Frontend**: nueva feature `features/categories/` (components, hooks, types, constants); nueva página `pages/CategoriesPage.tsx`; actualización del router
- **Backend**: ninguno — consume los endpoints ya existentes en `/api/v1/categorias`
- **Dependencias**: sin instalaciones nuevas (TanStack Query v5, Zustand v5 y lucide-react ya instalados)
- **Routing**: agrega entrada `/admin/categorias` → `<CategoriesPage>` protegida con rol ADMIN
