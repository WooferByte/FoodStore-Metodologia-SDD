# Design: shipping-fee-consistency

## Context

Ver `proposal.md — Why`. La regla de envío vive solo en `frontend/src/features/cart/components/OrderSummary.tsx` (cálculo local con `DELIVERY_FEE=500` y umbral remoto vía `useSystemConfig('envio_gratis_umbral')`). El backend nunca la computa: `create_pedido` (`backend/pedidos/service.py:230`) acumula `total += precio_base * cantidad` y persiste solo subtotal; `PedidoCreate` no tiene campo `total` (el cliente no puede overridearlo); `pagos/service.py:142` cobra `float(pedido.total)`. Por eso CartDrawer y CheckoutPage muestran 2.800 y MP cobra 2.800 mientras `/cart` muestra 3.300.

Restricciones que condicionan el diseño:
- `Router → Service → UoW → Repository → Model` — el service no commitea, lanza `HTTPException`.
- Zustand = estado cliente; TanStack Query = estado servidor. Prohibido duplicar datos de servidor en Zustand.
- FSD estricto: `Pages → Widgets → Features → Entities → Shared`, imports con `@/`.
- Snapshots de precio/dirección + historial append-only: el pedido es un registro financiero inmutable.
- Head de migraciones actual: `011` (`down_revision = "010"`). Próxima migración: `012`.
- El seed de configuraciones es idempotente (`get_or_create`).

## Goals / Non-Goals

**Goals:**
- Backend como única fuente de verdad: `create_pedido` computa envío y total desde configuración y los persiste.
- Una sola lógica de totales en frontend reutilizada por `OrderSummary`, `CartDrawer` y `CheckoutPage`.
- El total cobrado por MercadoPago incluye el envío.
- El envío queda registrado en el pedido (auditoría).

**Non-Goals:**
- NO modificar `ValidarCarritoResponse` para devolver totales servidor (la pre-validación sigue siendo advisory de stock/precio).
- NO agregar campo `total`/`envio` a `PedidoCreate` (ya no existe; se mantiene así).
- NO cambiar el flujo de webhook de pagos ni `pagos/service.py`.
- NO tocar la UI admin de configuración (la clave `envio_costo` es editable con la pantalla existente).

## Decisions

### 1. Backend: `create_pedido` computa envío con el helper `_get_config_int` existente
Reutilizar `_get_config_int(uow, clave, default)` (`pedidos/service.py:54`) — que ya se usa para el rate limit — para leer `envio_gratis_umbral` (default 3000) y `envio_costo` (default 500). El acumulador `total` se renombra a `subtotal` y, al construir el `Pedido`, se calcula:

```
envio = 0 if subtotal >= umbral else costo
pedido.total = subtotal + envio
pedido.envio = envio
```

**Por qué:** es el patrón ya establecido en el módulo, sin introducir dependencias nuevas. **Alternativa considerada:** agregar un método `get_value(clave)` a `ConfiguracionRepository` y leer vía `uow.configuracion` (layering más limpio, la spec de system-configuration ya expone el repo en el UoW). **Trade-off:** el repo agrega superficie para 2 lecturas de enteros; el helper directo es lo que el módulo ya hace. Si en el futuro las configs necesitan decimales, se generaliza a `_get_config_decimal`.

### 2. Pedido SÍ recibe columna `envio` + migración Alembic `012`
Agregar `envio: Decimal(10,2) NOT NULL default 0` al modelo `Pedido` (`backend/core/models.py`) con migración `012_add_pedido_envio.py` (`revision="012"`, `down_revision="011"`). Exponerlo en `PedidoResponse`. Filas históricas quedan en `0` (coincide con lo que realmente se cobró).

**Por qué SÍ:** misma lógica que los snapshots de precio/dirección — el pedido es un registro inmutable; si el admin cambia el umbral/costo después, el total sigue siendo reconstruible (`subtotal = total - envio`, con `envio` persistido). Sin la columna, no hay forma de saber cuánto envío se cobró ni de auditar. **Alternativa considerada:** no persistir y derivar del `total` y la config actual — **descartada** porque rompe la auditoría al cambiar la config.

