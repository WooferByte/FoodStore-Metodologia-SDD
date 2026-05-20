## Context

El backend de gestión de categorías jerárquicas está completamente operativo (archivado en `categories-crud-hierarchical`). Expone endpoints REST en `/api/v1/categorias` que devuelven una lista plana con los campos `id`, `nombre`, `descripcion`, `categoria_padre_id`, `depth`, `activa` y `creado_en`.

La referencia directa de implementación es `admin-users-management-ui` (`frontend/src/features/users/`, `frontend/src/pages/UsersPage.tsx`): misma arquitectura FSD, misma separación Zustand/TanStack Query, mismos shared components. Las categorías añaden complejidad jerárquica (tabla expandible, select de padre, cascade preview) que no existe en el change de usuarios.

Stack: React 18 + TypeScript strict + Tailwind v4 + TanStack Query v5 + Zustand v5 + lucide-react. Sin dependencias nuevas.

## Goals / Non-Goals

**Goals:**
- Tabla expandible en desktop con subcategorías indentadas (`pl-6` por nivel) y toggle ▶/▼ por fila padre
- CRUD completo: crear categoría raíz o subcategoría, editar nombre/descripción/padre, eliminar con preview de cascade
- Búsqueda client-side que filtra nombre en todas las categorías (raíces y subcategorías)
- Responsive: tabla desktop, cards anidadas mobile
- ARIA completo en tabla expandible (aria-expanded, aria-controls), modales (role=dialog, aria-labelledby, focus trap) y botones icon-only (aria-label)
- Tests unitarios con vitest para hooks y store (≥ 40% coverage frontend)

**Non-Goals:**
- Reordenamiento drag-and-drop de categorías
- Activar/desactivar categorías (campo `activa` es de solo lectura en este change)
- Búsqueda server-side paginada (el endpoint devuelve lista plana completa — filtrado client-side es suficiente)
- Migración Alembic (backend ya implementado, sin cambios de modelo)

## Decisions

### D-01: Estado de expansión de filas — useState local en CategoriesTable

**Decisión**: `expandedIds: Set<number>` en `useState` local dentro de `CategoriesTable`, no en Zustand.

**Rationale**: El estado de qué filas están expandidas es UI efímero, no compartido entre componentes ni persistido. Zustand v5 es para estado cliente compartido (carrito, sesión) o que sobrevive re-renders de componentes distintos. Una heurística de AGENTS.md prohíbe duplicar datos del servidor en Zustand; aquí tampoco hay necesidad de compartir el estado de expansión.

**Alternativa descartada**: Store Zustand `useCategoriesUIStore`. Innecesario — inflaría el store sin beneficio.

### D-02: Datos de categorías — TanStack Query v5 (`useCategories`) con staleTime 60 000 ms

**Decisión**: `useQuery` con `queryKey: ['categories']`, `staleTime: 60_000`. Un solo hook `useCategories` devuelve la lista plana completa; la construcción del árbol visual (agrupación por `categoria_padre_id`) se hace con `useMemo` client-side.

**Rationale**: El backend devuelve lista plana con `depth` y `categoria_padre_id`. La construcción del árbol en el cliente es O(n) con un `Map<id, Category>` y no requiere round-trip adicional. `staleTime: 60_000` evita re-fetches en cada interacción del modal manteniendo frescura aceptable para datos de catálogo.

**Alternativa descartada**: Endpoint árbol anidado del backend. No existe y no está en scope de este change.

### D-03: Búsqueda — filtrado client-side con `useMemo` + `useState` local en CategoriesPage

**Decisión**: Input de búsqueda controlado con `useState<string>` local en `CategoriesPage`. Al buscar, se filtra la lista plana completa por `nombre` (case-insensitive includes), luego `CategoriesTable` recibe la lista filtrada y muestra solo esas filas (sin estructura árbol — modo lista plana cuando hay query activa).

**Rationale**: La lista de categorías es pequeña (decenas a pocos cientos). Filtrado client-side es instantáneo y evita round-trips. Cuando no hay query, se muestra la vista árbol expandible; cuando hay query, se muestra lista plana con todas las coincidencias para facilitar la localización.

