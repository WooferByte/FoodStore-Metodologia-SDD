# Tasks: fix-timestamps-timezone

## 0. Skills

- [x] 0.1 Leer `.agents/skills/python-fastapi-ddd-skill/SKILL.md` — capas (Router→Service→UoW→Repo→Model): el helper `utc_now()` y los cambios de timestamps son transversales a modelos/repositorios/servicios, sin invertir imports; schemas de respuesta con `datetime` sin stripping manual.
- [x] 0.2 Leer `.agents/skills/supabase-postgres-best-practices/SKILL.md` — migración Alembic `013`: `alter_column` con `type_=sa.DateTime(timezone=True)` y `postgresql_using='col AT TIME ZONE ''UTC'''` para reinterpretar naive UTC sin corrimiento; TIMESTAMPTZ vs TIMESTAMP.
- [x] 0.3 Leer `.agents/skills/api-design/SKILL.md` — contrato de respuesta: timestamps RFC 3339 con sufijo `Z` en todos los schemas (`PedidoResponse`, etc.); formato consistente de datetime en JSON.
- [x] 0.4 Leer `.agents/skills/post-change-verification/SKILL.md` — checklist de health check post-cambio: pytest + coverage, alembic upgrade head/current, uvicorn, vitest, tsc; criterio "solo migración" → alembic head + query manual de timestamp histórico.

## 1. Helper `utc_now()` (Strict TDD)

> Strict TDD: test primero → rojo → implementar → verde. Runner: `backend/.venv/Scripts/pytest`.

- [x] 1.1 Escribir test que falla en `backend/tests/test_core_time.py`: `utc_now()` devuelve `datetime` con `tzinfo == timezone.utc` (aware), y es un valor cercano a `datetime.now(timezone.utc)` (±2s).
- [x] 1.2 Crear `backend/core/time.py` con `utc_now() -> datetime: return datetime.now(timezone.utc)`. Correr el test → verde.

## 2. Modelos — default_factories aware + timezone=True (Strict TDD)

- [x] 2.1 Escribir test de guard que falla: iterar `SQLModel.metadata.tables` de `backend/core/models.py` y `backend/pagos/model.py` y assert que TODA columna timestamp (`creado_en`, `actualizado_en`, `eliminado_en`, `ultimo_login`, `expires_at`, `revoked_at`) tiene `type.timezone is True`. Verlo fallar.
- [x] 2.2 Reemplazar los 21 `default_factory=datetime.utcnow` de `backend/core/models.py` por `default_factory=utc_now` + agregar `sa_column_kwargs={"timezone": True}` a cada campo timestamp (Configuracion, Rol, EstadoPedido, FormaPago, Usuario incl. `ultimo_login`, RefreshToken, DireccionEntrega, Categoria, Producto, Ingrediente, Pedido, DetallePedido, HistorialEstadoPedido, Pago). Los `Optional` conservan `nullable=True`.
- [x] 2.3 Reemplazar el `default_factory=datetime.utcnow` de `PagoWebhookLog.creado_en` en `backend/pagos/model.py` (mismo patrón). Correr guard → verde.

## 3. Migración Alembic `013` — columnas TIMESTAMPTZ

- [x] 3.1 Crear `backend/alembic/versions/013_timestamps_timezone.py` (`revision="013"`, `down_revision="012"`): para cada (tabla, columna) del mapeo de design.md → `op.alter_column(table, col, type_=sa.DateTime(timezone=True), postgresql_using=f'"{col}" AT TIME ZONE 'UTC'')`. Downgrade inverso con `postgresql_using='"{col}" AT TIME ZONE 'UTC''` y `type_=sa.DateTime()`.
- [x] 3.2 Mapeo completo (15 tablas, 32 columnas): `roles(creado_en)`, `estados_pedido(creado_en)`, `formas_pago(creado_en)`, `usuarios(ultimo_login, creado_en, actualizado_en, eliminado_en)`, `refresh_tokens(expires_at, revoked_at, creado_en)`, `direcciones_entrega(creado_en, actualizado_en, eliminado_en)`, `categorias(idem)`, `productos(idem)`, `ingredientes(creado_en, eliminado_en)`, `pedidos(creado_en, actualizado_en, eliminado_en)`, `detalle_pedido(creado_en)`, `historial_estado_pedido(creado_en)`, `pagos(creado_en, actualizado_en, eliminado_en)`, `pago_webhook_log(creado_en)`, `configuracion(creado_en, actualizado_en)`.
- [x] 3.3 Ejecutar `backend/.venv/Scripts/alembic upgrade head` y verificar `alembic current` muestra `(head)` = `013`. Verificar con query real que un timestamp histórico conserva el instante (ej. `SELECT creado_en FROM pedidos LIMIT 1` devuelve hora UTC con offset).

## 4. Escrituras explícitas — reemplazar utcnow por utc_now

