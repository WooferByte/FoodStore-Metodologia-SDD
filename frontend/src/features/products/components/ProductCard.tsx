/**
 * ProductCard Component
 *
 * Displays a product in thumbnail form with:
 * - Product image with lazy loading + gradient fallback with initial letter
 * - Product name and price
 * - Availability badge (In Stock / Out of Stock) — semantic tokens + ARIA
 * - "View Details" and "Add to Cart" buttons
 *
 * Accessibility:
 * - Descriptive alt text on images
 * - Fallback container is aria-hidden (decorative)
 * - Badges have role="status" + aria-label
 * - Buttons always show text (no hidden-on-mobile pattern)
 * - Keyboard navigable
 *
 * @component
 * @example
 * ```tsx
 * <ProductCard
 *   product={product}
 *   onViewDetails={(product) => setSelectedProduct(product)}
 *   onAddToCart={(product) => handleAddToCart(product)}
 * />
 * ```
 */

import { memo, useState } from 'react'
import { ShoppingCart, Eye } from 'lucide-react'
import type { ProductCardProps } from '@/features/products/types'

/**
 * Gradient fallback shown when imagen_url is absent or fails to load.
 * Displays the first character of the product name.
 */
function ProductImageFallback({ name }: { name: string }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary"
      aria-hidden="true"
    >
      <span className="text-5xl font-bold text-primary/60 select-none">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

export const ProductCard = memo(function ProductCard({
  product,
  onViewDetails,
  onAddToCart,
}: ProductCardProps) {
  const isAvailable = product.disponible && product.stock_cantidad > 0
  const priceNum = parseFloat(String(product.precio_base))
  const priceFormatted = isFinite(priceNum)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(priceNum)
    : '—'

  // Start in error state immediately if there is no URL — avoids a broken-image flash
  const [imgError, setImgError] = useState<boolean>(!product.imagen_url)

  return (
    <article
      className="group bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col"
      role="article"
      aria-label={`Product: ${product.nombre}`}
    >
      {/* Image Container — aspect ratio keeps cards uniform in the grid */}
      <div className="relative overflow-hidden bg-muted aspect-[4/3] w-full">
        {imgError ? (
          <ProductImageFallback name={product.nombre} />
        ) : (
          <img
            src={product.imagen_url}
            alt={`Foto de ${product.nombre}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}

        {/* Availability Badge */}
        <div className="absolute top-2 right-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              isAvailable
                ? 'bg-success/15 text-success border-success/30'
                : 'bg-destructive/15 text-destructive border-destructive/30'
            }`}
            role="status"
            aria-label={isAvailable ? 'En stock' : 'Sin stock'}
          >
            {isAvailable ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>

        {/* Allergen Indicator */}
        {product.ingredientes.some((ing) => ing.es_alergeno) && (
          <div
            className="absolute bottom-2 left-2 bg-warning/15 text-warning-foreground px-2 py-1 rounded text-xs font-semibold"
            role="img"
            aria-label="Contains allergens"
            title="This product contains allergens"
          >
            ⚠️ Allergens
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Name */}
        <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">
          {product.nombre}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {product.descripcion}
        </p>

        {/* Price */}
        <p className="text-2xl font-bold text-primary mb-4">
          {priceFormatted}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          {/* View Details Button */}
          <button
            onClick={() => onViewDetails(product)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg font-medium transition-colors"
            aria-label={`View details for ${product.nombre}`}
          >
            <Eye size={16} aria-hidden="true" />
            <span>Details</span>
          </button>

          {/* Add to Cart Button */}
          <button
            onClick={() => onAddToCart(product)}
            disabled={!isAvailable}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-success hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            aria-label={`Add ${product.nombre} to cart${!isAvailable ? ' (unavailable)' : ''}`}
          >
            <ShoppingCart size={16} aria-hidden="true" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </article>
  )
})

export type { ProductCardProps }
