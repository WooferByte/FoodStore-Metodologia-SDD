## ADDED Requirements

### Requirement: Tabla de productos con stock actual
La página `/admin/stock` SHALL mostrar una tabla paginada con todos los productos no eliminados, mostrando columnas: nombre, precio_base, stock_cantidad (con badge de color semántico), disponible (sí/no), y acciones (editar). La tabla SHALL seguir el mismo patrón de responsive design: tabla en desktop (`≥768px`), cards en mobile (`<768px`).

#### Scenario: Ver tabla de stock con productos
- **WHEN** el usuario con rol `STOCK` o `ADMIN` navega a `/admin/stock`
- **THEN** se muestran los productos en una tabla con columnas nombre, precio, stock, disponible, acciones

#### Scenario: Badge de stock con color semántico
- **WHEN** un producto tiene stock_cantidad = 0
- **THEN** el badge SHALL mostrar `error` (rojo)
- **WHEN** un producto tiene stock_cantidad entre 1 y 10
- **THEN** el badge SHALL mostrar `warning` (amarillo)
- **WHEN** un producto tiene stock_cantidad > 10
- **THEN** el badge SHALL mostrar `success` (verde)

#### Scenario: Paginación con más de PAGE_SIZE productos
- **WHEN** el total de productos excede PAGE_SIZE
- **THEN** se muestra paginación en el footer de la tabla

#### Scenario: Vista mobile muestra cards
- **WHEN** el viewport es < 768px
- **THEN** cada producto se renderiza como card en lugar de fila de tabla

### Requirement: Búsqueda y filtros de productos
La página SHALL proveer un input de búsqueda por nombre y un filtro de disponibilidad (`todos`, `sí`, `no`). La búsqueda SHALL tener debounce de 300ms. Los filtros SHALL resetear la página a 1 al cambiar.

#### Scenario: Búsqueda por nombre con debounce
- **WHEN** el usuario escribe en el input de búsqueda
- **THEN** después de 300ms sin escribir, se ejecuta la consulta con `q=<texto>`

#### Scenario: Filtro por disponibilidad
- **WHEN** el usuario selecciona "No" en el filtro de disponible
- **THEN** solo se muestran productos con `disponible === false`

#### Scenario: Sin resultados muestra mensaje vacío
- **WHEN** la búsqueda o filtros no producen resultados
- **THEN** se muestra un mensaje "No se encontraron productos"

#### Scenario: Cambiar filtro resetea página
- **WHEN** el usuario está en página 3 y cambia el filtro de disponibilidad
- **THEN** la página vuelve a 1 automáticamente

### Requirement: Editar stock de un producto
El sistema SHALL permitir actualizar el stock de un producto mediante un modal `StockEditModal` con campo `stock_cantidad` (input number, mínimo 0). El modal SHALL precargar el valor actual y SHALL permitir cambiar también el flag `disponible`.

#### Scenario: Abrir modal de edición de stock
- **WHEN** el usuario hace clic en el botón Editar de un producto
- **THEN** se abre `StockEditModal` con el nombre del producto, el stock actual precargado, y el toggle de disponible en su estado actual

#### Scenario: Actualizar stock exitosamente
- **WHEN** el usuario ingresa un nuevo valor de stock (ej: 25) y confirma
- **THEN** se realiza `PATCH /api/v1/productos/{id}/stock` con `{ stock_cantidad: 25 }`, la tabla se actualiza, y el modal se cierra

#### Scenario: Actualizar disponible exitosamente
- **WHEN** el usuario cambia el toggle de disponible y confirma
- **THEN** se realiza `PUT /api/v1/productos/{id}` con el campo disponible actualizado, la tabla se actualiza, y el modal se cierra

#### Scenario: Stock negativo es rechazado client-side
- **WHEN** el usuario intenta ingresar un valor negativo de stock
- **THEN** el campo muestra error de validación "El stock no puede ser negativo" y no se realiza la petición

#### Scenario: Error del backend muestra toast
- **WHEN** el backend responde con error (ej: producto no encontrado)
- **THEN** se muestra un toast con el mensaje de error sin cerrar el modal

### Requirement: Invalidación cruzada de caché
Al actualizar stock o disponible, el sistema SHALL invalidar las query keys `admin-stock-products`, `admin-products`, `products`, y `productDetail` para que todas las vistas del ecosistema reflejen el cambio inmediatamente.

#### Scenario: Cambio de stock se refleja en el catálogo público
- **WHEN** un administrador actualiza el stock de un producto desde `/admin/stock`
- **THEN** la query key `products` es invalidada, forzando refetch en el catálogo público

#### Scenario: Cambio de stock se refleja en admin productos
- **WHEN** un administrador actualiza el stock desde `/admin/stock`
- **THEN** la query key `admin-products` es invalidada, forzando refetch en la tabla de admin productos

### Requirement: Navegación y ruta protegida
La ruta `/admin/stock` SHALL estar protegida por `ProtectedRoute` con roles `['STOCK', 'ADMIN']`. SHALL existir un link en el sidebar del admin con icono `Package` de lucide-react.

#### Scenario: Acceso permitido con rol STOCK
- **WHEN** un usuario autenticado con rol `STOCK` navega a `/admin/stock`
- **THEN** se muestra la página de gestión de stock

#### Scenario: Acceso denegado sin rol STOCK ni ADMIN
- **WHEN** un usuario autenticado con rol `CLIENT` navega a `/admin/stock`
- **THEN** se redirige a la página de forbidden (403)

#### Scenario: Link en sidebar visible para STOCK y ADMIN
- **WHEN** un usuario con rol `STOCK` o `ADMIN` ve el panel admin
- **THEN** el sidebar muestra un link "Stock" con icono `Package`
