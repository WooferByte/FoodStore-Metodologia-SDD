/**
 * Component tests — CheckoutPage forma_pago_id wiring.
 *
 * mercadopago-live-integration — BUG 2.
 * Verifies that the create-order payload uses the BACKEND id of the SELECTED
 * payment method instead of the hardcoded EFECTIVO id:
 *   - mercadopago → forma_pago_id = 2 (MERCADOPAGO per backend seed)
 *   - cash        → forma_pago_id = 1 (EFECTIVO per backend seed)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { usePaymentStore } from '@/store/paymentStore'
import { useCartStore } from '@/store/cartStore'

const navigateMock = vi.fn()
let searchParamsMock = new URLSearchParams()
let createOrderMock = vi.fn()

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
  useCreateOrder: () => ({ mutate: createOrderMock }),
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

import CheckoutPage from '@/pages/CheckoutPage'

function seedCart() {
  useCartStore.getState().clearCart()
  useCartStore.getState().addItem({
    productId: '1',
    name: 'Pizza Margherita',
    price: 2800,
    precio_carrito: 2800,
    quantity: 1,
  })
}

function renderCheckout() {
  searchParamsMock = new URLSearchParams('')
  navigateMock.mockClear()
  createOrderMock.mockClear()
  return render(<CheckoutPage />)
}

describe('CheckoutPage — forma_pago_id según método seleccionado', () => {
  beforeEach(() => {
    usePaymentStore.getState().reset()
  })

  it('mercadopago seleccionado → payload forma_pago_id = 2 (MERCADOPAGO)', () => {
    seedCart()
    usePaymentStore.getState().setMethod('mercadopago')
    renderCheckout()

    fireEvent.change(screen.getByLabelText(/Nombre completo/), {
      target: { value: 'Juan Test' },
    })
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: 'juan@test.com' },
    })

    fireEvent.click(screen.getByTestId('generate-preference-btn'))

    expect(createOrderMock).toHaveBeenCalledTimes(1)
    const payload = createOrderMock.mock.calls[0][0]
    expect(payload.forma_pago_id).toBe(2)
    expect(payload.forma_pago_id).not.toBe(1)
  })

  it('cash seleccionado → payload forma_pago_id = 1 (EFECTIVO)', () => {
    seedCart()
    usePaymentStore.getState().setMethod('cash')
    renderCheckout()

    fireEvent.change(screen.getByLabelText(/Nombre completo/), {
      target: { value: 'Juan Test' },
    })
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: 'juan@test.com' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(createOrderMock).toHaveBeenCalledTimes(1)
    const payload = createOrderMock.mock.calls[0][0]
    expect(payload.forma_pago_id).toBe(1)
  })
})
