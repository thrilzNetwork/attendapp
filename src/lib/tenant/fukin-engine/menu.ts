
import { Product, Zone, ModifierGroup, Settings } from '../types'

export const CATEGORIES = [
  { id: 'cajas', name: 'Cajas' },
  { id: 'cookies', name: 'Cookies' },
  { id: 'extras', name: 'Extras' },
  { id: 'bebidas', name: 'Bebidas' },
]

export const ORDER_MIN = 3000 // Bs30.00 minimum order — keeps small orders deliverable

export const WHATSAPP_NUMBER = '59170000000'
export const INSTAGRAM_HANDLE = 'cookiesorganic.scz'

function cloneGroups(groups: ModifierGroup[]): ModifierGroup[] {
  return groups.map((g) => ({ ...g, modifiers: g.modifiers.map((m) => ({ ...m })) }))
}

export const GLASEADO: ModifierGroup = {
  id: 'glaseado',
  name: 'Glaseado (elige una)',
  type: 'single',
  required: true,
  modifiers: [
    { id: 'g-vainilla', name: 'Glaseado de vainilla', price: 0 },
    { id: 'g-choco', name: 'Glaseado de chocolate', price: 0 },
  ],
}

export const RELLENO: ModifierGroup = {
  id: 'relleno',
  name: 'Relleno',
  type: 'single',
  required: false,
  modifiers: [
    { id: 'r-ninguno', name: 'Sin relleno', price: 0 },
    { id: 'r-dulce', name: 'Dulce de leche', price: 300 },
    { id: 'r-mani', name: 'Crema de maní', price: 300 },
  ],
}

export const EXTRAS: ModifierGroup = {
  id: 'extras',
  name: 'Extras',
  type: 'multi',
  modifiers: [
    { id: 'x-chips', name: 'Extra chips de chocolate', price: 200 },
    { id: 'x-nueces', name: 'Extra nueces', price: 300 },
  ],
}

