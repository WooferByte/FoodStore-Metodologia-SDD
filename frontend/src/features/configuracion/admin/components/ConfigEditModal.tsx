import { useCallback, useState, useEffect } from 'react'
import { Modal, Input, Button } from '@/shared/components/ui'
import { useUpdateConfiguracion } from '@/features/configuracion/admin/hooks'
import type { Configuracion, ConfiguracionEditData } from '@/features/configuracion/admin/types'

interface ConfigEditModalProps {
  config: Configuracion | null
  isOpen: boolean
  onClose: () => void
}

export function ConfigEditModal({ config, isOpen, onClose }: ConfigEditModalProps) {
  const [valor, setValor] = useState('')
  const { mutate: updateConfig, isPending } = useUpdateConfiguracion()

  useEffect(() => {
    if (config) {
      setValor(config.valor)
    }
  }, [config, isOpen])

  const handleSave = useCallback(() => {
    if (!config) return

    const editData: ConfiguracionEditData = {
      valor: valor.trim(),
    }

    updateConfig(
      { clave: config.clave, datos: editData },
      {
        onSuccess: () => {
          onClose()
          setValor('')
        },
      }
    )
  }, [config, valor, updateConfig, onClose])

  const handleCancel = useCallback(() => {
    setValor('')
    onClose()
  }, [onClose])

  if (!config) {
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Editar Configuración"
      className="w-full max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Clave (read-only)
          </label>
          <code className="block bg-muted p-3 rounded-md text-sm font-mono text-muted-foreground">
            {config.clave}
          </code>
        </div>

        {config.descripcion && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Descripción
            </label>
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
              {config.descripcion}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Valor
          </label>
          <Input
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ingresa el nuevo valor"
            disabled={isPending}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || valor === config.valor}
            loading={isPending}
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
