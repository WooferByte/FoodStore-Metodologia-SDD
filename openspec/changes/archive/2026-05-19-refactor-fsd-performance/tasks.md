## 0. Skills

- [ ] 0.1 Leer `.agents/skills/tailwind-design-system/SKILL.md` — componentes a mover usan Tailwind v4 tokens semánticos
- [ ] 0.2 Leer `.agents/skills/ui-design-system/SKILL.md` — componentes con ARIA y Radix, mantener accesibilidad al mover
- [ ] 0.3 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — patrones de memoización, useCallback, useEffect
- [ ] 0.4 Leer `.agents/skills/frontend-state-management/SKILL.md` — separación Zustand vs TanStack Query, no duplicar estado

## 1. Poblar entities/

- [ ] 1.1 Crear `entities/product/index.ts` — re-exportar tipos Product, CatalogFilters, ProductsApiResponse desde `features/products/types/`
- [ ] 1.2 Crear `entities/order/index.ts` — re-exportar tipos de Order desde `features/orders/types/`
- [ ] 1.3 Crear `entities/address/index.ts` — re-exportar tipos DireccionResponse, DireccionCreate desde `features/addresses/types/`
- [ ] 1.4 Crear `entities/cart-item/index.ts` — mover tipo CartItem desde `store/types.ts`
- [ ] 1.5 Actualizar imports en features, pages, store para apuntar a `@/entities/...`
- [ ] 1.6 Verificar: `npx tsc --noEmit` — 0 errores

## 2. Migrar layout components a widgets/

- [ ] 2.1 Mover `shared/components/layout/Navbar.tsx` (y su test) a `widgets/Navbar/`
- [ ] 2.2 Mover `shared/components/layout/Footer.tsx` (y su test) a `widgets/Footer/`
- [ ] 2.3 Mover `shared/components/layout/Sidebar.tsx` (y su test) a `widgets/Sidebar/`
- [ ] 2.4 Actualizar imports en App.tsx y Router.tsx para apuntar a `@/widgets/...`
- [ ] 2.5 Verificar: `npx vitest run` — 452 tests pasando

## 3. Unificar imports a @/ en shared/

- [ ] 3.1 Migrar imports relativos `../../store/` a `@/store/` en `shared/api/axios.ts`
- [ ] 3.2 Migrar imports relativos `../../store/` a `@/store/` en `shared/hooks/useLogout.ts`
- [ ] 3.3 Migrar imports relativos en tests de shared/
- [ ] 3.4 Verificar: `npx tsc --noEmit` + `npx vitest run` — 0 errores, 452 tests

## 4. Aplicar memoización en componentes de lista

- [ ] 4.1 Envolver `ProductCard` en `React.memo`
- [ ] 4.2 Envolver `CartItemRow` en `React.memo`
- [ ] 4.3 Envolver `OrderCard` en `React.memo`
- [ ] 4.4 Envolver `OrderStatusBadge` en `React.memo`
- [ ] 4.5 Agregar `useCallback` en handlers pasados como props a los componentes memoizados (onAddToCart, onRemove, onClick, etc.)
- [ ] 4.6 Verificar: `npx vitest run` — 452 tests, sin regresiones

## 5. Agregar useMemo donde falte

- [ ] 5.1 Revisar Catalog.tsx — asegurar `useMemo` en filtered/allergenMap (ya existe en línea 71, verificar que cubra todos los transforms)
- [ ] 5.2 Revisar CartPage.tsx — agregar `useMemo` si hay computed values en items.map
- [ ] 5.3 Verificar: `npx vitest run` — sin regresiones

## 6. Corregir efectos con eslint-disable

- [ ] 6.1 CheckoutPage.tsx línea 132: efecto con dependencia `searchParams` + eslint-disable — evaluar y corregir (agregar dependencia o refactorizar)
- [ ] 6.2 CheckoutPage.tsx línea 175: efecto con dependencia `validationData` + eslint-disable — evaluar y corregir
- [ ] 6.3 SearchInput.tsx línea 46: sync prop→state con `[value]` — reemplazar con derivación directa o useMemo
- [ ] 6.4 Verificar: `npx vitest run` — sin regresiones

## 7. Verificación final

- [ ] 7.1 `npx tsc --noEmit` — 0 errores
- [ ] 7.2 `npm run build` — build exitoso
- [ ] 7.3 `npx vitest run` — 452 tests pasando
