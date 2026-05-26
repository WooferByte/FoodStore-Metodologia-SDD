## Context

El backend de configuración del sistema ya está implementado y archivado (`system-configuration-backend`). Provee `GET /api/v1/admin/configuracion` (lista todas) y `PUT /api/v1/admin/configuracion/{clave}` (actualiza valor). Lo que falta es la interfaz de administración.

Actualmente hay un placeholder inline en `Router.tsx` para `/admin/configuracion` y el link ya existe en `ADMIN_LINKS`. No hay feature creado en `features/`.

## Goals / Non-Goals

**Goals:**
- Página `/admin/configuracion` funcional con tabla de configuraciones
- Modal de edición inline para actualizar valor
- Toast de éxito/error al guardar
- Mostrar `clave`, `valor`, `descripcion`, `actualizado_por`, `actualizado_en`
- Seguir el patrón exacto de features admin existentes (ingredientes, stock, etc.)

**Non-Goals:**
- No crear ni eliminar configuraciones (se crean via seed, no se eliminan)
- No cambiar el link del sidebar (ya existe)
- No modificar el backend
- No implementar filtros de búsqueda (son pocas configs, 5-10)

## Decisions

### Decision 1: Sin store de filtros (Zustand)

A diferencia de otros features admin (stock, productos, ingredientes) que tienen filtros, las configuraciones son pocas (5-10). No vale la pena un store de filtros. El estado del modal se maneja con `useState` local.

### Decision 2: Sin delete ni create

Las configuraciones del sistema se definen en el seed y no se crean ni eliminan desde la UI. Solo se edita el `valor`. Esto simplifica el feature a 2 hooks (listar + actualizar) y 1 modal.

### Decision 3: Badge para mostrar tipo de valor

Para mejorar la UX, se muestra un badge indicando si el valor parece numérico (number), booleano (true/false) o texto. Esto ayuda al admin a entender qué tipo de valor espera cada clave.

## Risks / Trade-offs

- **Sin filtros**: A medida que crezcan las configuraciones, puede ser útil agregar búsqueda. **Mitigación**: son solo 5 configs por ahora. Si crecen, es fácil agregar filtro client-side.
- **Sin paginación**: Mismo caso que filtros. No justificado para el volumen actual.
