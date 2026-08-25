## Context

La integración MercadoPago ya existe completa (ver proposal.md — Why). El código actual hardcodea en `backend/pagos/service.py:146-151` los `back_urls` y `notification_url` a localhost. Además `frontend/src/pages/CheckoutPage.tsx:132-155` lee query params (`payment`, `pedido_id`) que MercadoPago NO envía: MP adjunta a los `back_urls` sus parámetros nativos `status`, `payment_id`, `external_reference`, `merchant_order_id`, `preference_id`. El contrato de retorno actual es código muerto que termina en el catch-all → `/404`.

`backend/core/config.py` (pydantic-settings) ya tiene `mp_access_token` y `mercadopago_public_key`; `main.py` lee `cors_origins` desde settings. No hay migraciones ni cambios de modelo involucrados. Requisitos en `specs/payment-preference-creation/spec.md` y `specs/payment-return-handling/spec.md`.

## Goals / Non-Goals

**Goals:**
- Hacer alcanzables `notification_url` y `back_urls` para MercadoPago real mediante configuración por entorno.
- Reconectar la detección de retorno del frontend con lo que MP realmente envía, en la ruta que ya existe (`/checkout`).
- Habilitar `auto_return: "approved"` para URLs reales.
- Verificación automática (pytest + vitest) sin requerir red real.

**Non-Goals:**
- Construir la integración desde cero ni cambiar el modelo de datos (no hay migraciones).
- Cambiar `ENV` a production ni habilitar validación de firma de webhook en este change.
- Migrar a Checkout Bricks/Orders API (el SDK `mercadopago==2.2.0` con Preference API se mantiene).
- Desplegar a producción ni crear dominio real (se asume túnel/URL pública solo para el E2E).

## Decisions

### D-1: `back_urls` apuntan a `/checkout` (ruta única) y se adapta la lectura de query params

**Decisión**: Las tres `back_urls` (success/failure/pending) apuntan a la misma ruta `{MP_FRONTEND_URL}/checkout`, y `CheckoutPage.tsx` pasa a leer los parámetros nativos de MP (`status` + `external_reference`) con fallback al contrato legacy (`payment` + `pedido_id`).

**Alternativa considerada**: Crear 3 rutas `/checkout/success`, `/checkout/failure`, `/checkout/pending`.

**Razón**: Crear 3 rutas duplicaría el layout de checkout o exigiría un componente compartido extra, sin aportar nada: MP redirige al `back_url` correspondiente **pero siempre adjunta los mismos query params** (`status`, `external_reference`, `payment_id`, `preference_id`). El estado real (approved/rejected/pending/in_process/cancelled) llega en `status` sin importar a qué `back_url` se redirige. Una única ruta `/checkout` con detección de params centraliza la lógica en el efecto que ya existe en `CheckoutPage.tsx:132-155`, y `PaymentStatusModal` + `usePaymentStatusPolling` ya se alimentan de `paymentStore.status`/`pedidoId` (no saben ni necesitan saber qué ruta es). Además elimina el bug actual: las rutas `/checkout/success|failure|pending` no existen → catch-all → `/404`.

**Mapeo de `status` → paymentStore**:
- `approved` → `success`
- `pending` | `in_process` → `pending`
- `rejected` | `cancelled` | `failure` → `error`
- `pedido_id` se obtiene de `external_reference` (parse a int; si falla, se ignora).
- Si `status` no está presente, se usa el fallback legacy `payment` + `pedido_id`.

**Enlace**: cubierto por `specs/payment-return-handling/spec.md`.

---

### D-2: Variables de entorno `MP_NOTIFICATION_URL` y `MP_FRONTEND_URL`

**Decisión**: Dos settings nuevas en `backend/core/config.py`:

| Variable | Default dev | Uso |
|----------|-------------|-----|
| `MP_NOTIFICATION_URL` | `http://localhost:8000/api/v1/webhooks/mercadopago` | `notification_url` de la preferencia |
| `MP_FRONTEND_URL` | `http://localhost:5173` | Base para construir `back_urls.*` = `{MP_FRONTEND_URL}/checkout` |

**Alternativa considerada**: una única variable `MP_BACK_URLS` (JSON). Descartada: más frágil de parsear y no separa el "de dónde viene el webhook" del "a dónde vuelve el usuario".

**Razón**: mantiene defaults de dev (localidad funciona sin `.env` extra), es coherente con `docs/Integrador.txt` §10.1 que ya documenta `MP_NOTIFICATION_URL`, y separa preocupaciones: backend (webhook) vs frontend (retorno). Ambas son configuración de despliegue, no secretos → van en `.env.example` sin valores reales.

---

### D-3: `auto_return: "approved"` condicionado a URL de retorno real

**Decisión**: La preferencia incluye `auto_return: "approved"` **solo cuando `mp_frontend_url` no es localhost** (no se envía la clave con localhost). Detección simple: `not settings.mp_frontend_url.startswith("http://localhost")`.

**Alternativa considerada**: incluir `auto_return` siempre, o condicionarlo a `settings.env != "development"`.

