import { useState, useEffect } from 'react'

/**
 * useDebounce — delays propagation of a value until after `delay` ms of inactivity.
 *
 * Used to avoid firing expensive operations (e.g., filtering) on every keystroke.
 * The returned value only updates once the caller has stopped changing `value`
 * for at least `delay` milliseconds.
 *
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
