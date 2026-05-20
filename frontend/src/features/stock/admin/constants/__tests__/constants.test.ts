import { describe, it, expect } from 'vitest'
import {
  ADMIN_STOCK_QUERY_KEY,
  ADMIN_STOCK_STALE_TIME,
  PRODUCTS_API_PATH,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_DELAY,
} from '@/features/stock/admin/constants'

describe('admin stock constants', () => {
  it('ADMIN_STOCK_QUERY_KEY is "admin-stock-products"', () => {
    expect(ADMIN_STOCK_QUERY_KEY).toBe('admin-stock-products')
  })

  it('ADMIN_STOCK_STALE_TIME is 60000', () => {
    expect(ADMIN_STOCK_STALE_TIME).toBe(60_000)
  })

  it('PRODUCTS_API_PATH is "/api/v1/productos"', () => {
    expect(PRODUCTS_API_PATH).toBe('/api/v1/productos')
  })

  it('PAGE_SIZE is 20', () => {
    expect(PAGE_SIZE).toBe(20)
  })

  it('SEARCH_DEBOUNCE_DELAY is 300', () => {
    expect(SEARCH_DEBOUNCE_DELAY).toBe(300)
  })
})
