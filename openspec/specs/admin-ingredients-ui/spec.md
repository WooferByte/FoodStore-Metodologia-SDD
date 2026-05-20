# admin-ingredients-ui Specification

## Purpose
TBD - created by archiving change admin-ingredients-management-ui. Update Purpose after archive.
## Requirements
### Requirement: Tabla de ingredientes con filtro por alérgeno
La página `/admin/ingredientes` SHALL mostrar una tabla con todos los ingredientes activos (no soft-deleteados), mostrando columnas: nombre (`font-medium`), es_alergeno (badge `warning` si es alérgeno, `success` si no), y acciones (editar, eliminar). La tabla SHALL tener un filtro por `es_alergeno` con opciones: "Todos", "Solo alérgenos", "No alérgenos". SHALL seguir el patrón responsive: tabla en desktop, cards en mobile.

#### Scenario: Ver tabla de ingredientes
- **WHEN** el usuario con rol `STOCK` o `ADMIN` navega a `/admin/ingredientes`
- **THEN** se muestran los ingredientes en una tabla con columnas nombre, es_alergeno, acciones

#### Scenario: Filtrar solo alérgenos
- **WHEN** el usuario selecciona "Solo alérgenos" en el filtro
- **THEN** se envía `?es_alergeno=true` al backend y solo se muestran ingredientes con `es_alergeno=true`

#### Scenario: Sin resultados muestra mensaje vacío
- **WHEN** no hay ingredientes que coincidan con el filtro
- **THEN** se muestra un mensaje "No se encontraron ingredientes"

### Requirement: Crear ingrediente
El sistema SHALL permitir crear un nuevo ingrediente mediante un modal con campos: `nombre` (requerido, texto) y `es_alergeno` (toggle, default false).

#### Scenario: Crear ingrediente exitosamente
- **WHEN** el usuario completa nombre y toggle de alérgeno y confirma
- **THEN** se realiza `POST /api/v1/ingredientes/`, la tabla se actualiza, el modal se cierra

#### Scenario: Nombre vacío es rechazado client-side
- **WHEN** el usuario intenta confirmar con nombre vacío
- **THEN** se muestra error "El nombre es requerido" y no se realiza la petición

#### Scenario: Nombre duplicado muestra error del backend
- **WHEN** el backend responde 409 por nombre duplicado
- **THEN** el modal muestra el mensaje de error sin cerrarse

### Requirement: Editar ingrediente
El sistema SHALL permitir editar `nombre` y `es_alergeno` de un ingrediente existente mediante el mismo modal precargado con los valores actuales.

#### Scenario: Editar y guardar exitosamente
- **WHEN** el usuario modifica nombre y/o toggle de alérgeno y confirma
- **THEN** se realiza `PUT /api/v1/ingredientes/{id}`, la tabla se actualiza, el modal se cierra

### Requirement: Soft-delete ingrediente con protección
El sistema SHALL requerir confirmación antes de soft-deletear un ingrediente. Si el backend responde 409 (ingrediente referenciado por productos activos), el sistema SHALL mostrar el mensaje de error sin cerrar el modal.

#### Scenario: Confirmar soft-delete exitoso
- **WHEN** el usuario confirma la eliminación de un ingrediente sin productos activos
- **THEN** se realiza `DELETE /api/v1/ingredientes/{id}`, el ingrediente desaparece de la tabla, el modal se cierra

#### Scenario: Backend rechaza con 409 (productos activos)
- **WHEN** el backend responde 409 al intentar eliminar
- **THEN** el modal muestra mensaje "No se puede eliminar: el ingrediente está siendo usado por productos activos" sin cerrarse

### Requirement: Invalidación cruzada de caché
Al crear, actualizar o eliminar un ingrediente, el sistema SHALL invalidar las query keys `admin-ingredients` y `products` para que el catálogo público refleje los cambios.

#### Scenario: Cambio en ingrediente se refleja en productos
- **WHEN** un administrador modifica un ingrediente
- **THEN** la query key `products` es invalidada para que el catálogo público refetchee

### Requirement: Ruta protegida y navegación
La ruta `/admin/ingredientes` SHALL estar protegida por `ProtectedRoute` con roles `['STOCK', 'ADMIN']`. SHALL existir un link en el sidebar del admin con icono `Wheat` de lucide-react.

