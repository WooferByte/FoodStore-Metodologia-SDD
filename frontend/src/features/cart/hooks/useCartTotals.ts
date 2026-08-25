/**
 * useCartTotals — shared cart totals logic for OrderSummary, CartDrawer
 * and CheckoutPage.
 *
 * Composes client state (cartStore subtotal) with server state (system
 * config umbral/costo via useSystemConfig). Server data must NOT go into
 * Zustand — TanStack Query owns it (single shared 'system-config' cache,
 * one network request for both keys).
 *
 * Fallbacks while config loads: umbral 3000, costo 500.
 */

import { useCartStore } from '@/store'
import { useSystemConfig } from '@/features/configuracion/hooks'

const DEFAULT_FREE_DELIVERY_THRESHOLD = 3000
const DEFAULT_DELIVERY_FEE = 500

export function useCartTotals() {
  // Client state — granular selector, derived during render (no mutation)
  const subtotal = useCartStore((s) => s.totalPrice())

  // Server state — shared 'system-config' cache
  const { data: umbralConfig } = useSystemConfig('envio_gratis_umbral')
  const { data: costoCfg } = useSystemConfig('envio_costo')

  const umbral = Number(umbralConfig?.valor ?? DEFAULT_FREE_DELIVERY_THRESHOLD)
  const costo = Number(costoCfg?.valor ?? DEFAULT_DELIVERY_FEE)

  const isFreeDelivery = subtotal >= umbral
  const deliveryFee = isFreeDelivery ? 0 : costo
  const total = subtotal + deliveryFee
  const missingForFree = isFreeDelivery ? 0 : Math.max(umbral - subtotal, 0)

  return { subtotal, deliveryFee, total, isFreeDelivery, missingForFree }
}
