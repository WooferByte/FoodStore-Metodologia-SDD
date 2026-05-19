## Context

El módulo `backend/admin/` ya existe con 3 endpoints de gestión de usuarios (list, update, toggle estado), todos con `require_role(["ADMIN"])`. No tiene repositorio propio — la lógica de consulta vive directamente en `AdminUsuarioService` usando `uow.session`. Este change extiende el mismo módulo con 4 nuevos endpoints de métricas de solo lectura.

Las queries de métricas necesitan JOINs multi-tabla y agregaciones (COUNT, SUM, GROUP BY, DATE_TRUNC). El diseño debe garantizar que ninguna lógica de agregación ocurra en Python con loops — todo debe ejecutarse en PostgreSQL.

**Estado actual**:
- `backend/admin/router.py` — router con prefix `/admin/usuarios`
- `backend/admin/schemas.py` — schemas solo para usuarios
- `backend/admin/service.py` — `AdminUsuarioService` con métodos de gestión de usuarios
- Sin `repository.py` en admin — el service accede a `uow.session` directamente
- Módulo registrado en `main.py` bajo `/api/v1`

## Goals / Non-Goals

**Goals:**
- 4 endpoints GET bajo `/api/v1/admin/metricas/` con `require_role(["ADMIN"])`
- Queries 100% en PostgreSQL: COUNT, SUM, GROUP BY, DATE_TRUNC — sin loops en Python
- Header `Cache-Control: max-age=300` en todos los endpoints de métricas
- Filtro de fechas opcional `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` en 3 de los 4 endpoints
- Granularidad configurable (`dia|semana|mes`) para `/ventas` con validación Pydantic
- Estados con 0 pedidos incluidos en `/pedidos-por-estado` (LEFT JOIN o CASE WHEN)
- Solo pedidos no cancelados en `/top-productos`
- RFC 7807 para errores (granularidad inválida → 422)
- Tests en `backend/tests/test_admin_metricas.py`

**Non-Goals:**
- No se agregan endpoints para modificar datos (solo lectura)
- No se implementa caché en servidor (Redis, etc.) — solo el header `Cache-Control`
- No se agrega frontend (este change es backend-only)
- No se migra el esquema de BD (no hay nuevas tablas/columnas)
- No se pagina ningún endpoint de métricas (los datasets son acotados por diseño)

## Decisions

### D1: Dónde colocar las queries — nuevo `repository.py` en admin

**Decisión**: Crear `backend/admin/repository.py` con `AdminMetricasRepository`.

**Rationale**: El service existente ya accede a `uow.session` directamente (sin repository), lo cual es aceptable para queries simples. Sin embargo, las queries de métricas son SQL complejo con múltiples JOINs y agregaciones. Poner eso en el service viola la arquitectura (Router → Service → UoW → Repository → Model). Un repository propio mantiene la capa de acceso a datos separada de la lógica de negocio.

**Alternativa descartada**: Poner las queries directamente en el service como hace `AdminUsuarioService`. Descartado porque las queries de métricas son demasiado complejas para el service — mezclaría responsabilidades y dificultaría testing.

### D2: Router separado para métricas vs. extender el router de usuarios

**Decisión**: Crear un segundo `APIRouter` con prefix `/admin/metricas` en el mismo `router.py` (o un `metricas_router` separado registrado en `main.py`).

**Rationale**: El router de usuarios tiene prefix `/admin/usuarios` hardcodeado. Las métricas van bajo `/admin/metricas/`. Cambiar el prefix del router existente rompería los endpoints de usuarios. La solución más limpia es un router adicional, ya sea en el mismo archivo o en uno nuevo.

**Implementación elegida**: Agregar `metricas_router = APIRouter(prefix="/admin/metricas", tags=["admin-metricas"])` en `router.py` y registrarlo en `main.py` junto al router de usuarios. Mantiene todo el módulo admin en un solo lugar.

### D3: Cómo implementar `Cache-Control: max-age=300`

**Decisión**: Usar `Response` como parámetro en cada endpoint y setear el header manualmente: `response.headers["Cache-Control"] = "max-age=300"`.

**Rationale**: Es el approach estándar en FastAPI para headers customizados sin middleware. No requiere dependencias adicionales y es explícito.

**Alternativa descartada**: Middleware global — sobrecomplica y aplicaría a todos los endpoints, no solo métricas.

