## 0. Skills

- [ ] 0.1 Leer `.agents/skills/tailwind-design-system/SKILL.md` — `cn()` usa `tailwind-merge`, verificar convenciones de utilidades compartidas

## 1. Crear shared/lib/utils.ts

- [ ] 1.1 Crear directorio `src/shared/lib/`
- [ ] 1.2 Crear `src/shared/lib/utils.ts` con la función `cn()`:
  - Importar `clsx` y `ClassValue` desde `clsx`
  - Importar `twMerge` desde `tailwind-merge`
  - Exportar la función `cn(...inputs: ClassValue[]) => twMerge(clsx(inputs))`

## 2. Verificar build

- [ ] 2.1 Ejecutar `cd frontend && npx tsc --noEmit` — verificar 0 errores
- [ ] 2.2 Ejecutar `cd frontend && npm run build` — verificar build exitoso
- [ ] 2.3 Ejecutar `cd frontend && npx vitest run` — verificar que tests existentes sigan pasando
