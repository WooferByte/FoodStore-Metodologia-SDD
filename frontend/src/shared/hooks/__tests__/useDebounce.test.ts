/**
 * Tests for useDebounce hook
 *
 * Verifies:
 * - Returns the initial value immediately (no delay on first render)
 * - Does NOT update before the delay has elapsed
 * - Updates the value after the delay has elapsed
 * - Resets the timer when value changes before the delay completes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update before the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } },
    )

    rerender({ value: 'updated' })

    // Advance timers by less than the delay
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Value should still be the old one
    expect(result.current).toBe('initial')
  })

  it('updates the value after the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } },
    )

    rerender({ value: 'updated' })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('updated')
  })

  it('resets the timer when value changes before the delay completes', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } },
    )

    // First change — starts a 300ms timer
    rerender({ value: 'middle' })

    act(() => {
      vi.advanceTimersByTime(200) // 200ms elapsed — not yet debounced
    })

    // Second change before 300ms — resets the timer
    rerender({ value: 'final' })

    act(() => {
      vi.advanceTimersByTime(200) // another 200ms — still not 300ms since 'final'
    })

    // Still at 'initial' because neither timer has completed 300ms from their start
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(100) // now 300ms since 'final' was set
    })

    // Should now be 'final', never 'middle'
    expect(result.current).toBe('final')
  })
})
