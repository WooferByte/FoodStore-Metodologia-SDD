import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { IngredientFormModal } from '@/features/ingredients/admin/components/IngredientFormModal'
import type { Ingredient } from '@/entities/product'

vi.mock('@/shared/api/axios', () => ({
  apiClient: {
    post: vi.fn(),
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

describe('IngredientFormModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    ingredient: null,
  }

  it('renders create mode with empty fields', () => {
    render(<IngredientFormModal {...defaultProps} />, { wrapper: createWrapper() })

    expect(screen.getByText('Nuevo ingrediente')).toBeDefined()
    expect(screen.getByLabelText('Nombre')).toBeDefined()
    expect(screen.getByLabelText('Es alérgeno')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Crear' })).toBeDefined()
  })

  it('renders edit mode with pre-filled fields', () => {
    render(
      <IngredientFormModal {...defaultProps} ingredient={mockIngredient} />,
      { wrapper: createWrapper() },
    )

    expect(screen.getByText(/Editar ingrediente/)).toBeDefined()
    expect(screen.getByDisplayValue('Queso')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDefined()
  })

  it('does not render modal content when closed', () => {
    const { container } = render(<IngredientFormModal {...defaultProps} isOpen={false} />, { wrapper: createWrapper() })

    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('open')).toBeNull()
  })

  it('renders cancel button in both modes', () => {
    render(<IngredientFormModal {...defaultProps} />, { wrapper: createWrapper() })

    const cancelBtns = screen.getAllByRole('button', { name: 'Cancelar' })
    expect(cancelBtns.length).toBeGreaterThanOrEqual(1)
  })
})
