## 0. Skills

- [x] 0.1 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — patrones de memoización y useCallback
- [x] 0.2 Leer `.agents/skills/tailwind-design-system/SKILL.md` — tokens semánticos para reemplazar colores hardcodeados

## 1. React.memo en componentes de lista

- [x] 1.1 Envolver `UsersTable` en React.memo
- [x] 1.2 Envolver `MetricsKPICards` en React.memo
- [x] 1.3 Envolver `DateRangeSelector` en React.memo
- [x] 1.4 Envolver `SalesChart` en React.memo
- [x] 1.5 Envolver `TopProductsChart` en React.memo
- [x] 1.6 Envolver `OrderStateChart` en React.memo
- [x] 1.7 Verificar npx tsc --noEmit

## 2. useCallback en UsersPage

- [x] 2.1 Envolver handleEdit en useCallback
- [x] 2.2 Envolver handleToggleStatus en useCallback
- [x] 2.3 Verificar npx tsc --noEmit

## 3. Colores hardcodeados → tokens semánticos

- [x] 3.1 Reemplazar bg-orange-500/15 text-orange-600 por bg-warning/15 text-warning en ROLE_COLORS
- [x] 3.2 Verificar npx tsc --noEmit + npx vitest run

## 4. Traducir inglés → español en constantes de productos

- [x] 4.1 Traducir ERROR_MESSAGES y SUCCESS_MESSAGES a español
- [x] 4.2 Verificar npx vitest run

## 5. Verificación final

- [x] 5.1 npx tsc --noEmit
- [x] 5.2 npm run build
- [x] 5.3 npx vitest run
