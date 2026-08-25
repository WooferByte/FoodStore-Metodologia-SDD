/**
 * CartDrawer widget tests
 *
 * Verifies:
 * - Renders without errors when closed
 * - When open: role="dialog" and aria-modal="true" present
 * - Clicking backdrop calls setCartDrawerOpen(false)
 * - Clicking close button calls setCartDrawerOpen(false)
 * - Escape key closes the drawer
 * - BUG 3 fix: returns null when on /checkout route
 */

import '@testing-library/jest-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CartDrawer } from '@/widgets/CartDrawer/CartDrawer'
import { useUIStore, useCartStore } from '@/store'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
}

function seedConfig(configs: Array<{ clave: string; valor: string }>) {
  queryClient.setQueryData(['system-config'], configs)
}

const queryClient = createTestQueryClient()

function renderWithRouter(ui: React.ReactElement, initialPath = '/') {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CartDrawer', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient.clear()
    useCartStore.setState({ items: [] })
    useUIStore.setState({
      theme: 'light',
      sidebarOpen: false,
      cartDrawerOpen: false,
      toasts: [],
      _hasHydrated: true,
    })
  })

  it('renders without errors when cartDrawerOpen is false', () => {
    expect(() => renderWithRouter(<CartDrawer />)).not.toThrow()
  })

  it('drawer has aria-hidden="true" when closed', () => {
    renderWithRouter(<CartDrawer />)
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog).toHaveAttribute('aria-hidden', 'true')
  })

  it('has role="dialog" and aria-modal="true" when open', () => {
    useUIStore.setState({ cartDrawerOpen: true })
    renderWithRouter(<CartDrawer />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Carrito de compras')
  })

  it('calls setCartDrawerOpen(false) when close button is clicked', () => {
    useUIStore.setState({ cartDrawerOpen: true })
    renderWithRouter(<CartDrawer />)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar carrito' }))
    expect(useUIStore.getState().cartDrawerOpen).toBe(false)
  })

  it('closes on Escape key press', () => {
    useUIStore.setState({ cartDrawerOpen: true })
    renderWithRouter(<CartDrawer />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(useUIStore.getState().cartDrawerOpen).toBe(false)
  })

  it('shows empty cart state when no items', () => {
    useUIStore.setState({ cartDrawerOpen: true })
    renderWithRouter(<CartDrawer />)
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()
  })

  it('renders CartItemRows when cart has items', () => {
    useCartStore.setState({
      items: [
        { productId: 'p1', name: 'Pepperoni Pizza', price: 10.99, quantity: 2 },
      ],
    })
    useUIStore.setState({ cartDrawerOpen: true })
    renderWithRouter(<CartDrawer />)
    expect(screen.getByText('Pepperoni Pizza')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// shipping-fee-consistency — footer + CTA totals (task 4.2)
// ---------------------------------------------------------------------------

describe('CartDrawer — footer totals (shipping fee)', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient.clear()
    useCartStore.setState({ items: [] })
    useUIStore.setState({
      theme: 'light',
      sidebarOpen: false,
      cartDrawerOpen: true,
      toasts: [],
      _hasHydrated: true,
    })
    seedConfig([
      { clave: 'envio_gratis_umbral', valor: '3000' },
      { clave: 'envio_costo', valor: '500' },
    ])
  })

  it('subtotal $2.800 → fila Envío $500 y Total $3.300', () => {
    useCartStore.setState({
      items: [
        { productId: 'p1', name: 'Pizza', price: 2800, quantity: 1 },
      ],
    })
    renderWithRouter(<CartDrawer />)
    const footer = within(screen.getByRole('contentinfo'))
    expect(footer.getByText('Envío')).toBeInTheDocument()
    expect(footer.getByText(/\$\s500,00/)).toBeInTheDocument()
    expect(footer.getByText('Total')).toBeInTheDocument()
    expect(footer.getAllByText(/\$\s3\.300,00/).length).toBeGreaterThan(0)
  })

  it('subtotal $2.800 → CTA "Proceder al pago" muestra total $3.300', () => {
    useCartStore.setState({
      items: [
        { productId: 'p1', name: 'Pizza', price: 2800, quantity: 1 },
      ],
    })
    renderWithRouter(<CartDrawer />)
    expect(
      screen.getByRole('link', { name: /Proceder al pago · \$\s3\.300,00/ }),
    ).toBeInTheDocument()
  })

  it('subtotal $3.000 → envío gratis (¡Gratis!) y Total $3.000', () => {
    useCartStore.setState({
      items: [
        { productId: 'p1', name: 'Pizza', price: 3000, quantity: 1 },
      ],
    })
    renderWithRouter(<CartDrawer />)
    expect(screen.getByLabelText('Envío gratis')).toBeInTheDocument()
    expect(screen.getByText(/\$\s0,00/)).toBeInTheDocument()
    expect(screen.getAllByText(/\$\s3\.000,00/).length).toBeGreaterThan(0)
  })
})


describe('CartDrawer — BUG 3: disabled on /checkout', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.setState({ items: [] })
    useUIStore.setState({
      theme: 'light',
      sidebarOpen: false,
      cartDrawerOpen: true, // open to confirm it still returns null
      toasts: [],
      _hasHydrated: true,
    })
  })

  it('returns null (nothing rendered) when route is /checkout', () => {
    const { container } = renderWithRouter(<CartDrawer />, '/checkout')
    expect(container.firstChild).toBeNull()
  })

  it('does NOT return null when route is / (renders normally)', () => {
    const { container } = renderWithRouter(<CartDrawer />, '/')
    expect(container.firstChild).not.toBeNull()
  })

  it('does NOT return null when route is /cart', () => {
    const { container } = renderWithRouter(<CartDrawer />, '/cart')
    expect(container.firstChild).not.toBeNull()
  })
})
