/**
 * Constants for the metrics feature:
 *  - GRANULARIDAD_MAP   — maps days-range to API granularity param
 *  - DEFAULT_DATE_RANGE — initial range (current month)
 *  - CHART_COLORS       — oklch values aligned with Tailwind v4 @theme tokens
 *  - PRESET_LABELS      — display text for preset buttons
 */

import type { DateRange } from '@/features/metrics/types'

// ── Granularidad ───────────────────────────────────────────────────────────

export type Granularidad = 'dia' | 'semana' | 'mes'

/**
 * Auto-compute API granularity based on the number of days in the range.
 *   ≤ 7 days   → 'dia'
 *   8–90 days  → 'semana'
 *   > 90 days  → 'mes'
 */
export function computeGranularidad(desde: string, hasta: string): Granularidad {
  const msPerDay = 1000 * 60 * 60 * 24
  const days = Math.round(
    (new Date(hasta).getTime() - new Date(desde).getTime()) / msPerDay,
  )
  if (days <= 7) return 'dia'
  if (days <= 90) return 'semana'
  return 'mes'
}

// ── Default date range ─────────────────────────────────────────────────────

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

export const DEFAULT_DATE_RANGE: DateRange = {
  preset: 'mes',
  desde: toISODate(firstOfMonth),
  hasta: toISODate(today),
}

// ── Chart colors (oklch — Tailwind v4 compatible) ──────────────────────────

export const CHART_COLORS = {
  primary: 'oklch(0.55 0.2 250)',
  success: 'oklch(0.55 0.15 145)',
  warning: 'oklch(0.65 0.18 75)',
  danger:  'oklch(0.55 0.2 25)',
  muted:   'oklch(0.65 0.02 264)',

  // Per-state colours (used cyclically for PieChart cells)
  estado_pendiente:   'oklch(0.65 0.18 75)',
  estado_confirmado:  'oklch(0.55 0.2 250)',
  estado_preparando:  'oklch(0.65 0.18 200)',
  estado_listo:       'oklch(0.55 0.15 145)',
  estado_entregado:   'oklch(0.45 0.1 145)',
  estado_cancelado:   'oklch(0.55 0.2 25)',
} as const

/** Ordered palette for cyclic use in charts */
export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.muted,
  CHART_COLORS.estado_preparando,
] as const

// ── Preset labels ──────────────────────────────────────────────────────────

export const PRESET_LABELS: Record<string, string> = {
  hoy:    'Hoy',
  semana: 'Esta Semana',
  mes:    'Este Mes',
  custom: 'Personalizado',
}
