# Design: admin-stock-management-ui

## Context

El backend ya expone `PATCH /api/v1/productos/{id}/stock` para actualizar stock individualmente, protegido por roles `STOCK` | `ADMIN`. El admin de productos (`admin-products-management-ui`) ya permite CRUD completo, pero no hay una vista dedicada a la gestión rápida de stock. Los encargados de stock (rol `STOCK`) no tienen una interfaz propia — necesitan navegar a productos y editar uno por uno.

## Goals / Non-Goals

**Goals:**
- Vista dedicada de stock en el panel admin (`/admin/stock`) accesible con rol `STOCK` | `ADMIN`
- Tabla de productos con stock actual, búsqueda, y filtro por disponibilidad
- Modal para actualizar stock_cantidad y toggle disponible
- Invalidación cruzada de caché con el resto del ecosistema de productos
- Seguir el mismo patrón FSD de los admin CRUDs existentes (products, categories, users)

**Non-Goals:**
- NO crear nuevos endpoints backend (todo existe)
- NO reemplazar el CRUD de productos existente
- NO incluir ajustes masivos de stock (CSV, bulk) — eso sería un cambio futuro
- NO incluir historial de cambios de stock (audit trail sería un cambio separado)

## Decisions

### Decisión 1: Feature folder separada vs. extender products/admin/

**Decisión**: Feature folder separada `features/stock/admin/`

**Alternativa considerada**: Agregar un modal de stock rápido dentro de `features/products/admin/`

**Razón**: El rol `STOCK` es un permiso independiente. Tener una feature separada respeta FSD y permite que alguien con rol `STOCK` acceda SOLO a stock sin tener permisos sobre productos completos. Además, la página de stock tiene un propósito distinto (solo visualizar + actualizar stock) vs. el CRUD completo de productos.

### Decisión 2: Hook de listado propio vs. reutilizar `useAdminProducts`

**Decisión**: Hook propio `useAdminStockProducts` que internamente llama al mismo endpoint `GET /api/v1/productos` pero con query keys separadas (`['admin-stock-products', filters]`)

**Alternativa considerada**: Reutilizar `useAdminProducts` directamente

**Razón**: Aunque el endpoint es el mismo, las query keys deben ser independientes para que la invalidación de caché de stock no afecte la tabla de productos y viceversa. Si compartieran query keys, cambiar stock refrescaría la tabla de productos, y cambiar un producto refrescaría la tabla de stock. Con keys separadas cada cache vive su propia vida y la invalidación es más precisa.

### Decisión 3: Store de filtros propia

**Decisión**: Store Zustand `stockFiltersStore` separada (no reutilizar `productsAdminFiltersStore`)

**Razón**: Misma lógica que la decisión 2 — los filtros de stock (nombre, disponible, página) son conceptualmente distintos. Si se compartiera la store, navegar a productos cambiaría la página de stock y viceversa.

### Decisión 4: Modal de edición inline vs. inline edit

**Decisión**: Modal `StockEditModal` siguiendo el patrón de `ProductFormModal` pero simplificado (solo stock_cantidad + disponible toggle)

**Alternativa considerada**: Edición inline en la tabla (input directo en la celda)

**Razón**: Consistencia con los patrones existentes del admin. El modal permite validación, confirmación, y manejo de errores de forma natural. Además evita bugs de estado local en la tabla (editar múltiples filas a la vez). Si en el futuro se quiere edición inline, se puede agregar como mejora.

### Decisión 5: Actualización de `disponible` vía `PUT /api/v1/productos/{id}`

**Decisión**: Usar `useUpdateProduct` (endpoint `PUT`) para cambiar `disponible`, y `useUpdateStock` (endpoint `PATCH`) para cambiar `stock_cantidad`.

**Razón**: El endpoint `PATCH /productos/{id}/stock` solo maneja stock. El campo `disponible` necesita el `PUT` completo. En la práctica, el modal de stock enviará ambos campos si se modificaron, o uno solo. Separar las mutations permite que cada una tenga su propia invalidación y manejo de errores.

## Architecture

```
AdminStockPage.tsx
├── useAdminStockProducts(filters)     → GET /api/v1/productos (query key separada)
├── useUpdateStock()                   → PATCH /api/v1/productos/{id}/stock
├── useUpdateProductDisponible()       → PUT /api/v1/productos/{id} (solo disponible)
├── useStockFiltersStore()             ← Zustand (q, disponible, page)
│
├── AdminStockTable                    ← Tabla con columnas: nombre, stock, disponible, acciones
│   └── StockBadge                     ← Badge color según nivel de stock
│
└── StockEditModal                     ← Modal para editar stock_cantidad + toggle disponible
```

