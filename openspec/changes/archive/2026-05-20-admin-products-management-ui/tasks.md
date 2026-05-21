## 0. Skills

- [ ] 0.1 Leer `.agents/skills/python-fastapi-ddd-skill/SKILL.md` — entender schemas de productos, endpoints, y flujo Router → Service → UoW → Repository
- [ ] 0.2 Leer `.agents/skills/tailwind-design-system/SKILL.md` — tokens @theme Tailwind v4, clases semánticas, responsive design, dark mode
- [ ] 0.3 Leer `.agents/skills/ui-design-system/SKILL.md` — accesibilidad WCAG AA, patrones de modales con <dialog>, keyboard navigation
- [ ] 0.4 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — TanStack Query v5 cache patterns, code splitting lazy(), React.memo, useCallback
- [ ] 0.5 Leer `.agents/skills/dashboard-crud-page/SKILL.md` — patrón CRUD admin: tabla responsive + modal formulario + modal delete + filtros
- [ ] 0.6 Leer `.agents/skills/zustand-state-management/README.md` — Zustand v5 create<T>()(), selectores granulares, stores sin persist
- [ ] 0.7 Leer `.agents/skills/frontend-state-management/SKILL.md` — separación Zustand (cliente) vs TanStack Query (servidor), no duplicación
- [ ] 0.8 Leer `.agents/skills/testing-e2e-playwright/SKILL.md` — patrones de testing E2E para flujos CRUD admin con autenticación JWT
- [ ] 0.9 Leer `.agents/skills/post-change-verification/SKILL.md` — health check post-change: tsc, vitest, build

## 1. Types y Constants

- [ ] 1.1 Crear `frontend/src/features/products/admin/types/index.ts` — interfaces:
  - `AdminProductFilters` — `{ q, categoriaId, disponible, page }`
  - `ProductFormData` — `{ nombre, descripcion, precio_base, stock_cantidad, disponible, imagen_url, categoria_ids, ingredientes }`
  - `AdminProductsListResponse` — `{ items: Product[], total, page, size, pages }`
  - `IngredientFormItem` — `{ ingrediente_id: number, es_removible: boolean }`
- [ ] 1.2 Crear `frontend/src/features/products/admin/constants/index.ts`:
  - `ADMIN_PRODUCTS_QUERY_KEY`, `ADMIN_PRODUCTS_STALE_TIME`
  - `PRODUCTS_API_PATH`, `CATEGORIES_API_PATH`, `INGREDIENTS_API_PATH`
  - `PAGE_SIZE`, `SEARCH_DEBOUNCE_DELAY`

## 2. Filtros store (Zustand)

- [ ] 2.1 Crear `frontend/src/store/productsAdminFiltersStore.ts` — Zustand v5 store:
  - Estado: `q: string`, `categoriaId: number | null`, `disponible: string` ("all" | "true" | "false"), `page: number`
  - Acciones: `setQ`, `setCategoriaId`, `setDisponible` (resetean page a 1), `setPage`, `reset`
  - Sin persist middleware (misma decisión que `usersFiltersStore.ts`)

## 3. Hooks TanStack Query

- [ ] 3.1 Crear `frontend/src/features/products/admin/hooks/useAdminProducts.ts`:
  - `useAdminProducts(filters: AdminProductFilters)` — `GET /api/v1/productos/?page=&size=&q=&categoria_id=&disponible=`
  - Debounce interno de 300ms en q (misma decisión que `useAdminUsers`)
  - `placeholderData: keepPreviousData`, `staleTime: 60000`
  - Retorna `AdminProductsListResponse`
- [ ] 3.2 Crear `frontend/src/features/products/admin/hooks/useCreateProduct.ts`:
  - `useCreateProduct()` — `POST /api/v1/productos/`
  - Invalida `ADMIN_PRODUCTS_QUERY_KEY` en onSuccess
- [ ] 3.3 Crear `frontend/src/features/products/admin/hooks/useUpdateProduct.ts`:
  - `useUpdateProduct()` — `PUT /api/v1/productos/{id}`
  - Invalida `ADMIN_PRODUCTS_QUERY_KEY` en onSuccess
- [ ] 3.4 Crear `frontend/src/features/products/admin/hooks/useDeleteProduct.ts`:
  - `useDeleteProduct()` — `DELETE /api/v1/productos/{id}`
  - Captura error 409 y lo propaga como `{ status: 409, message }`
  - Invalida `ADMIN_PRODUCTS_QUERY_KEY` en onSuccess
- [ ] 3.5 Crear `frontend/src/features/products/admin/hooks/useSetProductCategories.ts`:
  - `useSetProductCategories()` — `PUT /api/v1/productos/{id}/categorias`
  - Body: `{ categoria_ids: number[] }`
- [ ] 3.6 Crear `frontend/src/features/products/admin/hooks/useSetProductIngredients.ts`:
  - `useSetProductIngredients()` — `PUT /api/v1/productos/{id}/ingredientes`
  - Body: `{ ingredientes: IngredientFormItem[] }`
- [ ] 3.7 Crear `frontend/src/features/products/admin/hooks/useAllCategories.ts`:
  - `useAllCategories()` — `GET /api/v1/categorias`
  - Usar `CATEGORIES_QUERY_KEY` existente de `features/categories/constants`
  - `staleTime: 120000` (2 min — cambian poco)
- [ ] 3.8 Crear `frontend/src/features/products/admin/hooks/useAllIngredients.ts`:
  - `useAllIngredients()` — `GET /api/v1/ingredientes`
  - `staleTime: 120000`
- [ ] 3.9 Crear `frontend/src/features/products/admin/hooks/index.ts` — barrel export

## 4. ProductTable componente

