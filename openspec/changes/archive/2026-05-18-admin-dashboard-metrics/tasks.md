## 0. Skills

- [x] 0.1 Leer `.agents/skills/python-fastapi-ddd-skill/SKILL.md` — arquitectura DDD FastAPI: capas Router → Service → UoW → Repository → Model
- [x] 0.2 Leer `.agents/skills/supabase-postgres-best-practices/SKILL.md` — queries PostgreSQL optimizadas con COUNT/SUM/GROUP BY/DATE_TRUNC sin loops Python
- [x] 0.3 Leer `.agents/skills/api-design/SKILL.md` — diseño de endpoints REST: status codes, headers, query params
- [x] 0.4 Leer `.agents/skills/rest-api-design-patterns/SKILL.md` — patrones REST: versionado, filtros, respuestas
- [x] 0.5 Leer `.agents/skills/jwt-security/SKILL.md` — validación de JWT y RBAC con require_role(["ADMIN"])
- [x] 0.6 Leer `.agents/skills/post-change-verification/SKILL.md` — health check post-change antes de archivar

## 1. Exploración del módulo existente

- [x] 1.1 Leer `backend/admin/router.py` — entender el router existente de usuarios, su prefix y cómo está registrado
- [x] 1.2 Leer `backend/admin/schemas.py` — entender los schemas existentes para no duplicar imports
- [x] 1.3 Leer `backend/admin/service.py` — entender cómo `AdminUsuarioService` usa `uow.session` directamente
- [x] 1.4 Leer `backend/core/models.py` — confirmar campos de `Pedido`, `DetallePedido`, `Producto`, `Usuario`, `EstadoPedido`
- [x] 1.5 Leer `backend/core/uow.py` — confirmar la interfaz `UnitOfWork.session`
- [x] 1.6 Leer `backend/infrastructure/dependencies.py` — confirmar firma de `require_role()`
- [x] 1.7 Leer `backend/main.py` — ver cómo se registran los routers para agregar el nuevo `metricas_router`
- [x] 1.8 Leer un test existente en `backend/tests/` (ej. `test_admin_usuarios.py` si existe) — entender el patrón de tests async del proyecto

## 2. Schemas Pydantic v2 (backend/admin/schemas.py)

- [x] 2.1 Agregar schema `MetricasResumenResponse` con campos: `total_ventas: Decimal`, `pedidos_hoy: int`, `productos_activos: int`, `usuarios_activos: int`
- [x] 2.2 Agregar schema `VentasPorPeriodoItem` con campos: `fecha: datetime`, `total_ventas: Decimal`, `cantidad_pedidos: int`
- [x] 2.3 Agregar schema `VentasResponse` wrapeando lista de `VentasPorPeriodoItem`
- [x] 2.4 Agregar schema `TopProductoItem` con campos: `producto_id: int`, `nombre: str`, `cantidad_total: int`
- [x] 2.5 Agregar schema `TopProductosResponse` wrapeando lista de `TopProductoItem`
- [x] 2.6 Agregar schema `PedidosPorEstadoItem` con campos: `estado: str`, `cantidad: int`
- [x] 2.7 Agregar schema `PedidosPorEstadoResponse` wrapeando lista de `PedidosPorEstadoItem`
- [x] 2.8 Verificar que todos los schemas tienen `model_config = {"from_attributes": True}` donde aplique

## 3. Repository de métricas (backend/admin/repository.py — nuevo archivo)

- [x] 3.1 Crear `backend/admin/repository.py` con clase `AdminMetricasRepository`
- [x] 3.2 Implementar `get_resumen(session, desde, hasta)` — query con `func.sum(Pedido.total)`, `func.count(Pedido.id)` filtrando por `creado_en` si se proveen fechas; `func.count(Producto.id)` con `activo=True, eliminado_en IS NULL`; `func.count(Usuario.id)` con `activo=True, eliminado_en IS NULL`. Pedidos hoy: filtrar por `DATE(creado_en) = TODAY`. Todo en una transacción, sin loops.
- [x] 3.3 Implementar `get_ventas_por_periodo(session, granularidad, desde, hasta)` — query con `func.date_trunc(granularidad_pg, Pedido.creado_en)` as fecha, `func.sum(Pedido.total)`, `func.count(Pedido.id)`, WHERE `eliminado_en IS NULL`, GROUP BY fecha, ORDER BY fecha ASC. El parámetro `granularidad` se mapea: `dia→'day'`, `semana→'week'`, `mes→'month'`.
- [x] 3.4 Implementar `get_top_productos(session, desde, hasta, limit=10)` — query JOINing `DetallePedido → Pedido → EstadoPedido`, WHERE `estado.nombre != 'CANCELADO'` AND `pedido.eliminado_en IS NULL`, GROUP BY `detalle_pedido.producto_id`, `detalle_pedido.nombre_snapshot`, ORDER BY `SUM(cantidad) DESC`, LIMIT 10.
- [x] 3.5 Implementar `get_pedidos_por_estado(session)` — dos queries: 1) SELECT todos los `EstadoPedido`; 2) COUNT GROUP BY `estado_id` sobre `Pedido` no eliminados; merge en Python con defaultdict. Máximo 6 filas — no viola regla anti-loop.

