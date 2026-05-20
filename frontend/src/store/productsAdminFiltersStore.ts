import { create } from 'zustand'

export interface ProductsAdminFiltersState {
  q: string
  categoriaId: number | null
  disponible: string
  page: number

  setQ: (q: string) => void
  setCategoriaId: (categoriaId: number | null) => void
  setDisponible: (disponible: string) => void
  setPage: (page: number) => void
  reset: () => void
}

const initialState = {
  q: '',
  categoriaId: null as number | null,
  disponible: 'all',
  page: 1,
}

export const useProductsAdminFiltersStore = create<ProductsAdminFiltersState>()((set) => ({
  ...initialState,

  setQ: (q) => set({ q, page: 1 }),
  setCategoriaId: (categoriaId) => set({ categoriaId, page: 1 }),
  setDisponible: (disponible) => set({ disponible, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set(initialState),
}))