**Razón**: MercadoPago invalida `auto_return` contra localhost (fue la causa de su eliminación previa, ver `docs/CHANGES.md`). Condicionarlo por `env` mezclaría la decisión con un flag de entorno que también controla la firma de webhook. Condicionarlo por la **URL efectiva** ataca la causa raíz (localhost = inválido) y es directamente testeable en pytest (monkeypatch del setting → assert ausencia/presencia de la clave). Cuando se configure una URL real, `auto_return` se activa solo.

**Enlace**: cubierto por `specs/payment-preference-creation/spec.md` (ADDED — auto_return).

---

### D-4: Plumbing de configuración — Settings con defaults, sin romper arranque

**Decisión**: Las dos settings se agregan con `Field(default=..., alias="MP_NOTIFICATION_URL"|"MP_FRONTEND_URL")`. No se marcan como requeridas: el arranque no debe fallar en dev sin ellas. `backend/pagos/service.py` construye el payload desde `settings.mp_notification_url` y `settings.mp_frontend_url`.

**Razón**: consiste con el patrón existente (CORS ya tiene default). `extra="ignore"` en `Settings.Config` tolera variables extra. El webhook sigue en `ENV=development` → validación de firma off (intencional en este change). Se verifica CORS: con un frontend público distinto a los defaults, `CORS_ORIGINS` debe incluir el nuevo origen — tarea de apply, no de código.

---

### D-5: Estrategia de pruebas (TDD, sin red real)

**Backend (pytest)** en `backend/tests/test_pagos.py`:
- Payload de preferencia con `MP_FRONTEND_URL` real → `back_urls.*` correctos y `auto_return: "approved"` presente.
- Payload con default localhost → `auto_return` ausente, URLs localhost.
- `notification_url` toma `MP_NOTIFICATION_URL` configurada.
- Sin cambios en webhook/FSM (comportamiento ya cubierto).

**Frontend (vitest)** en `frontend/src/pages/__tests__/` (o junto a un helper de mapeo):
- Helper de mapeo `mpQueryToPaymentResult` (puro, testeable sin React): `status`/`external_reference` → `{ status, pedidoId }` para cada rama + fallback legacy.
- Componente: render de `CheckoutPage` con `useSearchParams` mockeado → verifica que el modal corresponde al estado seteado.

**E2E (apply)**: flujo real con tarjeta de prueba `5031 7557 3453 0604` (APRO / 12345678 → approved). Requiere URL pública (túnel) para `notification_url`; con `MP_FRONTEND_URL` real el E2E además ejercita `auto_return`. Sin túnel, el test manual hace clic en "Volver al sitio".

## Risks / Trade-offs

- **`status` de MP puede variar entre versiones de la API** → Mapeo tolerante: cualquier valor no reconocido no rompe el flujo (se ignora o se trata como error según corresponda) y `usePaymentStatusPolling` sigue siendo la fuente de verdad final vía `GET /pagos/{id}/status`.
- **MP rechaza la preferencia si el `notification_url`/`back_urls` son inalcanzables** → En dev con localhost el pago sandbox puede no completar el redirect; el E2E real usa túnel público. Mitigación documentada en tasks.
- **`external_reference` no es el `pedido_id` si cambia la serialización** → El backend ya fija `external_reference = str(pedido_id)` en `crear_preferencia`; el frontend parsea a int y descarta si no es válido (no crashea).
- **Cambiar la lectura de params puede romper bookmarks/flows existentes** → Mitigado con el fallback legacy (D-1).
- **`auto_return` detectado por `startswith("http://localhost")` es un heuristic** → Cobertura suficiente para este proyecto (dev local vs URL pública). Si se usara otro host de dev (e.g. `127.0.0.1`), se documenta ampliar el check.

## Migration Plan

1. `backend/core/config.py`: agregar `mp_notification_url` y `mp_frontend_url` con defaults.
2. `backend/pagos/service.py`: construir `preference_data` desde settings; `auto_return` condicional (D-3).
3. `frontend`: extraer helper de mapeo de params MP → payment result y usarlo en `CheckoutPage.tsx` (D-1).
4. `backend/.env.example`: documentar `MP_NOTIFICATION_URL` y `MP_FRONTEND_URL`.
5. Tests backend + frontend (TDD — red/green).
6. Apply-phase (fuera de este artefacto): crear buyer test via MCP, `save_webhook` con URL pública, E2E real.
7. Post-change-verification: pytest ≥60% cov, alembic head (sin migraciones nuevas), vitest, `tsc --noEmit`, `npm run build`.

**Rollback**: eliminar las 2 settings y revertir `service.py`/`CheckoutPage.tsx` al estado previo. No hay migraciones ni datos que revertir.

## Open Questions

- **¿Se desea probar `auto_return` en el E2E?** Depende de tener `MP_FRONTEND_URL` pública durante el apply (túnel). Si no, el E2E valida el flujo completo con clic manual en "Volver al sitio". Es una decisión del apply, no del diseño — no bloquea este change.
