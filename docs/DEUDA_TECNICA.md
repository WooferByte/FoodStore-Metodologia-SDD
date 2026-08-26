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
**Clasificación de urgencia (verificada 2026-08-26)**: **NO es incidente en vivo** — no existe CI configurado (`.github/workflows/` no existe) y no hay producción desplegada (`deploy-production` está pendiente en EPIC 15 de `docs/CHANGES.md`). Es deuda de repo → se ataca en el orden normal (después de §1).

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

## 3. 🟠 Spec `system-configuration` dice "Non-admin gets 403" pero el backend permite a CUALQUIER usuario autenticado — **DECISIÓN TOMADA (Opción A gradual)**

**Estado**: Hallazgo pre-existente documentado 2026-08-26 · **Decisión del usuario registrada 2026-08-26: Opción A con plan gradual en 2 fases**
**Impacto**: Un cliente autenticado puede leer la configuración del sistema (`GET /api/v1/admin/configuracion`): umbral de envío gratis (3000), costo de envío (500), productos por página, etc. Son **costos/umbrales → dato sensible** (información de negocio que no debería exponerse al cliente).

### Evidencia verificada (2026-08-26)

- Spec `openspec/specs/system-configuration/spec.md` documenta "Non-admin gets 403".
- `backend/configuracion/router.py:35` — el **GET** usa SOLO `Depends(get_current_user)` → responde 200 a cualquier autenticado (verificado con sesión CLIENT). El docstring del archivo (línea 7) dice "ADMIN only" pero la descripción del endpoint (línea 31) dice "Accessible to any authenticated user" → **contradicción interna en el propio archivo**.
- `backend/configuracion/router.py:59` — el **PUT** SÍ tiene `Depends(require_role(["ADMIN"]))` → el update está protegido. Solo el GET está abierto.
- `backend/tests/test_configuracion.py:180` — existe `test_get_configuracion_non_admin_forbidden` que espera 403 → **contradice el código actual** (el test es aspiracional o está entre los 41 fallidos de la deuda §1).
- **El frontend cliente SÍ consume el endpoint** (no es solo admin):
  - `frontend/src/features/cart/hooks/useCartTotals.ts:24-25` → `useSystemConfig('envio_gratis_umbral')` y `useSystemConfig('envio_costo')` (cálculo de envío en drawer/carrito/checkout del CLIENT).
  - `frontend/src/pages/Catalog.tsx:77` → `useSystemConfig('productos_por_pagina')` (paginación del catálogo público).
  - `frontend/src/features/configuracion/admin/hooks/useAdminConfiguraciones.ts` → tabla del panel admin.
- Conclusión: la spec estaba mal desde el inicio (el GET fue deliberadamente "any authenticated"), pero la exposición de costos/umbrales al cliente es indeseable → **mover el cálculo al backend de todos modos**.

### 🔧 DECISIÓN (usuario, 2026-08-26): Opción A con plan gradual en 2 fases

**FASE 1 — HOY (tapón de fuga, ~1 línea):**
1. En `backend/configuracion/router.py`, el GET `list_configuraciones` → cambiar `_ : Usuario = Depends(get_current_user)` por `_ : None = Depends(require_role(["ADMIN"]))` (igual que el PUT).
2. **NO romper el frontend cliente todavía**: documentar que el cliente debe dejar de usar `GET /api/v1/admin/configuracion`. Mientras no exista el endpoint alternativo, `useSystemConfig` con `enabled: isAuthenticated` devolverá `data: undefined` para no-admins → **los fallbacks actuales (umbral 3000 / costo 500) ya cubren el caso** (verificado en `useCartTotals`), pero **el catálogo perdería `productos_por_pagina` para CLIENT** → evaluar si eso es aceptable o si la paginación pasa a default 12.
   - ⚠️ Riesgo: `Catalog.tsx` (página pública para anónimos Y clientes) perdería el fetch de `productos_por_pagina` si el GET pasa a admin-only. **Decisión de diseño requerida en la implementación**: default 12, o exponer esa clave específica en un endpoint público.
