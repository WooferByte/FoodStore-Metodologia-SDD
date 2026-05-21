import { create } from 'zustand'

export interface StockFiltersState {
  q: string
  disponible: 'all' | 'true' | 'false'
  page: number

  setQ: (q: string) => void
  setDisponible: (disponible: 'all' | 'true' | 'false') => void
  setPage: (page: number) => void
  reset: () => void
}

const initialState = {
  q: '',
  disponible: 'all' as const,
  page: 1,
}

export const useStockFiltersStore = create<StockFiltersState>()((set) => ({
  ...initialState,

  setQ: (q) => set({ q, page: 1 }),
  setDisponible: (disponible) => set({ disponible, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(initialState),
}))