- [ ] 4.1 Crear `frontend/src/features/products/admin/components/AdminProductsTable.tsx`:
  - Props: `products: Product[]`, `isLoading`, `total`, `page`, `totalPages`, `onEdit`, `onDelete`, `onPageChange`
  - Desktop (`hidden md:block`): `<table>` con columnas:
    - Nombre (con imagen thumbnail 32x32 si existe)
    - Precio (`$` formateado con 2 decimales)
    - Stock (con badge de color según nivel: `>10` success, `1-10` warning, `0` destructive)
    - Disponible (Badge success/destructive)
    - Categorías (Badges)
    - Acciones (Pencil, Trash2)
  - Mobile (`md:hidden`): `<article>` cards con misma info en layout vertical
  - Skeleton: `TableSkeletonRows` (5 filas en desktop, 3 cards en mobile)
  - Empty state: "No se encontraron productos" con icono
  - Paginación abajo: botones Anterior/Siguiente + "Página X de Y (Z productos)"
  - Usar `cn()`, `React.memo`, `useCallback`
  - Tokens semánticos Tailwind (sin colores hardcodeados)

## 5. ProductFormModal componente

- [ ] 5.1 Crear `frontend/src/features/products/admin/components/ProductFormModal.tsx`:
  - Props: `isOpen`, `onClose`, `onSuccess`, `product?: Product`, `allCategories`, `allIngredients`
  - Modal con `<dialog>` nativo (mismo patrón que `CategoryEditModal`)
  - Campos del formulario:
    - Nombre (Input, required, min 1 char)
    - Descripción (textarea, opcional)
    - Precio base (Input type number, step 0.01, min 0.01, required)
    - Stock cantidad (Input type number, min 0, required)
    - Imagen URL (Input type url, opcional)
    - Disponible (toggle/checkbox, default true)
    - Categorías (multi-select checkboxes con scroll, search dentro del listado si > 10 categorías)
    - Ingredientes (checkboxes con toggle es_removible al lado de cada uno)
  - Create vs Edit: si `product` es undefined → "Nuevo Producto"; si tiene valor → "Editar Producto" con campos precargados
  - Validación cliente: nombre requerido, precio > 0, stock >= 0
  - On submit: si es creación → `useCreateProduct` + `useSetProductCategories` + `useSetProductIngredients` en secuencia; si es edición → `useUpdateProduct` + mismas asociaciones
  - Errores inline con `role="alert"`
  - Botones: Cancelar + Guardar (con loading state)
  - Focus management: auto-focus en nombre al abrir

## 6. ProductDeleteModal componente

- [ ] 6.1 Crear `frontend/src/features/products/admin/components/ProductDeleteModal.tsx`:
  - Props: `isOpen`, `onClose`, `onSuccess`, `product: Product | null`
  - Mensaje de confirmación: "¿Eliminar {nombre}?"
  - Si el backend retorna 409: mostrar mensaje inline "No se puede eliminar: el producto está en pedidos activos. Desactivá el producto en su lugar."
  - Botón Cancelar + Eliminar (variant destructive, con loading)
  - Mismo patrón que `CategoryDeleteModal`

## 7. ProductsPage

- [ ] 7.1 Crear `frontend/src/pages/AdminProductsPage.tsx`:
  - Lazy-loaded, default export
  - Conecta `productsAdminFiltersStore` (Zustand) + `useAdminProducts` (TanStack Query)
  - State local para modales: `editProduct`, `deleteProduct`, `isEditOpen`, `isDeleteOpen`
  - Handlers: `openCreate`, `openEdit`, `openDelete`, `closeEdit`, `closeDelete`, `handleEditSuccess`, `handleDeleteSuccess`
  - Render: header con título + botón "Nuevo Producto", filtros (search input + categoría select + disponible select), tabla, modales
  - `<title>` y `<meta>` tags (mismo patrón que `CategoriesPage.tsx`)
  - Error state: "Error al cargar los productos. Verificá que el backend esté corriendo."

## 8. Routing

- [ ] 8.1 Modificar `frontend/src/app/Router.tsx`:
  - Agregar `const AdminProductsPage = lazy(() => import('@/pages/AdminProductsPage'))`
  - Cambiar `<Route path="/admin/productos" element={<Admin />} />` a `<Route path="/admin/productos" element={<AdminProductsPage />} />`
  - Ya existe dentro del `ProtectedRoute requiredRoles={['STOCK', 'ADMIN']}`

## 9. Tests unitarios

- [ ] 9.1 Crear `frontend/src/features/products/admin/constants/__tests__/constants.test.ts` — verificar valores de API paths, query keys, PAGE_SIZE
- [ ] 9.2 Crear `frontend/src/features/products/admin/hooks/__tests__/useAdminProducts.test.tsx` — mockear apiClient.get, verificar query params y paginación
- [ ] 9.3 Crear `frontend/src/features/products/admin/hooks/__tests__/useCreateProduct.test.tsx` — mockear POST, verificar invalidación de queries
- [ ] 9.4 Crear `frontend/src/features/products/admin/hooks/__tests__/useDeleteProduct.test.tsx` — mockear DELETE, verificar 409 handling
- [ ] 9.5 Crear `frontend/src/store/__tests__/productsAdminFiltersStore.test.ts` — testear setQ resetea page, setPage no resetea, reset funciona

## 10. Verificación post-change

- [ ] 10.1 Ejecutar `npx tsc --noEmit` — sin errores de TypeScript
- [ ] 10.2 Ejecutar `npx vitest run` — todos los tests pasan (incluye preexistentes)
- [ ] 10.3 Ejecutar `npm run lint` — sin errores
- [ ] 10.4 Ejecutar `npm run build` — build exitoso