3. Correr tests de `test_configuracion.py` → `test_get_configuracion_non_admin_forbidden` debería pasar ahora.
4. Verificación E2E: flujo cliente (catálogo + carrito + checkout con fallbacks), flujo admin (tabla configuración funciona).

**FASE 2 — MAÑANA (siguiente sprint): mover el cálculo de envío al backend:**
1. El cálculo ya existe en `backend/pedidos/service.py` (`create_pedido` usa `_get_config_int` con umbral 3000 / costo 500). El frontend cliente **deja de llamar** a `GET /api/v1/admin/configuracion` por completo.
2. `useCartTotals` pasa a calcular envío con datos provistos por el backend o por un endpoint público mínimo (ej. `GET /api/v1/public/configuracion` exponiendo SOLO `envio_gratis_umbral`, `envio_costo`, `productos_por_pagina` — sin claves internas).
3. Opcional: separar claves sensibles (admin-only) de claves públicas (whitelist en el endpoint público).
4. Verificación: compra real E2E (como la #34 de 2026-08-26) con monto de envío correcto y sin exposición de config.

**Archivos afectados (F1)**: `backend/configuracion/router.py`, `frontend/src/features/configuracion/hooks/useSystemConfig.ts`, `frontend/src/pages/Catalog.tsx`, `frontend/src/features/cart/hooks/useCartTotals.ts`.
**Archivos afectados (F2)**: `backend/pedidos/service.py` (ya tiene el cálculo), `frontend/src/features/cart/hooks/useCartTotals.ts`, `frontend/src/features/configuracion/hooks/useSystemConfig.ts`, posible nuevo endpoint público.
**Spec**: `openspec/specs/system-configuration/spec.md` (actualizar requirement a "ADMIN only" en F1).

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

## 9. Decisiones del usuario (registradas)

### 9.1 — Acceso a `GET /api/v1/admin/configuracion` — ✅ DECIDIDO 2026-08-26 (ver §3)

**Decisión**: **Opción A con plan gradual en 2 fases**:
- **FASE 1 (hoy)**: cambiar el middleware del GET a admin-only (1 línea) + documentar que el cliente debe usar otro endpoint. Tapar la fuga YA.
- **FASE 2 (mañana, próximo sprint)**: mover el cálculo de envío al backend por completo (ya existe en `create_pedido`), el frontend cliente deja de llamar al endpoint.

**Razonamiento del usuario (registrado)**: la config contiene costos/umbrales → sí es sensible. El frontend cliente la usa para calcular envíos → la spec estaba mal desde el inicio, pero igual mover el cálculo al backend por seguridad a futuro.

### 9.2 — Prioridad de resolución de deuda — ✅ DECIDIDO 2026-08-26

**Decisión**: Orden sugerido por el orquestador **confirmado**:
1. §1 (tests backend — red de seguridad)
2. §2 (E2E cart-flows)
3. §3 (config 403 — Fase 1 tapón, Fase 2 mover envío al backend)
4. §4 + §5 (lints frontend + backend)
5. §6-§8 (menores)

**Salvedad evaluada**: el usuario indicó que si el E2E cart-flows fallara "en producción" sería un incidente en vivo y debería ir primero. **Verificado 2026-08-26**: NO hay producción desplegada ni CI → no es incidente en vivo → se mantiene el orden normal (tests → E2E → §3 → lints → menores).

---

## Historial

| Fecha | Cambio |
|-------|--------|
| 2026-08-26 | Documento creado con deuda registrada 2026-08-25/26. Cambios del día: fix `fix-refresh-loop-cartdrawer` archivado, compra real #34 verificada, hallazgo §3 documentado |
| 2026-08-26 | Decisiones del usuario registradas: §3 = Opción A gradual (F1 middleware admin-only hoy, F2 mover envío al backend mañana); §9.2 = orden de prioridad confirmado con salvedad resuelta (E2E no es incidente en vivo: sin CI ni producción). Evidencia verificada en router.py:35/59, test_configuracion.py:180, useCartTotals.ts:24-25, Catalog.tsx:77 |
