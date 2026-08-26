/**
 * E2E — fix-refresh-loop-cartdrawer: no refresh loop para anónimos.
 *
 * Bug: CartDrawer (montado globalmente) llamaba useSystemConfig → 401 →
 * interceptor con refreshToken null → POST /auth/refresh → 422 → logout +
 * location.href=/login → reload infinito.
 *
 * Fix:
 *   D-1: useSystemConfig/useAllSystemConfigs gateadas con enabled=isAuthenticated
 *   D-2: trailing slash en CONFIGURACION_API_PATH (/configuracion/)
 *   D-3: interceptor rechaza 401 directo si no hay refreshToken
 *   D-4: no hard reload si ya estás en /login
 *
 * Cobertura:
 *   5.1 — anónimo navega catálogo: NO /configuracion, NO /auth/refresh, NO redirect
 *   5.2 — anónimo abre el drawer con carrito seedeado: usa fallback sin loop
 *   5.3 — autenticado: la config SÍ se fetchea y el drawer muestra envío del server
 */

import { test, expect, Page } from '@playwright/test'
import { loginAs, logout } from '../helpers/auth'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
}

async function seedCart(page: Page, items: CartItem[]) {
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, {
    key: 'food-store-cart',
    value: { state: { items }, version: 0 },
  })
}

async function waitForCartHydration(page: Page) {
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('food-store-cart')
    if (!raw) return true
    try {
      JSON.parse(raw)
      return true
    } catch {
      return false
    }
  })
}

/** Catalog mocks so the home page renders without a live backend. */
async function mockCatalog(page: Page) {
  await page.route('**/api/v1/productos**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 12, total_pages: 0 }),
    })
  })
  await page.route('**/api/v1/categorias**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
  await page.route('**/api/v1/ingredientes**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
}

/**
 * Track forbidden requests: config endpoint must NOT be hit anonymously and
 * /auth/refresh must NEVER be hit in this change (no refresh token scenario).
 */
function trackLoopEndpoints(page: Page) {
  const counters = { config: 0, refresh: 0 }
  page.route('**/api/v1/admin/configuracion/**', (route) => {
    counters.config++
    route.fulfill({ status: 401, body: JSON.stringify({ detail: 'Not authenticated' }) })
  })
  page.route('**/api/v1/auth/refresh', (route) => {
    counters.refresh++
    route.fulfill({ status: 200, body: '{}' })
  })
  return counters
}

test.describe('Anonymous browsing — no refresh loop (fix-refresh-loop-cartdrawer)', () => {
  test('5.1 anonymous catalog: no config request, no refresh, no redirect', async ({ page }) => {
    const counters = trackLoopEndpoints(page)
    await mockCatalog(page)
    await logout(page)

    await page.goto('/')
    await expect(page).toHaveURL('/')

    // If the bug existed, the 401→refresh→reload loop would fire here
    await page.waitForTimeout(1500)

    expect(counters.config).toBe(0)
    expect(counters.refresh).toBe(0)
    await expect(page).toHaveURL('/')
  })

  test('5.2 anonymous drawer with seeded cart: fallback shipping, no loop', async ({ page }) => {
    const counters = trackLoopEndpoints(page)
    await mockCatalog(page)
    await logout(page)
    await seedCart(page, [
      { productId: 'pizza-001', name: 'Pizza Margherita', price: 2800, quantity: 1 },
    ])

    await page.goto('/')
    await waitForCartHydration(page)

    // Open the drawer — must NOT trigger config fetch or redirect
    await page.getByRole('button', { name: /Carrito/i }).click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()

    // Fallback config: umbral 3000 / costo 500 → subtotal 2800 → Envío $500
    await expect(drawer.getByText('Envío')).toBeVisible()
    await expect(drawer.getByText(/\$\s500,00/)).toBeVisible()

    await page.waitForTimeout(1500)
    expect(counters.config).toBe(0)
    expect(counters.refresh).toBe(0)
    await expect(page).toHaveURL('/')
  })
})

test.describe('Authenticated browsing — config IS fetched (fix-refresh-loop-cartdrawer)', () => {
  test('5.3 authenticated drawer fetches config and shows server shipping', async ({ page }) => {
    await mockCatalog(page)
    let configRequests = 0
    await page.route('**/api/v1/admin/configuracion/**', (route) => {
      configRequests++
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            clave: 'envio_gratis_umbral',
            valor: '5000',
            descripcion: 'Monto mínimo para envío gratis (en pesos)',
            actualizado_por: 1,
            creado_en: '2026-08-25T00:00:00',
            actualizado_en: '2026-08-25T00:00:00',
          },
          {
            id: 2,
            clave: 'envio_costo',
            valor: '800',
            descripcion: 'Costo de envío fijo (en pesos)',
            actualizado_por: 1,
            creado_en: '2026-08-25T00:00:00',
            actualizado_en: '2026-08-25T00:00:00',
          },
        ]),
      })
    })

    await loginAs(page, 'CLIENT')
    await seedCart(page, [
      { productId: 'pizza-001', name: 'Pizza Margherita', price: 2800, quantity: 1 },
    ])

    await page.goto('/')
    await waitForCartHydration(page)

    await page.getByRole('button', { name: /Carrito/i }).click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()

    // Server config (umbral 5000 / costo 800) → subtotal 2800 → Envío $800
    await expect(drawer.getByText(/\$\s800,00/)).toBeVisible()
    // Config was actually fetched (auth-gated ON)
    await expect.poll(() => configRequests).toBeGreaterThan(0)
  })
})
