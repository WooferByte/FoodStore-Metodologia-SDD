## Context

Post-merge de changes del compañero (frontend-catalog-search-images-refactor, admin-fe, admin-users-ui). Se identificaron 3 issues críticos.

## Goals / Non-Goals

**Goals:**
- Romper dependencia circular entities → features
- Estandarizar className building con cn()
- Corregir parámetros faltantes en API call de productos

**Non-Goals:**
- NO tocar issues medios/bajos (hardcoded colors, inglés, memo faltante)

## Decisions

1. **entities/product/** pasa a ser fuente de verdad de tipos de dominio. features/products/types/ importa desde allí.
2. **cn()** reemplaza template literals y .join(' ') en className condicionales. Es una función pura, no cambia comportamiento.
3. **buildProductsQueryParams** recibe filters completos y agrega excludeAllergens (join por coma) y search (como q param).
