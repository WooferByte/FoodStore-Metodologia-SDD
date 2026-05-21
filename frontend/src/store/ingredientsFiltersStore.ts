import { create } from 'zustand'

export interface IngredientsFiltersState {
  es_alergeno: 'all' | 'true' | 'false'
  setEsAlergeno: (v: 'all' | 'true' | 'false') => void
  reset: () => void
}

const initialState = {
  es_alergeno: 'all' as const,
}

export const useIngredientsFiltersStore = create<IngredientsFiltersState>()((set) => ({
  ...initialState,
  setEsAlergeno: (es_alergeno) => set({ es_alergeno }),
  reset: () => set(initialState),
}))
