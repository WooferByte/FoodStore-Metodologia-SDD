/**
 * MetricsKPICards tests.
 *
 * Verifies:
 *   - Renders 4 skeleton cards when isLoading=true
 *   - Renders formatted values when data is provided
 *   - Renders error message when isError=true
 */

import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricsKPICards } from '../MetricsKPICards'
import type { MetricsSummary } from '@/features/metrics/types'

const MOCK_DATA: MetricsSummary = {
  total_ventas: 12345,
  pedidos_hoy: 5,
  productos_activos: 30,
  usuarios_activos: 10,
}

describe('MetricsKPICards', () => {
  it('renders 4 skeleton cards when isLoading=true', () => {
    render(
      <MetricsKPICards
        data={undefined}
        isLoading={true}
        isError={false}
      />,
    )

    // Skeleton components have role="status" and aria-label="Cargando..."
    const skeletons = screen.getAllByRole('status')
    expect(skeletons).toHaveLength(4)
  })

  it('renders the 4 KPI labels when data is provided', () => {
    render(
      <MetricsKPICards
        data={MOCK_DATA}
        isLoading={false}
        isError={false}
      />,
    )

    expect(screen.getByText('Total Ventas')).toBeInTheDocument()
    expect(screen.getByText('Pedidos Hoy')).toBeInTheDocument()
    expect(screen.getByText('Productos Activos')).toBeInTheDocument()
    expect(screen.getByText('Usuarios Activos')).toBeInTheDocument()
  })

  it('renders numeric values when data is provided', () => {
    render(
      <MetricsKPICards
        data={MOCK_DATA}
        isLoading={false}
        isError={false}
      />,
    )

    // pedidos_hoy = 5, productos_activos = 30, usuarios_activos = 10
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders error message when isError=true', () => {
    render(
      <MetricsKPICards
        data={undefined}
        isLoading={false}
        isError={true}
      />,
    )

    const errorMessages = screen.getAllByText('Error al cargar')
    // One error message per card = 4
    expect(errorMessages).toHaveLength(4)
  })
})
