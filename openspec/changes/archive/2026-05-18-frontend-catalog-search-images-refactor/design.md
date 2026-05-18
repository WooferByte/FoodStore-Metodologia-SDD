# Design: frontend-catalog-search-images-refactor

## Architecture Decisions

---

### Decision 1: Client-side filtering vs. Server-side search query per keystroke

**Chosen approach**: Client-side filtering with `useMemo` + `useDebounce` hook.

**Rationale**:
- The catalog fetches up to 20 products per page. At that scale, a JavaScript `Array.filter()` on a normalized string is sub-millisecond.
- The current `SearchInput` already uses a 250ms debounce that triggers a new TanStack Query entry per search term. Each new query key causes a loading flash even with `keepPreviousData` because the new key has no cache entry yet.
- Removing `search` from the query key eliminates the cache fragmentation: one stable cache entry for all products (filtered by category + page), instant local filtering of that result set.
- If the backend eventually paginates deeply (>100 products), we can revisit. For now the spec has 15 products and the page size is 20.

**What changes in `useProductsCatalog`**:
- `CatalogFilters.search` is removed from `queryKey` and from `buildProductsQueryParams`
- The hook no longer sends `q=...` to the backend
- `CatalogFilters` type retains the `search` field — it's still tracked in component state for the `useCatalogSearch` hook

**Trade-off accepted**: If the backend supports full-text search with PostgreSQL `tsvector`, we lose that. Accepted because the current backend implementation sends `q` as a simple `ILIKE` filter and the product set is small.

---

### Decision 2: Debounce hook placement and implementation

**Chosen approach**: Custom `useDebounce<T>(value: T, delay: number): T` hook in `shared/hooks/`.

**Rationale**:
- Zustand and TanStack Query are both inappropriate for this: it's derived ephemeral UI state, not server state or persistent client state.
- A custom hook is 8 lines, zero dependencies, and testable in isolation.
- Placing in `shared/hooks/` follows FSD — it's reusable across features.

```ts
// shared/hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}
```

**Delay**: 300ms (updated from 250ms, aligned with task description).

---

### Decision 3: useCatalogSearch hook — filtering strategy

**Location**: `features/products/hooks/useCatalogSearch.ts`

**Signature**:
```ts
export function useCatalogSearch(
  products: Product[],
  searchTerm: string,
): { filtered: Product[]; resultCount: number; isFiltering: boolean }
```

**Filtering logic**:
- Normalize both term and searchable fields to lowercase, strip accents with `normalize('NFD').replace(/\p{Diacritic}/gu, '')`
- Search in: `nombre` + `descripcion`
- `useMemo` dependency: `[products, searchTerm]`
- `isFiltering`: true when `searchTerm.trim().length > 0`

**Result count display**: shown in `SearchInput` or just below it as `"{n} resultados encontrados"` — only when `isFiltering === true`.

---

### Decision 4: ProductCard fallback image — gradient with initial

**Approach**: Conditional render — no broken `<img>` element in fallback state.

```tsx
// Two states based on: hasImage = !!product.imagen_url
// State A (has image): render <img> with onError → switch to fallback state via React state
// State B (no image or error): render gradient div with initial

function ProductImageFallback({ name }: { name: string }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary"
      aria-hidden="true"
    >
      <span className="text-5xl font-bold text-primary/60 select-none">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}
```

**Why not `onError` inline only**: Using local `useState` (`imgError: boolean`) in ProductCard to toggle between `<img>` and fallback component avoids the flash of broken image icon before the `onError` fires. Initialize `imgError` to `!product.imagen_url` so products without a URL skip the `<img>` entirely.

---

### Decision 5: ProductCard layout — responsive strategy

**Mobile-first, always vertical**:
- Card is always `flex flex-col` (no horizontal variant)
- The grid parent (`ProductGrid`) handles responsive columns: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Image: `aspect-[4/3]` ensures consistent height regardless of screen width; `object-cover` fills without distortion

**Hover effect**:
- `group` class on `<article>`
- Image container: `overflow-hidden` (already present) + `transition-transform duration-300`
- Image: `group-hover:scale-105`
- Card: `transition-shadow duration-200 hover:shadow-lg` (already uses shadow-md)

**Badge tokens** (Tailwind v4 semantic):
- En Stock: `bg-success/15 text-success border border-success/30`
- Sin Stock: `bg-destructive/15 text-destructive border border-destructive/30`

**Button design**:
- Remove `hidden sm:inline` from button labels — always show text
- Use `gap-1.5` instead of `gap-2`
- Keep existing semantic button colors but upgrade padding: `py-2.5` instead of `py-2`
- Disabled state: `disabled:opacity-40 disabled:cursor-not-allowed`

