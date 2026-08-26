# Food Store — Deuda Técnica y Problemas Conocidos

> **Documento vivo**: registro central de toda la deuda técnica, bugs conocidos y problemas de la aplicación.
> **Última actualización**: 2026-08-26
> **Propósito**: cada entrada debe ser resoluble por un agente sin contexto previo, con causa raíz, impacto, archivos y pasos exactos de resolución.

---

## Leyenda de prioridades

| Severidad | Significado |
|-----------|-------------|
| 🔴 **CRÍTICA** | Afecta confiabilidad del proyecto / bloquea o enmascara regresiones |
| 🟠 **ALTA** | Deuda que crece, riesgos de seguridad o calidad |
| 🟡 **MEDIA** | Deuda menor, documentación, configuración |
| 🟢 **BAJA** | Cosmético / nitpick |

---

## 1. 🔴 41 tests backend FAILED + 8 collection errors — suite sin red de seguridad

**Estado**: PRE-EXISTENTE (no introducido por changes recientes) · **Fecha registro**: 2026-08-25
**Impacto**: La suite de pytest backend **ni siquiera arranca** sin `--continue-on-collection-errors`. Cualquier change backend puede romper comportamiento sin que nadie lo detecte.

### Causas raíz (por archivo de test)

| Test | Error | Causa raíz |
|------|-------|------------|
| `test_dependencies.py` | `ImportError: HTTPAuthCredentials` | Clase removida en FastAPI 0.110. Usar `HTTPAuthorizationCredentials` o la alternativa actual |
| `test_uow.py` | `ModuleNotFoundError: 'backend'` | Imports con prefijo `backend.` que no funcionan según la estructura real (ver §9: AGENTS.md desactualizado) |
| `test_auth_login.py` / `test_auth_register.py` / `test_auth_refresh.py` | Mocks síncronos donde el service ahora es async | Los mocks deben ser `AsyncMock` / `await` |
| `test_base_repository.py` | MockEntity inválido para `select` | La entidad mockeada no cumple el contrato del modelo SQLModel |
| `test_orders_fsm.py` / `test_orders_api.py` | Coroutine vs int, `session.add` | Mocks que devuelven coroutine donde se espera int; patrón de `session.add` desactualizado |
| `test_rbac_roles.py` | 409 "Last Admin" | Cambio en la regla de protección de último admin |
| `test_security.py` | `create_refresh_token` missing `user_id` | Firma de función cambió; falta pasar `user_id` |
| `test_infrastructure_integration.py` | `aiosqlite` NO instalado | Dependencia de test ausente: `pip install aiosqlite` |

### Pasos de resolución

1. Instalar dependencia faltante:
   ```bash
   cd backend
   .venv/Scripts/pip install aiosqlite
   ```
2. Correr la suite para ver el estado exacto actual:
   ```bash
   .venv/Scripts/pytest --continue-on-collection-errors -q
   ```
3. Arreglar en este orden (por dependencia):
   a. Imports `backend.*` → quitar el prefijo `backend.` (los módulos están en la raíz del paquete).
   b. `test_dependencies.py` → reemplazar `HTTPAuthCredentials` por la clase vigente de FastAPI.
   c. Mocks async en tests de auth/orders/base_repository (usar `unittest.mock.AsyncMock`).
   d. `test_security.py` → pasar `user_id` a `create_refresh_token`.
   e. `test_rbac_roles.py` → ajustar mock al flujo actual de último admin.
4. Objetivo: `pytest -q` corre completa sin `--continue-on-collection-errors` y con **0 failures**.
5. Criterio de cierre: `pytest --cov=. --cov-report=term-missing` ≥ 60% coverage (rúbrica).

**Archivos afectados**: `backend/tests/test_dependencies.py`, `test_uow.py`, `test_auth_login.py`, `test_auth_register.py`, `test_auth_refresh.py`, `test_base_repository.py`, `test_orders_fsm.py`, `test_orders_api.py`, `test_rbac_roles.py`, `test_security.py`, `test_infrastructure_integration.py` + `backend/pyproject.toml` (dev-dependencies).

