# timestamp-handling Specification

## Purpose
Define el contrato de timestamps de Food Store: todo timestamp se genera como UTC aware, se almacena en columnas `TIMESTAMP WITH TIME ZONE`, y las respuestas de la API lo serializan en RFC 3339 con sufijo `Z`, preservando el instante de los datos históricos almacenados como naive UTC.

## Requirements

### Requirement: Timestamps generados como UTC aware

El sistema SHALL generar todos los timestamps de entidades, auditoría, sesiones y seed como datetime timezone-aware en UTC, y NO SHALL usar `datetime.utcnow()` (naive, deprecado en Python 3.12) en ningún punto de escritura.

#### Scenario: Creación de una entidad con timestamp aware
- **WHEN** se crea una entidad nueva (ej. `Usuario`, `Pedido`, `Pago`, `Configuracion`)
- **THEN** sus campos `creado_en` (y `actualizado_en`/`eliminado_en` cuando aplique) son datetimes con `tzinfo = timezone.utc`

#### Scenario: Actualización y soft-delete con timestamp aware
- **WHEN** se actualiza una entidad o se realiza un soft-delete
- **THEN** `actualizado_en` y `eliminado_en` se setean con un datetime aware UTC

#### Scenario: Sin uso de utcnow
- **WHEN** se audita el codebase backend
- **THEN** no existe ninguna invocación a `datetime.utcnow()` en código de aplicación ni de seed

### Requirement: Almacenamiento en columnas TIMESTAMP WITH TIME ZONE

El sistema SHALL almacenar todos los timestamps en columnas PostgreSQL `TIMESTAMP WITH TIME ZONE` (`timezone=True` en los modelos SQLModel), de modo que el instante se preserve al cruzar zonas horarias.

#### Scenario: Todas las columnas timestamp son TIMESTAMPTZ
- **WHEN** se inspecciona el esquema de las 15 tablas del sistema
- **THEN** cada columna timestamp (`creado_en`, `actualizado_en`, `eliminado_en`, `ultimo_login`, `expires_at`, `revoked_at`) es de tipo `TIMESTAMP WITH TIME ZONE`

#### Scenario: Round-trip del instante
- **WHEN** se inserta un datetime aware UTC y se vuelve a leer
- **THEN** el valor leído representa el mismo instante (aware), sin corrimiento

#### Scenario: Migración de columnas existentes
- **WHEN** se ejecuta la migración sobre una base con datos previos en columnas `TIMESTAMP WITHOUT TIME ZONE`
- **THEN** las columnas se convierten a `TIMESTAMPTZ` reinterpretando los valores almacenados (que ya eran UTC) como UTC (`AT TIME ZONE 'UTC'`), sin corrimiento del instante

### Requirement: Serialización RFC 3339 con sufijo Z

El sistema SHALL serializar los datetimes aware UTC en las respuestas de la API en formato RFC 3339 con sufijo `Z` (ej. `"2026-08-25T18:12:56Z"`), y nunca SHALL emitir un timestamp naive sin indicador de zona en la salida JSON.

#### Scenario: Respuesta de pedido con Z
- **WHEN** la API devuelve un `PedidoResponse` (o cualquier schema con timestamps) con un `creado_en` aware UTC
- **THEN** el JSON serializado incluye `"creado_en":"<fecha>T<hora>Z"` con sufijo `Z`

#### Scenario: Sin timestamps naive en la salida
- **WHEN** se serializa cualquier respuesta que contenga datetimes
- **THEN** ningún valor datetime se emite sin indicador de zona u offset (todos son aware UTC → `Z`)

### Requirement: Datos históricos preservan su instante

El sistema SHALL preservar el instante de los registros creados antes de la migración: un valor naive UTC almacenado como `"2026-08-25T18:12:56"` representa las 18:12 UTC y DEBE leerse y serializarse como `"2026-08-25T18:12:56Z"` tras la conversión, sin sumar ni restar horas.

#### Scenario: Reinterpretación de valor histórico
- **WHEN** se consulta un pedido creado antes de la migración con `creado_en` = `"2026-08-25T18:12:56"` (naive UTC)
- **THEN** la API devuelve `"creado_en":"2026-08-25T18:12:56Z"` — el mismo instante, ahora explícitamente UTC

#### Scenario: Display en zona local del cliente
- **WHEN** el frontend parsea `"...Z"` con `new Date()` y formatea con `Intl.DateTimeFormat('es-AR')`
- **THEN** el timestamp se muestra convertido a la zona local del browser (ej. 18:12Z → 15:12 en Argentina UTC-3)
