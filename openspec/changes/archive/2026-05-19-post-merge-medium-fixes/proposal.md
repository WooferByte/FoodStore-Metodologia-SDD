## Why

Post-merge audit identificó 4 issues medios que alinean el código del compañero con los estándares del proyecto: React.memo faltante, useCallback ausente, colores hardcodeados en roles de usuario, y textos en inglés en constantes de productos.

## What Changes

- Envolver 6 componentes en React.memo (UsersTable, MetricsKPICards, DateRangeSelector, SalesChart, TopProductsChart, OrderStateChart)
- Envolver handlers handleEdit/handleToggleStatus en useCallback en UsersPage
- Reemplazar colores hardcodeados por tokens semánticos en features/users/constants/index.ts
- Traducir mensajes de error/success de inglés a español en features/products/constants/index.ts

## Capabilities

Ninguna — solo fixes de estándares

## Impact

- Solo frontend. Sin cambios de comportamiento funcional.
- React.memo y useCallback son puramente performance, no cambian UI
- Colores: cambio visual mínimo (naranja hardcodeado → tokens)
- Traducción: usuarios ven textos en español
