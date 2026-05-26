## Why

Actualmente las mutations de pedidos (cancelar, avanzar estado, bulk actions) siguen un patrón simple: llaman a la API, y en `onSuccess` invalidan queries y muestran un toast. Esto significa que el usuario ve un delay entre su acción y el feedback visual. Los optimistic updates permiten actualizar la UI **inmediatamente** (antes de la respuesta del server), y hacer rollback suave si la API falla.

Además, los hooks `useProductos`, `usePedidos`, `useCarrito` y `useAuth` ya existen pero bajo distintos nombres (useProductsCatalog, useOrders, useCart, useAuthStore). Este change los estandariza y wrappea para exponer una API consistente.

## What Changes

- Agregar optimistic updates (`onMutate` + rollback `onError`) en `useCancelOrder`, `useAdvanceOrderState`, `useBulkOrderActions`
- Crear `useAuth()` como wrapper del store (consistente con el resto)
- Estandarizar barrels de hooks con exports consistentes
- Tests para optimistic updates (simular error + verificar rollback)

## Capabilities

### New Capabilities
- `frontend-hooks-optimistic`: Patrón de optimistic updates con `onMutate`/`onError`/`onSettled` en todas las mutations de pedidos, más wrappers consistentes para auth, carrito, productos, y pedidos.

### Modified Capabilities
- *(ninguna — no cambian requisitos, solo patrón de implementación)*

## Impact

- **Frontend**: 3 hooks de mutations modificados (useCancelOrder, useAdvanceOrderState, useBulkOrderActions)
- **Frontend**: 1 nuevo hook (useAuth) 
- **Frontend**: Tests actualizados para optimistic rollback
- **No requiere backend**
