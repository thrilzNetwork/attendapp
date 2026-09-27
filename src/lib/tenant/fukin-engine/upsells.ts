export type Upsell = {
  id: string
  name: string
  price: number
  image: string
  active: boolean
}

/** Checkout upsells shown in the order summary (server-authoritative prices). */
export const UPSELLS: Upsell[] = [
  { id: 'up-chimichurri', name: 'Chimichurri extra', price: 200, image: '/menu/papas.jpg', active: false },
  { id: 'up-nacho', name: 'Papas con queso vegano', price: 900, image: '/menu/papas.jpg', active: true },
  { id: 'up-papas', name: 'Papas', price: 790, image: '/menu/papas.jpg', active: true },
  { id: 'up-nuggets6', name: 'Nuggets 6 unidades', price: 890, image: '/menu/nuggets.jpg', active: true },
  { id: 'up-nuggets', name: 'Nuggets extra (6u)', price: 700, image: '/menu/nuggets.jpg', active: false },
  { id: 'up-bebida', name: 'Bebida extra', price: 800, image: '/menu/bebida.jpg', active: false },
]

export const ATTENDA_SERVE_URL = 'https://attendaapp.com/serve'