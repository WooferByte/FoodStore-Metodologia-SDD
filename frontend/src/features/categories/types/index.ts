export interface Category {
  id: number
  nombre: string
  descripcion: string | null
  padre_id: number | null
  depth: number
  activa: boolean
  creado_en: string
}

export interface CreateCategoryPayload {
  nombre: string
  descripcion?: string
  padre_id?: number | null
}

export interface UpdateCategoryPayload {
  nombre: string
  descripcion?: string
  padre_id?: number | null
}
