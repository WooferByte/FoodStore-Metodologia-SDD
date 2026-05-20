## 0. Skills

- [ ] 0.1 Leer `.agents/skills/tailwind-design-system/SKILL.md` — Tailwind v4: tokens, variantes, clases responsive para tabla expandible y cards mobile
- [ ] 0.2 Leer `.agents/skills/ui-design-system/SKILL.md` — ARIA, accesibilidad WCAG, focus trap en modales, atributos aria-expanded/aria-controls
- [ ] 0.3 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — Performance React: useMemo, evitar re-renders, lazy loading de la página
- [ ] 0.4 Leer `.agents/skills/zustand-state-management/README.md` — Zustand v5: sintaxis create<T>()(), selectores, evitar duplicación con TanStack Query
- [ ] 0.5 Leer `.agents/skills/frontend-state-management/SKILL.md` — Decisión Zustand vs TanStack Query para estado de expansión vs datos del servidor
- [ ] 0.6 Leer `.agents/skills/testing-e2e-playwright/SKILL.md` — Patrones E2E: auth Zustand, guards de ruta, mocks de backend FastAPI
- [ ] 0.7 Leer `.agents/skills/dashboard-crud-page/SKILL.md` — Patrón CRUD admin: estructura de página, TanStack Query, modales, tabla con acciones
- [ ] 0.8 Leer `.agents/skills/post-change-verification/SKILL.md` — Checklist health check: vitest, tsc, build antes de archivar

## 1. Tipos y Constantes

- [ ] 1.1 Crear `frontend/src/features/categories/types/index.ts` — interfaz `Category` con campos `id`, `nombre`, `descripcion`, `categoria_padre_id`, `depth`, `activa`, `creado_en`; tipos `CreateCategoryPayload` y `UpdateCategoryPayload`
- [ ] 1.2 Crear `frontend/src/features/categories/constants/index.ts` — `CATEGORIES_QUERY_KEY`, `CATEGORIES_STALE_TIME` (60 000), `CATEGORIES_API_PATH` (`/api/v1/categorias`)

## 2. Hooks TanStack Query

- [ ] 2.1 Crear `frontend/src/features/categories/hooks/useCategories.ts` — `useQuery` con `queryKey: [CATEGORIES_QUERY_KEY]`, `staleTime: CATEGORIES_STALE_TIME`, `queryFn` GET `/api/v1/categorias` → `Category[]`
- [ ] 2.2 Crear `frontend/src/features/categories/hooks/useCreateCategory.ts` — `useMutation` POST `/api/v1/categorias`, `onSuccess` invalida `[CATEGORIES_QUERY_KEY]`
- [ ] 2.3 Crear `frontend/src/features/categories/hooks/useUpdateCategory.ts` — `useMutation` PUT `/api/v1/categorias/{id}`, `onSuccess` invalida `[CATEGORIES_QUERY_KEY]`
- [ ] 2.4 Crear `frontend/src/features/categories/hooks/useDeleteCategory.ts` — `useMutation` DELETE `/api/v1/categorias/{id}`, captura 409 con mensaje específico, `onSuccess` invalida `[CATEGORIES_QUERY_KEY]`

## 3. Componente CategoriesTable

- [ ] 3.1 Crear `frontend/src/features/categories/components/CategoriesTable.tsx` — recibe `categories: Category[]` (lista plana), `onEdit(c: Category): void`, `onDelete(c: Category): void`
- [ ] 3.2 Implementar construcción del árbol con `useMemo`: `Map<id, Category>` para lookup, raíces = `categoria_padre_id === null`, hijos agrupados por padre
- [ ] 3.3 Implementar estado de expansión: `expandedIds: Set<number>` con `useState`, función `toggleExpand(id: number)`
- [ ] 3.4 Implementar columnas de tabla: nombre (con indentación `pl-6 * depth`), descripción, profundidad, estado (badge activa/inactiva), acciones (Editar, Eliminar)
- [ ] 3.5 Implementar botón toggle ▶/▼ con `aria-expanded`, `aria-controls` apuntando a `id="subcats-{id}"`, `aria-label` descriptivo; ocultar si no tiene hijos
- [ ] 3.6 Implementar vista responsive: tabla `hidden md:table` (desktop), cards `md:hidden` (mobile) con subcategorías indentadas bajo su padre
- [ ] 3.7 Agregar skeleton loading: cuando `isLoading` se muestran filas skeleton de 5 items con `animate-pulse`
- [ ] 3.8 Agregar estado vacío: cuando `categories.length === 0` mostrar mensaje "No se encontraron categorías"

## 4. Componente CategoryEditModal

