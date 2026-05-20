## Why

Post-merge con cambios del compañero se identificaron 3 issues críticos que deben corregirse ya: una violación FSD en entities/product/ (dependencia circular), 15 archivos nuevos que no usan cn() (estándar del proyecto), y un bug en useProductsCatalog.ts donde excludeAllergens no se envía al API.

## What Changes

- Fix #1: Mover definiciones de tipos de dominio Product, CatalogFilters, ProductsApiResponse DENTRO de entities/product/index.ts en vez de re-exportar desde features/products/types/
- Fix #2: Reemplazar concatenación manual de clases Tailwind por cn() de @/shared/lib/utils en 15 archivos de features/users/, features/metrics/, pages/
- Fix #3: Agregar excludeAllergens y search a buildProductsQueryParams en useProductsCatalog.ts

## Capabilities

### New Capabilities
Ninguna — solo fixes post-merge

### Modified Capabilities
Ninguna — no cambia requirements

## Impact

- Frontend únicamente. Sin cambios de comportamiento funcional.
- Fix #2 puede cambiar clases visuales si cn() mergea distinto → verificar visualmente después
- Fix #3 cambia qué parámetros se envían al backend — verify tests