**ARIA**:
- Image: `alt={`Foto de ${product.nombre}`}` (descriptive, not just name)
- Badge: `role="status" aria-label={isAvailable ? 'En stock' : 'Sin stock'}`
- Buttons: existing `aria-label` pattern retained

---

### Decision 6: Seed update strategy for imagen_url

**Problem**: `get_or_create` returns existing products without updating them. Products seeded without `imagen_url` will stay `NULL` unless we add update logic.

**Chosen approach**: Add an `update_imagen_url` step after `get_or_create` that runs `UPDATE productos SET imagen_url = ? WHERE nombre = ? AND imagen_url IS NULL`.

This keeps the seed idempotent (only updates rows where the URL is still NULL, never overwrites a URL that was set via the API).

**Image URLs**: Use `images.unsplash.com` with fixed photo IDs for reproducibility. No random seeds — hardcoded to specific food photography IDs that are stable permanent CDN links.

---

## Component Data Flow (after change)

```
CatalogPage
  ├── useProductsCatalog(filters)   ← no search in query key
  │     └── TanStack Query: GET /api/v1/productos?categoria_id=X&page=1&size=20
  │
  ├── searchTerm (local state, updated by SearchInput onChange)
  ├── debouncedSearch = useDebounce(searchTerm, 300)
  ├── { filtered, resultCount } = useCatalogSearch(data.items, debouncedSearch)
  │
  ├── SearchInput
  │     ├── value={searchTerm}
  │     ├── onChange={setSearchTerm}         ← immediate (no debounce in SearchInput)
  │     └── resultCount={resultCount}        ← new prop
  │
  └── ProductGrid
        └── products={filtered}             ← already-filtered list
```

**SearchInput simplification**: Remove the internal debounce `useEffect` from `SearchInput` — the component becomes a pure controlled input. The debounce moves to the parent via `useDebounce`. This prevents the double-debounce bug (250ms internal + 300ms external).

---

## Testing Strategy

### Unit tests (vitest + @testing-library/react)

| Test file | What to test |
|-----------|-------------|
| `shared/hooks/__tests__/useDebounce.test.ts` | debounce timing, cleanup on unmount |
| `features/products/hooks/__tests__/useCatalogSearch.test.ts` | filter by name, filter by description, case-insensitive, accent normalization, empty term returns all, zero results |
| `features/products/components/__tests__/ProductCard.test.tsx` | renders with image, renders fallback (no imagen_url), renders fallback (img error), stock badge text, aria labels, disabled Add button when out of stock |

### E2E (Playwright — catalog.spec.ts)
- User types in search → products filter without network call
- Badge "En Stock" visible on available product
- Badge "Sin Stock" visible on unavailable product (need a product with disponible=False in seed or mock)
- Image alt text present and descriptive

---

## Files Created / Modified

| File | Action | Reason |
|------|--------|--------|
| `frontend/src/shared/hooks/useDebounce.ts` | CREATE | Reusable debounce hook |
| `frontend/src/features/products/hooks/useCatalogSearch.ts` | CREATE | Client-side filter logic |
| `frontend/src/features/products/hooks/useProductsCatalog.ts` | MODIFY | Remove search from query |
| `frontend/src/features/products/components/ProductCard.tsx` | MODIFY | Visual refactor + image fallback |
| `frontend/src/features/products/components/SearchInput.tsx` | MODIFY | Remove internal debounce, add resultCount prop |
| `frontend/src/features/products/constants/index.ts` | MODIFY | SEARCH_DEBOUNCE_DELAY 250→300 |
| `backend/scripts/seed.py` | MODIFY | Add imagen_url + update logic |
| `frontend/src/shared/hooks/__tests__/useDebounce.test.ts` | CREATE | Tests |
| `frontend/src/features/products/hooks/__tests__/useCatalogSearch.test.ts` | CREATE | Tests |
| `frontend/src/features/products/components/__tests__/ProductCard.test.tsx` | CREATE | Tests |
| `frontend/e2e/catalog/catalog.spec.ts` | CREATE | E2E tests |

---

## Non-Negotiables Checklist

- [x] Only semantic Tailwind v4 tokens — zero raw color values
- [x] ARIA on badge (role="status" + aria-label), buttons (aria-label), image (alt descriptive)
- [x] Image fallback: gradient + initial — no broken image icon
- [x] Debounce 300ms client-side — zero backend calls per keystroke
- [x] Tests: search filter, fallback image, stock badge
- [x] FSD imports: `@/` prefix on all
- [x] No Zustand for this state — it's ephemeral local/derived state
- [x] SearchInput becomes a pure controlled input (no internal debounce)
