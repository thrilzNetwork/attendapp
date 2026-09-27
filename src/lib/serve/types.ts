/* Attenda Serve — multi-tenant data model (FV-architecture port).
   Every tenant (demo or official) gets the same server-backed system:
   menu, orders with FV status machine, settings, admin PIN. */

export type ServeProduct = {
  slug: string;
  name: string;
  short?: string;
  category: string;
  price: number; // soles
  image?: string;
  available: boolean;
  sortOrder: number;
};

export type ServeOrderItem = { slug: string; name: string; qty: number; price: number };

export type ServeOrderStatus = 'RECIBIDO' | 'PREPARANDO' | 'LISTO' | 'ENTREGADO' | 'CANCELADO';

export type ServeOrder = {
  number: string; // TP-0001 style
  id: string; // internal
  items: ServeOrderItem[];
  total: number;
  status: ServeOrderStatus;
  payment: 'YAPE' | 'EFECTIVO';
  paymentStatus: 'PENDIENTE' | 'PAGADO';
  customerName: string;
  customerPhone: string;
  note?: string;
  ts: number;
};

export type ServeSettings = {
  hoursOpen: string; // 'HH:MM'
  hoursClose: string;
  hoursEnabled: boolean; // false = 24h
  ordersPaused: boolean;
  allowAfterHours: boolean;
  currency: string; // 'S/'
};

export type ServeTenant = {
  id: string;
  name: string;
  type: string;
  city: string;
  phone: string; // WhatsApp, digits
  email: string;
  logo: string | null;
  tagline: string;
  adminPin: string;
  status: 'demo' | 'official';
  createdAt: number;
};

export const DEFAULT_SERVE_SETTINGS: ServeSettings = {
  hoursOpen: '18:00',
  hoursClose: '23:00',
  hoursEnabled: true,
  ordersPaused: false,
  allowAfterHours: false,
  currency: 'S/',
};

export const SERVE_ORDER_FLOW: ServeOrderStatus[] = ['RECIBIDO', 'PREPARANDO', 'LISTO', 'ENTREGADO'];

export function nextServeStatus(s: ServeOrderStatus): ServeOrderStatus {
  const i = SERVE_ORDER_FLOW.indexOf(s);
  return SERVE_ORDER_FLOW[Math.min(i + 1, SERVE_ORDER_FLOW.length - 1)];
}

export function canCancel(s: ServeOrderStatus): boolean {
  return s !== 'ENTREGADO' && s !== 'CANCELADO';
}

/** Open-hours check in America/Lima, overnight-safe, FAIL OPEN. */
export function isServeOpen(s: ServeSettings, now = new Date()): boolean {
  if (!s.hoursEnabled) return true;
  if (s.ordersPaused) return false;
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false });
    const [h, m] = fmt.format(now).split(':');
    const mins = (Number(h) % 24) * 60 + Number(m);
    const [oh, om] = s.hoursOpen.split(':').map(Number);
    const [ch, cm] = s.hoursClose.split(':').map(Number);
    const open = (oh % 24) * 60 + (om || 0);
    const close = (ch % 24) * 60 + (cm || 0);
    if (Number.isNaN(open) || Number.isNaN(close)) return true; // fail open
    if (open === close) return true;
    if (close < open) return mins >= open || mins < close; // overnight wrap
    return mins >= open && mins < close;
  } catch {
    return true;
  }
}