# Tasks: admin-ingredients-management-ui

## 0. Skills

- [x] 0.1 Leer `.agents/skills/python-fastapi-ddd-skill/SKILL.md` — entender contrato del backend (modelo Ingrediente, endpoints CRUD)
- [x] 0.2 Leer `.agents/skills/tailwind-design-system/SKILL.md` — estilos de componentes, badges, variantes
- [x] 0.3 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — patrones de performance React, memoización
- [x] 0.4 Leer `.agents/skills/dashboard-crud-page/SKILL.md` — patrones de página admin CRUD (evaluar aplicabilidad al proyecto FSD)

## 1. Feature Scaffold

- [x] 1.1 Crear estructura de carpetas `features/ingredients/admin/` con types, constants, hooks, components
- [x] 1.2 Definir `features/ingredients/admin/types/index.ts` — `IngredientFilters`, `IngredientFormData`
- [x] 1.3 Definir `features/ingredients/admin/constants/index.ts` — query keys, API paths, stale time
- [x] 1.4 Crear store Zustand `store/ingredientsFiltersStore.ts` — estado de filtro es_alergeno

## 2. Hooks (TanStack Query)

- [x] 2.1 Implementar `useAdminIngredients(filters)` — `GET /api/v1/ingredientes`, soporta `?es_alergeno=true|false`
- [x] 2.2 Implementar `useCreateIngredient()` — `POST /api/v1/ingredientes`, maneja 409 unique name
- [x] 2.3 Implementar `useUpdateIngredient()` — `PUT /api/v1/ingredientes/{id}`, maneja 409 unique name
- [x] 2.4 Implementar `useDeleteIngredient()` — `DELETE /api/v1/ingredientes/{id}`, maneja 409 active products
- [x] 2.5 Crear barrel export `features/ingredients/admin/hooks/index.ts`

## 3. Components

- [x] 3.1 Implementar `IngredientsTable.tsx` — tabla responsive: nombre, es_alergeno (badge), acciones. Filtro es_alergeno. Estados: loading, error, empty
- [x] 3.2 Implementar `IngredientFormModal.tsx` — modal crear/editar: nombre + toggle es_alergeno. Precarga en edición. Maneja 409 inline
- [x] 3.3 Implementar `IngredientDeleteModal.tsx` — confirmación soft-delete con manejo de error 409

## 4. Page & Routing

- [x] 4.1 Implementar `pages/AdminIngredientsPage.tsx` — página lazy-loaded integrando store, hooks, componentes
- [x] 4.2 Agregar ruta en `app/Router.tsx` bajo `ProtectedRoute` con roles `['STOCK', 'ADMIN']`
- [x] 4.3 Agregar link "Ingredientes" en sidebar con icono `Wheat` de lucide-react

## 5. Tests

- [x] 5.1 Escribir tests para `useAdminIngredients` (fetch, filter, loading, error)
- [x] 5.2 Escribir tests para `useCreateIngredient` (create success, 409 error)
- [x] 5.3 Escribir tests para `useUpdateIngredient` (update success, 409 error)
- [x] 5.4 Escribir tests para `useDeleteIngredient` (delete success, 409 error)
- [x] 5.5 Escribir tests para `IngredientsTable` (render, filter, loading, empty, mobile)
- [x] 5.6 Escribir tests para `IngredientFormModal` (create, edit, validation, 409)
- [x] 5.7 Escribir tests para `IngredientDeleteModal` (confirm, 409 guard)
- [x] 5.8 Escribir tests para `ingredientsFiltersStore` (setter, reset)
