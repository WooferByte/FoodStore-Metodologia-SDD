## Context

Food Store ya tiene implementado el backend completo de productos (`backend/productos/`) con endpoints para CRUD, gestión de categorías e ingredientes. El frontend tiene un catálogo público de productos (`features/products/`) pero no tiene interfaz admin. Existen dos páginas admin CRUD como referencia de patrón: `admin-users-management-ui` y `admin-categories-management-ui` (ya archivadas).

El backend expone:
- `GET /api/v1/productos/` — paginado con `?page=1&size=20`, búsqueda `?q=pizza`, filtro `?categoria_id=3`, exclusión de alérgenos `?excluirAlergenos=1,3`
- `POST /api/v1/productos/` — crear producto (requiere STOCK/ADMIN)
- `PUT /api/v1/productos/{id}` — actualizar producto (parcial, campos opcionales)
- `DELETE /api/v1/productos/{id}` — soft-delete (requiere STOCK/ADMIN)
- `PATCH /api/v1/productos/{id}/stock` — actualizar stock
- `PUT /api/v1/productos/{id}/categorias` — reemplazar categorías (full replacement)
- `PUT /api/v1/productos/{id}/ingredientes` — reemplazar ingredientes con `es_removible`

El `ProductoResponse` incluye `categorias: CategoriaCompacta[]` e `ingredientes: IngredienteCompacto[]` con sus asociaciones.

El frontend usa React 18, TypeScript strict, Tailwind v4 (CSS-first, sin `tailwind.config.ts`), Zustand v5 para estado cliente, TanStack Query v5 para estado servidor, y FSD (`Pages → Features → Shared`). Los componentes shared (`Button`, `Input`, `Modal`, `Badge`, `Skeleton`) y la utilidad `cn()` ya existen en `shared/components/ui/`.

## Goals / Non-Goals

**Goals:**
- Proveer una página admin `/admin/productos` con tabla responsive paginada (server-side), filtros por nombre, categoría, disponibilidad
- Modal de crear/editar producto con todos los campos del schema: nombre, descripción, precio, stock, imagen URL, disponible (toggle), categorías (multi-select), ingredientes (checkboxes con es_removible toggle)
- Modal de confirmación de eliminación con manejo de error 409 (producto en pedidos activos)
- Skeleton loading, empty state, error state en todos los componentes
- Escribir tests unitarios con vitest para hooks, constantes, y componentes clave
- Seguir exactamente el mismo patrón que `admin-categories-management-ui` y `admin-users-management-ui`

**Non-Goals:**
- Edición masiva (bulk edit) de productos — cada producto se edita individualmente
- Import/export CSV/Excel
- Historial de cambios del producto (audit trail) — el backend no expone endpoint
- Vista de producto descontinuado (soft-delete recovery)
- Integración con @tanstack/react-form — usar useState local como en los modales existentes

## Decisions

### D1: Paginación server-side con TanStack Query `placeholderData: keepPreviousData`

**Decision**: El hook `useAdminProducts` recibe `{ q, categoriaId, disponible, page }` como parámetros de queryKey y usa `placeholderData: keepPreviousData` para evitar el flash de contenido al cambiar de página o filtro.

**Rationale**: El endpoint `GET /api/v1/productos/` ya soporta paginación server-side con `page` y `size`. La experiencia de usuario mejora significativamente mostrando los datos anteriores mientras se carga la nueva página. El mismo patrón se usa en `useAdminUsers`.

### D2: Filtros en Zustand v5 (no en URL search params)

**Decision**: Crear `productsAdminFiltersStore` (Zustand v5) con estado `{ q: string, categoriaId: number | null, disponible: string, page: number }`. Las acciones `setQ`, `setCategoriaId`, `setDisponible` resetean `page` a 1. Sin persist middleware.

**Rationale**: Misma decisión que `usersFiltersStore.ts`. Los filtros son estado cliente puro. El reset a página 1 evita mostrar paginación inconsistente. Sin persist porque los filtros admin no necesitan sobrevivir al refresh.

### D3: Multi-select de categorías e ingredientes como reemplazo completo (PUT full replacement)

**Decision**: El formulario de producto envía las categorías como array de IDs (`categoria_ids: number[]`) vía `PUT /api/v1/productos/{id}/categorias` y los ingredientes como array de `{ ingrediente_id: number, es_removible: boolean }` vía `PUT /api/v1/productos/{id}/ingredientes`. Ambos son full replacement atómico.

**Rationale**: El backend no expone endpoints para agregar/remover categorías o ingredientes individualmente (excepto DELETE individual, que no se usa en este flujo). El full replacement es atómico (DELETE + INSERT dentro de la misma transacción) y evita lógica compleja de diff en el frontend. El formulario carga todas las categorías e ingredientes disponibles al abrirse, y el usuario selecciona los que corresponden.

### D4: Eliminación con 409 handling inline (sin toast)

**Decision**: `useDeleteProduct` captura el error 409 del backend y lo propaga como error de la mutación. El `ProductDeleteModal` muestra el mensaje inline (igual que `CategoryDeleteModal`). El modal no se cierra automáticamente en error.

**Rationale**: El backend retorna 409 con RFC 7807 cuando el producto tiene pedidos activos asociados. Mostrar el error en el modal permite al usuario leerlo y tomar acción (por ejemplo, desactivar el producto en lugar de eliminarlo). El patrón es idéntico al de `CategoryDeleteModal`.

