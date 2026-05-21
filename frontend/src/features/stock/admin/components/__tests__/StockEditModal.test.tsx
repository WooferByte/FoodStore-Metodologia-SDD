import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { StockEditModal } from '@/features/stock/admin/components/StockEditModal'
import { apiClient } from '@/shared/api/axios'
import type { Product } from '@/entities/product'

vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    patch: vi.fn(),
    put: vi.fn(),
  },
}))

beforeEach(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
  vi.clearAllMocks()
})

const mockProduct: Product = {
  id: '1',
  nombre: 'Pizza Margherita',
  descripcion: 'Rica pizza',
  precio_base: 10.5,
  imagen_url: '',
  disponible: true,
  stock_cantidad: 20,
  categorias: [],
  ingredientes: [],
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('StockEditModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    product: mockProduct,
  }

  it('renders modal with product name and current stock', () => {
    render(<StockEditModal {...defaultProps} />, { wrapper: createWrapper() })

    expect(screen.getByText('Stock: Pizza Margherita')).toBeDefined()
  })

  it('preloads current stock value', () => {
    render(<StockEditModal {...defaultProps} />, { wrapper: createWrapper() })

    const input = screen.getByLabelText('Cantidad en stock') as HTMLInputElement
    expect(input.value).toBe('20')
  })

  it('shows validation error for negative stock', async () => {
    const { container } = render(<StockEditModal {...defaultProps} />, { wrapper: createWrapper() })

    const input = screen.getByLabelText('Cantidad en stock')
    fireEvent.change(input, { target: { value: '-5' } })

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('El stock no puede ser negativo')).toBeDefined()
    })

    expect(apiClient.patch).not.toHaveBeenCalled()
  })

  it('submits stock change via PATCH endpoint', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockProduct })

    const { container } = render(<StockEditModal {...defaultProps} />, { wrapper: createWrapper() })

    const input = screen.getByLabelText('Cantidad en stock')
    fireEvent.change(input, { target: { value: '25' } })

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/productos/1/stock', { stock_cantidad: 25 })
    })
  })

  it('calls onSuccess and onClose on successful submit', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockProduct })

    const onSuccess = vi.fn()

    const { container } = render(
      <StockEditModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={onSuccess}
        product={mockProduct}
      />,
      { wrapper: createWrapper() },
    )

    const input = screen.getByLabelText('Cantidad en stock')
    fireEvent.change(input, { target: { value: '30' } })

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('renders disponible checkbox with current state', () => {
    render(<StockEditModal {...defaultProps} />, { wrapper: createWrapper() })

    const checkbox = screen.getByLabelText('Producto disponible') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('does not submit if nothing changed', async () => {
    const onClose = vi.fn()

    const { container } = render(
      <StockEditModal
        isOpen={true}
        onClose={onClose}
        onSuccess={vi.fn()}
        product={mockProduct}
      />,
      { wrapper: createWrapper() },
    )

    const form = container.querySelector('form')!
    fireEvent.submit(form)

    expect(apiClient.patch).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
