import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { apiClient } from '@/shared/api/axios'
import {
  ADMIN_PRODUCTS_QUERY_KEY,
  ADMIN_PRODUCTS_STALE_TIME,
  PRODUCTS_API_PATH,
  PAGE_SIZE,
  SEARCH_DEBOUNCE_DELAY,
} from '@/features/products/admin/constants'
import type { AdminProductFilters, AdminProductsListResponse } from '@/features/products/admin/types'

function buildQueryParams(filters: AdminProductFilters & { debouncedQ: string }): URLSearchParams {
  const p = new URLSearchParams()
  p.set('page', String(filters.page))
  p.set('size', String(PAGE_SIZE))

  if (filters.debouncedQ.trim()) {
    p.set('q', filters.debouncedQ.trim())
  }
  if (filters.categoriaId !== null) {
    p.set('categoria_id', String(filters.categoriaId))
  }
  if (filters.disponible !== 'all') {
    p.set('disponible', filters.disponible)
  }

  return p
}

export function useAdminProducts(filters: AdminProductFilters) {
  const [debouncedQ, setDebouncedQ] = useState(filters.q)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(filters.q)
    }, SEARCH_DEBOUNCE_DELAY)
    return () => clearTimeout(timer)
  }, [filters.q])

  const params = buildQueryParams({ ...filters, debouncedQ })

  return useQuery<AdminProductsListResponse>({
    queryKey: [ADMIN_PRODUCTS_QUERY_KEY, {
      q: debouncedQ,
      categoriaId: filters.categoriaId,
      disponible: filters.disponible,
      page: filters.page,
    }],
    queryFn: async () => {
      const response = await apiClient.get<AdminProductsListResponse>(
        `${PRODUCTS_API_PATH}?${params.toString()}`,
      )
      return response.data
    },
    placeholderData: keepPreviousData,
    staleTime: ADMIN_PRODUCTS_STALE_TIME,
    gcTime: 5 * 60_000,
    retry: 1,
  })
}