### D5: Tabla responsive: tabla semántica en desktop, cards en mobile

**Decision**: Mismo patrón que `UsersTable` y `CategoriesTable`. Desktop (`md:`) muestra `<table>` con columnas. Mobile (`< md`) muestra `<article>` cards. Skeleton rows en desktop, skeleton cards en mobile.

**Rationale**: Consistencia visual con el resto del admin. Tailwind v4 `md:` breakpoint. Los datos de producto (nombre, precio, stock, categorías) se adaptan bien a ambos formatos.

### D6: Formulario de producto como modal, no como página separada

**Decision**: Crear y editar comparten el mismo `ProductFormModal` con prop `product?: Product`. Si no se pasa producto, es creación; si se pasa, es edición. Mismo patrón que `CategoryEditModal`.

**Rationale**: Consistencia con el patrón existente. Los campos son los mismos en create y update. El modal evita navegación adicional. Según el dashboard-crud-page skill, el modal es el patrón recomendado para CRUD admin con pocos campos.

### D7: Debounce de búsqueda en el hook, no en el componente

**Decision**: `useAdminProducts` recibe `q` directamente y aplica debounce interno de 300ms antes de pasarlo a la queryKey y al API call. El store de Zustand refleja inmediatamente lo que el usuario escribe.

**Rationale**: Misma decisión D3 de `admin-users-management-ui`. Mantiene el componente dumb y hace el debounce testable en aislamiento.

## Risks / Trade-offs

- **Risk: Multi-select de categorías/ingredientes con muchos items** → Si hay más de 50 categorías o ingredientes, el multi-select se vuelve difícil de usar. Mitigación: agregar search dentro del multi-select dropdown. Si el rendimiento es problema, considerar virtualización.
- **Risk: Full replacement de categorías/ingredientes pierde asociaciones si el PUT falla** → El backend lo maneja como transacción atómica (DELETE + INSERT en misma sesión, UoW hace commit o rollback). Si falla, ninguna asociación se pierde.
- **Risk: Error 409 en delete no es claro para el usuario** → El mensaje del backend sigue RFC 7807. Mostrarlo inline con `role="alert"` es suficiente. Si el mensaje es genérico, el frontend puede mejorarlo del lado cliente.
- **Risk: Creación de producto sin categorías ni ingredientes** → Ambos campos son opcionales en el formulario. El backend acepta arrays vacíos para ambas asociaciones. UX: mostrar hint "Sin categorías" / "Sin ingredientes" si está vacío.
- **Risk: Categorías/ingredientes cambian mientras el modal está abierto** → No hay tiempo real. Si el usuario abre el modal y otro admin agrega una categoría, no la verá hasta que cierre y reabra el modal. Aceptable para el caso de uso.

## Migration Plan

1. Crear `features/products/admin/constants/index.ts` — API paths, query keys
2. Crear `features/products/admin/types/index.ts` — interfaces de filtros, form data
3. Crear `features/products/admin/hooks/useAdminProducts.ts` — hook TanStack Query con paginación server-side + debounce
4. Crear `features/products/admin/hooks/useCreateProduct.ts` — mutation POST
5. Crear `features/products/admin/hooks/useUpdateProduct.ts` — mutation PUT
6. Crear `features/products/admin/hooks/useDeleteProduct.ts` — mutation DELETE con 409 handling
7. Crear `features/products/admin/hooks/useSetProductCategories.ts` — mutation PUT categorias
8. Crear `features/products/admin/hooks/useSetProductIngredients.ts` — mutation PUT ingredientes
9. Crear `features/products/admin/hooks/useAllCategories.ts` — query GET /api/v1/categorias
10. Crear `features/products/admin/hooks/useAllIngredients.ts` — query GET /api/v1/ingredientes
11. Crear `store/productsAdminFiltersStore.ts` — Zustand v5 store para filtros
12. Crear `AdminProductsTable.tsx` — tabla responsive + skeleton + empty state
13. Crear `ProductFormModal.tsx` — modal crear/editar con todos los campos + multi-select
14. Crear `ProductDeleteModal.tsx` — modal confirmación con 409 handling
15. Crear `pages/AdminProductsPage.tsx` — página que conecta todo
16. Modificar `Router.tsx` — agregar ruta lazy-loaded para `/admin/productos`
17. Escribir tests unitarios (vitest)
18. Ejecutar `npx vitest run` + `npm run lint` + `npm run build`

**Rollback**: Revertir el cambio en `Router.tsx`. Eliminar los archivos nuevos en `features/products/admin/` y `pages/AdminProductsPage.tsx`. No hay cambios en backend, migraciones, ni dependencias.

## Open Questions

- ¿El endpoint `GET /api/v1/categorias` devuelve categorías activas o todas? → Asumimos activas (eliminado_en IS NULL), consistente con el catálogo público. Verificar durante implementación.
- ¿El endpoint `GET /api/v1/ingredientes` existe y devuelve ingredientes activos? → Asumimos sí, consistente con el módulo `ingredientes/`. Verificar durante implementación.
- ¿El seed de datos tiene suficientes productos, categorías e ingredientes para probar? → Si no, crear data de prueba manual para validar filtros, paginación y multi-select.