**Alternativa descartada**: Debounce + parámetro de búsqueda al backend. Overkill para el volumen esperado.

### D-04: Construcción del árbol visual — groupBy en useMemo dentro de CategoriesTable

**Decisión**: `CategoriesTable` recibe la lista plana `Category[]` y construye internamente el árbol con `useMemo`:
1. `Map<id, Category>` para lookup O(1)
2. Raíces = categorías con `categoria_padre_id === null`
3. Hijos = categorías agrupadas por `categoria_padre_id`

El componente renderiza raíces; cada fila expandida renderiza sus hijos con indentación `pl-6` adicional.

**Rationale**: Mantiene la lógica de presentación en el componente de tabla, donde pertenece. `CategoriesPage` no necesita conocer la estructura árbol — solo pasa la lista filtrada.

### D-05: CategoryEditModal — select de padre con opción "Sin padre (categoría raíz)"

**Decisión**: `<select>` nativo con valor vacío (`""`) para "Sin padre". Al crear, el select parte en `""`. Al editar, precarga el `categoria_padre_id` actual. El hook `useCreateCategory`/`useUpdateCategory` traduce `""` → `null` antes del POST/PUT.

**Rationale**: Select nativo es accesible por defecto (keyboard navigation, screen reader). No requiere dependencia adicional. La traducción `""` → `null` es trivial y mantiene el contrato del backend.

**Alternativa descartada**: Combobox con búsqueda (lucide + popover). Overkill para el volumen esperado de categorías.

### D-06: Delete cascade preview — subcategorías afectadas desde datos locales (sin endpoint específico)

**Decisión**: Al abrir `CategoryDeleteModal`, se filtran de la caché local (`useCategories`) todas las categorías con `categoria_padre_id === id` de la categoría a eliminar (hijos directos). Se muestran sus nombres en el modal. No se hace llamada adicional al backend para obtener el árbol completo de afectados (solo nivel 1 de profundidad en preview).

**Rationale**: El backend devuelve 409 si hay productos activos — ese es el guard real. El preview visual con hijos directos es suficiente para que el administrador entienda el impacto antes de confirmar. Implementar un preview recursivo completo requeriría lógica adicional no especificada en los criterios.

**Alternativa descartada**: Endpoint `GET /api/v1/categorias/{id}/subcategorias` para preview completo. No existe y está fuera de scope.

## Risks / Trade-offs

- **[Riesgo] Backend devuelve 409 al eliminar categoría con productos activos** → El hook `useDeleteCategory` captura el 409 y muestra mensaje de error en el modal antes de cerrar. El usuario ve el error inline, no un toast genérico.
- **[Riesgo] Lista de categorías crece significativamente (> 500 items)** → El filtrado client-side y la construcción del árbol seguirán siendo O(n). Si se detecta latencia visible, se puede agregar virtualización con `@tanstack/react-virtual` sin cambiar la API pública de los componentes.
- **[Trade-off] Preview cascade solo nivel 1** → El administrador ve los hijos directos pero no los nietos. Aceptable dado que el backend es la fuente de verdad para el delete cascade; el preview es informativo, no bloqueante.
- **[Trade-off] Sin persistencia del estado de expansión** → Al re-render (ej. después de una mutación y re-fetch de TanStack Query), las filas colapsan al estado por defecto (todas cerradas). Aceptable para un panel admin donde la interacción es explícita.

## Migration Plan

1. Crear feature `frontend/src/features/categories/` con types, constants, hooks y components
2. Crear página `frontend/src/pages/CategoriesPage.tsx`
3. Registrar ruta `/admin/categorias` en el router (lazy-loaded, ProtectedRoute con rol ADMIN)
4. Verificar: `npx tsc --noEmit` + `npx vitest run` + `npm run build`
5. No hay migración de base de datos ni cambio de backend

**Rollback**: eliminar los archivos creados y la entrada en el router.

## Open Questions

- ¿Se debe mostrar el badge `activa: false` en la tabla para categorías inactivas, o solo se gestionan las activas? → Decisión por defecto: mostrar badge de estado en la columna de acciones para todas las categorías (activa/inactiva), sin cambiar el campo desde este change.