---

## 2. 🔴 E2E `cart-flows.spec.ts` — 4 tests rotos (strict-mode CartDrawer global)

**Estado**: PRE-EXISTENTE (verificado incluso con el código original, stash test) · **Fecha registro**: 2026-08-26
**Impacto**: E2E del flujo de carrito no da señal. 1 failure por strict-mode (`getByText` matchea 2 nodos: el drawer + la página) y 1 por "Ver productos" (redirect a /login). Un 5º (item removal) es flaky por la misma causa.

### Causa raíz

`frontend/src/app/App.tsx` (líneas ~50-53) monta `<CartDrawer />` **globalmente** fuera de `<Routes>`. El drawer está presente en TODAS las páginas (incluso /login), aunque esté cerrado. Playwright strict-mode falla cuando un selector como `getByText("Pepperoni Pizza")` matchea tanto el drawer como el contenido de la página.

### Pasos de resolución

1. Correr para reproducir:
   ```bash
   cd frontend
   npx playwright test e2e/cart/cart-flows.spec.ts
   ```
2. Opciones (elegir una, preferir la A):
   - **A (recomendada, robusta)**: scoping de selectores en los specs — usar `page.getByRole('dialog', { name: 'Carrito de compras' }).getByText(...)` para todo lo que esté dentro del drawer, y selectores de página para el resto. Aplicar `.first()` solo donde el scoping no sea práctico.
   - **B (refactor de producto, mayor alcance)**: dejar de montar `CartDrawer` globalmente en `App.tsx` y montarlo solo donde aplica (por ejemplo, en layout de catálogo/carrito). **OJO**: esto toca el fix `fix-refresh-loop-cartdrawer` (el bug del loop se disparaba justamente por el montaje global) — requiere re-verificación E2E del flujo anónimo.
3. Criterio de cierre: `npx playwright test` completo en verde (incluyendo `e2e/cart/anonymous-cartdrawer.spec.ts` y `e2e/shipping/shipping-fee.spec.ts`).

**Archivos afectados**: `frontend/e2e/cart/cart-flows.spec.ts`, potencialmente `frontend/src/app/App.tsx`.

---

## 3. 🟠 Spec `system-configuration` dice "Non-admin gets 403" pero el backend permite a CUALQUIER usuario autenticado — **PENDIENTE DE DECISIÓN**

**Estado**: Hallazgo pre-existente documentado 2026-08-26 · **Requiere decisión del usuario** (ver §9.1)
**Impacto**: Un cliente autenticado puede leer la configuración del sistema (`GET /api/v1/admin/configuracion`): umbral de envío gratis, costo de envío, etc. No es dato sensible crítico, pero contradice el contrato de la spec y el principio de mínimo privilegio.

### Evidencia

- Spec: `openspec/specs/system-configuration/spec.md` documenta "Non-admin gets 403".
- Backend real: `GET /api/v1/admin/configuracion` responde 200 a cualquier usuario autenticado (verificado con sesión CLIENT en 2026-08-26).
- El frontend ya gatea el consumo (fix `fix-refresh-loop-cartdrawer`): `useSystemConfig` con `enabled: isAuthenticated` — pero **no** por rol.

### Pasos de resolución (una vez decidida la dirección)

- **Opción A — endurecer backend (seguro, recomendado si la config es admin-only)**:
  1. En `backend/admin/configuracion_router.py` (o donde esté el GET) agregar `Depends(require_role(["ADMIN"]))`.
  2. Verificar que `useAdminConfiguraciones` y `useSystemConfig` del frontend siguen funcionando para admin.
  3. **OJO**: `useCartTotals` usa `useSystemConfig` para calcular envío en el drawer/carrito del CLIENT — si el GET pasa a ser admin-only, hay que **mover el cálculo de envío al backend** (ya está en `create_pedido` vía `_get_config_int`) o exponer un endpoint público de config mínima. Riesgo de regresión alto → requiere E2E completo del carrito/cliente.
