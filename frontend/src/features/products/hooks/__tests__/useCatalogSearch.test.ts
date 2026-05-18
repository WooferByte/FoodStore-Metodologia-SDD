/**
 * Tests for useCatalogSearch hook
 *
 * Verifies:
 * - Empty search term returns all products, isFiltering=false
 * - Filters by product name
 * - Filters by product description
 * - Case-insensitive matching
 * - Accent normalization (e.g. "cafe" matches "Café")
 * - Returns empty filtered list when no match
 * - resultCount reflects exact filtered count
 * - isFiltering is true when a search term is active
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { Product } from '@/features/products/types'
import { useCatalogSearch } from '../useCatalogSearch'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<Product> & { nombre: string; descripcion: string }): Product {
  return {
    id: String(Math.random()),
    precio_base: 1000,
    imagen_url: '',
    disponible: true,
    stock_cantidad: 10,
    categorias: [],
    ingredientes: [],
    ...overrides,
  }
}

const PRODUCTS: Product[] = [
  makeProduct({ nombre: 'Pizza Margherita', descripcion: 'La clásica napolitana con mozzarella.' }),
  makeProduct({ nombre: 'Pizza Pepperoni', descripcion: 'Abundante pepperoni importado.' }),
  makeProduct({ nombre: 'Hamburguesa Clásica', descripcion: 'Carne vacuna, lechuga y tomate.' }),
  makeProduct({ nombre: 'Café Especial', descripcion: 'Blend de origen con notas frutales.' }),
  makeProduct({ nombre: 'Sprite 500ml', descripcion: 'Lima limón sin azúcar.' }),
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCatalogSearch', () => {
  it('empty search term returns all products with isFiltering=false', () => {
    const { result } = renderHook(() => useCatalogSearch(PRODUCTS, ''))

    expect(result.current.filtered).toEqual(PRODUCTS)
    expect(result.current.resultCount).toBe(PRODUCTS.length)
    expect(result.current.isFiltering).toBe(false)
  })

  it('filters by product nombre', () => {
    const { result } = renderHook(() => useCatalogSearch(PRODUCTS, 'Pizza'))

    expect(result.current.filtered).toHaveLength(2)
    expect(result.current.filtered.map((p) => p.nombre)).toContain('Pizza Margherita')
    expect(result.current.filtered.map((p) => p.nombre)).toContain('Pizza Pepperoni')
    expect(result.current.isFiltering).toBe(true)
  })

  it('filters by product descripcion', () => {
    const { result } = renderHook(() => useCatalogSearch(PRODUCTS, 'mozzarella'))

    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].nombre).toBe('Pizza Margherita')
    expect(result.current.isFiltering).toBe(true)
  })

  it('is case-insensitive (lowercase term matches capitalized nombre)', () => {
    const { result } = renderHook(() => useCatalogSearch(PRODUCTS, 'pizza'))

    expect(result.current.filtered).toHaveLength(2)
  })

  it('normalizes accents — "cafe" matches "Café Especial"', () => {
    const { result } = renderHook(() => useCatalogSearch(PRODUCTS, 'cafe'))

    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].nombre).toBe('Café Especial')
  })

  it('returns empty filtered list when no products match', () => {
    const { result } = renderHook(() => useCatalogSearch(PRODUCTS, 'nonexistent-xyz'))

    expect(result.current.filtered).toHaveLength(0)
    expect(result.current.resultCount).toBe(0)
    expect(result.current.isFiltering).toBe(true)
  })

  it('resultCount reflects exactly the number of filtered products', () => {
    const { result } = renderHook(() => useCatalogSearch(PRODUCTS, 'Hamburguesa'))

    expect(result.current.resultCount).toBe(1)
    expect(result.current.resultCount).toBe(result.current.filtered.length)
  })

  it('isFiltering is true when a non-empty search term is provided', () => {
    const { result } = renderHook(() => useCatalogSearch(PRODUCTS, 'sprite'))

    expect(result.current.isFiltering).toBe(true)
  })
})
