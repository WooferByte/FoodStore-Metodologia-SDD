## Why

El frontend tiene 2 problemas estructurales que afectan mantenibilidad y performance:

1. **FSD incompleto**: La carpeta `entities/` está vacía (tipos de dominio en `features/` y `store/`), `widgets/` solo tiene `CartDrawer` (Navbar/Footer/Sidebar están en `shared/components/layout/`), y hay imports relativos (`../../store/`) en `shared/` que violan la direccionalidad FSD.

2. **Memoización ausente**: Solo 2 usos de `useMemo` en todo el frontend. Componentes de listas (`ProductCard`, `CartItemRow`, `OrderCard`) sin `React.memo`. CheckoutPage tiene 4 useEffect con `eslint-disable` en dependencias. SearchInput hace sync prop→state sin considerar cambios reales.

## What Changes

- Mover tipos de dominio a `entities/`: crear `entities/product/`, `entities/order/`, `entities/address/`, `entities/cart-item/` con sus tipos
- Mover Navbar, Footer, Sidebar de `shared/components/layout/` a `widgets/`
- Migrar imports relativos (`../../store/`) en `shared/` a `@/store/`
- Envolver `ProductCard`, `CartItemRow`, `OrderCard` en `React.memo`
- Agregar `useCallback` en handlers pasados como props a children memoizados
- Agregar `useMemo` en transforms compute-heavy
- Corregir efectos con `eslint-disable` en CheckoutPage y SearchInput
- NO se cambia comportamiento funcional — solo estructura y performance

## Capabilities

### New Capabilities
Ninguna — es refactor puro, no introduce nuevas capabilities

### Modified Capabilities
Ninguna — no cambia requirements de specs existentes

## Impact

- **Frontend**: 30+ archivos modificados con cambios de imports y estructura
- **Build/Runtime**: Sin cambios funcionales. Tests deben seguir pasando.
- **Riesgo**: Los cambios de imports pueden romper imports si no se actualizan todas las referencias. Los cambios de memoización son seguros.
- **Dependencias**: Requiere `fix-build-critical` previo (ya archivado) — porque algunos archivos que moveremos importan `cn()` de `@/shared/lib/utils`
