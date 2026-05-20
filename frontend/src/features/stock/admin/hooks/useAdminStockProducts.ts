import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { apiClient } from '@/shared/api/axios'
import {
  ADMIN_STOCK_QUERY_KEY,
  ADMIN_STOCK_STALE_TIME,
  PRODUCTS_API_PATH,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_DELAY,
} from '@/features/stock/admin/constants'
import type { StockProductFilters, StockProductListResponse } from '@/features/stock/admin/types'

function buildQueryParams(filters: StockProductFilters & { debouncedQ: string }): URLSearchParams {
  const p = new URLSearchParams()
  p.set('page', String(filters.page))
  p.set('size', String(PAGE_SIZE))

  if (filters.debouncedQ.trim()) {
    p.set('q', filters.debouncedQ.trim())
  }
  if (filters.disponible !== 'all') {
    p.set('disponible', filters.disponible)
  }

  return p
}

export function useAdminStockProducts(filters: StockProductFilters) {
  const [debouncedQ, setDebouncedQ] = useState(filters.q)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(filters.q)
    }, SEARCH_DEBOUNCE_DELAY)
    return () => clearTimeout(timer)
  }, [filters.q])

  const params = buildQueryParams({ ...filters, debouncedQ })

  return useQuery<StockProductListResponse>({
    queryKey: [ADMIN_STOCK_QUERY_KEY, {
      q: debouncedQ,
      disponible: filters.disponible,
      page: filters.page,
    }],
    queryFn: async () => {
      const response = await apiClient.get<StockProductListResponse>(
        `${PRODUCTS_API_PATH}?${params.toString()}`,
      )
      return response.data
    },
    placeholderData: keepPreviousData,
    staleTime: ADMIN_STOCK_STALE_TIME,
    gcTime: 5 * 60_000,
    retry: 1,
  })
}
