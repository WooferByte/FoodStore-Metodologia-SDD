## ADDED Requirements

### Requirement: Configuration List Page

The system SHALL provide a page at `/admin/configuracion` showing all system configurations in a table.

#### Scenario: Admin views all configs
- **WHEN** an authenticated ADMIN user navigates to `/admin/configuracion`
- **THEN** the page SHALL display a table with columns: Clave, Valor, Descripción, Última modificación, Acciones
- **AND** each row SHALL contain: `clave` (monospace font), `valor` (with type badge), `descripcion`, `actualizado_en` (formatted date), and an "Editar" button
- **AND** SHALL show a badge indicating the value type (number, boolean, text)

#### Scenario: Loading state
- **WHEN** the page is loading
- **THEN** SHALL display Skeleton components in place of the table

#### Scenario: Empty state
- **WHEN** no configurations exist
- **THEN** SHALL display an empty state message "No hay configuraciones disponibles"

#### Scenario: Error state
- **WHEN** the API request fails
- **THEN** SHALL display an error message with a "Reintentar" button

### Requirement: Edit Configuration Modal

The system SHALL provide a modal dialog to edit a configuration value.

#### Scenario: Open edit modal
- **WHEN** the admin clicks "Editar" on a configuration row
- **THEN** a modal SHALL open showing: the `clave` (read-only), the `descripcion`, and an input field pre-filled with the current `valor`

#### Scenario: Successful update
- **WHEN** the admin modifies the `valor` and clicks "Guardar"
- **THEN** the system SHALL send a PUT request to `/api/v1/admin/configuracion/{clave}`
- **AND** on success, SHALL show a success toast "Configuración actualizada"
- **AND** SHALL close the modal
- **AND** SHALL refresh the table data

#### Scenario: Failed update
- **WHEN** the PUT request fails
- **THEN** SHALL show an error toast with the error message
- **AND** the modal SHALL remain open

#### Scenario: Cancel edit
- **WHEN** the admin clicks "Cancelar" or closes the modal
- **THEN** the modal SHALL close without saving

### Requirement: Audit Trail Display

The system SHALL display audit information for each configuration.

#### Scenario: Show last modifier
- **WHEN** the admin views the configuration table
- **THEN** each row SHALL show who last modified the configuration (name or email from `actualizado_por`) and when (`actualizado_en` formatted as datetime)