- [x] 4.1 `backend/infrastructure/repositories/base_repository.py` — `:138` (`actualizado_en`) y `:161` (`eliminado_en`).
- [x] 4.2 `backend/pedidos/repository.py:265` (`actualizado_en`) y `backend/pedidos/service.py:271` (`one_hour_ago = utc_now() - timedelta(hours=1)` — CRÍTICO, comparación contra `Pedido.creado_en` que pasa a aware).
- [x] 4.3 `backend/admin/service.py` — `:57` (revoked_at), `:250` y `:343` (`actualizado_en`); `backend/admin/repository.py:62` → `utc_now().date()` (KPI `pedidos_hoy`).
- [x] 4.4 `backend/configuracion/service.py:110`, `backend/pagos/service.py:419`, `backend/direcciones/repository.py:82`.
- [x] 4.5 `backend/auth/service.py` — `:100`, `:206`, `:362` (`expires_at`), `:260` y `:289` (`revoked_at`/`now` de comparación); `backend/usuarios/perfil_service.py:111` (`revoked_at`).
- [x] 4.6 Actualizar el docstring de `backend/usuarios/role_service.py:76` (ya no usa `datetime.utcnow()`).

## 5. Seed — timestamps aware

- [x] 5.1 `backend/scripts/seed_dev_data.py:49` → `NOW = utc_now()`. Verificar que el seed sigue insertando fechas coherentes (correr el seed contra la BD local si el entorno lo permite).

## 6. Backend tests — serialización con Z + comparaciones naive/aware (Strict TDD)

- [x] 6.1 Escribir test de serialización que falla ANTES del cambio (rojo) y pasa DESPUÉS: `PedidoResponse(creado_en=datetime(2026,8,25,18,12,56,tzinfo=timezone.utc)).model_dump_json()` contiene `"2026-08-25T18:12:56Z"`, y un `datetime` naive NUNCA se emite sin offset en schemas de respuesta. Ubicación sugerida: `backend/tests/test_orders_api.py` o `test_core_time.py`.
- [x] 6.2 Actualizar comparaciones naive-vs-aware (rompen con `TypeError`): `test_auth_login.py:202-204` y `test_auth_register.py:214-216` (`expected_min/expected_max` con `datetime.now(timezone.utc)`); `test_auth_logout.py:166-178` (`before/after` aware); `test_base_repository.py:25-27,115-123` (MockEntity con `utc_now` como default_factory y assert de aware); `test_infrastructure_integration.py:125-140` (verificar comparación `> old_time`).
- [x] 6.3 Correr suite de tests afectados: `backend/.venv/Scripts/pytest tests/test_core_time.py tests/test_auth_login.py tests/test_auth_register.py tests/test_auth_logout.py tests/test_base_repository.py tests/test_infrastructure_integration.py tests/test_orders_api.py tests/test_pagos.py tests/test_configuracion.py -x -q` → verdes.

## 7. Suite backend completa

- [x] 7.1 Correr `backend/.venv/Scripts/pytest --cov=. --cov-report=term-missing -x -q` → todos verdes, coverage ≥ 60%.
- [x] 7.2 Correr `backend/.venv/Scripts/black --check .` y `backend/.venv/Scripts/flake8 .` → sin errores.
- [x] 7.3 Guard de regresión: `grep -r "utcnow" backend --include=*.py` NO debe devolver resultados en código de app/seed (solo puede aparecer en docstrings históricos ya corregidos).

## 8. Frontend — verificación sin cambios de código

- [x] 8.1 Correr `npx vitest run` → todos verdes (los mocks de órdenes ya usan `'...Z'`; los de profile/addresses no asertan hora exacta). Si alguno falla por tz, evaluar ajuste de mock — NO cambiar lógica de negocio.
- [x] 8.2 Correr `npx tsc --noEmit` → 0 errores.

## 9. Post-change verification

- [x] 9.1 Ejecutar checklist de `post-change-verification`: backend `.venv/Scripts/pytest --cov=. --cov-report=term-missing -x -q` (≥60%), `.venv/Scripts/alembic upgrade head` + `alembic current` (head `013`), uvicorn arranca y Swagger OK, frontend `npx tsc --noEmit` y `npx vitest run` (≥40%).
- [x] 9.2 Guía de testing manual (Regla 3 de AGENTS.md) con PASO 4 específico: crear un pedido real y verificar que la respuesta JSON de `GET /api/v1/pedidos` devuelve `creado_en` con sufijo `Z` y que el frontend lo muestra en hora local correcta (ej. 18:12Z → 15:12 en Argentina). Validar BD: `SELECT id, creado_en FROM pedidos ORDER BY id DESC LIMIT 1` → valor con offset UTC.
- [x] 9.3 Responder con el bloque de confirmación exacto: "✅ pytest: X/X passing · alembic: at head (013) · vitest: X/X passing · tsc: 0 errors · build: compiled successfully" antes de pedir aprobación para `opsx:archive`.
