## 0. Skills

- [x] 0.1 Leer `.agents/skills/tailwind-design-system/SKILL.md` — `cn()` usa `tailwind-merge`, verificar convenciones de utilidades compartidas

## 1. Crear shared/lib/utils.ts

- [x] 1.1 Crear directorio `src/shared/lib/`
- [x] 1.2 Crear `src/shared/lib/utils.ts` con la función `cn()`:
  - Importar `clsx` y `ClassValue` desde `clsx`
  - Importar `twMerge` desde `tailwind-merge`
  - Exportar la función `cn(...inputs: ClassValue[]) => twMerge(clsx(inputs))`

## 2. Verificar build

- [x] 2.1 Ejecutar `cd frontend && npx tsc --noEmit` — verificar 0 errores
- [x] 2.2 Ejecutar `cd frontend && npm run build` — verificar build exitoso
- [x] 2.3 Ejecutar `cd frontend && npx vitest run` — verificar que tests existentes sigan pasando
