/**
 * OrderSummary component tests
 *
 * Verifies:
 * - Shows item count and total price
 * - CTA button is disabled when cart is empty
 * - Shows correct pluralization for 1 vs N items
 * - Shows delivery breakdown with FREE_DELIVERY_THRESHOLD logic
 * - Shows "¡Gratis!" badge when subtotal >= 3000
 * - Shows progress text when below threshold
 */

import '@testing-library/jest-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrderSummary } from '@/features/cart/components/OrderSummary'
import { useCartStore, useAuthStore } from '@/store'

const SHIPPING_CONFIG = [
  { clave: 'envio_gratis_umbral', valor: '3000' },
  { clave: 'envio_costo', valor: '500' },
]

function createTestQueryClient(
  configs?: Array<{ clave: string; valor: string }>,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  if (configs) {
    queryClient.setQueryData(['system-config'], configs)
  }
  return queryClient
}

function renderWithRouter(
  ui: React.ReactElement,
  configs?: Array<{ clave: string; valor: string }>,
) {
  const queryClient = createTestQueryClient(configs)
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OrderSummary', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.setState({ items: [] })
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: true,
    })
  })

  it('shows "No hay productos" and disabled CTA when cart is empty', () => {
    renderWithRouter(<OrderSummary />)
    expect(screen.getByText('No hay productos')).toBeInTheDocument()
    const cta = screen.getByRole('button', { name: 'Proceder al pago' })
    expect(cta).toBeDisabled()
  })

  it('shows item count and total price with 2 items', () => {
    useCartStore.setState({
      items: [
        { productId: 'p1', name: 'Pizza', price: 10.00, quantity: 2 },
        { productId: 'p2', name: 'Calzone', price: 15.00, quantity: 1 },
      ],
    })
    renderWithRouter(<OrderSummary />)
    expect(screen.getByText('3 productos')).toBeInTheDocument()
    // CTA should be a link (not a disabled button) when cart has items
    // Text includes total: "Proceder al pago · $X.XXX"
    expect(screen.getByRole('link', { name: /Proceder al pago/i })).toBeInTheDocument()
  })

  it('uses singular "producto" for exactly 1 item', () => {
    useCartStore.setState({
      items: [
        { productId: 'p1', name: 'Pizza', price: 10.00, quantity: 1 },
      ],
    })
    renderWithRouter(<OrderSummary />)
    expect(screen.getByText('1 producto')).toBeInTheDocument()
  })

  it('shows hint text when unauthenticated and cart has items', () => {
    useCartStore.setState({
      items: [{ productId: 'p1', name: 'Pizza', price: 10.00, quantity: 1 }],
    })
    renderWithRouter(<OrderSummary />)
    expect(
      screen.getByText(/Deberás iniciar sesión para completar el pedido/i)
    ).toBeInTheDocument()
  })

  it('shows free delivery badge when subtotal >= 3000', () => {
    useCartStore.setState({
      items: [{ productId: 'p1', name: 'Pizza', price: 3000, quantity: 1 }],
    })
    renderWithRouter(<OrderSummary />)
    expect(screen.getByLabelText('Envío gratis')).toBeInTheDocument()
  })

  it('shows "Te faltan" progress text when below FREE_DELIVERY_THRESHOLD', () => {
    useCartStore.setState({
      items: [{ productId: 'p1', name: 'Pizza', price: 1000, quantity: 1 }],
    })
    renderWithRouter(<OrderSummary />)
    expect(screen.getByText(/Te faltan/i)).toBeInTheDocument()
  })

  it('shows subtotal and delivery rows in the breakdown', () => {
    useCartStore.setState({
      items: [{ productId: 'p1', name: 'Pizza', price: 500, quantity: 1 }],
    })
    renderWithRouter(<OrderSummary />)
    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('Envío')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // shipping-fee-consistency — totals from shared useCartTotals (task 6.2)
  // -------------------------------------------------------------------------

  it('subtotal $2.800 → Envío $500 y Total $3.300', () => {
    useCartStore.setState({
      items: [{ productId: 'p1', name: 'Pizza', price: 2800, quantity: 1 }],
    })
    renderWithRouter(<OrderSummary />, SHIPPING_CONFIG)
    expect(screen.getAllByText(/\$\s500,00/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\$\s3\.300,00/).length).toBeGreaterThan(0)
  })

  it('subtotal $2.800 → CTA "Proceder al pago" muestra total $3.300', () => {
    useCartStore.setState({
      items: [{ productId: 'p1', name: 'Pizza', price: 2800, quantity: 1 }],
    })
    renderWithRouter(<OrderSummary />, SHIPPING_CONFIG)
    expect(
      screen.getByRole('link', { name: /Proceder al pago · \$\s3\.300,00/ }),
    ).toBeInTheDocument()
  })

  it('subtotal $3.000 → envío gratis y Total $3.000', () => {
    useCartStore.setState({
      items: [{ productId: 'p1', name: 'Pizza', price: 3000, quantity: 1 }],
    })
    renderWithRouter(<OrderSummary />, SHIPPING_CONFIG)
    expect(screen.getByLabelText('Envío gratis')).toBeInTheDocument()
    expect(screen.getAllByText(/\$\s3\.000,00/).length).toBeGreaterThan(0)
  })
})