- [ ] 4.1 Crear `frontend/src/features/categories/components/CategoryEditModal.tsx` — props: `isOpen`, `onClose`, `onSuccess`, `category?: Category` (si se pasa → modo edit, sino → create), `allCategories: Category[]`
- [ ] 4.2 Implementar campos: Input `nombre` (requerido, validación client-side), Textarea `descripcion` (opcional), Select `categoria_padre_id` con opción "Sin padre (categoría raíz)" como valor vacío
- [ ] 4.3 En modo edición: precargar valores del `category` recibido; filtrar del select la categoría que se está editando (no puede ser su propio padre)
- [ ] 4.4 En submit: traducir `""` → `null` para `categoria_padre_id`; llamar `useCreateCategory` o `useUpdateCategory` según modo; mostrar error inline si falla; cerrar modal y llamar `onSuccess` si OK
- [ ] 4.5 Implementar accesibilidad: `role="dialog"`, `aria-labelledby`, focus trap (Tab/Shift+Tab ciclan dentro del modal), foco inicial en input nombre al abrir

## 5. Componente CategoryDeleteModal

- [ ] 5.1 Crear `frontend/src/features/categories/components/CategoryDeleteModal.tsx` — props: `isOpen`, `onClose`, `onSuccess`, `category: Category | null`, `allCategories: Category[]`
- [ ] 5.2 Implementar preview de cascade: filtrar de `allCategories` los hijos directos (`categoria_padre_id === category.id`) y mostrar sus nombres en lista
- [ ] 5.3 Implementar mensaje de confirmación: "¿Eliminar la categoría `{nombre}`?" + lista de subcategorías afectadas si las hay
- [ ] 5.4 En submit: llamar `useDeleteCategory`; si respuesta es 409 mostrar error "No se puede eliminar: la categoría tiene productos activos" dentro del modal sin cerrarlo; si OK cerrar y llamar `onSuccess`
- [ ] 5.5 Implementar accesibilidad: `role="dialog"`, `aria-labelledby`, focus trap, foco inicial en botón Cancelar

## 6. Página CategoriesPage

- [ ] 6.1 Crear `frontend/src/pages/CategoriesPage.tsx` — importa hooks y componentes de `@/features/categories/`
- [ ] 6.2 Implementar estado de búsqueda: `useState<string>` local para `query`; filtrar lista plana de `useCategories` por `nombre.toLowerCase().includes(query.toLowerCase())`
- [ ] 6.3 Pasar la lista filtrada a `CategoriesTable` (cuando hay query → lista plana filtrada; cuando no hay query → lista completa con vista árbol)
- [ ] 6.4 Implementar estado modal: `useState` para `editCategory: Category | null`, `deleteCategory: Category | null`, `isEditOpen: boolean`, `isDeleteOpen: boolean`
- [ ] 6.5 Agregar botón "Nueva Categoría" (lucide `Plus`) en el header de la página; al hacer clic abrir `CategoryEditModal` con `category={undefined}` (modo create)
- [ ] 6.6 Conectar `onEdit` → abrir `CategoryEditModal` con la categoría seleccionada; `onDelete` → abrir `CategoryDeleteModal` con la categoría seleccionada
- [ ] 6.7 Agregar `<title>Gestión de Categorías | Food Store Admin</title>` y meta descripción

## 7. Routing

- [ ] 7.1 Abrir el archivo del router (`frontend/src/shared/routing/Router.tsx` o equivalente) y agregar entrada lazy-loaded: `const CategoriesPage = React.lazy(() => import('@/pages/CategoriesPage'))`
- [ ] 7.2 Registrar ruta `/admin/categorias` dentro del `ProtectedRoute` con rol ADMIN, renderizando `<CategoriesPage>`
- [ ] 7.3 Verificar que la ruta `/admin/categorias` sea accesible desde la navegación del admin (si existe un sidebar/nav, agregar el link con icono `Tag` de lucide-react)

## 8. Tests Unitarios

- [ ] 8.1 Crear `frontend/src/features/categories/hooks/__tests__/useCategories.test.ts` — test que mockea `apiClient.get` y verifica que retorna `Category[]`; test que verifica `staleTime: 60_000`
- [ ] 8.2 Crear `frontend/src/features/categories/hooks/__tests__/useCreateCategory.test.ts` — test que verifica POST a la URL correcta e invalidación del queryKey al éxito
- [ ] 8.3 Crear `frontend/src/features/categories/hooks/__tests__/useDeleteCategory.test.ts` — test que verifica que el error 409 se captura y expone mensaje específico
- [ ] 8.4 Crear `frontend/src/features/categories/constants/__tests__/constants.test.ts` — test que verifica valores de constantes exportadas (queryKey, staleTime, apiPath)

## 9. Verificación Post-Change

- [ ] 9.1 Ejecutar `npx tsc --noEmit` desde `frontend/` — debe terminar sin errores
- [ ] 9.2 Ejecutar `npx vitest run` desde `frontend/` — todos los tests deben pasar, coverage ≥ 40%
- [ ] 9.3 Ejecutar `npm run build` desde `frontend/` — debe compilar sin errores (warnings de chunk size son OK)
- [ ] 9.4 Verificar manualmente: levantar backend + frontend, navegar a `/admin/categorias`, crear una categoría raíz, crear una subcategoría, editarla, buscar por nombre, intentar eliminar una con hijos (ver preview), confirmar eliminación
- [ ] 9.5 Verificar accesibilidad: Tab a través de la tabla expandible, verificar aria-expanded al toggle, abrir modal y verificar focus trap
