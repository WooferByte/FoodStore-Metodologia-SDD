import type { Product } from '@/entities/product'

export interface StockProductFilters {
  q: string
  disponible: 'all' | 'true' | 'false'
  page: number
}

export interface StockProductListResponse {
  items: Product[]
  total: number
  page: number
  size: number
  pages: number
}

export interface StockEditPayload {
  stock_cantidad: number
  disponible?: boolean
}

export interface DisponibleUpdatePayload {
  disponible: boolean
}
