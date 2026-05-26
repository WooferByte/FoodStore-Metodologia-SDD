import { useMemo } from 'react'
import { Badge, Button, Card, Skeleton } from '@/shared/components/ui'
import { useAdminConfiguraciones } from '@/features/configuracion/admin/hooks'
import type { Configuracion } from '@/features/configuracion/admin/types'
import { formatDate } from '@/shared/lib/date'
import { PencilIcon } from 'lucide-react'

interface ConfigTableProps {
  onEdit: (config: Configuracion) => void
}

function detectValueType(valor: string): 'number' | 'boolean' | 'text' {
  if (!isNaN(Number(valor))) {
    return 'number'
  }
  if (valor === 'true' || valor === 'false') {
    return 'boolean'
  }
  return 'text'
}

export function ConfigTable({ onEdit }: ConfigTableProps) {
  const { data = [], isLoading, error, refetch } = useAdminConfiguraciones()

  const sortedConfigs = useMemo(() => {
    return [...data].sort((a, b) => a.clave.localeCompare(b.clave))
  }, [data])

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-20" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-destructive">
        <div className="text-center py-8">
          <p className="text-destructive font-semibold mb-4">
            Error al cargar las configuraciones
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Reintentar
          </Button>
        </div>
      </Card>
    )
  }

  if (sortedConfigs.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No hay configuraciones disponibles
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-foreground">
                Clave
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">
                Valor
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">
                Descripción
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">
                Última modificación
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedConfigs.map((config) => {
              const valueType = detectValueType(config.valor)
              const typeBadgeVariant = valueType === 'number' 
                ? 'info' 
                : valueType === 'boolean' 
                ? 'warning' 
                : 'default'

              return (
                <tr key={config.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono text-foreground">
                      {config.clave}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{config.valor}</span>
                      <Badge variant={typeBadgeVariant} className="text-xs">
                        {valueType}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {config.descripcion || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(new Date(config.actualizado_en))}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(config)}
                      className="inline-flex items-center gap-2"
                      aria-label={`Editar configuración ${config.clave}`}
                    >
                      <PencilIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