- **Opción B — actualizar spec (rápido, si la config es legítimamente pública para autenticados)**:
  1. Editar `openspec/specs/system-configuration/spec.md`: cambiar el requirement de "Non-admin gets 403" a "any authenticated user can read".
  2. Regenerar delta + archivar como change de spec (`🔧` en `docs/CHANGES.md`).

**Archivos afectados**: backend router de configuración, `openspec/specs/system-configuration/spec.md`, `frontend/src/features/configuracion/hooks/useSystemConfig.ts`, `frontend/src/features/cart/hooks/useCartTotals.ts`.

---

## 4. 🟠 Linter ausente en frontend — `npm run lint` no existe

**Estado**: PRE-EXISTENTE · **Fecha registro**: 2026-08-26
**Impacto**: El código TS no se chequea por estilo/errores de lint. Solo `tsc` del build hace typecheck.

### Pasos de resolución

1. Instalar ESLint + plugin de TS:
   ```bash
   cd frontend
   npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh
   ```
2. Crear `eslint.config.js` (flat config, compatible ESLint 9) con:
   - `typescript-eslint` recommended + `react-hooks` recommended.
   - Reglas del proyecto: `@typescript-eslint/no-unused-vars` como warn (o error), imports con path alias `@/`.
3. Agregar script en `frontend/package.json`:
   ```json
   "lint": "eslint src --max-warnings=0"
   ```
4. Correr `npm run lint` y corregir warnings/errores.
5. Criterio de cierre: `npm run lint` y `npm run build` en verde.

**Archivos afectados**: `frontend/package.json`, `frontend/eslint.config.js` (nuevo), archivos `src/**` con violaciones.

---

## 5. 🟠 black/flake8 non-compliant en backend

**Estado**: PRE-EXISTENTE · **Fecha registro**: 2026-08-25
**Impacto**: `black --check .` falla en 8 archivos; `flake8 .` falla en TODO el repo (default 79 chars vs black 100, sin config).

### Pasos de resolución

1. Unificar config de flake8 con black (agregar a `backend/pyproject.toml` o `setup.cfg`):
   ```toml
   [tool.black]
   line-length = 100

   [flake8]
   max-line-length = 100
   extend-ignore = E203, W503
   ```
2. Correr formateo:
   ```bash
   cd backend
   .venv/Scripts/black .
   ```
3. Correr `flake8` y corregir lo que quede (imports sin usar, etc.).
4. Criterio de cierre: `black --check .` y `flake8 .` en verde.

**Archivos afectados**: `backend/pyproject.toml` (o `setup.cfg`), archivos fuente backend.

---

## 6. 🟡 AGENTS.md desactualizado — sqlmodel ^0.0.14 vs real 0.0.38

