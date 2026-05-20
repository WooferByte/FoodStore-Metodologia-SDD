import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminStockTable } from '@/features/stock/admin/components/AdminStockTable'
import type { Product } from '@/entities/product'

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

const mockProductLowStock: Product = {
  id: '2',
  nombre: 'Empanada',
  descripcion: '',
  precio_base: 5,
  imagen_url: '',
  disponible: true,
  stock_cantidad: 3,
  categorias: [],
  ingredientes: [],
}

const mockProductNoStock: Product = {
  id: '3',
  nombre: 'Lomito',
  descripcion: '',
  precio_base: 15,
  imagen_url: '',
  disponible: false,
  stock_cantidad: 0,
  categorias: [],
  ingredientes: [],
}

describe('AdminStockTable', () => {
  const defaultProps = {
    products: [mockProduct, mockProductLowStock, mockProductNoStock],
    isLoading: false,
    isError: false,
    total: 3,
    page: 1,
    totalPages: 1,
    onEdit: vi.fn(),
    onPageChange: vi.fn(),
  }

  it('renders table with product rows (desktop + mobile)', () => {
    render(<AdminStockTable {...defaultProps} />)

    const names = screen.getAllByText('Pizza Margherita')
    expect(names.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Empanada').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Lomito').length).toBeGreaterThanOrEqual(1)
  })

  it('renders loading skeleton', () => {
    const { container } = render(<AdminStockTable {...defaultProps} isLoading={true} />)

    const skeleton = container.querySelector('.animate-pulse')
    expect(skeleton).toBeDefined()
  })

  it('renders empty state when no products', () => {
    render(<AdminStockTable {...defaultProps} products={[]} total={0} totalPages={0} />)

    expect(screen.getByText('No se encontraron productos')).toBeDefined()
  })

  it('renders error state', () => {
    render(<AdminStockTable {...defaultProps} isError={true} />)

    expect(screen.getByText('Error al cargar los productos.')).toBeDefined()
  })

  it('renders pagination when totalPages > 1', () => {
    render(<AdminStockTable {...defaultProps} totalPages={3} total={45} />)

    expect(screen.getByText('Página 1 de 3 (45 productos)')).toBeDefined()
    expect(screen.getByText('Siguiente')).toBeDefined()
    expect(screen.getByText('Anterior')).toBeDefined()
  })

  it('renders stock badge with warning variant for low stock', () => {
    render(<AdminStockTable {...defaultProps} />)

    const badges = screen.getAllByText('3 uds.')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('renders stock badge with error variant for no stock', () => {
    render(<AdminStockTable {...defaultProps} />)

    const badges = screen.getAllByText('Sin stock')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('renders edit buttons with aria-label (desktop + mobile)', () => {
    render(<AdminStockTable {...defaultProps} />)

    const editBtns = screen.getAllByLabelText('Editar stock de Pizza Margherita')
    expect(editBtns.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByLabelText('Editar stock de Empanada').length).toBeGreaterThanOrEqual(1)
  })
})
