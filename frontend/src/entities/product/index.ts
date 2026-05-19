/**
 * Product Domain Types
 *
 * Canonical source of truth for product-related domain types.
 * Features/ import from here, NOT the other way around.
 */

export interface Ingredient {
  id: string
  nombre: string
  es_alergeno: boolean
  es_removible?: boolean
}

export interface Category {
  id: string
  nombre: string
  padre_id?: string | null
}

export interface Product {
  id: string
  nombre: string
  descripcion: string
  precio_base: number | string
  imagen_url: string
  disponible: boolean
  stock_cantidad: number
  categorias: Category[]
  ingredientes: Ingredient[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export type ProductsApiResponse = PaginatedResponse<Product>

export type CategoriesApiResponse = Category[]

export interface CatalogFilters {
  categoryIds: string[]
  search: string
  excludeAllergens: string[]
  currentPage: number
}
