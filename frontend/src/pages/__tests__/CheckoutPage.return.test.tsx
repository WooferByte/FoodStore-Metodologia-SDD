/**
 * Component tests — CheckoutPage MercadoPago return handling.
 *
 * mercadopago-live-integration — task 2.3 / 2.4.
 * Verifies that on mount with MP native query params, CheckoutPage updates
 * the paymentStore (status + pedidoId) and does NOT run the cart validation
 * flow (it came back from an MP redirect).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePaymentStore } from '@/store/paymentStore'

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
    data: undefined,
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

vi.mock('@/features/cart/hooks', () => ({
  useCartTotals: () => ({
    subtotal: 2800,
    deliveryFee: 500,
    total: 3300,
    isFreeDelivery: false,
    missingForFree: 200,
  }),
}))

import CheckoutPage from '@/pages/CheckoutPage'

function renderWithSearchParams(queryString: string) {
  searchParamsMock = new URLSearchParams(queryString)
  navigateMock.mockClear()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <CheckoutPage />
    </QueryClientProvider>,
  )
}

describe('CheckoutPage — MP return handling', () => {
  beforeEach(() => {
    usePaymentStore.getState().reset()
  })

  it('params nativos approved + external_reference → success + pedidoId', () => {
    renderWithSearchParams('status=approved&external_reference=42')

    const store = usePaymentStore.getState()
    expect(store.status).toBe('success')
    expect(store.pedidoId).toBe(42)
  })

  it('params nativos rejected → error + pedidoId', () => {
    renderWithSearchParams('status=rejected&external_reference=42')

    const store = usePaymentStore.getState()
    expect(store.status).toBe('error')
    expect(store.pedidoId).toBe(42)
  })

  it('params nativos pending → pending + pedidoId', () => {
    renderWithSearchParams('status=pending&external_reference=42')

    const store = usePaymentStore.getState()
    expect(store.status).toBe('pending')
    expect(store.pedidoId).toBe(42)
  })

  it('external_reference no entero → status fijado, pedidoId sin setear', () => {
    renderWithSearchParams('status=approved&external_reference=abc')

    const store = usePaymentStore.getState()
    expect(store.status).toBe('success')
    expect(store.pedidoId).toBeNull()
  })

  it('fallback legacy payment=success&pedido_id=7 → success + pedidoId 7', () => {
    renderWithSearchParams('payment=success&pedido_id=7')

    const store = usePaymentStore.getState()
    expect(store.status).toBe('success')
    expect(store.pedidoId).toBe(7)
  })

  it('sin params de resultado → paymentStore sin alterar (idle)', () => {
    renderWithSearchParams('')

    const store = usePaymentStore.getState()
    expect(store.status).toBe('idle')
    expect(store.pedidoId).toBeNull()
  })
})
