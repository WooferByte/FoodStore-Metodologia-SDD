import { useCallback, useState } from 'react'
import { ConfigTable } from '@/features/configuracion/admin/components/ConfigTable'
import { ConfigEditModal } from '@/features/configuracion/admin/components/ConfigEditModal'
import type { Configuracion } from '@/features/configuracion/admin/types'

export default function AdminConfiguracionPage() {
  const [editConfig, setEditConfig] = useState<Configuracion | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const handleEdit = useCallback((config: Configuracion) => {
    setEditConfig(config)
    setIsEditOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setEditConfig(null)
    setIsEditOpen(false)
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">
          Configuración del Sistema
        </h1>
      </div>
      
      <p className="text-muted-foreground">
        Administra las configuraciones clave-valor del sistema.
      </p>

      <ConfigTable onEdit={handleEdit} />
      
      <ConfigEditModal 
        config={editConfig} 
        isOpen={isEditOpen} 
        onClose={handleClose} 
      />
    </div>
  )
}
