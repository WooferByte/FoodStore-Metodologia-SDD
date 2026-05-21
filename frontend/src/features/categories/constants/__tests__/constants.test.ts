import { describe, it, expect } from 'vitest'
import {
  CATEGORIES_QUERY_KEY,
  CATEGORIES_STALE_TIME,
  CATEGORIES_API_PATH,
} from '@/features/categories/constants'

describe('categories constants', () => {
  it('CATEGORIES_QUERY_KEY is "categories"', () => {
    expect(CATEGORIES_QUERY_KEY).toBe('categories')
  })

  it('CATEGORIES_STALE_TIME is 60000', () => {
    expect(CATEGORIES_STALE_TIME).toBe(60_000)
  })

  it('CATEGORIES_API_PATH is "/api/v1/categorias"', () => {
    expect(CATEGORIES_API_PATH).toBe('/api/v1/categorias')
  })
})
