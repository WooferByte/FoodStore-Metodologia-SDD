/**
 * MercadoPagoButton — redirects the user to the MercadoPago checkout page.
 *
 * Uses a direct page redirect to initPoint (returned by the backend when
 * creating the preference). This works correctly in sandbox/test mode
 * whereas the JS SDK modal does not redirect after login.
 *
 * States:
 *   - idle with initPoint: enabled, shows "Pagar con MercadoPago"
 *   - creating_order | creating_preference: loading spinner, disabled
 *   - no initPoint yet: disabled (waiting for preference creation)
 */

import { usePaymentStore } from '@/store/paymentStore'

interface MercadoPagoButtonProps {
  /** Called just before the redirect happens */
  onCheckoutOpen?: () => void
}

export function MercadoPagoButton({ onCheckoutOpen }: MercadoPagoButtonProps) {
  const initPoint = usePaymentStore((state) => state.initPoint)
  const status = usePaymentStore((state) => state.status)
  const setStatus = usePaymentStore((state) => state.setStatus)

  const isLoading =
    status === 'creating_order' || status === 'creating_preference'

  const isDisabled = !initPoint || isLoading || status === 'waiting_payment'

  function handleClick() {
    if (isDisabled || !initPoint) return

    setStatus('waiting_payment')
    onCheckoutOpen?.()
    window.location.href = initPoint
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
      data-testid="mercadopago-button"
      className={[
        'relative flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3',
        'text-sm font-semibold transition-colors focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDisabled
          ? 'cursor-not-allowed bg-muted text-muted-foreground'
          : 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
      ].join(' ')}
    >
      {isLoading ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>
            {status === 'creating_order'
              ? 'Creando pedido...'
              : 'Generando pago...'}
          </span>
        </>
      ) : (
        <>
          <span aria-hidden="true">💳</span>
          <span>
            {status === 'waiting_payment'
              ? 'Redirigiendo...'
              : 'Pagar con MercadoPago'}
          </span>
        </>
      )}
    </button>
  )
}
