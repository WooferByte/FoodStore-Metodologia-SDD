## Context

El frontend está estructurado en FSD (Feature-Sliced Design) pero tiene 2 problemas: la capa `entities/` nunca se pobló y la capa `widgets/` está casi vacía. Además, no se aplicaron patrones de performance (React.memo, useCallback, useMemo) en componentes de lista y efectos con dependencias incorrectas.

Este refactor es puramente estructural y de performance — no cambia comportamiento ni UI.

## Goals / Non-Goals

**Goals:**
- Poblar `entities/` con tipos de dominio (Product, Order, Address, CartItem)
- Mover Navbar, Footer, Sidebar a `widgets/`
- Unificar imports a `@/` path alias en toda la capa `shared/`
- Aplicar React.memo en componentes de lista (ProductCard, CartItemRow, OrderCard)
- Agregar useCallback en handlers pasados como props
- Agregar useMemo en transforms compute-heavy que falten
- Corregir efectos con eslint-disable en CheckoutPage y SearchInput
- 452 tests existentes deben seguir pasando sin cambios

**Non-Goals:**
- NO cambiar comportamiento funcional ni UI
- NO tocar backend
- NO agregar nuevas funcionalidades
- NO refactorizar stores (eso es otro change)
- NO crear la capa `widgets/` completa (solo mover los componentes de layout existentes)

## Decisions

1. **entities/ structure**: Cada entidad tiene su propia carpeta con `index.ts` que re-exporta tipos. Ej: `entities/product/index.ts` → re-exporta desde `features/products/types/`. Los features actualizan sus imports para apuntar a `@/entities/product`.

2. **widgets/ migration**: Navbar → `widgets/Navbar/`, Footer → `widgets/Footer/`, Sidebar → `widgets/Sidebar/`. Los componentes se mueven con su archivo de test. Los imports en pages y features se actualizan. Los estilos Tailwind no cambian.

3. **Memoization strategy**:
   - `React.memo` en componentes puros de presentación que se renderizan en listas (ProductCard, CartItemRow, OrderCard, OrderStatusBadge)
   - `useCallback` en handlers pasados como props a esos componentes memoizados
   - `useMemo` solo en transforms existentes (allergenMap pattern) que sean compute-heavy
   - No aplicar memoización prematura donde no hay evidencia de re-render problemático

4. **Effect fixes**:
   - CheckoutPage: evaluar cada eslint-disable y agregar dependencia real o refactorizar para evitar el efecto
   - SearchInput: reemplazar sync prop→state con `useMemo` o derivar directamente

5. **Import unification**: Todos los imports relativos en `shared/` que apunten a `store/` se migran a `@/store/`. Usar script de búsqueda y reemplazo con verificación.

## Risks / Trade-offs

- [Medio] Migración de imports FSD puede dejar imports rotos si se omite algún archivo → mitigar con `npx tsc --noEmit` después de cada paso
- [Bajo] React.memo puede causar bugs si los props incluyen objetos/funciones que cambian en cada render → usar useCallback junto con memo
- [Bajo] Los cambios de import en shared/ pueden romper tests → correr vitest después de cada bloque
- [Ninguno] No hay cambios de comportamiento — todo es refactor mecánico
