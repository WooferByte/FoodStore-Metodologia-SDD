import { useMemo } from 'react'
import type { Product } from '@/entities/product'

/**
 * Normalize a string for accent-insensitive, case-insensitive comparison.
 * Strips diacritics (accents) so "cafe" matches "Café", etc.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export interface CatalogSearchResult {
  filtered: Product[]
  resultCount: number
  isFiltering: boolean
}

/**
 * useCatalogSearch — client-side product search with accent normalization.
 *
 * Searches both `nombre` and `descripcion` fields.
 * When `searchTerm` is empty, returns all products without filtering.
 *
 * Uses `useMemo` to avoid recomputation on unrelated re-renders.
 *
 * @param products - Full product list from the server
 * @param searchTerm - Raw search string (not yet debounced — caller controls debounce)
 * @returns filtered list, result count, and isFiltering flag
 */
export function useCatalogSearch(
  products: Product[],
  searchTerm: string,
): CatalogSearchResult {
  return useMemo(() => {
    const trimmed = searchTerm.trim()

    if (trimmed === '') {
      return {
        filtered: products,
        resultCount: products.length,
        isFiltering: false,
      }
    }

    const normalizedTerm = normalize(trimmed)

    const filtered = products.filter((product) => {
      const inNombre = normalize(product.nombre).includes(normalizedTerm)
      const inDescripcion = product.descripcion ? normalize(product.descripcion).includes(normalizedTerm) : false
      return inNombre || inDescripcion
    })

    return {
      filtered,
      resultCount: filtered.length,
      isFiltering: true,
    }
  }, [products, searchTerm])
}
