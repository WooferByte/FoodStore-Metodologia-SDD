# Design: admin-ingredients-management-ui

## Context

El backend ya expone CRUD completo en `GET/POST/PUT/DELETE /api/v1/ingredientes/`, protegido por roles `STOCK` | `ADMIN`. Los endpoints están operativos con soft-delete, validación unique de nombre, y guard de integridad referencial (409 si el ingrediente está en productos activos). El frontend ya tiene 4 admin CRUDs implementados (products, categories, users, stock) que sirven como patrón.

## Goals / Non-Goals

**Goals:**
- CRUD completo de ingredientes en el panel admin (`/admin/ingredientes`)
- Tabla con columnas: nombre, es_alergeno (badge), acciones (editar, eliminar)
- Filtro por es_alergeno (todos, solo alérgenos, solo no alérgenos)
- Modal de crear/editar con nombre + toggle es_alergeno
- Confirmación de soft-delete con manejo de error 409
- Invalidación cruzada con catálogo público

**Non-Goals:**
- NO crear nuevos endpoints backend (todo existe)
- NO incluir búsqueda por nombre backend (la lista de ingredientes es pequeña, se puede filtrar client-side si es necesario)
- NO incluir paginación server-side con total count (si se necesita en el futuro, se agrega al backend)

## Architecture

```
AdminIngredientsPage.tsx
├── useAdminIngredients(filters)        → GET /api/v1/ingredientes
├── useCreateIngredient()               → POST /api/v1/ingredientes
├── useUpdateIngredient()               → PUT /api/v1/ingredientes/{id}
├── useDeleteIngredient()               → DELETE /api/v1/ingredientes/{id}
├── useIngredientsFiltersStore()        ← Zustand (es_alergeno filter)
│
├── IngredientsTable                    ← Tabla: nombre, es_alergeno (badge), acciones
│
├── IngredientFormModal                 ← Modal crear/editar: nombre + toggle es_alergeno
│
└── IngredientDeleteModal               ← Confirmación soft-delete + error 409
```

### Data Structures

```typescript
interface IngredientFilters {
  es_alergeno: 'all' | 'true' | 'false'
}

interface IngredientFormData {
  nombre: string
  es_alergeno: boolean
}
```

### Store

```typescript
interface IngredientsFiltersState {
  es_alergeno: 'all' | 'true' | 'false'
  setEsAlergeno: (v: string) => void
  reset: () => void
}
```

## File Structure

```
frontend/src/
├── features/
│   └── ingredients/
│       └── admin/
│           ├── types/index.ts
│           ├── constants/index.ts
│           ├── hooks/
│           │   ├── index.ts
│           │   ├── useAdminIngredients.ts
│           │   ├── useCreateIngredient.ts
│           │   ├── useUpdateIngredient.ts
│           │   └── useDeleteIngredient.ts
│           └── components/
│               ├── IngredientsTable.tsx
│               ├── IngredientFormModal.tsx
│               └── IngredientDeleteModal.tsx
├── store/
│   └── ingredientsFiltersStore.ts
├── pages/
│   └── AdminIngredientsPage.tsx
```

## Routing & Navigation

```
Router.tsx:
<Route element={<ProtectedRoute requiredRoles={['STOCK', 'ADMIN']} />}>
  ...
  <Route path="/admin/ingredientes" element={<AdminIngredientsPage />} />
</Route>
```

Sidebar: link "Ingredientes" en sección de productos, icono `Wheat` de lucide-react, roles `STOCK` | `ADMIN`.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Sin paginación server-side con total count** | El GET list solo devuelve array plano sin envelope. Para listas chicas (<100 ingredientes) es aceptable. Si crece, hay que agregar PaginatedResponse al backend. |
| **Unique name conflict** | El backend responde 409. El modal debe mostrar el error inline y no cerrarse. |
| **Delete guard** | Eliminar ingrediente asociado a productos activos → 409. El modal debe mostrar mensaje claro. |
