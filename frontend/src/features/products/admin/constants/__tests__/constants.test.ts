import { describe, it, expect } from 'vitest'
import {
  ADMIN_PRODUCTS_QUERY_KEY,
  ADMIN_PRODUCTS_STALE_TIME,
  PRODUCTS_API_PATH,
  CATEGORIES_API_PATH,
  INGREDIENTS_API_PATH,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_DELAY,
} from '@/features/products/admin/constants'

describe('admin products constants', () => {
  it('ADMIN_PRODUCTS_QUERY_KEY is "admin-products"', () => {
    expect(ADMIN_PRODUCTS_QUERY_KEY).toBe('admin-products')
  })

  it('ADMIN_PRODUCTS_STALE_TIME is 60000', () => {
    expect(ADMIN_PRODUCTS_STALE_TIME).toBe(60_000)
  })

  it('PRODUCTS_API_PATH is "/api/v1/productos"', () => {
    expect(PRODUCTS_API_PATH).toBe('/api/v1/productos')
  })

  it('CATEGORIES_API_PATH is "/api/v1/categorias"', () => {
    expect(CATEGORIES_API_PATH).toBe('/api/v1/categorias')
  })

  it('INGREDIENTS_API_PATH is "/api/v1/ingredientes"', () => {
    expect(INGREDIENTS_API_PATH).toBe('/api/v1/ingredientes')
  })

  it('PAGE_SIZE is 20', () => {
    expect(PAGE_SIZE).toBe(20)
  })

  it('SEARCH_DEBOUNCE_DELAY is 300', () => {
    expect(SEARCH_DEBOUNCE_DELAY).toBe(300)
  })
})
