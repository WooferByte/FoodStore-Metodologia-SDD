# Tasks: frontend-catalog-search-images-refactor

## 0. Skills

- [ ] 0.1 Leer `.agents/skills/tailwind-design-system/SKILL.md` — tokens semánticos Tailwind v4, CVA, clases responsivas, no valores raw
- [ ] 0.2 Leer `.agents/skills/ui-design-system/SKILL.md` — ARIA, WCAG AA, accesibilidad badges e imágenes, mobile-first
- [ ] 0.3 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — useMemo para derivar estado, evitar re-renders, rerender-use-deferred-value para búsqueda
- [ ] 0.4 Leer `.agents/skills/frontend-state-management/SKILL.md` — confirmar que búsqueda es local state (no Zustand, no TanStack Query)
- [ ] 0.5 Leer `.agents/skills/testing-e2e-playwright/SKILL.md` — estructura e2e/catalog/, helpers auth, mocks page.route

---

## 1. Verificación previa

- [ ] 1.1 Leer `frontend/src/features/products/components/ProductCard.tsx` — entender estructura actual antes de modificar
- [ ] 1.2 Leer `frontend/src/features/products/components/SearchInput.tsx` — confirmar que tiene debounce interno a eliminar
- [ ] 1.3 Leer `frontend/src/features/products/hooks/useProductsCatalog.ts` — identificar dónde `search` entra en queryKey
- [ ] 1.4 Leer `frontend/src/features/products/constants/index.ts` — confirmar `SEARCH_DEBOUNCE_DELAY = 250`
- [ ] 1.5 Leer `backend/scripts/seed.py` — confirmar ausencia de `imagen_url` en productos_spec y entender estructura get_or_create
- [ ] 1.6 Verificar campo `imagen_url` en `backend/core/models.py` (Producto) — confirmar que existe como `Optional[str]`, no se necesita migración
- [ ] 1.7 Localizar el componente padre del catálogo (buscar `useProductsCatalog` + `SearchInput` en uso) para entender cómo se pasa `search` actualmente

---

## 2. Backend — Seed con imágenes

- [ ] 2.1 Modificar `backend/scripts/seed.py`: agregar `imagen_url` a cada entrada de `productos_spec` (15 productos con URLs Unsplash/Pexels estables y descriptivas de comida)

  URLs sugeridas por producto (usar `https://images.unsplash.com/photo-<ID>?w=400&q=80`):
  - Pizza Margherita: `photo-1513104890138-7c749659a591`
  - Pizza Pepperoni: `photo-1628840042765-356cda07504e`
  - Pizza 4 Quesos: `photo-1574071318508-1cdbab80d002`
  - Pizza Fugazzeta: `photo-1565299624946-b28f40a0ae38`
  - Pizza Napolitana: `photo-1551183053-bf91798d773e`
  - Pizza Marinera: `photo-1619947583690-c2c9d5f97ed2`
  - Hamburguesa Clásica: `photo-1568901346375-23c9450c58cd`
  - Hamburguesa Doble Cheddar: `photo-1553979459-d2229ba7433b`
  - Hamburguesa de Pollo: `photo-1606755962773-d324e0a13086`
  - Combo Burger + Gaseosa: `photo-1594212699903-ec8a3eca50f5`
  - Coca-Cola 500ml: `photo-1554866585-cd94860890b7`
  - Sprite 500ml: `photo-1571091718767-18b5b1457add`
  - Cerveza Artesanal IPA: `photo-1535958636474-b021ee887b13`
  - Helado Doble Sabor: `photo-1501443762994-82bd5dace89a`
  - Brownie con Helado: `photo-1564355808539-22fda35bed7e`

- [ ] 2.2 En `seed_database()`, después del bloque `[PRODUCTOS]`, agregar un paso `[UPDATE IMAGEN_URL]` que ejecute `UPDATE productos SET imagen_url = :url WHERE nombre = :nombre AND imagen_url IS NULL` para cada producto usando `session.execute(text(...))` — esto permite que el seed sea idempotente también para filas existentes sin URL
- [ ] 2.3 Importar `text` de `sqlalchemy` si aún no está importado en seed.py
- [ ] 2.4 Verificar localmente que el seed es idempotente: correr dos veces, confirmar que no genera duplicados ni errores

---

## 3. Custom Hook — useDebounce

- [ ] 3.1 Crear `frontend/src/shared/hooks/useDebounce.ts`:
  ```ts
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
- [ ] 3.2 Exportar desde `frontend/src/shared/hooks/index.ts` si existe ese barrel, o dejarlo como import directo

---

## 4. Custom Hook — useCatalogSearch

- [ ] 4.1 Crear `frontend/src/features/products/hooks/useCatalogSearch.ts`:
  - Signature: `useCatalogSearch(products: Product[], searchTerm: string): { filtered: Product[], resultCount: number, isFiltering: boolean }`
  - Implementar normalización: `text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')`
  - Buscar en `product.nombre` y `product.descripcion`
  - Usar `useMemo` con deps `[products, searchTerm]`
  - Cuando `searchTerm.trim() === ''` retornar todos los productos sin filtrar
