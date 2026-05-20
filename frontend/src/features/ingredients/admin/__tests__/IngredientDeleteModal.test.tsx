import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { IngredientDeleteModal } from '@/features/ingredients/admin/components/IngredientDeleteModal'
import type { Ingredient } from '@/entities/product'

vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    delete: vi.fn(),
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
    }
  }
  vi.clearAllMocks()
})

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

const mockIngredient: Ingredient = { id: '1', nombre: 'Queso', es_alergeno: false }

describe('IngredientDeleteModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    ingredient: null,
  }

  it('renders with ingredient name in message', () => {
    render(<IngredientDeleteModal {...defaultProps} ingredient={mockIngredient} />, { wrapper: createWrapper() })

    expect(screen.getByText(/Queso/)).toBeDefined()
    expect(screen.getByText('Eliminar ingrediente')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDefined()
  })

  it('renders cancel button', () => {
    render(<IngredientDeleteModal {...defaultProps} ingredient={mockIngredient} />, { wrapper: createWrapper() })

    const cancelBtns = screen.getAllByRole('button', { name: 'Cancelar' })
    expect(cancelBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('does not render modal content when closed', () => {
    const { container } = render(<IngredientDeleteModal {...defaultProps} isOpen={false} ingredient={mockIngredient} />, { wrapper: createWrapper() })

    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('open')).toBeNull()
  })

  it('renders non-reversible message', () => {
    render(<IngredientDeleteModal {...defaultProps} ingredient={mockIngredient} />, { wrapper: createWrapper() })

    expect(screen.getByText(/no se puede deshacer/)).toBeDefined()
  })
})
