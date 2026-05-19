/**
 * Tests for ProductCard component
 *
 * Verifies:
 * - Renders <img> element when imagen_url is present
 * - Renders fallback (first letter of name) when imagen_url is null/undefined
 * - Renders fallback when the image fires an onError event
 * - Badge shows "In Stock" with role="status" when product is available
 * - Badge shows "Out of Stock" when product is not available
 * - "Add" button is disabled when product is not available
 * - aria-label on "Add" button mentions "(unavailable)" when not available
 */

import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Product } from '@/entities/product'
import { ProductCard } from '../ProductCard'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '1',
    nombre: 'Pizza Margherita',
    descripcion: 'La clásica napolitana con mozzarella.',
    precio_base: 2800,
    imagen_url: 'https://example.com/pizza.jpg',
    disponible: true,
    stock_cantidad: 10,
    categorias: [],
    ingredientes: [],
    ...overrides,
  }
}

const noop = vi.fn()

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProductCard', () => {
  it('renders <img> element when imagen_url is present', () => {
    const product = makeProduct({ imagen_url: 'https://example.com/pizza.jpg' })
    render(<ProductCard product={product} onViewDetails={noop} onAddToCart={noop} />)

    const img = screen.getByRole('img', { name: `Foto de ${product.nombre}` })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', product.imagen_url)
  })

  it('renders fallback with first letter of name when imagen_url is null/undefined', () => {
    // imagen_url type in Product is string, but backend sends Optional[str]
    // so we cast to any to simulate the null case
    const product = makeProduct({ imagen_url: undefined as unknown as string })
    render(<ProductCard product={product} onViewDetails={noop} onAddToCart={noop} />)

    // No <img> should be rendered
    expect(screen.queryByRole('img', { name: `Foto de ${product.nombre}` })).toBeNull()

    // Fallback shows first letter
    expect(screen.getByText('P')).toBeInTheDocument() // 'P' from 'Pizza'
  })

  it('renders fallback when image fires onError', () => {
    const product = makeProduct({ imagen_url: 'https://broken-url.example.com/image.jpg' })
    render(<ProductCard product={product} onViewDetails={noop} onAddToCart={noop} />)

    const img = screen.getByRole('img', { name: `Foto de ${product.nombre}` })

    // Simulate image load failure
    fireEvent.error(img)

    // After error, fallback should appear (img no longer in DOM)
    expect(screen.queryByRole('img', { name: `Foto de ${product.nombre}` })).toBeNull()
    expect(screen.getByText('P')).toBeInTheDocument()
  })

  it('badge shows "In Stock" with role="status" when product is available and stock > 0', () => {
    const product = makeProduct({ disponible: true, stock_cantidad: 5 })
    render(<ProductCard product={product} onViewDetails={noop} onAddToCart={noop} />)

    const badge = screen.getByRole('status')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('In Stock')
    expect(badge).toHaveAttribute('aria-label', 'En stock')
  })

  it('badge shows "Out of Stock" when product is not available', () => {
    const product = makeProduct({ disponible: false, stock_cantidad: 0 })
    render(<ProductCard product={product} onViewDetails={noop} onAddToCart={noop} />)

    const badge = screen.getByRole('status')
    expect(badge).toHaveTextContent('Out of Stock')
    expect(badge).toHaveAttribute('aria-label', 'Sin stock')
  })

  it('"Add" button is disabled when product is not available', () => {
    const product = makeProduct({ disponible: false, stock_cantidad: 0 })
    render(<ProductCard product={product} onViewDetails={noop} onAddToCart={noop} />)

    const addButton = screen.getByRole('button', {
      name: new RegExp(`Add ${product.nombre}`, 'i'),
    })
    expect(addButton).toBeDisabled()
  })

  it('aria-label on "Add" button mentions "(unavailable)" when not available', () => {
    const product = makeProduct({ disponible: false, stock_cantidad: 0 })
    render(<ProductCard product={product} onViewDetails={noop} onAddToCart={noop} />)

    const addButton = screen.getByRole('button', {
      name: new RegExp('unavailable', 'i'),
    })
    expect(addButton).toBeInTheDocument()
    expect(addButton).toHaveAttribute(
      'aria-label',
      `Add ${product.nombre} to cart (unavailable)`,
    )
  })
})
