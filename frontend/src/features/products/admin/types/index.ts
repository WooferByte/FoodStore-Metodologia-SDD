import type { Product } from '@/entities/product'

export interface AdminProduct extends Product {}

export interface AdminProductFilters {
  q: string
  categoriaId: number | null
  disponible: string
  page: number
}

export interface ProductFormData {
  nombre: string
  descripcion: string
  precio_base: number
  stock_cantidad: number
  disponible: boolean
  imagen_url: string
  categoria_ids: number[]
  ingredientes: IngredientFormItem[]
}

export interface IngredientFormItem {
  ingrediente_id: number
  es_removible: boolean
}

export interface AdminProductsListResponse {
  items: Product[]
  total: number
  page: number
  size: number
  pages: number
}

export interface CreateProductPayload {
  nombre: string
  descripcion?: string
  precio_base: number
  stock_cantidad: number
  disponible?: boolean
  imagen_url?: string
}

export interface UpdateProductPayload {
  nombre?: string
  descripcion?: string
  precio_base?: number
  stock_cantidad?: number
  disponible?: boolean
  imagen_url?: string
}

export interface DeleteProductError {
  status: number
  message: string
}
