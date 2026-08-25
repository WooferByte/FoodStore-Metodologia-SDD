/**
 * Component tests — CheckoutPage resumen con envío (shipping-fee-consistency).
 *
 * Verifica que la columna de resumen muestra el desglose Subtotal + Envío +
 * Total usando la lógica compartida useCartTotals (config umbral 3000 / costo 500).
 * La query de config se mockea; el hook real computa los totales.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePaymentStore } from '@/store/paymentStore'
import { useCartStore } from '@/store/cartStore'

const navigateMock = vi.fn()
let searchParamsMock = new URLSearchParams()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [searchParamsMock],
}))

vi.mock('@/features/checkout/hooks/useCheckoutValidation', () => ({
  useCheckoutValidation: () => ({
    mutate: vi.fn(),
    isPending: false,
    data: {
      stock_insuficiente: [],
      productos_invalidos: [],
      cambios_de_precio: [],
      carrito_vacio: false,
      sin_direccion: false,
    },
    isError: false,
  }),
}))

vi.mock('@/features/payments/hooks/useCreateOrder', () => ({
  useCreateOrder: () => ({ mutate: vi.fn() }),
}))

vi.mock('@/features/payments/hooks/useCreatePreference', () => ({
  useCreatePreference: () => ({ mutate: vi.fn() }),
}))

vi.mock('@/features/checkout/components/CheckoutValidationModal', () => ({
  CheckoutValidationModal: () => null,
}))

vi.mock('@/features/payments/components/PaymentStatusModal', () => ({
  PaymentStatusModal: () => null,
}))

vi.mock('@/features/payments/components/PaymentMethodSelector', () => ({
  PaymentMethodSelector: () => null,
}))

vi.mock('@/features/payments/components/MercadoPagoButton', () => ({
  MercadoPagoButton: () => null,
}))

vi.mock('@/shared/components/ui/Spinner', () => ({
  Spinner: () => null,
}))

// Config fetch mocked — useCartTotals (real) computes totals from these values
vi.mock('@/features/configuracion/hooks', () => ({
  useSystemConfig: (clave: string) => ({
    data:
      clave === 'envio_gratis_umbral'
        ? { clave, valor: '3000' }
        : { clave, valor: '500' },
  }),
}))

import CheckoutPage from '@/pages/CheckoutPage'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
}

function renderCheckout() {
  searchParamsMock = new URLSearchParams('')
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <CheckoutPage />
    </QueryClientProvider>,
  )
}

function seedCart(price: number) {
  useCartStore.getState().clearCart()
  useCartStore.getState().addItem({
    productId: '1',
    name: 'Pizza Margherita',
    price,
    precio_carrito: price,
    quantity: 1,
  })
}

describe('CheckoutPage — resumen con envío', () => {
  beforeEach(() => {
    usePaymentStore.getState().reset()
  })

  it('subtotal $2.800 → Envío $500 y Total $3.300', async () => {
    seedCart(2800)
    renderCheckout()

    expect(await screen.findByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('Envío')).toBeInTheDocument()
    expect(screen.getByText(/\$\s500,00/)).toBeInTheDocument()
    expect(screen.getByText(/\$\s3\.300,00/)).toBeInTheDocument()
  })

  it('subtotal $3.000 → envío gratis y Total $3.000', async () => {
    seedCart(3000)
    renderCheckout()

    expect(await screen.findByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('Envío')).toBeInTheDocument()
    expect(screen.getByText(/\$\s0,00/)).toBeInTheDocument()
    expect(screen.getAllByText(/\$\s3\.000,00/).length).toBeGreaterThan(0)
  })
})
