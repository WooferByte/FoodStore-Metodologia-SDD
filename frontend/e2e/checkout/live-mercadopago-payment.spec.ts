/**
 * LIVE E2E — Real MercadoPago payment flow with TEST credentials.
 *
 * mercadopago-live-integration — tasks 4.5 / 4.6 / 4.7.
 *
 * ⚠️ RUN CONDITION: this spec is SKIPPED unless `E2E_LIVE_MP=1` is set.
 * It requires a live environment that the orchestrator prepares separately:
 *   1. Backend running on http://localhost:8000 with TEST credentials
 *      (backend/.env → MP_ACCESS_TOKEN, MERCADOPAGO_PUBLIC_KEY).
 *   2. A public tunnel (ngrok) pointing at localhost:8000, used for
 *      MP_NOTIFICATION_URL and MP_FRONTEND_URL in backend/.env.
 *   3. Test buyer created via MCP `create_test_user` (profile=buyer, site_id=MLA);
 *      credentials stored ONLY in backend/.env (never committed).
 *   4. Webhook configured via MCP `save_webhook` → {PUBLIC_URL}/api/v1/webhooks/mercadopago.
 *   5. CORS_ORIGINS in backend/.env includes the public frontend origin.
 *
 * Test card (MP): 5031 7557 3453 0604  |  Titular: APRO  |  DNI: 12345678 → approved.
 *
 * Run with: E2E_LIVE_MP=1 npx playwright test e2e/checkout/live-mercadopago-payment.spec.ts
 */

import { test, expect } from '@playwright/test'
import type { Page, Frame } from '@playwright/test'

const IS_LIVE = process.env.E2E_LIVE_MP === '1'

// MP responde 403 al UA de HeadlessChrome en su sandbox (bloqueo anti-bot).
// Con un UA de Chrome real el checkout de prueba carga normalmente.
test.use({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  locale: 'es-AR',
  timezoneId: 'America/Argentina/Buenos_Aires',
})

// El flujo real de pago (checkout MP + aprobación) supera los 30s default.
test.describe.configure({ timeout: 120_000 })