### Flujo de datos

```
Usuario escribe nuevo stock → StockEditModal valida localmente (ge: 0)
  → useUpdateStock.mutate({ id, stock_cantidad })
    → PATCH /api/v1/productos/{id}/stock { stock_cantidad: N }
      → 200 ProductoResponse
    → invalidateQueries(['admin-stock-products'])
    → invalidateQueries(['admin-products'])
    → invalidateQueries(['products'])
    → invalidateQueries(['productDetail'])
  → onSuccess: cierra modal
  → onError: muestra toast con error
```

## Data Structures

### Hook: `useAdminStockProducts`
```typescript
interface StockProductFilters {
  q: string
  disponible: 'all' | 'true' | 'false'
  page: number
}

interface StockProductListResponse {
  items: Product[]
  total: number
  page: number
  size: number
  pages: number
}
```

### Store: `stockFiltersStore`
```typescript
interface StockFiltersState {
  q: string
  disponible: 'all' | 'true' | 'false'
  page: number
  setQ: (q: string) => void        // resetea page a 1
  setDisponible: (d: string) => void  // resetea page a 1
  setPage: (p: number) => void
  reset: () => void
}
```

### Modal Payload: `StockEditPayload`
```typescript
interface StockEditPayload {
  stock_cantidad: number  // Field(ge=0)
  disponible?: boolean
}
```

## File Structure

```
frontend/src/
├── features/
│   └── stock/
│       └── admin/
│           ├── types/
│           │   └── index.ts
│           ├── constants/
│           │   └── index.ts
│           ├── hooks/
│           │   ├── index.ts
│           │   ├── useAdminStockProducts.ts
│           │   ├── useUpdateStock.ts
│           │   └── useUpdateProductDisponible.ts
│           └── components/
│               ├── AdminStockTable.tsx
│               ├── StockEditModal.tsx
│               └── StockBadge.tsx
├── store/
│   └── stockFiltersStore.ts
├── pages/
│   └── AdminStockPage.tsx
```

## Component Specifications

### AdminStockTable
- Props: `products`, `isLoading`, `isError`, `total`, `page`, `totalPages`, `onEdit`, `onPageChange`
- Columnas: nombre, precio_base, stock_cantidad (con StockBadge), disponible (badge), acciones (editar)
- Desktop: `<table>` con `<thead>` sticky
- Mobile: `<MobileCard>` con los mismos datos
- Estados: loading (skeleton), error, vacío (empty state con mensaje)
- Paginación condicional si `totalPages > 1`

### StockBadge
- Props: `stock: number`, `size?: 'sm' | 'md'`
- Variantes: `error` (0), `warning` (1-10), `success` (>10)
- Muestra el número con color semántico

### StockEditModal
- Props: `isOpen`, `onClose`, `onSuccess`, `product`
- Campos: stock_cantidad (input number, min 0), disponible (switch/toggle)
- Precarga con valores actuales del producto
- Submit: llama `useUpdateStock` y/o `useUpdateProductDisponible` según qué cambió
- Manejo de errores: toast con detail del backend

## Routing & Navigation

```
Router.tsx:
<Route element={<ProtectedRoute requiredRoles={['STOCK', 'ADMIN']} />}>
  ...
  <Route path="/admin/stock" element={<AdminStockPage />} />
</Route>
```

Sidebar: nuevo link "Stock" en la sección de productos, visible para roles `STOCK` | `ADMIN`, con icono `Package` de lucide-react.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Cache inconsistency**: Si alguien actualiza stock desde el CRUD de productos, la tabla de stock queda stale | `useUpdateStock` invalida ambas query keys (`admin-stock-products` Y `admin-products`). El `staleTime` es 60s, así que el refetch automático ocurre al cambiar de pestaña. |
| **Race condition**: Dos usuarios actualizan el mismo producto simultáneamente | El endpoint `PATCH` es atómico a nivel BD. El último write gana. No hay riesgo de corrupción porque la operación es `SET stock_cantidad = N`. |
| **Overfetching**: El endpoint GET /productos devuelve muchos campos que no se usan en stock | Aceptado por ahora. Si en el futuro es un problema de performance, se puede crear un endpoint específico GET /admin/stock que devuelva solo los campos necesarios. |
| **UX confuso si no hay productos con stock bajo**: La tabla puede mostrar cientos de productos sin problemas de stock | Los filtros por defecto muestran todo. El usuario puede buscar por nombre o filtrar por no disponibles. |
