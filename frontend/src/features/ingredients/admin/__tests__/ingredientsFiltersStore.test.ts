import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIngredientsFiltersStore } from '@/store/ingredientsFiltersStore'

describe('ingredientsFiltersStore', () => {
  it('has initial state with default values', () => {
    const { result } = renderHook(() => useIngredientsFiltersStore())

    expect(result.current.es_alergeno).toBe('all')
  })

  it('setEsAlergeno updates filter value', () => {
    const { result } = renderHook(() => useIngredientsFiltersStore())

    act(() => { result.current.setEsAlergeno('true') })

    expect(result.current.es_alergeno).toBe('true')
  })

  it('setEsAlergeno to false', () => {
    const { result } = renderHook(() => useIngredientsFiltersStore())

    act(() => { result.current.setEsAlergeno('false') })

    expect(result.current.es_alergeno).toBe('false')
  })

  it('reset restores initial state', () => {
    const { result } = renderHook(() => useIngredientsFiltersStore())

    act(() => { result.current.setEsAlergeno('true') })
    act(() => { result.current.reset() })

    expect(result.current.es_alergeno).toBe('all')
  })
})
