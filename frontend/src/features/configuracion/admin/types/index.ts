export interface Configuracion {
  id: number
  clave: string
  valor: string
  descripcion: string | null
  actualizado_por: number
  actualizado_en: string
  creado_en: string
}

export interface ConfiguracionEditData {
  valor: string
}
