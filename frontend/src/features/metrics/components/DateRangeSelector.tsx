/**
 * DateRangeSelector — preset date range picker for the metrics dashboard.
 *
 * Renders 4 buttons: Hoy | Esta Semana | Este Mes | Personalizado.
 * When "Personalizado" is active two <input type="date"> are shown.
 * Calling onChange immediately on every interaction (no "Aplicar" button).
 */

import { cn } from '@/shared/lib/utils'
import type { DateRange, DatePreset } from '@/features/metrics/types'
import { PRESET_LABELS } from '@/features/metrics/constants'

// ── Helpers ────────────────────────────────────────────────────────────────

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function buildPresetRange(preset: Exclude<DatePreset, 'custom'>): DateRange {
  const today = new Date()
  const desde = new Date(today)

  if (preset === 'hoy') {
    return { preset, desde: toISODate(today), hasta: toISODate(today) }
  }
  if (preset === 'semana') {
    desde.setDate(today.getDate() - 6)
    return { preset, desde: toISODate(desde), hasta: toISODate(today) }
  }
  // 'mes'
  desde.setDate(1)
  return { preset, desde: toISODate(desde), hasta: toISODate(today) }
}

// ── Component ──────────────────────────────────────────────────────────────

interface DateRangeSelectorProps {
  dateRange: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS: DatePreset[] = ['hoy', 'semana', 'mes', 'custom']

export function DateRangeSelector({ dateRange, onChange }: DateRangeSelectorProps) {
  function handlePreset(preset: DatePreset) {
    if (preset === 'custom') {
      // Keep current desde/hasta but switch to custom preset
      onChange({ ...dateRange, preset: 'custom' })
      return
    }
    onChange(buildPresetRange(preset))
  }

  function handleDesde(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...dateRange, preset: 'custom', desde: e.target.value })
  }

  function handleHasta(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...dateRange, preset: 'custom', hasta: e.target.value })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => {
        const isActive = dateRange.preset === preset
        return (
          <button
            key={preset}
            type="button"
            onClick={() => handlePreset(preset)}
            aria-pressed={isActive}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            )}
          >
            {PRESET_LABELS[preset]}
          </button>
        )
      })}

      {dateRange.preset === 'custom' && (
        <div className="flex items-center gap-2 ml-2">
          <label className="sr-only" htmlFor="metrics-desde">Desde</label>
          <input
            id="metrics-desde"
            type="date"
            value={dateRange.desde}
            onChange={handleDesde}
            max={dateRange.hasta}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-muted-foreground text-sm" aria-hidden="true">→</span>
          <label className="sr-only" htmlFor="metrics-hasta">Hasta</label>
          <input
            id="metrics-hasta"
            type="date"
            value={dateRange.hasta}
            onChange={handleHasta}
            min={dateRange.desde}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}
    </div>
  )
}
