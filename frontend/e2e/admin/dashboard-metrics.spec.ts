/**
 * E2E tests — Admin Metrics Dashboard
 *
 * Covers:
 *   - ADMIN can access /admin and see 4 KPI cards
 *   - Clicking "Hoy" preset triggers re-fetch of metrics APIs
 *   - CLIENT is redirected to /403 when accessing /admin
 */

import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth'

const METRICS_SUMMARY = {
  total_ventas: 12345,
  pedidos_hoy: 5,
  productos_activos: 30,
  usuarios_activos: 10,
}

const METRICS_VENTAS = {
  items: [
    { fecha: '2026-05-18', total_ventas: 1000, cantidad_pedidos: 5 },
  ],
}

const METRICS_TOP = {
  items: [
    { producto_id: 1, nombre: 'Pizza Napolitana', cantidad_total: 120 },
  ],
}

const METRICS_ESTADOS = {
  items: [
    { estado: 'pendiente', cantidad: 3 },
    { estado: 'entregado', cantidad: 15 },
  ],
}

test.describe('Admin Dashboard Metrics', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all 4 metrics endpoints
    await page.route('**/api/v1/admin/metricas/resumen**', (route) =>
      route.fulfill({ json: METRICS_SUMMARY }),
    )
    await page.route('**/api/v1/admin/metricas/ventas**', (route) =>
      route.fulfill({ json: METRICS_VENTAS }),
    )
    await page.route('**/api/v1/admin/metricas/top-productos**', (route) =>
      route.fulfill({ json: METRICS_TOP }),
    )
    await page.route('**/api/v1/admin/metricas/pedidos-por-estado**', (route) =>
      route.fulfill({ json: METRICS_ESTADOS }),
    )
  })

  test('ADMIN can view the dashboard with 4 KPI cards', async ({ page }) => {
    await loginAs(page, 'ADMIN')
    await page.goto('/admin')

    // Page title
    await expect(page.getByRole('heading', { name: 'Panel de Administración' })).toBeVisible()

    // KPI labels
    await expect(page.getByText('Total Ventas')).toBeVisible()
    await expect(page.getByText('Pedidos Hoy')).toBeVisible()
    await expect(page.getByText('Productos Activos')).toBeVisible()
    await expect(page.getByText('Usuarios Activos')).toBeVisible()
  })

  test('clicking "Hoy" preset triggers re-fetch of ranged metrics APIs', async ({ page }) => {
    const requests: string[] = []

    await loginAs(page, 'ADMIN')
    await page.goto('/admin')

    // Wait for initial load
    await expect(page.getByText('Total Ventas')).toBeVisible()

    // Track requests after clicking "Hoy"
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/admin/metricas/')) {
        requests.push(req.url())
      }
    })

    await page.getByRole('button', { name: 'Hoy' }).click()

    // At least the summary and ventas endpoints should be called after preset change
    await page.waitForTimeout(500)

    const hitSummary = requests.some((u) => u.includes('resumen'))
    const hitVentas  = requests.some((u) => u.includes('ventas'))
    expect(hitSummary || hitVentas).toBe(true)
  })
})

test.describe('Admin route access control', () => {
  test('CLIENT is redirected to /403 when accessing /admin', async ({ page }) => {
    await loginAs(page, 'CLIENT')
    await page.goto('/admin')

    // ProtectedRoute should redirect to /403
    await expect(page).toHaveURL(/\/403/)
  })
})