- [ ] 4.2 Asegurarse de que el import de `Product` usa `@/features/products/types`

---

## 5. Modificar useProductsCatalog — eliminar search del query

- [ ] 5.1 En `buildProductsQueryParams`: eliminar el bloque `if (filters.search.trim()) { params.append('q', ...) }`
- [ ] 5.2 En `useQuery`: eliminar `search` del `queryKey` — cambiar a `[QUERY_KEYS.PRODUCTS, { categoryIds: filters.categoryIds, currentPage: filters.currentPage, excludeAllergens: filters.excludeAllergens }]` (excluir `search` explícitamente)
- [ ] 5.3 Verificar que `CatalogFilters` sigue teniendo el campo `search` en el tipo (no eliminarlo — lo necesita el hook de búsqueda)

---

## 6. Modificar SearchInput — hacerlo controlado puro

- [ ] 6.1 Eliminar el `useEffect` de debounce interno en `SearchInput` (el que llama `onChange(localValue)` con `setTimeout`)
- [ ] 6.2 Eliminar el `useEffect` de sync externa (`useEffect(() => setLocalValue(value), [value])`)
- [ ] 6.3 Eliminar el estado `localValue` — el componente ahora es controlado puro: `value` viene del padre, `onChange` se llama en cada keystroke
- [ ] 6.4 Agregar prop `resultCount?: number` al interface `SearchInputProps`
- [ ] 6.5 Renderizar feedback de resultados: cuando `value.trim()` es no-vacío, mostrar `<p aria-live="polite" className="text-sm text-muted-foreground mt-1">{resultCount ?? 0} resultados encontrados</p>` debajo del input
- [ ] 6.6 Actualizar `SEARCH_DEBOUNCE_DELAY` en constants de 250 a 300

---

## 7. Integrar en el componente padre del catálogo

- [ ] 7.1 Localizar el componente que usa `useProductsCatalog` + `SearchInput` (probablemente una página o un widget)
- [ ] 7.2 Agregar `const [searchTerm, setSearchTerm] = useState('')`
- [ ] 7.3 Agregar `const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_DELAY)` — importar desde `@/shared/hooks/useDebounce`
- [ ] 7.4 Agregar `const { filtered, resultCount } = useCatalogSearch(data?.items ?? [], debouncedSearch)` — importar hook
- [ ] 7.5 Pasar `value={searchTerm}` y `onChange={setSearchTerm}` al `<SearchInput>` (no más debounce en SearchInput)
- [ ] 7.6 Pasar `resultCount={resultCount}` al `<SearchInput>`
- [ ] 7.7 Pasar `products={filtered}` al `<ProductGrid>` en vez de `data?.items`
- [ ] 7.8 Verificar que los filtros existentes (categoría, alérgenos, paginación) no se rompen

---

## 8. Refactor ProductCard

