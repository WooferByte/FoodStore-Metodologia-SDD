# Design: fix-timestamps-timezone

## Context

Ver `proposal.md — Why`. Los timestamps se escriben naive (UTC) y se leen como si fueran locales en el frontend (+3h). Restricciones y hechos verificados que condicionan el diseño:

- `datetime.utcnow()` se usa en 22 `default_factory` de modelos (`core/models.py` líneas 41-377 + `pagos/model.py:39`) y en 17 escrituras explícitas (`base_repository.py:138,161`, `pedidos/repository.py:265`, `admin/service.py:57,250,343`, `configuracion/service.py:110`, `pagos/service.py:419`, `direcciones/repository.py:82`, `auth/service.py:100,206,260,289,362`, `perfil_service.py:111`, `admin/repository.py:62`, `pedidos/service.py:271`). `role_service.py:76` es solo un docstring desactualizado.
- Columnas: `sa.DateTime()` (→ `TIMESTAMP WITHOUT TIME ZONE`) en migración `001`; `configuracion` (migración `011`) usa `DEFAULT NOW()`. Cero `timezone=True`/`TIMESTAMPTZ` en el codebase.
- **Verificado empíricamente (pydantic 2.13.4 / python 3.13)**: aware UTC → `"2026-08-25T18:12:56Z"`; naive → `"2026-08-25T18:12:56"` sin offset; cualquier offset cero normaliza a `Z`. `config.py` NO tiene `json_encoders` ni setting de timezone. Los schemas de respuesta usan `datetime` plano (`PedidoResponse.creado_en: datetime`, `model_config = from_attributes`) — sin stripping manual.
- SQLModel real instalado: **0.0.38** (AGENTS.md dice `^0.0.14` pero el venv tiene 0.0.38) — soporta `sa_column_kwargs` y `sa_column`.
- Head de migraciones: `012` (`down_revision = "011"`). Próxima migración: `013`.
- Flujo de imports `Router → Service → UoW → Repository → Model` nunca se invierte.
- Frontend parsea con `new Date(iso)` + `Intl.DateTimeFormat('es-AR')`; los mocks de tests de órdenes ya usan `'...Z'`.

## Goals / Non-Goals

**Goals:**
- Todos los timestamps escritos son aware UTC (helper único, sin `utcnow`).
- Columnas `TIMESTAMPTZ` en las 15 tablas (32 columnas).
- Respuestas JSON con `Z`; el frontend muestra la hora local correcta sin cambios de código.
- Datos históricos preservan su instante (reinterpretación, no corrimiento).

**Non-Goals:**
- NO cambiar la zona horaria por defecto de la sesión PostgreSQL (seguimos guardando UTC).
- NO introducir soporte multi-zona configurable por usuario (`timezone` por usuario) — fuera de alcance.
- NO tocar la UI/lógica de fechas del frontend (usa `new Date` correctamente una vez que hay `Z`).
- NO modificar migraciones ya aplicadas (`001`..`012`).

## Decisions

### 1. Helper `utc_now()` en `backend/core/time.py` (vs inline `datetime.now(timezone.utc)`)
Nuevo helper:
```python
def utc_now() -> datetime:
    return datetime.now(timezone.utc)
```
Reemplaza los 22 `default_factory` (con `default_factory=utc_now`) y las 17 escrituras explícitas.

**Por qué helper en vez de inline:** (a) `datetime.now(timezone.utc)` es verboso en ~40 call sites; (b) centraliza la fuente del reloj del sistema — si mañana se necesita reloj inyectable/reloj de test, se cambia en UN lugar; (c) permite la verificación trivial "grep utcnow → 0 resultados" como guard de regresión; (d) la API deprecada queda encapsulada. **Alternativas consideradas:** inline (descartado por verbosidad y riesgo de regresión a `utcnow()`); helper con `@staticmethod` en una clase TimeProvider (descartado: sobre-ingeniería para un sistema que ya no necesita reloj inyectable). **Trade-off:** un archivo extra de 4 líneas; aceptado.

### 2. `timezone=True` en los modelos SQLModel vía `sa_column_kwargs`
En `core/models.py` y `pagos/model.py`, cada campo timestamp se declara con:
```python
creado_en: datetime = Field(default_factory=utc_now, sa_column_kwargs={"timezone": True})
```
(mismo patrón para `actualizado_en`, `eliminado_en`, `ultimo_login`, `expires_at`, `revoked_at`; los `Optional` conservan `nullable=True`).

