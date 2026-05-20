import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IngredientsTable } from '@/features/ingredients/admin/components/IngredientsTable'
import type { Ingredient } from '@/entities/product'

const mockIngredients: Ingredient[] = [
  { id: '1', nombre: 'Queso', es_alergeno: false },
  { id: '2', nombre: 'Gluten', es_alergeno: true },
  { id: '3', nombre: 'Leche', es_alergeno: true },
]

describe('IngredientsTable', () => {
  const defaultProps = {
    ingredients: mockIngredients,
    isLoading: false,
    isError: false,
    esAlergenoFilter: 'all' as const,
    onEsAlergenoFilterChange: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }

  it('renders ingredient names (desktop + mobile)', () => {
    render(<IngredientsTable {...defaultProps} />)

    expect(screen.getAllByText('Queso').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Gluten').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Leche').length).toBeGreaterThanOrEqual(1)
  })

  it('renders loading skeleton', () => {
    const { container } = render(<IngredientsTable {...defaultProps} isLoading={true} />)

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders empty state when no ingredients', () => {
    render(<IngredientsTable {...defaultProps} ingredients={[]} />)

    expect(screen.getByText('No se encontraron ingredientes')).toBeDefined()
  })

  it('renders error state', () => {
    render(<IngredientsTable {...defaultProps} isError={true} />)

    expect(screen.getByText('Error al cargar los ingredientes.')).toBeDefined()
  })

  it('renders filter select', () => {
    render(<IngredientsTable {...defaultProps} />)

    expect(screen.getByLabelText('Filtrar por alérgeno')).toBeDefined()
  })

  it('renders edit and delete buttons with aria-label', () => {
    render(<IngredientsTable {...defaultProps} />)

    expect(screen.getAllByLabelText('Editar Queso').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByLabelText('Eliminar Queso').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByLabelText('Editar Gluten').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByLabelText('Eliminar Gluten').length).toBeGreaterThanOrEqual(1)
  })

  it('renders warning badge for allergens and success badge for non-allergens', () => {
    const { container } = render(<IngredientsTable {...defaultProps} />)

    const badgeTexts = screen.getAllByText('Sí')
    expect(badgeTexts.length).toBeGreaterThanOrEqual(2)

    const noTexts = screen.getAllByText('No')
    expect(noTexts.length).toBeGreaterThanOrEqual(1)
  })
})
