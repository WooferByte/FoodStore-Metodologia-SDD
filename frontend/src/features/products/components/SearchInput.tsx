/**
 * SearchInput Component
 *
 * Controlled pure search input — no internal debounce or local state.
 * The parent is responsible for debouncing via useDebounce before querying.
 *
 * - Labeled for accessibility (sr-only label + aria-label on input)
 * - Clear button resets to empty string
 * - Shows result count when a search term is active
 *
 * @component
 */

import { Search, X } from 'lucide-react'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  resultCount?: number
}

/**
 * SearchInput Component
 *
 * @param value - Current search value (controlled by parent)
 * @param onChange - Callback called on every keystroke — parent applies debounce
 * @param placeholder - Input placeholder text
 * @param resultCount - Number of results to display below the input when filtering
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search products...',
  resultCount,
}: SearchInputProps) {
  const handleClear = () => {
    onChange('')
  }

  return (
    <div className="relative w-full">
      <label htmlFor="search-input" className="sr-only">
        Search products
      </label>
      <div className="relative">
        <Search
          size={20}
          className="absolute left-3 top-3 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="search-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          aria-label="Search products by name or description"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
            title="Clear search"
          >
            <X size={20} />
          </button>
        )}
      </div>
      {value.trim() && (
        <p
          aria-live="polite"
          className="text-sm text-muted-foreground mt-1"
        >
          {resultCount ?? 0} resultados encontrados
        </p>
      )}
    </div>
  )
}
