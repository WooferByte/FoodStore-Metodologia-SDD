export interface CartItem {
  productId: string
  name: string
  price: number
  precio_carrito?: number
  quantity: number
  image?: string
  ingredientes_excluidos?: number[]
}
