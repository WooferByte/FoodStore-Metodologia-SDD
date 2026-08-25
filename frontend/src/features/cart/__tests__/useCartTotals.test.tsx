/**
 * useCartTotals hook tests
 *
 * Verifies the shared cart-totals logic used by OrderSummary, CartDrawer
 * and CheckoutPage:
 * - subtotal $2.800 + umbral 3000/costo 500 → envío $500, total $3.300
 * - subtotal $3.000 → envío gratis, total $3.000
 * - config sin cargar → fallbacks umbral 3000 / costo 500
 */

import '@testing-library/jest-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCartTotals } from '@/features/cart/hooks'
import { useCartStore } from '@/store'

const CONFIG_KEY = 'system-config'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
}

function renderUseCartTotals(queryClient: QueryClient) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useCartTotals(), { wrapper })
}

function seedConfig(
  queryClient: QueryClient,
  configs: Array<{ clave: string; valor: string }>,
) {
  queryClient.setQueryData([CONFIG_KEY], configs)
}

describe('useCartTotals', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.setState({ items: [] })
  })

  it('subtotal $2.800 + umbral 3000/costo 500 → envío $500, total $3.300', async () => {
    const queryClient = createTestQueryClient()
    useCartStore.setState({
      items: [{ productId: 'p1', name: 'Pizza', price: 2800, quantity: 1 }],
    })
    seedConfig(queryClient, [
      { clave: 'envio_gratis_umbral', valor: '3000' },
      { clave: 'envio_costo', valor: '500' },
    ])

    const { result } = renderUseCartTotals(queryClient)
    await waitFor(() => {
      expect(result.current).toEqual({
        subtotal: 2800,
        deliveryFee: 500,
        total: 3300,
        isFreeDelivery: false,
        missingForFree: 200,
      })
    })
  })

  it('subtotal $3.000 → envío gratis, total $3.000', async () => {
    const queryClient = createTestQueryClient()
    useCartStore.setState({
      items: [{ productId: 'p1', name: 'Pizza', price: 3000, quantity: 1 }],
    })
    seedConfig(queryClient, [
      { clave: 'envio_gratis_umbral', valor: '3000' },
      { clave: 'envio_costo', valor: '500' },
    ])

    const { result } = renderUseCartTotals(queryClient)
    await waitFor(() => {
      expect(result.current).toEqual({
        subtotal: 3000,
        deliveryFee: 0,
        total: 3000,
        isFreeDelivery: true,
        missingForFree: 0,
      })
    })
  })

  it('config sin cargar → fallbacks umbral 3000 / costo 500', async () => {
    const queryClient = createTestQueryClient()
    useCartStore.setState({
      items: [{ productId: 'p1', name: 'Pizza', price: 2800, quantity: 1 }],
    })
    seedConfig(queryClient, [])

    const { result } = renderUseCartTotals(queryClient)
    await waitFor(() => {
      expect(result.current).toEqual({
        subtotal: 2800,
        deliveryFee: 500,
        total: 3300,
        isFreeDelivery: false,
        missingForFree: 200,
      })
    })
  })
})
