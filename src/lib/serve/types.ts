/* Attenda Serve — multi-tenant data model. FV-architecture port: the demo
   tenant runs the exact fukinvegan.com order system (cent pricing, FV
   status machine, Yape claim flow, zones, hours gate). Demo vs official
   is only the `status` flag — same engine, same data shapes. */

/* All money is integer CENTS (FV convention). S/ 19.90 = 1990 */

export type ServeProduct = {
  slug: string;
  name: string;
  short: string;
  category: string; // category id
  price: number; // cents
  image?: string; // dataURL or absent → generated placeholder
  active: boolean;
  sortOrder: number;
};

export type ServeZone = { id: string; name: string; fee: number }; // fee cents

export type ServeSettings = {
  hoursEnabled: boolean;
  hoursOpen: string; // 'HH:MM' Lima
  hoursClose: string;
  allowAfterHours: boolean; // accept scheduled orders while closed
  ordersPaused: boolean;
  etaMin: number; // minutes, shown in delivery bar
  etaMax: number;
  orderMin: number; // cents
  zones: ServeZone[];
  yapeNumber: string;
  yapeHolder: string;
  promoCode: string;
  promoDiscount: number; // cents off
};

export type ServeCustomer = { firstName: string; phone: string };

export type ServeAddress = { street: string; apartment?: string; reference?: string };

export type ServeOrder = {
  number: string; // TP-XXXX
  ts: number; // created epoch ms
  items: { slug: string; name: string; qty: number; price: number }[]; // price cents each
  subtotal: number; // cents
  zoneFee: number; // cents (0 if pickup)
  discount: number; // cents
  total: number; // cents
  customer: ServeCustomer;
  address: ServeAddress | null; // null = retiro en tienda
  zoneId: string | null;
  notes?: string;
  scheduledFor?: string; // 'HH:MM' when programado
  payment: 'YAPE_PLIN' | 'CASH';
  paymentStatus: 'PENDING_PAYMENT' | 'CLAIMED' | 'PAID';
  status: ServeOrderStatus;
};

export const SERVE_STATUSES = [
  'PENDING_PAYMENT',
  'RECEIVED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'DISPATCHED',
  'DELIVERED',
] as const;
export type ServeOrderStatus = (typeof SERVE_STATUSES)[number] | 'CANCELLED';

export const SERVE_CATEGORIES = [
  { id: 'principales', name: 'Principales' },
  { id: 'combos', name: 'Combos' },
  { id: 'extras', name: 'Extras' },
  { id: 'bebidas', name: 'Bebidas' },
] as const;

export type ServeTenant = {
  id: string;
  name: string;
  type: string;
  city: string;
  phone: string; // digits, no '+'
  email: string;
  logo: string | null;
  tagline: string;
  status: 'demo' | 'official';
  adminPin: string;
  createdAt: number;
};

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

export function formatPEN(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

export function defaultSettings(): ServeSettings {
  return {
    hoursEnabled: true,
    hoursOpen: '18:00',
    hoursClose: '23:00',
    allowAfterHours: false,
    ordersPaused: false,
    etaMin: 25,
    etaMax: 35,
    orderMin: 0,
    zones: [
      { id: 'z1', name: 'Zona 1 (cerca)', fee: 590 },
      { id: 'z2', name: 'Zona 2 (lejos)', fee: 890 },
      { id: 'pickup', name: 'Retiro en tienda', fee: 0 },
    ],
    yapeNumber: '',
    yapeHolder: '',
    promoCode: 'PRIMERO',
    promoDiscount: 0,
  };
}