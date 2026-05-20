## Why

El admin de Food Store ya cuenta con páginas CRUD para usuarios (`/admin/usuarios`) y categorías (`/admin/categorias`), pero no existe una interfaz para gestionar productos desde el panel administrativo. Actualmente, la única forma de crear/editar/eliminar productos es mediante llamadas directas a la API (POST/PUT/DELETE `/api/v1/productos/`). Los administradores de stock necesitan una UI que les permita:

- Listar productos con paginación server-side, filtros por nombre, categoría y disponibilidad
- Crear y editar productos con todos sus campos (nombre, descripción, precio, stock, imagen, categorías, ingredientes)
- Eliminar productos (soft-delete) con manejo de conflictos (409 si tiene pedidos activos)
- Gestionar asociaciones N:M con categorías e ingredientes desde el mismo formulario

Sin esta UI, el equipo de STOCK depende de herramientas externas o del backend directo, lo que ralentiza la operación diaria y aumenta el riesgo de errores de integridad.

## What Changes

- Crear `frontend/src/features/products/admin/hooks/` — hooks TanStack Query v5 para CRUD admin de productos:
  - `useAdminProducts(filters)` — `GET /api/v1/productos/` con paginación, filtro por nombre (q), categoría, disponibilidad
  - `useCreateProduct()` — `POST /api/v1/productos/`
  - `useUpdateProduct()` — `PUT /api/v1/productos/{id}`
  - `useDeleteProduct()` — `DELETE /api/v1/productos/{id}` (soft-delete, maneja 409)
  - `useSetProductCategories()` — `PUT /api/v1/productos/{id}/categorias`
  - `useSetProductIngredients()` — `PUT /api/v1/productos/{id}/ingredientes`
  - `useAllCategories()` — `GET /api/v1/categorias` (para el multi-select en el formulario)
  - `useAllIngredients()` — `GET /api/v1/ingredientes` (para el multi-select en el formulario)

- Crear `frontend/src/features/products/admin/components/`:
  - `AdminProductsTable.tsx` — tabla responsive con skeleton, empty state, columnas: nombre, precio, stock, disponible, categorías, acciones
  - `ProductFormModal.tsx` — modal crear/editar con campos: nombre, descripción, precio, stock, imagen URL, disponible (toggle), categorías (multi-select), ingredientes (checkboxes con es_removible)
  - `ProductDeleteModal.tsx` — modal confirmación con cascade preview (productos en pedidos activos → 409 handling)

- Crear `frontend/src/features/products/admin/constants/index.ts` — query keys, API paths, default values
- Crear `frontend/src/features/products/admin/types/index.ts` — interfaces específicas del admin (ProductFormData, AdminProductFilters, etc.)

- Crear `frontend/src/pages/AdminProductsPage.tsx` — página lazy-loaded que conecta hooks + componentes, maneja estado de búsqueda con Zustand (como `usersFiltersStore.ts`) y paginación server-side

- Modificar `frontend/src/app/Router.tsx` — agregar ruta lazy-loaded `/admin/productos` con `ProtectedRoute` para roles `['STOCK', 'ADMIN']`, reemplazando el placeholder actual que renderiza `Admin` (dashboard)

## Capabilities

### New Capabilities

- `admin-products-list`: tabla paginada server-side con filtros por nombre, categoría, disponibilidad; skeleton loading, empty state, error state
- `admin-products-create`: modal de creación con formulario completo + multi-select de categorías e ingredientes
- `admin-products-edit`: modal de edición con los mismos campos, precargados desde el producto existente
- `admin-products-delete`: confirmación de soft-delete con manejo de error 409 (producto en pedidos activos)

### Modified Capabilities

- `frontend-routing`: la ruta `/admin/productos` cambia de renderizar `Admin` (dashboard) a renderizar `AdminProductsPage`
- `frontend-products-feature`: se agrega sub-carpeta `admin/` dentro de `features/products/` — no rompe los componentes existentes del catálogo público

## Impact

- **Files modified**: `frontend/src/app/Router.tsx` (1 ruta)
- **Files added**: ~15 archivos en `features/products/admin/` + `pages/AdminProductsPage.tsx` + tests
- **Dependencies**: Ninguna nueva — TanStack Query v5, Zustand v5, Axios, lucide-react ya instalados
- **Breaking changes**: Ninguno — el catálogo público de productos sigue intacto
- **FSD layer**: `pages/` → `features/products/admin/` → `shared/` — todo dentro de FSD estricto
