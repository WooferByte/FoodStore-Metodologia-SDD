## Context

El frontend tiene 14+ archivos que importan `{ cn }` de `@/shared/lib/utils`, pero ese módulo nunca fue creado. Las dependencias `clsx` (v2.1.1) y `tailwind-merge` (v3.6.0) están instaladas en `package.json` pero no se importan en ningún lado. El build `npm run build` (tsc + vite build) falla por esta causa.

No hay un directorio `src/shared/lib/` actualmente — hay que crearlo.

## Goals / Non-Goals

**Goals:**
- Que `npm run build` pase exitosamente
- Que los 14+ archivos puedan importar `cn()` sin error
- Usar las dependencias ya instaladas (`clsx`, `tailwind-merge`)

**Non-Goals:**
- NO migrar imports ni modificar archivos existentes (no hace falta, el import ya está)
- NO agregar nuevas funcionalidades ni utilidades
- NO tocar tests — los tests existentes deben seguir pasando

## Decisions

1. **Ubicación**: `src/shared/lib/utils.ts` — porque 14+ archivos ya importan `@/shared/lib/utils` y el path alias `@/` → `./src/` está configurado en tsconfig
2. **Implementación**: `cn()` es una función que recibe `ClassValue[]` (tipos de `clsx`), los procesa con `clsx` y luego mergea con `tailwind-merge` para resolver conflictos de Tailwind. Firma estándar en la comunidad shadcn/ui.
3. **TypeScript**: Usar `ClassValue` de `clsx` para type-safety. No usar `string[]` porque `clsx` acepta condicionales, objetos, arrays, etc.
4. **Export**: Named export `cn` — porque todos los archivos existentes importan `{ cn }`

## Risks / Trade-offs

- [Bajo] Si el path alias `@/` no estuviera configurado en `tsconfig.json` → verificar que existe. Ya está confirmado que sí.
- [Bajo] Si `tailwind-merge` tuviera una API diferente en v3.6.0 → verificar antes. `twMerge` es la exportación estándar desde v2.
- [Ninguno] Es puramente aditivo — el archivo no existe, crearlo no puede romper nada existente.