- [ ] 8.1 Agregar `useState<boolean>` para `imgError` — inicializar como `!product.imagen_url` (si no hay URL, ya está en error)
- [ ] 8.2 Crear componente interno `ProductImageFallback({ name }: { name: string })`:
  ```tsx
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
- [ ] 8.3 En el contenedor de imagen: cambiar `h-48` a `aspect-[4/3] w-full` para ratio consistente
- [ ] 8.4 Condicional de imagen:
  ```tsx
  {imgError ? (
    <ProductImageFallback name={product.nombre} />
  ) : (
    <img
      src={product.imagen_url}
      alt={`Foto de ${product.nombre}`}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
      onError={() => setImgError(true)}
    />
  )}
  ```
- [ ] 8.5 Agregar clase `group` al `<article>` — asegurarse de que esté en la raíz
- [ ] 8.6 Agregar `group-hover:shadow-lg transition-shadow duration-200` al `<article>` (reemplaza hover:shadow-xl)
- [ ] 8.7 Actualizar badge de stock con tokens semánticos y border:
  - En Stock: `bg-success/15 text-success border border-success/30 rounded-full px-3 py-1 text-xs font-semibold`
  - Sin Stock: `bg-destructive/15 text-destructive border border-destructive/30 rounded-full px-3 py-1 text-xs font-semibold`
  - Badge ARIA: `role="status" aria-label={isAvailable ? 'En stock' : 'Sin stock'}`
- [ ] 8.8 Actualizar precio: `text-2xl font-bold text-primary` (era `text-xl`)
- [ ] 8.9 Actualizar botones: eliminar `hidden sm:inline` de los spans de texto — siempre mostrar texto
- [ ] 8.10 Actualizar padding de botones: `py-2.5` (era `py-2`)
- [ ] 8.11 Actualizar `aria-label` de imagen: `alt={`Foto de ${product.nombre}`}`

---

## 9. Tests unitarios

### 9.1 useDebounce
- [ ] 9.1.1 Crear `frontend/src/shared/hooks/__tests__/useDebounce.test.ts`
- [ ] 9.1.2 Test: retorna valor inicial inmediatamente
- [ ] 9.1.3 Test: no actualiza antes del delay (usar `vi.useFakeTimers`)
- [ ] 9.1.4 Test: actualiza después del delay
- [ ] 9.1.5 Test: resetea el timer si el valor cambia antes del delay (cancel + restart)

### 9.2 useCatalogSearch
- [ ] 9.2.1 Crear `frontend/src/features/products/hooks/__tests__/useCatalogSearch.test.ts`
- [ ] 9.2.2 Test: término vacío → retorna todos los productos, isFiltering=false
- [ ] 9.2.3 Test: término con resultado → filtra por nombre correctamente
- [ ] 9.2.4 Test: término que matchea descripción → incluye el producto
- [ ] 9.2.5 Test: case-insensitive (term "pizza" matchea "Pizza Margherita")
- [ ] 9.2.6 Test: accent normalization ("cafe" matchea "Café")
- [ ] 9.2.7 Test: término sin resultados → filtered=[], resultCount=0, isFiltering=true
- [ ] 9.2.8 Test: resultCount refleja exactamente la cantidad de productos filtrados

### 9.3 ProductCard
- [ ] 9.3.1 Crear (o actualizar) `frontend/src/features/products/components/__tests__/ProductCard.test.tsx`
- [ ] 9.3.2 Test: renderiza `<img>` cuando `imagen_url` está presente
- [ ] 9.3.3 Test: renderiza fallback (inicial del nombre) cuando `imagen_url` es null/undefined
- [ ] 9.3.4 Test: renderiza fallback cuando la imagen falla (`onError` dispara)
- [ ] 9.3.5 Test: badge muestra "En Stock" con `role="status"` cuando disponible=true y stock>0
- [ ] 9.3.6 Test: badge muestra "Out of Stock" cuando disponible=false
- [ ] 9.3.7 Test: botón "Add" está disabled cuando producto no disponible
- [ ] 9.3.8 Test: `aria-label` del botón menciona "(unavailable)" cuando no disponible

---

## 10. Tests E2E (Playwright)

- [ ] 10.1 Crear `frontend/e2e/catalog/catalog.spec.ts` si no existe
- [ ] 10.2 Test: escribir en el search input → los productos se filtran sin requests adicionales al backend (mockear products endpoint una sola vez, verificar que `page.route` no se llama más de una vez)
- [ ] 10.3 Test: badge "En Stock" visible en un producto disponible
- [ ] 10.4 Test: texto "X resultados encontrados" aparece al escribir en el search
- [ ] 10.5 Test: borrar el search → "X resultados encontrados" desaparece
- [ ] 10.6 Mockear `GET **/api/v1/productos` con los 15 productos del seed (incluyendo imagen_url y sin imagen_url para probar fallback)

---

## 11. Verificación final

- [ ] 11.1 Leer `.agents/skills/post-change-verification/SKILL.md`
- [ ] 11.2 Correr `npx vitest run` en `frontend/` — todos los tests pasan
- [ ] 11.3 Correr `npm run lint` en `frontend/` — sin errores
- [ ] 11.4 Correr `npx tsc --noEmit` en `frontend/` — sin errores de tipos
- [ ] 11.5 Verificar visualmente: levantar dev server, confirmar que el catálogo muestra imágenes, el search filtra localmente, el fallback aparece con la inicial
- [ ] 11.6 Verificar accesibilidad: tab navigation llega a search input, badges, botones; no hay elementos sin aria-label

---

## Definition of Done

- [ ] `useDebounce` hook en `shared/hooks/` con tests
- [ ] `useCatalogSearch` hook con normalización de acentos + tests
- [ ] `useProductsCatalog` ya no envía `q=` al backend
- [ ] `SearchInput` es controlled puro, muestra conteo de resultados
- [ ] `ProductCard` con fallback gradient + initial, badge semántico, hover group, ARIA completo
- [ ] `seed.py` actualizado con `imagen_url` para los 15 productos + update de filas existentes
- [ ] Todos los tests unitarios pasan (`vitest run`)
- [ ] Sin errores TypeScript (`tsc --noEmit`)
- [ ] Sin errores de lint
- [ ] Imports usan `@/` (FSD compliant)
- [ ] Cero colores raw en Tailwind — solo tokens semánticos
