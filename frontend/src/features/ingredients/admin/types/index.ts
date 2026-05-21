import type { Ingredient } from '@/entities/product'

export interface IngredientFilters {
  es_alergeno: 'all' | 'true' | 'false'
}

export interface IngredientFormData {
  nombre: string
  es_alergeno: boolean
}

export type IngredientsApiResponse = Ingredient[]
