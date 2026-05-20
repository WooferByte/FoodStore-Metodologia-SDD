/**
 * TypeScript interfaces for the metrics feature.
 * All types correspond 1:1 to API response shapes from
 * GET /api/v1/admin/metricas/*
 */

// ── Summary ────────────────────────────────────────────────────────────────

export interface MetricsSummary {
  total_ventas: number
  pedidos_hoy: number
  productos_activos: number
  usuarios_activos: number
}

// ── Sales over time ────────────────────────────────────────────────────────

export interface VentasItem {
  fecha: string
  total_ventas: number
  cantidad_pedidos: number
}

export interface VentasResponse {
  items: VentasItem[]
}

// ── Top products ───────────────────────────────────────────────────────────

export interface TopProductoItem {
  producto_id: number
  nombre: string
  cantidad_total: number
}

export interface TopProductosResponse {
  items: TopProductoItem[]
}

// ── Orders by state ────────────────────────────────────────────────────────

export interface PedidoEstadoItem {
  estado: string
  cantidad: number
}

export interface PedidosEstadoResponse {
  items: PedidoEstadoItem[]
}

// ── Date range ─────────────────────────────────────────────────────────────

export type DatePreset = 'hoy' | 'semana' | 'mes' | 'custom'

export interface DateRange {
  desde: string
  hasta: string
  preset: DatePreset
}
