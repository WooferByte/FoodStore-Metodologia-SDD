import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProductsAdminFiltersStore } from '@/store/productsAdminFiltersStore'

describe('productsAdminFiltersStore', () => {
  it('has initial state with default values', () => {
    const { result } = renderHook(() => useProductsAdminFiltersStore())

    expect(result.current.q).toBe('')
    expect(result.current.categoriaId).toBeNull()
    expect(result.current.disponible).toBe('all')
    expect(result.current.page).toBe(1)
  })

  it('setQ updates q and resets page to 1', () => {
    const { result } = renderHook(() => useProductsAdminFiltersStore())

    act(() => { result.current.setPage(3) })
    act(() => { result.current.setQ('pizza') })

    expect(result.current.q).toBe('pizza')
    expect(result.current.page).toBe(1)
  })

  it('setCategoriaId updates categoriaId and resets page to 1', () => {
    const { result } = renderHook(() => useProductsAdminFiltersStore())

    act(() => { result.current.setPage(3) })
    act(() => { result.current.setCategoriaId(5) })

    expect(result.current.categoriaId).toBe(5)
    expect(result.current.page).toBe(1)
  })

  it('setDisponible updates disponible and resets page to 1', () => {
    const { result } = renderHook(() => useProductsAdminFiltersStore())

    act(() => { result.current.setPage(2) })
    act(() => { result.current.setDisponible('true') })

    expect(result.current.disponible).toBe('true')
    expect(result.current.page).toBe(1)
  })

  it('setPage does NOT reset other filters', () => {
    const { result } = renderHook(() => useProductsAdminFiltersStore())

    act(() => { result.current.setQ('test') })
    act(() => { result.current.setCategoriaId(3) })
    act(() => { result.current.setPage(5) })

    expect(result.current.q).toBe('test')
    expect(result.current.categoriaId).toBe(3)
    expect(result.current.page).toBe(5)
  })

  it('reset restores initial state', () => {
    const { result } = renderHook(() => useProductsAdminFiltersStore())

    act(() => {
      result.current.setQ('pizza')
      result.current.setCategoriaId(3)
      result.current.setDisponible('true')
      result.current.setPage(5)
    })

    act(() => { result.current.reset() })

    expect(result.current.q).toBe('')
    expect(result.current.categoriaId).toBeNull()
    expect(result.current.disponible).toBe('all')
    expect(result.current.page).toBe(1)
  })
})
