/**
 * Unit tests for mpReturnToPaymentResult — maps MercadoPago native query
 * params (`status` + `external_reference`) to paymentStore status/pedidoId,
 * with fallback to the legacy contract (`payment` + `pedido_id`).
 *
 * mercadopago-live-integration — tasks 2.1 / 2.2
 */

import { describe, it, expect } from 'vitest'
import { mpReturnToPaymentResult } from '../mpReturnToPaymentResult'

describe('mpReturnToPaymentResult — native MP params', () => {
  it('status=approved → success', () => {
    const result = mpReturnToPaymentResult({
      status: 'approved',
      externalReference: '42',
      payment: null,
      pedidoId: null,
    })
    expect(result).toEqual({ status: 'success', pedidoId: 42 })
  })

  it('status=pending → pending', () => {
    const result = mpReturnToPaymentResult({
      status: 'pending',
      externalReference: '42',
      payment: null,
      pedidoId: null,
    })
    expect(result).toEqual({ status: 'pending', pedidoId: 42 })
  })

  it('status=in_process → pending', () => {
    const result = mpReturnToPaymentResult({
      status: 'in_process',
      externalReference: '42',
      payment: null,
      pedidoId: null,
    })
    expect(result).toEqual({ status: 'pending', pedidoId: 42 })
  })

  it('status=rejected → error', () => {
    const result = mpReturnToPaymentResult({
      status: 'rejected',
      externalReference: '42',
      payment: null,
      pedidoId: null,
    })
    expect(result).toEqual({ status: 'error', pedidoId: 42 })
  })

  it('status=cancelled → error', () => {
    const result = mpReturnToPaymentResult({
      status: 'cancelled',
      externalReference: '42',
      payment: null,
      pedidoId: null,
    })
    expect(result).toEqual({ status: 'error', pedidoId: 42 })
  })

  it('status=failure → error', () => {
    const result = mpReturnToPaymentResult({
      status: 'failure',
      externalReference: '42',
      payment: null,
      pedidoId: null,
    })
    expect(result).toEqual({ status: 'error', pedidoId: 42 })
  })

  it('external_reference no entero → pedidoId null (status igual)', () => {
    const result = mpReturnToPaymentResult({
      status: 'approved',
      externalReference: 'not-an-int',
      payment: null,
      pedidoId: null,
    })
    expect(result).toEqual({ status: 'success', pedidoId: null })
  })
})

describe('mpReturnToPaymentResult — fallback legacy', () => {
  it('payment=success&pedido_id=7 (sin nativos) → success + pedidoId 7', () => {
    const result = mpReturnToPaymentResult({
      status: null,
      externalReference: null,
      payment: 'success',
      pedidoId: '7',
    })
    expect(result).toEqual({ status: 'success', pedidoId: 7 })
  })

  it('payment=failure&pedido_id=7 → error + pedidoId 7', () => {
    const result = mpReturnToPaymentResult({
      status: null,
      externalReference: null,
      payment: 'failure',
      pedidoId: '7',
    })
    expect(result).toEqual({ status: 'error', pedidoId: 7 })
  })

  it('payment=pending&pedido_id=7 → pending + pedidoId 7', () => {
    const result = mpReturnToPaymentResult({
      status: null,
      externalReference: null,
      payment: 'pending',
      pedidoId: '7',
    })
    expect(result).toEqual({ status: 'pending', pedidoId: 7 })
  })
})

describe('mpReturnToPaymentResult — precedencia nativos sobre legacy', () => {
  it('nativos y legacy en conflicto → ganan los nativos', () => {
    const result = mpReturnToPaymentResult({
      status: 'approved',
      externalReference: '42',
      payment: 'failure',
      pedidoId: '7',
    })
    expect(result).toEqual({ status: 'success', pedidoId: 42 })
  })
})

describe('mpReturnToPaymentResult — sin params de resultado', () => {
  it('sin status ni payment → null', () => {
    const result = mpReturnToPaymentResult({
      status: null,
      externalReference: null,
      payment: null,
      pedidoId: null,
    })
    expect(result).toBeNull()
  })

  it('status desconocido y sin legacy → null', () => {
    const result = mpReturnToPaymentResult({
      status: 'weird_unknown_status',
      externalReference: '42',
      payment: null,
      pedidoId: null,
    })
    expect(result).toBeNull()
  })
})