test.describe('Live MercadoPago payment', () => {
  test.skip(!IS_LIVE, 'Requires E2E_LIVE_MP=1 + tunnel + backend running (orchestrator)')

  let accessToken = ''

  test.beforeEach(async ({ page }) => {
    // Seed a cart with the REAL product id=1 (Pizza Margherita $2800) so the
    // pre-validation (POST /pedidos/validar) passes without price warnings.
    // El auth se seedea por test: test 1 usa login real (1 sola vez por corrida
    // para respetar el rate limit 5/15min de /auth/login), test 2 usa token fake.
    await page.addInitScript(() => {
      localStorage.setItem(
        'food-store-cart',
        JSON.stringify({
          state: {
            items: [
              {
                productId: '1',
                name: 'Pizza Margherita',
                price: 2800,
                precio_carrito: 2800,
                quantity: 1,
              },
            ],
          },
          version: 0,
        }),
      )
    })
  })

  test('pago completo con tarjeta de prueba → modal éxito + status approved', async ({
    page,
  }) => {
    // Real login — the checkout flow hits protected endpoints (/pedidos/validar,
    // /pedidos, /pagos/*) and a fake token would get 401.
    const loginRes = await page.request.post(
      'http://localhost:8000/api/v1/auth/login',
      { data: { email: 'cliente@foodstore.com', password: 'cliente123456' } },
    )
    expect(loginRes.ok()).toBeTruthy()
    const auth = (await loginRes.json()) as {
      access_token: string
      usuario: { id: number; email: string; nombre: string }
    }
    accessToken = auth.access_token

    // Seed auth state with the REAL token before React hydrates
    await page.addInitScript(
      ({ key, token, user }) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            state: {
              isAuthenticated: true,
              accessToken: token,
              refreshToken: null,
              user: {
                id: String(user.id),
                email: user.email,
                name: user.nombre,
                roles: ['CLIENT'],
              },
              _hasHydrated: true,
            },
            version: 0,
          }),
        )
      },
      { key: 'food-store-auth', token: accessToken, user: auth.usuario },
    )
    // 4.5a — Ir al checkout (validación real contra backend)
    // Nota: URL absoluta — el config no aplica baseURL (Playwright 1.60 lo
    // requiere dentro de use.baseURL; acá está a nivel raíz y se ignora).
    await page.goto('http://localhost:5173/checkout')

    // Esperar el selector de método (implica que la validación pasó y hay form)
    await expect(page.getByTestId('payment-method-mercadopago')).toBeVisible({
      timeout: 10000,
    })

    // Completar datos del comprador
    await page.getByLabel('Nombre completo').fill('Comprador Test')
    await page.getByLabel('Email').fill('comprador@test.com')
    await page.getByLabel('Teléfono').fill('1123456789')

    // Seleccionar método de pago MercadoPago (el botón de pagar solo se
    // renderiza cuando hay un método elegido)
    await page.getByTestId('payment-method-mercadopago').click()

    // Validación pasa (producto real con stock) → formulario visible
    const buyButton = page.getByTestId('generate-preference-btn')
    await expect(buyButton).toBeVisible({ timeout: 10000 })

    // 4.5b — Generar preferencia (POST /pedidos + POST /pagos/crear-preferencia)
    // Capturamos el init_point de la respuesta del backend para abrir el
    // checkout de MP en PÁGINA COMPLETA (top-level).
    const prefRespPromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/pagos/crear-preferencia') && r.status() === 201,
      { timeout: 15000 },
    )
    await buyButton.click()
    const prefResp = await prefRespPromise
    const initPoint = ((await prefResp.json()) as { init_point: string }).init_point
    expect(initPoint).toContain('mercadopago')

    // 4.5c — Checkout de MP en página completa.
    //   El modal del SDK (mp.checkout({autoOpen:true})) abre un IFRAME
    //   cross-origin donde los secure-fields fallan en headless:
    //   requestStorageAccess / requestStorageAccessFor solo funcionan en
    //   contexto top-level → el card form nunca tokeniza y el pago no avanza.
    await page.goto(initPoint)
    await fillMpTestCard(page)

    // 4.6 — Retorno a /checkout.
    //   MP_FRONTEND_URL=http://localhost:5173 (local) → NO auto_return:
    //   hay que clicar "Volver al sitio" dentro del checkout de MP.
    const volver = page.getByText(/Volver al sitio|Ir al sitio/i).first()
    await volver.waitFor({ state: 'visible', timeout: 45000 }).catch(() => {
      /* el pago pudo auto-redirigir o falló — seguimos */
    })
    if (await volver.isVisible().catch(() => false)) {
      await volver.click({ timeout: 10000 }).catch(() => {})
    }

    // 4.6 — Modal de estado del pago
    await expect(page.getByTestId('payment-status-modal')).toBeVisible({
      timeout: 30000,
    })

    // 4.6 — Modal de éxito
    await expect(page.getByText('¡Pago exitoso!')).toBeVisible()
    await expect(page.getByTestId('modal-view-order-btn')).toBeVisible()

    // 4.6 — GET /pagos/{id}/status confirma approved (con token real)
    const pedidoId = await readPedidoId(page)
    expect(pedidoId).toBeGreaterThan(0)
    await expect
      .poll(
        async () => {
          const res = await page.request.get(
            `http://localhost:8000/api/v1/pagos/${pedidoId}/status`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          )
          if (!res.ok()) return null
          const body = (await res.json()) as { estado?: string }
          return body.estado
        },
        { timeout: 30000 },
      )
      .toBe('approved')
  })

  test('retorno con params nativos de MP → paymentStore success', async ({ page }) => {
    // Este test NO llama al backend (hasReturnResult saltea la validación),
    // así que basta con un auth fake en localStorage (sin consumir rate limit).
    await page.addInitScript(() => {
      localStorage.setItem(
        'food-store-auth',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            accessToken: 'fake-token',
            refreshToken: null,
            user: {
              id: '4',
              email: 'cliente@foodstore.com',
              name: 'Juan',
              roles: ['CLIENT'],
            },
            _hasHydrated: true,
          },
          version: 0,
        }),
      )
    })

    // Cubre el contrato nativo de MP directamente (sin pasar por el checkout hosted)
    await page.goto('http://localhost:5173/checkout?status=approved&external_reference=1')
    await expect(page.getByTestId('payment-status-modal')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText('¡Pago exitoso!')).toBeVisible()
    await expect(page.getByText(/pedido #1/i)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Helpers para el checkout hosted de MercadoPago
// ---------------------------------------------------------------------------

async function fillMpTestCard(target: Page | Frame) {
  // 1) Seleccionar "Tarjeta" (pago sin cuenta) dentro del checkout de MP.
  //    Esperar VISIBLE (el checkout aparece antes de renderizar las opciones).
  const cardHolder = target.locator('#cardholderName')
  if (await cardHolder.isVisible().catch(() => false)) {
    // el checkout ya abrió directo en el card-form
  } else {
    const tarjeta = target.getByRole('button', { name: /Tarjeta/ }).first()
    await tarjeta.waitFor({ state: 'visible', timeout: 30000 })
    await tarjeta.click()
  }

  // 2) Datos del titular (inputs regulares del card-form de MP)
  await target.locator('#cardholderName').fill('APRO')
  await target.locator('#cardholderIdentificationNumber').fill('12345678')

  // 3) Secure fields (iframes de secure-fields.mercadopago.com).
  //    PRIMERO el número: la detección del bin re-renderiza y activa los
  //    campos de vencimiento y CVV. Llenarlos antes se pierde.
  await waitForSecureFields(target)
  const cardNum = await findVisibleSecureField(target, '#cardNumber')
  if (!cardNum) throw new Error('Campo de número de tarjeta no disponible')
  await cardNum.fill('5031755734530604')

  // Esperar el reconocimiento del bin (marca de la tarjeta)
  await target
    .getByText(/Mastercard|Visa|American Express|Tarjeta de prueba/i)
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {})
  await target.waitForTimeout(1000)

  // Recién acá vencimiento y CVV
  const exp = await findVisibleSecureField(target, '#expirationDate')
  if (exp) await exp.fill('11/30')
  const cvv = await findVisibleSecureField(target, '#securityCode')
  if (cvv) await cvv.fill('123')

  // 4) Continuar → MP procesa el pago de prueba (approved)
  await target.getByRole('button', { name: /Continuar/ }).first().click()
}

async function findVisibleSecureField(
  target: Page | Frame,
  selector: string,
) {
  for (const f of getSecureFrames(target)) {
    const field = f.locator(selector).first()
    if (await field.isVisible().catch(() => false)) return field
  }
  return null
}

async function waitForSecureFields(target: Page | Frame) {
  let ready = false
  for (let i = 0; i < 40 && !ready; i++) {
    for (const f of getSecureFrames(target)) {
      if (await f.locator('#cardNumber').first().isVisible().catch(() => false)) {
        ready = true
        break
      }
    }
    if (!ready) await target.waitForTimeout(500)
  }
  if (!ready) throw new Error('No aparecieron los secure fields de la tarjeta')
}

function getSecureFrames(target: Page | Frame): Frame[] {
  // Page → target.frames(); Frame (modal iframe) → target.childFrames()
  const frames =
    'childFrames' in target
      ? target.childFrames()
      : target.frames()
  return frames.filter((f) => f.url().includes('secure-fields'))
}

async function readPedidoId(page: Page): Promise<number> {
  const text = await page
    .getByTestId('payment-status-modal')
    .getByText(/Tu pedido #\d+/)
    .textContent()
  const match = text?.match(/#(\d+)/)
  return match ? Number(match[1]) : 0
}
