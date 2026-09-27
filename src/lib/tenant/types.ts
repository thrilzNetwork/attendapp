// ════════════════════════════════════════════════════════════════
//  TENANT TYPES — verbatim from the fukin engine (CO source of truth)
// ════════════════════════════════════════════════════════════════

export type Modifier = {
  id: string
  name: string
  price: number // cents
  active?: boolean
}

export type ModifierGroup = {
  id: string
  name: string
  type: 'single' | 'multi'
  required?: boolean
  modifiers: Modifier[]
}

export type Product = {
  slug: string
  name: string
  short: string
  long: string
  category: string
  price: number // cents
  image: string
  active: boolean
  featured: boolean
  proteinBadge?: string
  proteinVerified: boolean
  proteinNote?: string
  sortOrder: number
  groups: ModifierGroup[]
  /** Computed at read time from stock.json — never stored on the product */
  soldOut?: boolean
}

export type CartLine = {
  slug: string
  qty: number
  mods: Record<string, string[]>
  notes?: string
}

export type Zone = {
  id: string
  name: string
  fee: number
  minMinutes: number
  maxMinutes: number
  active: boolean
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_CLAIMED'
  | 'SCHEDULED'
  | 'RECEIVED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED'

export type PaymentMethod = 'TRANSFERENCIA_QR' | 'CASH'
export type PaymentStatus = 'PENDING' | 'CLAIMED' | 'PAID' | 'UNPAID'

export type OrderItem = {
  name: string
  qty: number
  mods: string[]
  notes?: string
  lineTotal: number
  kind?: 'product' | 'upsell'
}

export type Order = {
  number: string
  createdAt: string
  source: 'DIRECT'
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  /** Scheduled delivery: 'YYYY-MM-DD HH:MM' inside opening hours — undefined = ASAP */
  scheduledFor?: string
  customer: { firstName: string; phone: string }
  address: { district: string; street: string; apartment?: string; reference?: string }
  zoneId: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  notes?: string
  promoCode?: string
  discount?: number
}

export type Settings = {
  ordersPaused: boolean
  capacity: number
  hoursOpen: string // 'HH:MM'
  hoursClose: string // 'HH:MM'
  hoursEnabled: boolean // false = 24h, no gating
}

export type MenuOverride = {
  active?: boolean
  name?: string
  short?: string
  long?: string
  price?: number
  image?: string
}

export type StockState = {
  slug: string
  soldOut: boolean
  dailyCount: number
  countDate: string
  auto86Threshold: number
}

export type Promo = {
  code: string
  type: 'PERCENT' | 'FLAT'
  value: number
  minSubtotal: number
  active: boolean
  maxUses: number
  usedCount: number
  startsAt?: string
  endsAt?: string
  note?: string
}