### 3. Frontend: hook compartido `useCartTotals` en `frontend/src/features/cart/hooks/`
Nuevo hook que compone `useCartStore` (subtotal/items) + `useSystemConfig` (umbral y costo) y devuelve `{ subtotal, deliveryFee, total, isFreeDelivery, missingForFree }`, con fallbacks 3000/500 mientras la config carga. `useSystemConfig` usa el cache compartido `system-config` → una sola llamada de red para ambas claves.

**Por qué hook en `features/cart` y no selectores del store:** el umbral y el costo son **estado servidor** (TanStack Query). Meterlos en el cartStore como selectores alimentados rompería la regla "nunca duplicar datos del servidor en Zustand" y complicaría la suscripción (el selector necesitaría el umbral como argumento). El hook compone ambos mundos sin duplicar. **Ubicación en `features/cart`:** los totales son dominio del carrito, y `features/cart` ya importa `@/features/configuracion/hooks` (lo hace `OrderSummary` hoy) — consistente con FSD. **Alternativa descartada:** selectores en el store con umbral inyectado (viola separación cliente/servidor); hook en `features/configuracion/hooks` (el hook no es "configuración", es lógica de carrito).

`OrderSummary` (página `/cart`), el footer + CTA del `CartDrawer` y la columna de resumen de `CheckoutPage` consumen el mismo hook. El CTA del CartDrawer pasa de mostrar `totalPrice()` (subtotal) a `total` (con envío).

### 4. MercadoPago: sin cambios en `pagos/service.py`
La preferencia ya cobra `float(pedido.total)` (`pagos/service.py:142`). Al persistir `total` con envío en el paso 1, el `unit_price` de la preferencia queda correcto automáticamente. El diseño solo valida con un test que `unit_price == pedido.total`.

### 5. `validar_carrito` y el payload de checkout: sin cambios de contrato
`PedidoCreate` no acepta `total` ni `envio` → el cliente no puede overridearlos; el backend SIEMPRE recomputa (Pydantic v2 ignora campos extra por defecto, así que un `total` fabricado se descarta, no da 422). El payload de CheckoutPage sigue enviando solo `items`. La consistencia visual se garantiza porque frontend y backend derivan de las mismas claves de configuración.

## Risks / Trade-offs

- **Frontend con config stale (cache 5 min)** → si el admin cambia `envio_gratis_umbral`/`envio_costo`, los componentes pueden mostrar un total distinto al que persistirá el backend hasta que venza el cache. **Mitigación:** en `CheckoutPage`, al montar, invalidar la query `system-config` (`queryClient.invalidateQueries(['system-config'])`) para que el resumen sea fresco antes de crear el pedido.
- **Pedidos históricos con `envio=0`** → es el valor correcto (nunca se les cobró envío), pero una query admin que asuma `envio` poblado en todos los pedidos vería 0. **Mitigación:** escenario de spec explícito; si en el futuro se quiere, backfill manual — fuera de alcance.
- **`_get_config_int` lee la sesión directo, sin pasar por `ConfiguracionRepository`** → desviación menor del layering repo. **Mitigación:** patrón ya existente en el módulo (rate limit); aceptado y documentado.
- **`float(pedido.total)` en la preferencia MP** → conversión Decimal→float existente; con montos ARS ≤ 10 dígitos no hay riesgo de precisión. **Mitigación:** test unitario del payload de preferencia.

## Migration Plan

1. **Seed** (`backend/scripts/seed.py`): agregar `("envio_costo", "500", "Costo de envío fijo (en pesos)")` a `configuraciones_spec`. Idempotente (rerun no duplica).
2. **Migración** `012_add_pedido_envio.py`: `ALTER TABLE pedidos ADD COLUMN envio NUMERIC(10,2) NOT NULL DEFAULT 0`. Ejecutar `alembic upgrade head`.
3. **Backend**: modelo (`Pedido.envio`), `PedidoResponse.envio`, `create_pedido` (subtotal + envio + total).
4. **Frontend**: `useCartTotals` → refactor `OrderSummary` → `CartDrawer` → `CheckoutPage`.
5. **Rollback**: `alembic downgrade 011` (dropea la columna); revertir cambios frontend; los pedidos creados con la feature quedan en BD (no hay vuelta atrás financiera — aceptado).

## Open Questions

Ninguna que cambie specs, approach o tareas. (Potencial futuro, fuera de alcance: que `validar_carrito` devuelva `subtotal`/`envio`/`total` como verdad servidor — no es necesario ahora porque ambos lados derivan de la misma config.)
