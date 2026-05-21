import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStockFiltersStore } from '@/store/stockFiltersStore'

describe('stockFiltersStore', () => {
  it('has initial state with default values', () => {
    const { result } = renderHook(() => useStockFiltersStore())

    expect(result.current.q).toBe('')
    expect(result.current.disponible).toBe('all')
    expect(result.current.page).toBe(1)
  })

  it('setQ updates q and resets page to 1', () => {
    const { result } = renderHook(() => useStockFiltersStore())

    act(() => { result.current.setPage(3) })
    act(() => { result.current.setQ('pizza') })

    expect(result.current.q).toBe('pizza')
    expect(result.current.page).toBe(1)
  })

  it('setDisponible updates disponible and resets page to 1', () => {
    const { result } = renderHook(() => useStockFiltersStore())

    act(() => { result.current.setPage(2) })
    act(() => { result.current.setDisponible('true') })

    expect(result.current.disponible).toBe('true')
    expect(result.current.page).toBe(1)
  })

  it('setPage does NOT reset other filters', () => {
    const { result } = renderHook(() => useStockFiltersStore())

    act(() => { result.current.setQ('test') })
    act(() => { result.current.setDisponible('false') })
    act(() => { result.current.setPage(5) })

    expect(result.current.q).toBe('test')
    expect(result.current.disponible).toBe('false')
    expect(result.current.page).toBe(5)
  })

  it('reset restores initial state', () => {
    const { result } = renderHook(() => useStockFiltersStore())

    act(() => {
      result.current.setQ('pizza')
      result.current.setDisponible('true')
      result.current.setPage(5)
    })

    act(() => { result.current.reset() })

    expect(result.current.q).toBe('')
    expect(result.current.disponible).toBe('all')
    expect(result.current.page).toBe(1)
  })
})
