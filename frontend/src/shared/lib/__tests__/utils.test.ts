/**
 * Tests for cn() utility function.
 *
 * Covers:
 *   - Non-conflicting class merge (all classes preserved)
 *   - Conflicting Tailwind classes (last one wins via tailwind-merge)
 *   - Falsy values are ignored
 *   - Conditional classes (clsx object syntax)
 */

import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn() utility', () => {
  it('merges non-conflicting classes without duplication', () => {
    const result = cn('px-4', 'py-2', 'text-sm')
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
    expect(result).toContain('text-sm')
  })

  it('resolves conflicting Tailwind classes — last one wins', () => {
    // tailwind-merge should keep px-6 and discard px-4
    const result = cn('px-4', 'px-6')
    expect(result).toContain('px-6')
    expect(result).not.toContain('px-4')
  })

  it('resolves conflicting background colors', () => {
    const result = cn('bg-primary', 'bg-destructive')
    expect(result).toContain('bg-destructive')
    expect(result).not.toContain('bg-primary')
  })

  it('ignores falsy values (undefined, null, false)', () => {
    const result = cn('text-sm', undefined, null, false, 'font-medium')
    expect(result).toContain('text-sm')
    expect(result).toContain('font-medium')
    // No undefined/null/false in output
    expect(result).not.toContain('undefined')
    expect(result).not.toContain('null')
    expect(result).not.toContain('false')
  })

  it('handles conditional classes via boolean', () => {
    const isActive = true
    const isDisabled = false
    const result = cn('base', isActive && 'active', isDisabled && 'disabled')
    expect(result).toContain('base')
    expect(result).toContain('active')
    expect(result).not.toContain('disabled')
  })

  it('returns empty string when no classes provided', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles className override (consumer passes className)', () => {
    const className = 'my-custom-class'
    const result = cn('px-4', 'py-2', className)
    expect(result).toContain('my-custom-class')
    expect(result).toContain('px-4')
  })
})
