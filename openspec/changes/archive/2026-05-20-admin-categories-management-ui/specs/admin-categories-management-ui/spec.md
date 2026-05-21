## ADDED Requirements

### Requirement: Tabla expandible de categorías jerárquicas
La página `/admin/categorias` SHALL mostrar todas las categorías en una tabla expandible donde las categorías raíz (sin padre) son filas de nivel 0 y sus subcategorías se muestran con indentación visual `pl-6` por nivel de profundidad. Cada fila raíz con hijos SHALL tener un botón toggle ▶/▼ para expandir o colapsar sus subcategorías. El estado de expansión es local al componente y no se persiste.

#### Scenario: Ver tabla inicial con categorías raíz
- **WHEN** el administrador navega a `/admin/categorias`
- **THEN** se muestran todas las categorías raíz (`categoria_padre_id === null`) con sus columnas (nombre, descripción, ID de padre, profundidad, estado, acciones)

#### Scenario: Expandir subcategorías de una categoría raíz
- **WHEN** el administrador hace clic en el botón ▶ de una categoría raíz con subcategorías
- **THEN** se muestran las subcategorías directas indentadas bajo la categoría padre con `pl-6` adicional y el botón cambia a ▼

#### Scenario: Colapsar subcategorías
- **WHEN** el administrador hace clic en el botón ▼ de una categoría expandida
- **THEN** las subcategorías se ocultan y el botón regresa a ▶

#### Scenario: Fila sin subcategorías no muestra botón toggle
- **WHEN** una categoría no tiene subcategorías
- **THEN** su fila no muestra botón ▶/▼ (solo espacio equivalente para alineación)

### Requirement: Búsqueda client-side de categorías
La página SHALL proveer un input de búsqueda que filtre en tiempo real por `nombre` sobre todas las categorías (raíces y subcategorías). Al haber una query activa, la tabla SHALL mostrar la lista plana filtrada (sin estructura árbol). Al limpiar la búsqueda, SHALL restaurar la vista árbol expandible.

#### Scenario: Búsqueda filtra raíces y subcategorías
- **WHEN** el administrador escribe texto en el input de búsqueda
- **THEN** se muestran todas las categorías cuyo `nombre` contiene el texto (case-insensitive), incluyendo subcategorías de cualquier nivel

#### Scenario: Sin resultados muestra mensaje vacío
- **WHEN** la búsqueda no encuentra coincidencias
- **THEN** se muestra un mensaje "No se encontraron categorías" en lugar de la tabla

#### Scenario: Limpiar búsqueda restaura vista árbol
- **WHEN** el administrador borra el texto del input de búsqueda
- **THEN** la tabla regresa a la vista árbol con todas las raíces visibles y subcategorías colapsadas

### Requirement: Crear categoría raíz o subcategoría
El sistema SHALL permitir crear una nueva categoría mediante un modal con campos: `nombre` (requerido), `descripción` (opcional) y `categoria_padre_id` (opcional — seleccionable de la lista de categorías existentes). Al seleccionar un padre, la nueva categoría será subcategoría de ese padre. Al dejar el campo vacío, será categoría raíz.

#### Scenario: Abrir modal de creación
- **WHEN** el administrador hace clic en el botón "Nueva Categoría"
- **THEN** se abre el `CategoryEditModal` con todos los campos vacíos y el select de padre con opción "Sin padre (categoría raíz)" seleccionada

#### Scenario: Crear categoría raíz exitosamente
- **WHEN** el administrador ingresa un nombre, deja el campo padre vacío y confirma
- **THEN** se realiza POST `/api/v1/categorias` con `{ nombre, descripcion, categoria_padre_id: null }`, la tabla se actualiza con la nueva categoría raíz y el modal se cierra

#### Scenario: Crear subcategoría exitosamente
- **WHEN** el administrador ingresa un nombre, selecciona un padre en el select y confirma
- **THEN** se realiza POST `/api/v1/categorias` con `{ nombre, descripcion, categoria_padre_id: <id> }`, la tabla se actualiza y el modal se cierra

#### Scenario: Nombre requerido — validación client-side
- **WHEN** el administrador intenta confirmar con el campo nombre vacío
- **THEN** se muestra un mensaje de error "El nombre es requerido" y no se realiza la petición