**Por qué `sa_column_kwargs` en vez de `sa_column=Column(...)`:** es menos boilerplate, SQLModel sigue auto-generando la `Column` con su `nullable` correcto, y el venv real (SQLModel 0.0.38) lo soporta (verificado vía `inspect.signature`). El codebase ya usa `sa_column=` solo para el ARRAY de `DetallePedido`, que es un caso especial. **Trade-off:** `sa_column_kwargs` no estaba en 0.0.14 — irrelevante porque el venv tiene 0.0.38.

### 3. Migración Alembic `013` — reinterpretación con `AT TIME ZONE 'UTC'`
Migración `013_timestamps_timezone.py` (`revision="013"`, `down_revision="012"`) que convierte las **32 columnas de las 15 tablas** de `TIMESTAMP WITHOUT TIME ZONE` a `TIMESTAMPTZ`, reinterpretando los valores existentes (que ya son UTC) como UTC — sin corrimiento del instante:

```python
def upgrade() -> None:
    for table, cols in TIMESTAMP_COLUMNS.items():
        for col in cols:
            op.alter_column(
                table, col,
                type_=sa.DateTime(timezone=True),
                postgresql_using=f'"{col}" AT TIME ZONE \'UTC\'',
            )

def downgrade() -> None:
    for table, cols in TIMESTAMP_COLUMNS.items():
        for col in cols:
            op.alter_column(
                table, col,
                type_=sa.DateTime(),
                postgresql_using=f'"{col}" AT TIME ZONE \'UTC\'',
            )
```

Tablas y columnas (mapeo completo desde los modelos):
- `roles` → `creado_en`
- `estados_pedido` → `creado_en`
- `formas_pago` → `creado_en`
- `usuarios` → `ultimo_login`, `creado_en`, `actualizado_en`, `eliminado_en`
- `refresh_tokens` → `expires_at`, `revoked_at`, `creado_en`
- `direcciones_entrega` → `creado_en`, `actualizado_en`, `eliminado_en`
- `categorias` → `creado_en`, `actualizado_en`, `eliminado_en`
- `productos` → `creado_en`, `actualizado_en`, `eliminado_en`
- `ingredientes` → `creado_en`, `eliminado_en`
- `pedidos` → `creado_en`, `actualizado_en`, `eliminado_en`
- `detalle_pedido` → `creado_en`
- `historial_estado_pedido` → `creado_en`
- `pagos` → `creado_en`, `actualizado_en`, `eliminado_en`
- `pago_webhook_log` → `creado_en`
- `configuracion` → `creado_en`, `actualizado_en`

**Por qué `postgresql_using`:** sin él, PostgreSQL convertiría naive → timestamptz usando la session TimeZone y re-interpretaría/desplazaría; `AT TIME ZONE 'UTC'` fija la interpretación. **`configuracion` conserva `DEFAULT NOW()`:** `NOW()` ya devuelve `timestamptz` y sigue siendo válido como default del `TIMESTAMPTZ`. **Nota:** en PostgreSQL, `c AMERICA ZONE`… no — el `AT TIME ZONE 'UTC'` sobre `timestamp without time zone` produce `timestamptz` sin desplazar el reloj (18:12 → 18:12Z).

### 4. Actualizar las ~17 escrituras explícitas + rate-limit + KPI
Todos los call sites usan `utc_now()`:
- `base_repository.py:138` (`actualizado_en`) y `:161` (`eliminado_en`) — cubren a TODAS las entidades que pasan por `BaseRepository`.
- `pedidos/repository.py:265`, `configuracion/service.py:110`, `pagos/service.py:419`, `direcciones/repository.py:82`, `admin/service.py:57,250,343`, `auth/service.py:100,206,260,289,362`, `perfil_service.py:111`.
- **CRÍTICO (comparaciones)**: `pedidos/service.py:271` (`one_hour_ago = utc_now() - timedelta(hours=1)`) — si queda naive y `Pedido.creado_en` es aware (TIMESTAMPTZ), la query falla con `TypeError`; `auth/service.py:289` (`now = utc_now()`) compara contra `expires_at`/`revoked_at` aware; `admin/repository.py:62` usa `utc_now().date()` (comportamiento idéntico — es comparación por fecha, no por instante). Los checks de expiración de JWT (python-jose) aceptan aware y convierten a unix timestamp — sin cambio adicional.

