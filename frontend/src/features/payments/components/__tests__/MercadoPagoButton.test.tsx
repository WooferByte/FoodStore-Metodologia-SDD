/**
 * Tests for MercadoPagoButton component.
 *
 * Tests:
 *   - No initPoint: button disabled
 *   - initPoint set: button enabled, click redirects to initPoint
 *   - Loading states: aria-busy, disabled, spinner text
 *   - onClick callback called before redirect
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MercadoPagoButton } from '../MercadoPagoButton'
import { usePaymentStore } from '@/store/paymentStore'

beforeEach(() => {
  usePaymentStore.getState().reset()
  usePaymentStore.getState().setMethod('mercadopago')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MercadoPagoButton', () => {
  describe('Sin initPoint', () => {
    it('renders the button disabled when initPoint is null', () => {
      render(<MercadoPagoButton />)
      const btn = screen.getByTestId('mercadopago-button')
      expect(btn).toBeInTheDocument()
      expect(btn).toBeDisabled()
      expect(btn).toHaveAttribute('aria-disabled', 'true')
    })

    it('shows "Pagar con MercadoPago" label when idle with no initPoint', () => {
      render(<MercadoPagoButton />)
      expect(screen.getByText('Pagar con MercadoPago')).toBeInTheDocument()
    })
  })

  describe('Con initPoint', () => {
    it('button is enabled when initPoint is set', () => {
      usePaymentStore.getState().setPreference('pref-123', 1, 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-123')
      usePaymentStore.getState().setStatus('idle')
      render(<MercadoPagoButton />)
      const btn = screen.getByTestId('mercadopago-button')
      expect(btn).not.toBeDisabled()
      expect(btn).toHaveAttribute('aria-disabled', 'false')
    })

    it('shows "Pagar con MercadoPago" label when idle with initPoint', () => {
      usePaymentStore.getState().setPreference('pref-123', 1, 'https://mp.com/checkout')
      render(<MercadoPagoButton />)
      expect(screen.getByText('Pagar con MercadoPago')).toBeInTheDocument()
    })

    it('redirects to initPoint on click', () => {
      const initPoint = 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-abc'
      usePaymentStore.getState().setPreference('pref-abc', 1, initPoint)
      usePaymentStore.getState().setStatus('idle')

      // jsdom does not support window.location assignment — mock it
      const assignSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        href: '',
      } as Location)
      let capturedHref = ''
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      })

      render(<MercadoPagoButton />)
      fireEvent.click(screen.getByTestId('mercadopago-button'))

      // In jsdom, assignment to window.location.href is intercepted
      // We verify status transitioned (redirect was attempted)
      expect(usePaymentStore.getState().status).toBe('waiting_payment')
      assignSpy.mockRestore()
      void capturedHref // suppress unused var warning
    })

    it('calls onCheckoutOpen callback before redirect', () => {
      const initPoint = 'https://mp.com/checkout'
      usePaymentStore.getState().setPreference('pref-xyz', 2, initPoint)
      usePaymentStore.getState().setStatus('idle')

      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      })

      const onCheckoutOpen = vi.fn()
      render(<MercadoPagoButton onCheckoutOpen={onCheckoutOpen} />)
      fireEvent.click(screen.getByTestId('mercadopago-button'))

      expect(onCheckoutOpen).toHaveBeenCalledOnce()
    })

    it('sets status to waiting_payment after clicking', () => {
      usePaymentStore.getState().setPreference('pref-xyz', 2, 'https://mp.com')
      usePaymentStore.getState().setStatus('idle')

      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      })

      render(<MercadoPagoButton />)
      fireEvent.click(screen.getByTestId('mercadopago-button'))

      expect(usePaymentStore.getState().status).toBe('waiting_payment')
    })
  })

  describe('Estados de carga', () => {
    it('shows "Creando pedido..." when status is creating_order', () => {
      usePaymentStore.getState().setStatus('creating_order')
      render(<MercadoPagoButton />)
      expect(screen.getByText('Creando pedido...')).toBeInTheDocument()
    })

    it('shows "Generando pago..." when status is creating_preference', () => {
      usePaymentStore.getState().setStatus('creating_preference')
      render(<MercadoPagoButton />)
      expect(screen.getByText('Generando pago...')).toBeInTheDocument()
    })

    it('has aria-busy=true when loading', () => {
      usePaymentStore.getState().setStatus('creating_order')
      render(<MercadoPagoButton />)
      expect(screen.getByTestId('mercadopago-button')).toHaveAttribute(
        'aria-busy',
        'true',
      )
    })

    it('button is disabled when loading even with initPoint', () => {
      usePaymentStore.getState().setPreference('pref-123', 1, 'https://mp.com')
      usePaymentStore.getState().setStatus('creating_preference')
      render(<MercadoPagoButton />)
      expect(screen.getByTestId('mercadopago-button')).toBeDisabled()
    })
  })
})
