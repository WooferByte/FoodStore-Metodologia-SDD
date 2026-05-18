/**
 * DateRangeSelector tests.
 *
 * Verifies:
 *   - All 4 preset buttons render
 *   - Clicking "Hoy" calls onChange with preset='hoy'
 *   - Clicking "Custom" button shows the date inputs
 */

import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangeSelector } from '../DateRangeSelector'
import type { DateRange } from '@/features/metrics/types'

const INITIAL_RANGE: DateRange = {
  preset: 'mes',
  desde: '2026-05-01',
  hasta: '2026-05-18',
}

describe('DateRangeSelector', () => {
  it('renders all 4 preset buttons', () => {
    render(<DateRangeSelector dateRange={INITIAL_RANGE} onChange={vi.fn()} />)

    expect(screen.getByText('Hoy')).toBeInTheDocument()
    expect(screen.getByText('Esta Semana')).toBeInTheDocument()
    expect(screen.getByText('Este Mes')).toBeInTheDocument()
    expect(screen.getByText('Personalizado')).toBeInTheDocument()
  })

  it('calls onChange with preset="hoy" when "Hoy" button is clicked', () => {
    const onChange = vi.fn()
    render(<DateRangeSelector dateRange={INITIAL_RANGE} onChange={onChange} />)

    fireEvent.click(screen.getByText('Hoy'))

    expect(onChange).toHaveBeenCalledOnce()
    const calledWith: DateRange = onChange.mock.calls[0][0]
    expect(calledWith.preset).toBe('hoy')
    // Desde and hasta should be the same day (today)
    expect(calledWith.desde).toBe(calledWith.hasta)
  })

  it('calls onChange with preset="semana" when "Esta Semana" is clicked', () => {
    const onChange = vi.fn()
    render(<DateRangeSelector dateRange={INITIAL_RANGE} onChange={onChange} />)

    fireEvent.click(screen.getByText('Esta Semana'))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange.mock.calls[0][0].preset).toBe('semana')
  })

  it('calls onChange with preset="custom" when "Personalizado" is clicked', () => {
    const onChange = vi.fn()
    render(<DateRangeSelector dateRange={INITIAL_RANGE} onChange={onChange} />)

    fireEvent.click(screen.getByText('Personalizado'))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange.mock.calls[0][0].preset).toBe('custom')
  })

  it('shows date inputs when preset is "custom"', () => {
    const customRange: DateRange = {
      preset: 'custom',
      desde: '2026-05-01',
      hasta: '2026-05-18',
    }
    render(<DateRangeSelector dateRange={customRange} onChange={vi.fn()} />)

    // date inputs should be visible
    expect(screen.getByLabelText('Desde')).toBeInTheDocument()
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument()
  })

  it('does NOT show date inputs when preset is not "custom"', () => {
    render(<DateRangeSelector dateRange={INITIAL_RANGE} onChange={vi.fn()} />)

    expect(screen.queryByLabelText('Desde')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Hasta')).not.toBeInTheDocument()
  })

  it('calls onChange when custom desde input changes', () => {
    const onChange = vi.fn()
    const customRange: DateRange = {
      preset: 'custom',
      desde: '2026-05-01',
      hasta: '2026-05-18',
    }
    render(<DateRangeSelector dateRange={customRange} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-04-01' },
    })

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange.mock.calls[0][0].desde).toBe('2026-04-01')
    expect(onChange.mock.calls[0][0].preset).toBe('custom')
  })
})