### 5. Frontend: cero cambios; solo verificación
El frontend ya parsea con `new Date(iso)` y formatea con `Intl.DateTimeFormat('es-AR')`. Al recibir `"…Z"` convierte automáticamente a la zona local (ej. 18:12Z → 15:12 en Argentina). Los mocks de tests de órdenes/timeline ya usan `'2026-05-15T10:00:00Z'`; los de profile/addresses usan naive `'2024-01-01T00:00:00'` pero NO asertan hora exacta (solo fecha/render) → no rompen. El `dateTime` attribute de `OrderCard.test.tsx:49` aserta el string crudo del mock (con `Z`) → sigue pasando.

### 6. Tests backend
- **Nuevos (TDD)**: (a) `utc_now()` devuelve aware con `tzinfo=timezone.utc`; (b) guard de metadata — iterar `SQLModel.metadata.tables` y assert que toda columna timestamp tiene `type.timezone is True`; (c) serialización — `PedidoResponse(creado_en=aware).model_dump_json()` contiene `Z` y NUNCA un datetime naive.
- **Actualizaciones obligatorias** (rompen por naive-vs-aware): `test_auth_login.py:202-204` y `test_auth_register.py:214-216` (`expected_min/max` con `datetime.now(timezone.utc)`), `test_auth_logout.py:166-178` (`before/after` aware), `test_base_repository.py:25-27,115-123` (MockEntity con `utc_now` + assert aware), `test_infrastructure_integration.py:125-140` (verificar/ajustar comparación `> old_time`).
- `test_orders_api.py` usa mocks con `datetime(2026,1,1,12,0,0)` naive — no comparan contra aware → siguen pasando.

## Risks / Trade-offs

- **Tests con comparaciones naive-vs-aware → `TypeError`** → Mitigación: lista cerrada de tests a actualizar (decisión 6); el `pytest -x` de la suite completa los detecta.
- **PostgreSQL convierte `timestamp → timestamptz` mal sin `postgresql_using`** → Mitigación: usar `AT TIME ZONE 'UTC'` en upgrade y downgrade; verificación en post-change-verification con un `SELECT` real de un pedido histórico que devuelva `18:12:56Z`.
- **`DEFAULT NOW()` en `configuracion`** → ya devuelve timestamptz; sin cambio. Si un INSERT llegara por SQL directo, sigue siendo correcto.
- **Clientes externos que parseen timestamps con regex exigiendo offset `+00:00`** → el cambio `...T18:12:56` → `...T18:12:56Z` es **BREAKING menor** de contrato API; el frontend propio no se ve afectado (usa `new Date`). Mitigación: documentado en proposal; sin clientes externos conocidos (app propia).
- **KPI `pedidos_hoy` (admin/repository)** → compara por fecha (cast SQL a DATE); el instante UTC vs aware no cambia el resultado. Sin riesgo.
- **Regresión futura a `utcnow()`** → Mitigación: grep guard en tests (assert `"utcnow" not in` código de app/seed) + helper centralizado.

## Migration Plan

1. **Helper + modelos**: crear `core/time.py`, reemplazar `default_factory`s en `core/models.py` + `pagos/model.py`, agregar `sa_column_kwargs={"timezone": True}`. Tests de metadata rojos primero → verdes.
2. **Escrituras explícitas**: reemplazar los 17 call sites por `utc_now()` (incluye `pedidos/service.py:271` y `auth/service.py`).
3. **Migración `013`**: crear `013_timestamps_timezone.py` con el mapeo de las 15 tablas; ejecutar `backend/.venv/Scripts/alembic upgrade head` y `alembic current` → `(head)`.
4. **Seed**: `seed_dev_data.py:49` → `NOW = utc_now()`.
5. **Tests**: actualizar naive-vs-aware; agregar serialización `Z` y guard de metadata.
6. **Frontend**: correr `npx vitest run` + `npx tsc --noEmit` (sin cambios de código esperados).
7. **Verificación**: checklist `post-change-verification` completo + query manual de un pedido histórico.
8. **Rollback**: `alembic downgrade 012` revierte columnas a `TIMESTAMP WITHOUT TIME ZONE` (los valores ya reinterpretados como UTC se vuelven a leer igual — sin pérdida); revertir el resto de cambios de código.

## Open Questions

Ninguna que cambie specs, approach o tareas. (Nota de contexto, no blocker: AGENTS.md declara `sqlmodel ^0.0.14` pero el venv real tiene 0.0.38 — se usó 0.0.38 para verificar `sa_column_kwargs`; conviene actualizar el stack table en una futura sesión.)