### Requirement: Editar categoría existente
El sistema SHALL permitir editar los campos `nombre`, `descripcion` y `categoria_padre_id` de una categoría existente mediante el mismo `CategoryEditModal` precargado con los valores actuales.

#### Scenario: Abrir modal de edición
- **WHEN** el administrador hace clic en el botón Editar de una categoría
- **THEN** se abre el `CategoryEditModal` con `nombre`, `descripcion` y `categoria_padre_id` precargados con los valores actuales de la categoría

#### Scenario: Editar y guardar exitosamente
- **WHEN** el administrador modifica uno o más campos y confirma
- **THEN** se realiza PUT `/api/v1/categorias/{id}` con los campos modificados, la tabla se actualiza y el modal se cierra

#### Scenario: Categoría no puede ser su propio padre
- **WHEN** el select de padre excluye la categoría que se está editando de las opciones
- **THEN** no aparece en el listado de padres seleccionables (filtrado client-side en el select)

### Requirement: Eliminar categoría con preview de cascade
El sistema SHALL requerir confirmación antes de eliminar una categoría. El modal de confirmación SHALL mostrar los nombres de las subcategorías hijas directas que se eliminarán en cascada. Si el backend responde con 409 (categoría con productos activos), el sistema SHALL mostrar un mensaje de error sin cerrar el modal.

#### Scenario: Abrir modal de confirmación de borrado
- **WHEN** el administrador hace clic en el botón Eliminar de una categoría
- **THEN** se abre el `CategoryDeleteModal` con el nombre de la categoría y la lista de subcategorías hijas directas afectadas (si las hay)

#### Scenario: Confirmar eliminación sin hijos
- **WHEN** la categoría no tiene subcategorías y el administrador confirma
- **THEN** se realiza DELETE `/api/v1/categorias/{id}`, la categoría desaparece de la tabla y el modal se cierra

#### Scenario: Confirmar eliminación con hijos — cascade preview
- **WHEN** la categoría tiene subcategorías hijas directas y el administrador confirma
- **THEN** se realiza DELETE `/api/v1/categorias/{id}` (el backend maneja el cascade), la tabla se actualiza y el modal se cierra

#### Scenario: Backend rechaza con 409 (productos activos)
- **WHEN** el backend responde 409 al intentar eliminar
- **THEN** el modal muestra el mensaje de error "No se puede eliminar: la categoría tiene productos activos" sin cerrar el modal

### Requirement: Responsive — tabla desktop, cards mobile
La página SHALL mostrar la tabla expandible en pantallas `md` y superiores. En pantallas menores a `md`, SHALL mostrar un layout de cards anidadas donde las subcategorías aparecen visualmente indentadas bajo su padre.

#### Scenario: Vista desktop muestra tabla
- **WHEN** el ancho de viewport es ≥ 768px (breakpoint `md`)
- **THEN** se renderiza `CategoriesTable` con columnas completas

#### Scenario: Vista mobile muestra cards
- **WHEN** el ancho de viewport es < 768px
- **THEN** cada categoría raíz se muestra como card con sus subcategorías indentadas debajo

### Requirement: Accesibilidad ARIA en tabla expandible y modales
El sistema SHALL implementar atributos ARIA correctos: `aria-expanded` en botones toggle, `aria-controls` apuntando al ID del contenedor de subcategorías, `role="dialog"` y `aria-labelledby` en modales con focus trap al abrir.

#### Scenario: Botón toggle con aria-expanded
- **WHEN** una fila padre tiene su toggle en estado colapsado
- **THEN** el botón toggle tiene `aria-expanded="false"`; al expandir cambia a `aria-expanded="true"`

#### Scenario: Modal accesible con focus trap
- **WHEN** se abre cualquier modal (create/edit/delete)
- **THEN** el foco se mueve al primer elemento interactivo del modal y Tab/Shift+Tab ciclan solo dentro del modal

#### Scenario: Botones icon-only con aria-label descriptivo
- **WHEN** existen botones con solo icono (Editar, Eliminar, Toggle)
- **THEN** cada botón tiene `aria-label` descriptivo con el nombre de la acción y la entidad afectada
