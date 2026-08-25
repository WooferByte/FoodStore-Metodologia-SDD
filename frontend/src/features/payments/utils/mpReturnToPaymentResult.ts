/**
 * Maps MercadoPago redirect query params to the paymentStore contract.
 *
 * MercadoPago attaches its NATIVE params to the back_url:
 *   ?status=approved|pending|in_process|rejected|cancelled|failure
 *   &external_reference=<pedido_id>&payment_id=...&preference_id=...
 *
 * Legacy contract (kept as fallback for existing flows):
 *   ?payment=success|failure|pending&pedido_id=<id>
 *
 * FSD layer: features/payments/utils — pure, no React.
 */

export type MpPaymentStatus = 'success' | 'pending' | 'error'

export interface MpReturnParams {
  /** Native MP `status` param. */
  status: string | null
  /** Native MP `external_reference` param (should be the pedido_id). */
  externalReference: string | null
  /** Legacy `payment` param. */
  payment: string | null
  /** Legacy `pedido_id` param. */
  pedidoId: string | null
}

export interface MpPaymentResult {
  status: MpPaymentStatus
  pedidoId: number | null
}

const NATIVE_STATUS_MAP: Record<string, MpPaymentStatus> = {
  approved: 'success',
  pending: 'pending',
  in_process: 'pending',
  rejected: 'error',
  cancelled: 'error',
  failure: 'error',
}

const LEGACY_STATUS_MAP: Record<string, MpPaymentStatus> = {
  success: 'success',
  pending: 'pending',
  failure: 'error',
}

function parsePedidoId(value: string | null): number | null {
  if (value === null) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Resolve the payment result from query params after an MP redirect.
 *
 * Native MP params take precedence over the legacy contract. Returns null
 * when no result params are present (normal checkout flow).
 */
export function mpReturnToPaymentResult(params: MpReturnParams): MpPaymentResult | null {
  const nativeStatus = params.status ? NATIVE_STATUS_MAP[params.status] : undefined
  if (nativeStatus) {
    return {
      status: nativeStatus,
      pedidoId: parsePedidoId(params.externalReference),
    }
  }

  const legacyStatus = params.payment ? LEGACY_STATUS_MAP[params.payment] : undefined
  if (legacyStatus) {
    return {
      status: legacyStatus,
      pedidoId: parsePedidoId(params.pedidoId),
    }
  }

  return null
}
