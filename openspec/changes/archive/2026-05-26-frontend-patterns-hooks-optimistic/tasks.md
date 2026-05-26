# Tasks: frontend-patterns-hooks-optimistic

## 0. Skills

- [ ] 0.1 Leer `.agents/skills/vercel-react-best-practices/SKILL.md` — patrones de performance React
- [ ] 0.2 Leer `.agents/skills/zustand-state-management/SKILL.md` — patrones Zustand v5

## 1. Optimistic updates en useCancelOrder

- [ ] 1.1 Agregar `onMutate` en `useCancelOrder`: guardar snapshot del cache de `['orders']` y `['order-detail', id]`, actualizar optimisticamente
- [ ] 1.2 Agregar `onError` con rollback: restaurar snapshots + toast error
- [ ] 1.3 Agregar `onSettled` con invalidación forzada
- [ ] 1.4 Actualizar tests para verificar optimistic rollback

## 2. Optimistic updates en useAdvanceOrderState

- [ ] 2.1 Agregar `onMutate` en `useAdvanceOrderState`: snapshot + update optimista del estado
- [ ] 2.2 Agregar `onError` con rollback
- [ ] 2.3 Agregar `onSettled` con invalidación
- [ ] 2.4 Actualizar tests para verificar optimistic rollback

## 3. Optimistic updates en useBulkOrderActions

- [ ] 3.1 Migrar `useBulkOrderActions` a `useMutation` con `onMutate`/`onError`/`onSettled`
- [ ] 3.2 Agregar rollback parcial para `Promise.allSettled` (algunos fallan, otros no)
- [ ] 3.3 Actualizar tests

## 4. Crear useAuth wrapper

- [ ] 4.1 Crear `features/auth/hooks/useAuth.ts` como wrapper de `useAuthStore` (mismo patrón que `useCart`)
- [ ] 4.2 Crear barrel export en `features/auth/hooks/index.ts`

## 5. Tests

- [ ] 5.1 Ejecutar `vitest run` para verificar 0 regresiones