## 4. Service de métricas (backend/admin/service.py)

- [x] 4.1 Agregar clase `AdminMetricasService` en `service.py` (separada de `AdminUsuarioService`)
- [x] 4.2 Implementar `get_resumen(uow, desde, hasta)` — delega a `AdminMetricasRepository.get_resumen(uow.session, desde, hasta)`, retorna `MetricasResumenResponse`
- [x] 4.3 Implementar `get_ventas(uow, granularidad, desde, hasta)` — delega al repository, retorna lista de `VentasPorPeriodoItem`
- [x] 4.4 Implementar `get_top_productos(uow, desde, hasta)` — delega al repository, retorna lista de `TopProductoItem`
- [x] 4.5 Implementar `get_pedidos_por_estado(uow)` — delega al repository, retorna lista de `PedidosPorEstadoItem`

## 5. Router de métricas (backend/admin/router.py)

- [x] 5.1 Agregar `metricas_router = APIRouter(prefix="/admin/metricas", tags=["admin-metricas"])` en `router.py`
- [x] 5.2 Implementar `GET /` → `resumen` con `response_model=MetricasResumenResponse`, params `desde: Optional[date] = None, hasta: Optional[date] = None`, dependency `require_role(["ADMIN"])`, header `Cache-Control: max-age=300`
- [x] 5.3 Implementar `GET /ventas` con `response_model=VentasResponse`, param `granularidad: Literal["dia", "semana", "mes"]`, params de fecha opcionales, `require_role(["ADMIN"])`, `Cache-Control: max-age=300`
- [x] 5.4 Implementar `GET /top-productos` con `response_model=TopProductosResponse`, params de fecha opcionales, `require_role(["ADMIN"])`, `Cache-Control: max-age=300`
- [x] 5.5 Implementar `GET /pedidos-por-estado` con `response_model=PedidosPorEstadoResponse`, `require_role(["ADMIN"])`, `Cache-Control: max-age=300`
- [x] 5.6 Verificar que todos los endpoints tienen `response_model` explícito y no usan lógica de negocio en el router

## 6. Registrar el nuevo router en main.py

- [x] 6.1 Importar `metricas_router` desde `admin.router` en `backend/main.py`
- [x] 6.2 Registrar con `app.include_router(metricas_router, prefix="/api/v1")` (mismo prefix que el router de usuarios)
- [ ] 6.3 Verificar en Swagger (`/docs`) que los 4 endpoints aparecen bajo el tag `admin-metricas`

## 7. Tests (backend/tests/test_admin_metricas.py)

- [x] 7.1 Crear `backend/tests/test_admin_metricas.py` con fixture de cliente async autenticado como ADMIN
- [x] 7.2 Test: `GET /resumen` sin fechas → 200, campos presentes y son números >= 0
- [x] 7.3 Test: `GET /resumen?desde=2020-01-01&hasta=2020-12-31` → 200 con filtro (puede devolver 0 ventas en ese rango)
- [x] 7.4 Test: `GET /resumen` sin token → 401
- [x] 7.5 Test: `GET /resumen` con usuario no-ADMIN → 403
- [x] 7.6 Test: `GET /ventas?granularidad=dia` → 200, array (puede ser vacío si no hay datos)
- [x] 7.7 Test: `GET /ventas?granularidad=mes` → 200
- [x] 7.8 Test: `GET /ventas?granularidad=hora` → 422 (granularidad inválida)
- [x] 7.9 Test: `GET /top-productos` → 200, array de max 10 items, cada item tiene `producto_id`, `nombre`, `cantidad_total`
- [x] 7.10 Test: `GET /pedidos-por-estado` → 200, array con todos los estados (incluye estados con cantidad=0)
- [x] 7.11 Test: verificar header `Cache-Control: max-age=300` en al menos un endpoint
- [ ] 7.12 Verificar coverage ≥ 60% para el módulo admin (pytest --cov=admin)

## 8. Verificación post-implementación

- [ ] 8.1 Ejecutar `cd backend && .venv/Scripts/pytest -x -q` — todos los tests deben pasar
- [ ] 8.2 Ejecutar `cd backend && .venv/Scripts/black --check .` — sin errores de formato
- [ ] 8.3 Ejecutar `cd backend && .venv/Scripts/flake8 .` — sin errores de lint
- [ ] 8.4 Levantar uvicorn y verificar que los 4 endpoints aparecen en Swagger (`http://localhost:8000/docs`)
- [ ] 8.5 Probar manualmente `GET /api/v1/admin/metricas/resumen` con token ADMIN — verificar header `Cache-Control: max-age=300` en la respuesta
- [ ] 8.6 Probar `GET /api/v1/admin/metricas/ventas?granularidad=dia` — verificar array ordenado por fecha
- [ ] 8.7 Probar `GET /api/v1/admin/metricas/pedidos-por-estado` — verificar que aparecen todos los estados incluso con 0 pedidos