export const SEED_PRODUCTS: Product[] = [
  {
    slug: 'caja-6-clasicas',
    featured: true,
    name: 'CAJA 6 CLASICAS',
    short: '6 cookies clásicas a elección. La caja para compartir.',
    long: "CAJA 6 CLASICAS: elige 6 cookies entre nuestros sabores clásicos del día. Horneadas el mismo día, con ingredientes orgánicos. Ideal para compartir o regalar.",
    category: 'cajas',
    price: 6000, // Bs60
    image: '/menu/caja-6.jpg',
    sortOrder: 1,
    groups: [],
    proteinVerified: true,
    active: true,
  },
  {
    slug: 'caja-12-fiesta',
    name: 'CAJA 12 FIESTA',
    short: '12 cookies surtidas para eventos. El favorito de las oficinas.',
    long: "CAJA 12 FIESTA: 12 cookies surtidas entre clásicos y especiales. La caja de los eventos, cumpleaños y oficinas. Ingredientes orgánicos, horneado del día.",
    category: 'cajas',
    price: 11000, // Bs110
    image: '/menu/caja-12.jpg',
    sortOrder: 2,
    groups: [],
    featured: false,
    proteinVerified: true,
    active: true,
  },
  {
    slug: 'cookie-chips',
    name: 'COOKIE CHIPS DE CHOCOLATE',
    short: 'La clásica. Chips de chocolate semi-amargo, centro blandito.',
    long: "COOKIE CHIPS DE CHOCOLATE: masa orgánica de vainilla con chips de chocolate semi-amargo. Centro blandito, borde crocante. Nuestra clásica.",
    category: 'cookies',
    price: 1200, // Bs12
    image: '/menu/cookie-chips.jpg',
    sortOrder: 3,
    groups: [EXTRAS],
    featured: false,
    proteinVerified: true,
    active: true,
  },
  {
    slug: 'cookie-doble-choco',
    name: 'COOKIE DOBLE CHOCOLATE',
    short: 'Masa de cacao + chips. Para los que van con todo.',
    long: "COOKIE DOBLE CHOCOLATE: masa de cacao orgánico con chips de chocolate semi-amargo. Intensa, húmeda por dentro.",
    category: 'cookies',
    price: 1300,
    image: '/menu/cookie-doble.jpg',
    sortOrder: 4,
    groups: [EXTRAS],
    featured: false,
    proteinVerified: true,
    active: true,
  },
  {
    slug: 'cookie-avena-miel',
    name: 'COOKIE AVENA Y MIEL',
    short: 'Avena orgánica y miel cruceña. La más suave.',
    long: "COOKIE AVENA Y MIEL: avena orgánica, miel pura y un toque de canela. Suave por dentro, dorada por fuera.",
    category: 'cookies',
    price: 1200,
    image: '/menu/cookie-avena.jpg',
    sortOrder: 5,
    groups: [EXTRAS],
    featured: false,
    proteinVerified: true,
    active: true,
  },
  {
    slug: 'cookie-mani',
    name: 'COOKIE MANÍ',
    short: 'Crema de maní orgánico + chips de chocolate.',
    long: "COOKIE MANÍ: crema de maní orgánico con chips de chocolate. Salado-dulce en su punto.",
    category: 'cookies',
    price: 1300,
    image: '/menu/cookie-mani.jpg',
    sortOrder: 6,
    groups: [EXTRAS],
    featured: false,
    proteinVerified: true,
    active: true,
  },
  {
    slug: 'galleta-sin-relleno',
    name: 'COOKIE RELLENA DULCE DE LECHE',
    short: 'Dos cookies, dulce de leche en el medio.',
    long: "COOKIE RELLENA DE DULCE DE LECHE: dos cookies blanditas unidas por dulce de leche cremoso. El sándwich dulce.",
    category: 'cookies',
    price: 1500,
    image: '/menu/cookie-rellena.jpg',
    sortOrder: 7,
    groups: [GLASEADO, EXTRAS],
    featured: false,
    proteinVerified: true,
    active: true,
  },
  {
    slug: 'porcion-brownie',
    name: 'BROWNIE ORGÁNICO',
    short: 'Brownie denso de chocolate orgánico. Porción individual.',
    long: "BROWNIE ORGÁNICO: chocolate orgánico intenso, denso y húmedo. Porción individual, recién horneado.",
    category: 'extras',
    price: 1400,
    image: '/menu/brownie.jpg',
    sortOrder: 8,
    groups: [EXTRAS],
    featured: false,
    proteinVerified: true,
    active: true,
  },
  {
    slug: 'leche-vegetal',
    name: 'LECHE DE COCO',
    short: 'Bebida fría para acompañar. 300ml.',
    long: "LECHE DE COCO: bebida fría de 300ml, natural y orgánica. El acompañante clásico de una cookie tibia.",
    category: 'bebidas',
    price: 800,
    image: '/menu/leche-coco.jpg',
    sortOrder: 9,
    groups: [],
    featured: false,
    proteinVerified: true,
    active: true,
  },
  {
    slug: 'cafe-frio',
    name: 'COLD BREW',
    short: 'Café frío de altura boliviana. 300ml.',
    long: "COLD BREW: café de altura boliviana, extracción en frío 12 horas. 300ml. Combina con cualquier cookie.",
    category: 'bebidas',
    price: 1000,
    image: '/menu/cold-brew.jpg',
    sortOrder: 10,
    groups: [],
    featured: false,
    proteinVerified: true,
    active: true,
  },
]


export const ZONES: Zone[] = [
  { id: 'equipetrol', name: 'Equipetrol', fee: 800, minMinutes: 25, maxMinutes: 40, active: true },
  { id: 'monsenor', name: 'Monseñor Rivero', fee: 800, minMinutes: 25, maxMinutes: 40, active: true },
  { id: 'ventos', name: 'Ventos', fee: 1000, minMinutes: 35, maxMinutes: 50, active: true },
  { id: 'urubo', name: 'Urubo', fee: 1200, minMinutes: 40, maxMinutes: 55, active: true },
  { id: 'centro', name: 'Centro', fee: 800, minMinutes: 25, maxMinutes: 40, active: true },
]

export const DEFAULT_SETTINGS: Settings = {
  ordersPaused: false,
  capacity: 6,
  hoursOpen: '18:00',
  hoursClose: '23:00',
  hoursEnabled: true,
}