### D4: Estados con 0 pedidos en `/pedidos-por-estado`

**Decisión**: Hacer un SELECT de todos los `estado_pedido` y LEFT JOIN contra los pedidos, o generar los 0 en Python sobre el resultado de GROUP BY.

**Implementación elegida**: Query con `func.count()` y GROUP BY sobre `EstadoPedido`, LEFT JOINing a `Pedido`. Alternativamente, traer todos los estados en una query y los counts en otra, luego merge en Python con dict. Esta segunda opción es más simple y segura porque evita complejidad de LEFT JOIN con condiciones de filtro de fecha.

**Query elegida para pedidos-por-estado**:
```sql
-- Paso 1: todos los estados
SELECT id, nombre FROM estado_pedido

-- Paso 2: counts (con filtro de fecha si aplica)
SELECT ep.nombre, COUNT(p.id)
FROM estado_pedido ep
LEFT JOIN pedido p ON p.estado_id = ep.id
  AND p.eliminado_en IS NULL
GROUP BY ep.nombre

-- Merge en Python con defaultdict (sin loop sobre pedidos individuales)
```
Esto NO viola la regla "sin loops" — el merge en Python opera sobre conteos (máximo 6 filas), no sobre pedidos individuales.

### D5: Granularidad en `/ventas` — validación con Enum Pydantic

**Decisión**: Usar `Literal["dia", "semana", "mes"]` en el query param de FastAPI. FastAPI valida automáticamente y retorna 422 si el valor no está en el conjunto.

**Rationale**: Más idiomático que validación manual. El error 422 cumple RFC 7807 automáticamente con el exception handler global de FastAPI.

**Mapping a DATE_TRUNC**:
- `dia` → `DATE_TRUNC('day', p.creado_en)`
- `semana` → `DATE_TRUNC('week', p.creado_en)`
- `mes` → `DATE_TRUNC('month', p.creado_en)`

### D6: Service de métricas — clase nueva o métodos estáticos en AdminUsuarioService

**Decisión**: Clase nueva `AdminMetricasService` en `service.py`.

**Rationale**: Separación de responsabilidades. `AdminUsuarioService` gestiona usuarios. `AdminMetricasService` provee métricas. Mantenerlas separadas facilita testing y evolución independiente.

## Risks / Trade-offs

- **Queries sin índices en `creado_en`**: Si la tabla `pedido` no tiene índice en `creado_en`, las queries de ventas con filtro de fechas harán seq scan. [Riesgo] → Verificar con `EXPLAIN ANALYZE` post-implementación. Si hay problema de performance, agregar `CREATE INDEX CONCURRENTLY idx_pedido_creado_en ON pedido(creado_en)` en una migración separada.

- **Cache-Control sin invalidación activa**: `max-age=300` en el header indica al cliente/proxy cachear 5 minutos, pero no invalida automáticamente si hay cambios en pedidos. [Riesgo] → Aceptable para dashboard de métricas. Los administradores esperan datos con latencia de minutos.

- **Estado CANCELADO incluido en resumen pero excluido de top-productos**: Esta asimetría puede confundir. [Trade-off] → Documentado en los schemas. El resumen muestra todos los pedidos para tener el número total real; el top-productos excluye cancelados para mostrar el ranking de ventas efectivas.

- **Sin repository en admin previo**: El service existente accede directamente a `uow.session`. Al agregar un repository para métricas, existe una inconsistencia dentro del módulo. [Trade-off aceptable] → Las queries de métricas son complejas y justifican el repository. No refactorizar el service de usuarios para no agregar riesgo innecesario.

## Migration Plan

1. No hay migraciones de BD — este change es de solo lectura.
2. Deploy: agregar archivos nuevos y actualizar `main.py` y `router.py`.
3. Rollback: revertir los cambios en `main.py` y `router.py`. Los archivos nuevos pueden quedar sin afectar otros componentes.

## Open Questions

- ¿Se necesita índice en `pedido.creado_en` para performance aceptable? → Verificar con datos reales post-deploy. Si el dataset de pedidos es pequeño (<10k rows) no es urgente.
- ¿El filtro de fechas en `/pedidos-por-estado` es útil? → Por ahora el endpoint no lo tiene (sin rango obligatorio). Se puede agregar en futuro change.
