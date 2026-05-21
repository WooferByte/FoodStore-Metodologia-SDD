import React, { useState, useMemo, useCallback } from 'react'
import { ChevronRight, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import type { Category } from '@/features/categories/types'

interface CategoriesTableProps {
  categories: Category[]
  isLoading: boolean
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

interface TreeNode {
  category: Category
  children: TreeNode[]
}

function buildTree(categories: Category[]): TreeNode[] {
  const map = new Map<number, TreeNode>()
  const roots: TreeNode[] = []

  for (const cat of categories) {
    map.set(cat.id, { category: cat, children: [] })
  }

  for (const node of map.values()) {
    const parentId = node.category.padre_id
    if (parentId !== null && map.has(parentId)) {
      map.get(parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

interface TableRowProps {
  node: TreeNode
  depth: number
  expandedIds: Set<number>
  hasChildren: boolean
  onToggle: (id: number) => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

function TableRow({ node, depth, expandedIds, hasChildren, onToggle, onEdit, onDelete }: TableRowProps) {
  const { category } = node
  const isExpanded = expandedIds.has(category.id)

  return (
    <tr
      className="border-b border-border hover:bg-muted/50 transition-colors"
      role="row"
      aria-expanded={hasChildren ? isExpanded : undefined}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1.5}rem` }}>
          {hasChildren ? (
            <button
              onClick={() => onToggle(category.id)}
              aria-expanded={isExpanded}
              aria-controls={`subcats-${category.id}`}
              aria-label={isExpanded ? 'Contraer subcategorías' : 'Expandir subcategorías'}
              className="p-0.5 rounded hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
          ) : (
            <span className="w-5" aria-hidden="true" />
          )}
          <span className="font-medium text-foreground text-sm">{category.nombre}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
        {category.descripcion ?? '—'}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{category.depth}</td>
      <td className="px-4 py-3">
        <Badge variant={category.activa ? 'success' : 'default'}>
          <span className="sr-only">Estado:</span>
          {category.activa ? 'Activa' : 'Inactiva'}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category)}
            aria-label={`Editar ${category.nombre}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category)}
            className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
            aria-label={`Eliminar ${category.nombre}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

const MemoizedTableRow = React.memo(TableRow)

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
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
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-muted-foreground text-sm">No se encontraron categorías</p>
    </div>
  )
}

interface MobileCardProps {
  node: TreeNode
  depth: number
  expandedIds: Set<number>
  hasChildren: boolean
  onToggle: (id: number) => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

const MobileCard = React.memo(function MobileCard({
  node, depth, expandedIds, hasChildren, onToggle, onEdit, onDelete,
}: MobileCardProps) {
  const { category } = node
  const isExpanded = expandedIds.has(category.id)

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 space-y-2"
      style={{ marginLeft: `${depth * 1}rem` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              onClick={() => onToggle(category.id)}
              aria-expanded={isExpanded}
              aria-controls={`subcats-${category.id}`}
              aria-label={isExpanded ? 'Contraer subcategorías' : 'Expandir subcategorías'}
              className="p-0.5 rounded hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
          ) : (
            <span className="w-5" aria-hidden="true" />
          )}
          <span className="font-medium text-foreground text-sm">{category.nombre}</span>
        </div>
        <Badge variant={category.activa ? 'success' : 'default'}>
          <span className="sr-only">Estado:</span>
          {category.activa ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>
      {category.descripcion && (
        <p className="text-sm text-muted-foreground">{category.descripcion}</p>
      )}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">Profundidad: {category.depth}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category)}
            aria-label={`Editar ${category.nombre}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category)}
            className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
            aria-label={`Eliminar ${category.nombre}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
})

export function CategoriesTable({ categories, isLoading, onEdit, onDelete }: CategoriesTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const tree = useMemo(() => buildTree(categories), [categories])

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const visibleNodes = useMemo(() => {
    const result: TreeNode[] = []
    function walk(nodes: TreeNode[]) {
      for (const node of nodes) {
        result.push(node)
        if (node.children.length > 0 && expandedIds.has(node.category.id)) {
          walk(node.children)
        }
      }
    }
    walk(tree)
    return result
  }, [tree, expandedIds])

  if (isLoading) {
    return (
      <>
        <div className="hidden md:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prof.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <TableSkeleton />
          </table>
        </div>
        <div className="md:hidden"><CardSkeleton /></div>
      </>
    )
  }

  if (categories.length === 0) {
    return <EmptyState />
  }

  return (
    <>
      {/* Desktop: table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse" role="treegrid" aria-label="Categorías">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prof.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleNodes.map((node) => (
              <MemoizedTableRow
                key={node.category.id}
                node={node}
                depth={node.category.depth}
                expandedIds={expandedIds}
                hasChildren={node.children.length > 0}
                onToggle={toggleExpand}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-3">
        {visibleNodes.map((node) => (
          <MobileCard
            key={node.category.id}
            node={node}
            depth={node.category.depth}
            expandedIds={expandedIds}
            hasChildren={node.children.length > 0}
            onToggle={toggleExpand}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  )
}
