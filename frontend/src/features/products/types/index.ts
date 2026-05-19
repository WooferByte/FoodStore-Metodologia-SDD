/**
 * Product Feature Types
 *
 * Component prop types only. Domain types live in @/entities/product.
 */

import type { Product } from '@/entities/product'

export interface ProductCardProps {
  product: Product
  onViewDetails: (product: Product) => void
  onAddToCart: (product: Product) => void
}

export interface ProductDetailProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: Product, quantity: number) => void
}
