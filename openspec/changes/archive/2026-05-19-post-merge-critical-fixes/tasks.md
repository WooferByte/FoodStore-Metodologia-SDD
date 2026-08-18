## 1. Fix FSD violation entities/product

- [x] 1.1 Mover tipos Product, CatalogFilters, ProductsApiResponse DENTRO de entities/product/index.ts (definición directa, no re-export)
- [x] 1.2 Actualizar features/products/types/index.ts para importar desde @/entities/product
- [x] 1.3 Verificar npx tsc --noEmit

## 2. Reemplazar concatenación manual por cn()

- [x] 2.1 DateRangeSelector.tsx — reemplazar .join(' ') por cn()
- [x] 2.2 MetricsKPICards.tsx — reemplazar template literal por cn()
- [x] 2.3 UsersTable.tsx — reemplazar template literals por cn()
- [x] 2.4 UserEditModal.tsx — reemplazar template literals por cn()
- [x] 2.5 Verificar npx tsc --noEmit

## 3. Fix excludeAllergens + search en useProductsCatalog.ts

- [x] 3.1 Agregar excludeAllergens y search a buildProductsQueryParams
- [x] 3.2 Verificar npx tsc --noEmit

## 4. Verificación final

- [x] 4.1 npx tsc --noEmit
- [x] 4.2 npm run build
- [x] 4.3 npx vitest run
