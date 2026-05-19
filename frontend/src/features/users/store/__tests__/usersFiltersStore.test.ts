import { describe, it, expect, beforeEach } from 'vitest'
import { useUsersFiltersStore } from '@/features/users/store/usersFiltersStore'

describe('useUsersFiltersStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUsersFiltersStore.getState().reset()
  })

  describe('initial state', () => {
    it('starts with empty q', () => {
      expect(useUsersFiltersStore.getState().q).toBe('')
    })

    it('starts with empty rol', () => {
      expect(useUsersFiltersStore.getState().rol).toBe('')
    })

    it('starts with activo = "all"', () => {
      expect(useUsersFiltersStore.getState().activo).toBe('all')
    })

    it('starts on page 1', () => {
      expect(useUsersFiltersStore.getState().page).toBe(1)
    })
  })

  describe('setQ', () => {
    it('updates q', () => {
      useUsersFiltersStore.getState().setQ('john')
      expect(useUsersFiltersStore.getState().q).toBe('john')
    })

    it('resets page to 1 when q changes', () => {
      useUsersFiltersStore.getState().setPage(3)
      useUsersFiltersStore.getState().setQ('test')
      expect(useUsersFiltersStore.getState().page).toBe(1)
    })
  })

  describe('setRol', () => {
    it('updates rol', () => {
      useUsersFiltersStore.getState().setRol('ADMIN')
      expect(useUsersFiltersStore.getState().rol).toBe('ADMIN')
    })

    it('resets page to 1 when rol changes', () => {
      useUsersFiltersStore.getState().setPage(5)
      useUsersFiltersStore.getState().setRol('CLIENT')
      expect(useUsersFiltersStore.getState().page).toBe(1)
    })
  })

  describe('setActivo', () => {
    it('updates activo', () => {
      useUsersFiltersStore.getState().setActivo('true')
      expect(useUsersFiltersStore.getState().activo).toBe('true')
    })

    it('resets page to 1 when activo changes', () => {
      useUsersFiltersStore.getState().setPage(2)
      useUsersFiltersStore.getState().setActivo('false')
      expect(useUsersFiltersStore.getState().page).toBe(1)
    })
  })

  describe('setPage', () => {
    it('updates page without touching other filters', () => {
      useUsersFiltersStore.getState().setQ('test')
      useUsersFiltersStore.getState().setPage(4)
      expect(useUsersFiltersStore.getState().page).toBe(4)
      expect(useUsersFiltersStore.getState().q).toBe('test')
    })
  })

  describe('reset', () => {
    it('resets all fields to initial values', () => {
      useUsersFiltersStore.getState().setQ('search')
      useUsersFiltersStore.getState().setRol('ADMIN')
      useUsersFiltersStore.getState().setActivo('true')
      useUsersFiltersStore.getState().setPage(5)

      useUsersFiltersStore.getState().reset()

      const state = useUsersFiltersStore.getState()
      expect(state.q).toBe('')
      expect(state.rol).toBe('')
      expect(state.activo).toBe('all')
      expect(state.page).toBe(1)
    })
  })
})
