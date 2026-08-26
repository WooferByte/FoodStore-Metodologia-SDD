/**
 * E2E — shipping-fee-consistency: consistencia de envío entre /cart,
 * CartDrawer y /checkout.
 *
 * Regla: envío gratis si subtotal >= umbral (envio_gratis_umbral=3000),
 * si no costo fijo (envio_costo=500). Para un carrito de subtotal $2.800:
 *   - /cart (OrderSummary)          → Envío $500 + Total $3.300
 *   - CartDrawer (footer + CTA)     → Total $3.300
 *   - /checkout (resumen)           → Subtotal $2.800 + Envío $500 + Total $3.300
 *
 * Backend mockeado (FastAPI) vía page.route:
 *   - GET  /api/v1/admin/configuracion/  → umbral 3000, costo 500
 *   - POST /api/v1/pedidos/validar      → limpio (sin warnings)
 *   - POST /api/v1/pedidos              → { id: 100, total: 3300, envio: 500 }
 *   - POST /api/v1/pagos/crear-preferencia → preferencia TEST
 *
 * El unit_price de la preferencia lo computa el BACKEND (pagos/service.py
 * usa float(pedido.total)) — cubierto por tests unitarios de backend; aquí se
 * verifica el contrato del request del frontend.
 */

import { test, expect, Page } from '@playwright/test'
import { loginAs } from '../helpers/auth'

const SHIPPING_CONFIG = [
  {
    id: 1,
    clave: 'envio_gratis_umbral',
    valor: '3000',
    descripcion: 'Monto mínimo para envío gratis (en pesos)',
    actualizado_por: 1,
    creado_en: '2026-08-25T00:00:00',
    actualizado_en: '2026-08-25T00:00:00',
  },
  {
    id: 2,
    clave: 'envio_costo',
    valor: '500',
    descripcion: 'Costo de envío fijo (en pesos)',
    actualizado_por: 1,
    creado_en: '2026-08-25T00:00:00',
    actualizado_en: '2026-08-25T00:00:00',
  },
]

const CART_SUBTOTAL_2800 = [
  {
    productId: 'pizza-001',
    name: 'Pizza Margherita',
    price: 2800,
    precio_carrito: 2800,
    quantity: 1,
  },
]

async function seedCart(page: Page, items: unknown[]) {
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, {
    key: 'food-store-cart',
    value: { state: { items }, version: 0 },
  })
}

async function mockConfiguracion(page: Page) {
  await page.route('**/api/v1/admin/configuracion/', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SHIPPING_CONFIG),
    })
  })
}

async function mockValidarLimpio(page: Page) {
  await page.route('**/api/v1/pedidos/validar', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stock_insuficiente: [],
        productos_invalidos: [],
        cambios_de_precio: [],
        carrito_vacio: false,
        sin_direccion: false,
      }),
    })
  })
}

// ---------------------------------------------------------------------------
// 8.1 — /cart: OrderSummary con envío
// ---------------------------------------------------------------------------

