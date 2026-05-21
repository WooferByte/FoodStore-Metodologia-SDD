import React from 'react'
import { Pencil, Trash2, Wheat } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import type { Ingredient } from '@/entities/product'

interface IngredientsTableProps {
  ingredients: Ingredient[]
  isLoading: boolean
  isError: boolean
  esAlergenoFilter: 'all' | 'true' | 'false'
  onEsAlergenoFilterChange: (v: 'all' | 'true' | 'false') => void
  onEdit: (ingredient: Ingredient) => void
  onDelete: (ingredient: Ingredient) => void
}

interface RowProps {
  ingredient: Ingredient
  onEdit: (ingredient: Ingredient) => void
  onDelete: (ingredient: Ingredient) => void
}

const TableRow = React.memo(function TableRow({ ingredient, onEdit, onDelete }: RowProps) {
  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors" role="row">
      <td className="px-4 py-3">
        <span className="font-medium text-foreground text-sm">{ingredient.nombre}</span>
      </td>
      <td className="px-4 py-3">
        <Badge variant={ingredient.es_alergeno ? 'warning' : 'success'}>
          <span className="sr-only">Alérgeno:</span>
          {ingredient.es_alergeno ? 'Sí' : 'No'}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(ingredient)}
            aria-label={`Editar ${ingredient.nombre}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(ingredient)}
            aria-label={`Eliminar ${ingredient.nombre}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
  )
})

interface MobileCardProps {
  ingredient: Ingredient
  onEdit: (ingredient: Ingredient) => void
  onDelete: (ingredient: Ingredient) => void
}

const MobileCard = React.memo(function MobileCard({ ingredient, onEdit, onDelete }: MobileCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground text-sm">{ingredient.nombre}</span>
        <Badge variant={ingredient.es_alergeno ? 'warning' : 'success'}>
          <span className="sr-only">Alérgeno:</span>
          {ingredient.es_alergeno ? 'Sí' : 'No'}
        </Badge>
      </div>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(ingredient)}
          aria-label={`Editar ${ingredient.nombre}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(ingredient)}
          aria-label={`Eliminar ${ingredient.nombre}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
})

function TableSkeletonRows() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
        </tr>
      ))}
    </tbody>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Wheat className="h-12 w-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
      <p className="text-muted-foreground text-sm">No se encontraron ingredientes</p>
    </div>
  )
}

export function IngredientsTable({
  ingredients,
  isLoading,
  isError,
  esAlergenoFilter,
  onEsAlergenoFilterChange,
  onEdit,
  onDelete,
}: IngredientsTableProps) {
  if (isLoading) {
    return (
      <>
        <div className="hidden md:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alérgeno</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <TableSkeletonRows />
          </table>
        </div>
        <div className="md:hidden"><CardSkeleton /></div>
      </>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive text-sm">Error al cargar los ingredientes.</p>
      </div>
    )
  }

  if (ingredients.length === 0) {
    return <EmptyState />
  }

  return (
    <>
      <div className="flex items-center gap-4 pb-4">
        <select
          value={esAlergenoFilter}
          onChange={(e) => onEsAlergenoFilterChange(e.target.value as 'all' | 'true' | 'false')}
          aria-label="Filtrar por alérgeno"
          className="flex h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-[160px]"
        >
          <option value="all">Todos</option>
          <option value="true">Solo alérgenos</option>
          <option value="false">No alérgenos</option>
        </select>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse" aria-label="Ingredientes">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alérgeno</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ingredient) => (
              <TableRow
                key={ingredient.id}
                ingredient={ingredient}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {ingredients.map((ingredient) => (
          <MobileCard
            key={ingredient.id}
            ingredient={ingredient}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  )
}
