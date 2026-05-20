## 1. Fix FSD violation entities/product

- [ ] 1.1 Mover tipos Product, CatalogFilters, ProductsApiResponse DENTRO de entities/product/index.ts (definición directa, no re-export)
- [ ] 1.2 Actualizar features/products/types/index.ts para importar desde @/entities/product
- [ ] 1.3 Verificar npx tsc --noEmit

## 2. Reemplazar concatenación manual por cn()

- [ ] 2.1 DateRangeSelector.tsx — reemplazar .join(' ') por cn()
- [ ] 2.2 MetricsKPICards.tsx — reemplazar template literal por cn()
- [ ] 2.3 UsersTable.tsx — reemplazar template literals por cn()
- [ ] 2.4 UserEditModal.tsx — reemplazar template literals por cn()
- [ ] 2.5 Verificar npx tsc --noEmit

## 3. Fix excludeAllergens + search en useProductsCatalog.ts

- [ ] 3.1 Agregar excludeAllergens y search a buildProductsQueryParams
- [ ] 3.2 Verificar npx tsc --noEmit

## 4. Verificación final

- [ ] 4.1 npx tsc --noEmit
- [ ] 4.2 npm run build
- [ ] 4.3 npx vitest run
