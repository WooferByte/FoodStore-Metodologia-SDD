## Why

El build de producción (`npm run build`) está roto porque 14+ archivos importan `{ cn }` de `@/shared/lib/utils` pero ese archivo nunca fue creado. Las dependencias `clsx` y `tailwind-merge` están instaladas en `package.json` pero nunca se importan. Esto bloquea cualquier deploy, verificación CI/CD, o entrega.

## What Changes

- Crear el archivo `src/shared/lib/utils.ts` con la función `cn()` que combine `clsx` + `tailwind-merge`
- Crear el directorio `src/shared/lib/` (no existe actualmente)
- No se modifica ningún archivo existente — es puramente aditivo
- Verificar que `npm run build` pase exitosamente después del cambio

## Capabilities

### New Capabilities
- `shared-utils`: Función utilitaria `cn()` para combinar clases CSS con soporte de Tailwind v4, ubicada en `@/shared/lib/utils`

### Modified Capabilities
-  Ninguno — es puramente aditivo, no cambia requirements existentes

## Impact

- **Frontend**: 14+ archivos desbloquean su import `{ cn }` actualmente fallido
- **Build**: `npm run build` (tsc + vite build) pasa de rojo a verde
- **Dependencias**: `clsx` y `tailwind-merge` entran en uso real (hoy están instaladas pero huérfanas)
- **Riesgo**: Cero — el archivo no existe hoy, crearlo no rompe nada
