/**
 * usersFiltersStore — Zustand v5 store for admin users filter UI state.
 *
 * Design decision D1 (design.md): Filters are stored in Zustand (client state),
 * NOT in URL search params and NOT duplicated from server data.
 *
 * Rules:
 * - This store ONLY holds UI filter state — never server/API data.
 * - NO persist middleware: filters reset on tab reload.
 *   This is intentional — the design.md states session-only persistence is enough.
 * - Zustand v5 syntax: create<T>()() with double parentheses.
 * - setQ and setRol reset page to 1 to avoid showing stale pagination.
 */

import { create } from 'zustand'

export interface UsersFiltersState {
  q: string
  rol: string
  activo: string    // "all" | "true" | "false"
  page: number

  // Actions
  setQ: (q: string) => void
  setRol: (rol: string) => void
  setActivo: (activo: string) => void
  setPage: (page: number) => void
  reset: () => void
}

const initialState = {
  q: '',
  rol: '',
  activo: 'all',
  page: 1,
}

export const useUsersFiltersStore = create<UsersFiltersState>()((set) => ({
  ...initialState,

  // Reset page to 1 on any filter change to avoid stale pagination
  setQ:     (q)      => set({ q, page: 1 }),
  setRol:   (rol)    => set({ rol, page: 1 }),
  setActivo:(activo) => set({ activo, page: 1 }),
  setPage:  (page)   => set({ page }),
  reset:    ()       => set(initialState),
}))