test.describe('shipping fee — /cart OrderSummary', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'CLIENT')
    await seedCart(page, CART_SUBTOTAL_2800)
    await mockConfiguracion(page)
  })

  test('subtotal $2.800 → Envío $500 y Total $3.300', async ({ page }) => {
    await page.goto('/cart')
    const summary = page.getByRole('complementary', {
      name: 'Resumen del pedido',
    })
    await expect(summary.getByText(/\$\s3\.300,00/).first()).toBeVisible()
    await expect(summary.getByText(/\$\s500,00/)).toBeVisible()
  })

  test('subtotal $2.800 → CTA "Proceder al pago" muestra total $3.300', async ({
    page,
  }) => {
    await page.goto('/cart')
    const summary = page.getByRole('complementary', {
      name: 'Resumen del pedido',
    })
    await expect(
      summary.getByRole('link', { name: /Proceder al pago · \$\s3\.300,00/ }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 8.1 — CartDrawer: footer + CTA con envío
// ---------------------------------------------------------------------------

test.describe('shipping fee — CartDrawer footer + CTA', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'CLIENT')
    await seedCart(page, CART_SUBTOTAL_2800)
    await mockConfiguracion(page)
  })

  test('footer muestra Envío $500 y Total $3.300', async ({ page }) => {
    await page.goto('/cart')
    await page.getByRole('button', { name: /Carrito/i }).click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('Envío')).toBeVisible()
    await expect(drawer.getByText(/\$\s500,00/)).toBeVisible()
    await expect(drawer.getByText(/\$\s3\.300,00/).first()).toBeVisible()
  })

  test('CTA del drawer muestra total $3.300', async ({ page }) => {
    await page.goto('/cart')
    await page.getByRole('button', { name: /Carrito/i }).click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await expect(
      drawer.getByRole('link', { name: /Proceder al pago · \$\s3\.300,00/ }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 8.1 — /checkout: resumen Subtotal + Envío + Total
// ---------------------------------------------------------------------------

test.describe('shipping fee — /checkout resumen', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'CLIENT')
    await seedCart(page, CART_SUBTOTAL_2800)
    await mockConfiguracion(page)
    await mockValidarLimpio(page)
  })

  test('resumen muestra Subtotal $2.800 + Envío $500 + Total $3.300', async ({
    page,
  }) => {
    await page.goto('/checkout')
    await expect(page.getByText('Subtotal')).toBeVisible()
    await expect(page.getByText(/\$\s2\.800,00/)).toBeVisible()
    await expect(page.getByText('Envío')).toBeVisible()
    await expect(page.getByText(/\$\s500,00/)).toBeVisible()
    await expect(page.getByText(/\$\s3\.300,00/)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 8.2 — Contrato de payload: POST /pedidos sin total/envio; preferencia con
//       el pedido creado (unit_price lo computa el backend — D4)
// ---------------------------------------------------------------------------

test.describe('shipping fee — payload checkout', () => {
  test('POST /pedidos no envía total/envio y la preferencia usa el pedido creado', async ({
    page,
  }) => {
    await loginAs(page, 'CLIENT')
    await seedCart(page, CART_SUBTOTAL_2800)
    await mockConfiguracion(page)
    await mockValidarLimpio(page)

    let pedidosRequestBody: Record<string, unknown> | null = null
    let preferenciaRequestBody: Record<string, unknown> | null = null

    await page.route('**/api/v1/pedidos', async (route) => {
      if (route.request().method() === 'POST') {
        pedidosRequestBody = route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 100,
            usuario_id: 2,
            direccion_entrega_id: 1,
            forma_pago_id: 2,
            estado_pedido_id: 1,
            envio: 500,
            total: 3300,
            observacion: null,
            direccion_snapshot: null,
            creado_en: '2026-08-25T00:00:00',
            actualizado_en: '2026-08-25T00:00:00',
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.route('**/api/v1/pagos/crear-preferencia', async (route) => {
      preferenciaRequestBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preference_id: 'pref_TEST_E2E',
          pago_id: 42,
          init_point:
            'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref_TEST_E2E',
        }),
      })
    })

    await page.goto('/checkout')
    await page.waitForSelector('input#nombre_comprador', { timeout: 5000 })

    await page.fill('input#nombre_comprador', 'Juan Test')
    await page.fill('input#email_comprador', 'juan@test.com')
    await page.click('[data-testid="payment-method-mercadopago"]')

    await page.click('[data-testid="generate-preference-btn"]')

    await expect
      .poll(() => preferenciaRequestBody)
      .not.toBeNull()

    // Payload a POST /pedidos: SOLO items — nunca total/envio (D5)
    expect(pedidosRequestBody).not.toBeNull()
    expect(pedidosRequestBody).not.toHaveProperty('total')
    expect(pedidosRequestBody).not.toHaveProperty('envio')
    expect((pedidosRequestBody as { items: unknown[] }).items.length).toBe(1)

    // La preferencia referencia el pedido creado (id 100 del response mock)
    expect(preferenciaRequestBody).toEqual({ pedido_id: 100 })
  })
})
