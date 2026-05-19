## 0. Skills

- [ ] 0.1 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — patrones de memoización y useCallback
- [ ] 0.2 Leer `.agents/skills/tailwind-design-system/SKILL.md` — tokens semánticos para reemplazar colores hardcodeados

## 1. React.memo en componentes de lista

- [ ] 1.1 Envolver `UsersTable` en React.memo
- [ ] 1.2 Envolver `MetricsKPICards` en React.memo
- [ ] 1.3 Envolver `DateRangeSelector` en React.memo
- [ ] 1.4 Envolver `SalesChart` en React.memo
- [ ] 1.5 Envolver `TopProductsChart` en React.memo
- [ ] 1.6 Envolver `OrderStateChart` en React.memo
- [ ] 1.7 Verificar npx tsc --noEmit

## 2. useCallback en UsersPage

- [ ] 2.1 Envolver handleEdit en useCallback
- [ ] 2.2 Envolver handleToggleStatus en useCallback
- [ ] 2.3 Verificar npx tsc --noEmit

## 3. Colores hardcodeados → tokens semánticos

- [ ] 3.1 Reemplazar bg-orange-500/15 text-orange-600 por bg-warning/15 text-warning en ROLE_COLORS
- [ ] 3.2 Verificar npx tsc --noEmit + npx vitest run

## 4. Traducir inglés → español en constantes de productos

- [ ] 4.1 Traducir ERROR_MESSAGES y SUCCESS_MESSAGES a español
- [ ] 4.2 Verificar npx vitest run

## 5. Verificación final

- [ ] 5.1 npx tsc --noEmit
- [ ] 5.2 npm run build
- [ ] 5.3 npx vitest run