**Estado**: PRE-EXISTENTE · **Fecha registro**: 2026-08-25
**Impacto**: El stack documentado no refleja la realidad → mocks/tests mal escritos (contribuye al #1), decisiones erróneas.

### Pasos de resolución

1. Verificar versión real instalada:
   ```bash
   cd backend
   .venv/Scripts/pip show sqlmodel
   ```
2. Actualizar `.agents/AGENTS.md` tabla de dependencias backend: `sqlmodel ^0.0.38` (y verificar el resto de la tabla contra `pip freeze` / `pyproject.toml`).
3. Nota: `sa_column_kwargs={'timezone': True}` NO funciona en SQLModel 0.0.38 → usar `sa_type=DateTime(timezone=True)` (ya aplicado en migración 013).

**Archivos afectados**: `.agents/AGENTS.md`, `backend/pyproject.toml`.

---

## 7. 🟡 `.openspec-archive.lock` queda STALE después de cada archive

**Estado**: PRE-EXISTENTE · **Fecha registro**: 2026-08-25
**Impacto**: Si el lock stale queda commiteado, el siguiente `opsx:archive` puede fallar o quedar bloqueado.

### Pasos de resolución

1. Verificar existencia: `openspec/changes/.openspec-archive.lock` (o path equivalente).
2. Borrarlo antes de commitear: `Remove-Item openspec/changes/.openspec-archive.lock` (o `rm`).
3. Opcional: agregar al `.gitignore` de `openspec/` si el CLI no lo limpia solo.

**Archivos afectados**: lock de openspec (transitorio).

---

## 8. 🟡 Otros pendientes menores

| # | Deuda | Detalle / Fix |
|---|-------|----------------|
| 8.1 | `docs/CHANGES.md` referencia `OrderTimeline` en `frontend-orders-detail-ui` | Cosmético: el widget se llama `OrderTimeline` (correcto) — solo validar redacción |
| 8.2 | Warning `act(...)` en suite vitest | Proviene de `CheckoutPage` (pre-existente, no de changes recientes). Investigar con `npx vitest run --reporter verbose` y aislar el test que lo dispara |
| 8.3 | `openspec/config.yaml` sin `context:` ni `rules:` | Configurar cuando se defina el contexto global del proyecto |
| 8.4 | `devdocs-mcp` sin config | `.opencode/opencode.json` no existe aún — pendiente configurar MCP devdocs |
| 8.5 | `BCRYPT_COST` discrepancia `.env.example` (10) vs código (12) | El código usa 12 (correcto según spec RN). Actualizar `.env.example` a 12 para no confundir |
| 8.6 | `package.json` huérfano en raíz | Eliminado 2026-08-25 (decisión: no trackear) — verificar que no reaparezca |
| 8.7 | `@tanstack/react-form` y `@mercadopago/sdk-js` no instalados | Se instalan cuando lleguen los changes de formularios / checkout SDK (documentado en AGENTS.md) |

---

## 9. Decisiones pendientes del usuario

### 9.1 — Acceso a `GET /api/v1/admin/configuracion` (ver §3)

**Pregunta**: ¿La configuración del sistema debe ser admin-only (endurecer backend) o es aceptable que cualquier usuario autenticado la lea (actualizar spec)?

**Contexto para decidir**:
- Hoy: cualquier autenticado puede leerla (200).
- Spec actual: dice 403 para no-admin (contradicción).
- El frontend ya la usa para el cálculo de envío del cliente (`useCartTotals`), así que **si se endurece a admin-only, hay que mover el cálculo de envío al backend o exponer una config pública mínima** (riesgo de regresión medio-alto).
- Dato de negocio expuesto: umbral envío gratis (3000), costo envío (500). No es crítico, pero es información interna.

**Opciones**:
- **A** — Endurecer: config = admin-only; envío del cliente computado 100% en backend (ya existe en `create_pedido`); frontend cliente deja de llamar al endpoint. **Más trabajo, más seguro, alineado con la spec.**
- **B** — Aceptar lectura autenticada: actualizar la spec y `docs/CHANGES.md`. **Cero código, pero deja la lectura abierta.**

### 9.2 — Prioridad de resolución de deuda

**Pregunta**: ¿Qué orden preferís para atacar la deuda en próximas sesiones?

**Sugerencia del orquestador**:
1. §1 (tests backend) — devuelve la red de seguridad. **Es la más importante.**
2. §2 (E2E cart-flows) — devuelve la señal de E2E.
3. §3 (decisión config 403) — una vez decidida A o B.
4. §4 + §5 (lint frontend + backend) — calidad.
5. §6-§8 — menores.

---

## Historial

| Fecha | Cambio |
|-------|--------|
| 2026-08-26 | Documento creado con deuda registrada 2026-08-25/26. Cambios del día: fix `fix-refresh-loop-cartdrawer` archivado, compra real #34 verificada, hallazgo §3 documentado |
