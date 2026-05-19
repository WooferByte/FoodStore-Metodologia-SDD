## Decisions

1. **React.memo**: Envolver cada componente exportado con `memo`. Los componentes hijos internos (DesktopTable, MobileCards, RoleBadge en UsersTable; KPI_CONFIGS.map en MetricsKPICards) se benefician indirectamente.
2. **useCallback**: Handlers en UsersPage se envuelven con `useCallback` con dependencias vacías si no capturan variables del closure, o con las dependencias reales.
3. **Colores**: Reemplazar objetos con valores hardcodeados por tokens: `bg-primary/15`, `text-primary`, `bg-warning/15`, `text-warning`, etc.
4. **Traducción**: Mapear mensajes uno a uno manteniendo el mismo tipo de objeto/mensaje.

## Risks

- React.memo puede causar stale closures si las props incluyen objetos sin referencias estables → los handlers ya tienen useCallback, safe.
- Ningún riesgo funcional.
