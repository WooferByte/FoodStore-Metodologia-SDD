## Why

Ya existe el backend `system-configuration-backend` con endpoints `GET/PUT /api/v1/admin/configuracion`, pero no hay UI para que el administrador pueda ver y modificar las configuraciones del sistema. Actualmente hay un placeholder "Próximamente disponible." en `/admin/configuracion`.

## What Changes

- **Nueva página** `AdminConfiguracionPage` en `/admin/configuracion` — reemplaza el placeholder inline
- **Feature** `features/configuracion/admin/` — siguiendo el patrón estándar FSD del proyecto
- **Tabla** de configuraciones con columnas: clave, valor, descripción, último modificador, última modificación
- **Edición inline** vía modal: seleccionar una configuración → modal con campo `valor` editable
- **Toast** al guardar con éxito o error
- Sin create ni delete: las configuraciones se crean via seed y no se eliminan
- **Sin breaking changes** — el link ya existe en el sidebar

## Capabilities

### New Capabilities

- `frontend-system-configuration-ui`: Interfaz de administración para el sistema de configuración clave-valor, con tabla de configuraciones y modal de edición inline.

### Modified Capabilities

- *(ninguna — no cambian requirements de specs existentes)*

## Impact

- **Frontend**: Nuevo feature `features/configuracion/admin/` (types, constants, 2 hooks, 2 componentes, página)
- **Router**: Reemplazar placeholder inline por `<AdminConfiguracionPage />`
- **No requiere cambios en backend** — usa los endpoints existentes
- **No requiere cambios en navegación** — el link ya existe
