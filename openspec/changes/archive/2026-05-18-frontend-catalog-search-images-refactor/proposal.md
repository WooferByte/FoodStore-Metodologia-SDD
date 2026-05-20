# Proposal: frontend-catalog-search-images-refactor

## Epic
EPIC 05 — Productos y Catálogo

## Context
The product catalog (`frontend/src/features/products/`) is operational but has three UX gaps:

1. **Search is server-round-trip-heavy**: `SearchInput` already debounces at 250ms, but each keystroke-settle triggers a full API call. With 15 seeded products the catalog fits in a single page (size=20), making client-side filtering faster, cheaper, and instant.

2. **Images are missing from seed data**: `backend/scripts/seed.py` creates 15 products without `imagen_url`. The `Producto` model already has `Optional[str] imagen_url`, so no migration is needed — the seed just needs URLs. The `ProductCard` renders `<img src={product.imagen_url}>` with an inline SVG fallback on `onError`, but that fallback is a generic "No Image" grey box — poor UX for a food store.

3. **ProductCard visual design is functional but flat**: The card lacks visual hierarchy — the image area is bare, the stock badge uses raw color strings (`bg-success/10`), the hover effect is shadow-only, and the layout doesn't scale gracefully between mobile and desktop. The design system (Tailwind v4 semantic tokens) is partially applied but not consistently.

## What We're Building

### Mejora 1 — Búsqueda client-side debounced (300ms)
- Add a `useDebounce` custom hook in `frontend/src/shared/hooks/useDebounce.ts`
- Add `useCatalogSearch` in `frontend/src/features/products/hooks/useCatalogSearch.ts` that takes the full fetched product list and a debounced search term, returns `useMemo`-filtered results + a result count
- The existing `SearchInput` debounce (250ms) is server-side. Change the debounce to 300ms client-side; the `useProductsCatalog` query no longer receives the search term — it fetches all (or paginated) products and the hook filters client-side
- Visual feedback: "X resultados encontrados" below the search input when a term is active
- No new API calls on each keypress

### Mejora 2 — Imágenes reales en el seed
- Update `backend/scripts/seed.py` to add `imagen_url` for all 15 products using free Unsplash/Pexels food photography CDN URLs
- No schema migration required — `imagen_url Optional[str]` exists in `Producto`
- The seed is idempotent (`get_or_create`) so existing rows won't be duplicated; however since products already exist without URLs we need to add an `UPDATE` path in the seed or document re-seeding

### Mejora 3 — Refactor visual ProductCard
- Imagen destacada arriba: `aspect-[4/3]` fijo, `object-cover`, `overflow-hidden`
- Fallback elegante: cuando `imagen_url` es null/undefined o la imagen falla, renderizar un `div` con gradiente semántico (`bg-gradient-to-br from-primary/20 to-secondary`) que muestre la inicial del nombre del producto centrada
- Badge de stock en esquina superior derecha con tokens semánticos Tailwind v4 (`bg-success/15 text-success`, `bg-destructive/15 text-destructive`)
- Hover: `group` en `<article>` → `group-hover:scale-105` en imagen + `group-hover:shadow-lg`
- Responsive: verticalmente apilado siempre (imagen arriba, contenido abajo) — la grid del padre ya maneja columnas
- Nombre truncado a 2 líneas (`line-clamp-2`), descripción a 2 líneas (`line-clamp-2`)
- Precio grande y primario (`text-2xl font-bold text-primary`)
- Botones con íconos siempre visibles (sin `hidden sm:inline`), full-width en mobile

## Why Now
- The catalog is the first page users see after login as CLIENT
- Missing images make products look unfinished
- Client-side search eliminates unnecessary network round-trips for a small catalog
- All three improvements are tightly coupled (seed → images → ProductCard renders them)

## Out of Scope
- Pagination changes
- Backend search endpoint modifications
- Cart implementation
- Product detail modal changes
- Allergen filter changes

## Previous Change
`frontend-payment-status-polling` (commit 1f5eed0)

## Files Affected
```
frontend/src/shared/hooks/useDebounce.ts          ← NEW
frontend/src/features/products/hooks/useCatalogSearch.ts  ← NEW
frontend/src/features/products/hooks/useProductsCatalog.ts  ← MODIFY (remove search param from query)
frontend/src/features/products/components/ProductCard.tsx   ← MODIFY
frontend/src/features/products/components/SearchInput.tsx   ← MODIFY (debounce 300ms, result count)
frontend/src/features/products/constants/index.ts           ← MODIFY (SEARCH_DEBOUNCE_DELAY 250→300)
backend/scripts/seed.py                                     ← MODIFY (add imagen_url to all products)
frontend/src/features/products/hooks/__tests__/useCatalogSearch.test.ts  ← NEW
frontend/src/features/products/components/__tests__/ProductCard.test.tsx ← NEW (or update existing)
```
