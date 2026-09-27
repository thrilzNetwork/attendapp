/* Attenda Serve — demo tenant store (client-side, localStorage only).
   SSR-safe: every accessor guards on typeof window. */

export type DemoProduct = { name: string; price: number; available?: boolean };

export type DemoDraft = {
  id: string;
  name: string;
  type: string;
  city: string;
  phone: string;
  email: string;
  logo: string | null;
  tagline: string;
  products: DemoProduct[];
  createdAt: number;
};

export type DemoOrderItem = { name: string; qty: number; price: number };

export type DemoOrder = {
  id: string;
  items: DemoOrderItem[];
  total: number;
  status: 'Recibido' | 'Preparando' | 'Listo' | 'Entregado';
  ts: number;
};

export const TRIAL_MS = 24 * 60 * 60 * 1000;

const draftKey = (id: string) => `attd_serve_demo_${id}`;
const ordersKey = (id: string) => `attd_serve_demo_orders_${id}`;
const INDEX_KEY = 'attd_serve_demo_index';
/* Legacy wizard draft (pre-tenant demos) */
export const LEGACY_KEY = 'attenda-serve-demo-v1';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Shape-validate and backfill defaults (old drafts lack id/tagline/available). */
function normalizeDraft(p: Partial<DemoDraft> | null): DemoDraft | null {
  if (!p || typeof p !== 'object') return null;
  if (!p.name || typeof p.name !== 'string') return null;
  return {
    id: typeof p.id === 'string' && p.id ? p.id : 'legacy',
    name: p.name,
    type: typeof p.type === 'string' ? p.type : 'Negocio local',
    city: typeof p.city === 'string' ? p.city : '',
    phone: typeof p.phone === 'string' ? p.phone : '',
    email: typeof p.email === 'string' ? p.email : '',
    logo: typeof p.logo === 'string' ? p.logo : null,
    tagline: typeof p.tagline === 'string' ? p.tagline : '',
    products: Array.isArray(p.products)
      ? p.products
          .filter((x) => x && typeof x.name === 'string')
          .map((x) => ({ name: x.name, price: typeof x.price === 'number' && x.price >= 0 ? x.price : 0, available: x.available !== false }))
      : [],
    createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
  };
}

export function loadDraft(id: string): DemoDraft | null {
  if (typeof window === 'undefined') return null;
  return normalizeDraft(safeParse<Partial<DemoDraft>>(window.localStorage.getItem(draftKey(id))));
}

export function saveDraft(d: DemoDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(draftKey(d.id), JSON.stringify(d));
    const idx = listDemoIds().filter((x) => x !== d.id);
    idx.unshift(d.id);
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(idx.slice(0, 20)));
  } catch {}
}

/** Most recent demo id, for the builder's "previous demo" banner. */
export function listDemoIds(): string[] {
  if (typeof window === 'undefined') return [];
  const idx = safeParse<string[]>(window.localStorage.getItem(INDEX_KEY));
  return Array.isArray(idx) ? idx.filter((x) => typeof x === 'string') : [];
}

export function latestDemoId(): string | null {
  return listDemoIds()[0] || null;
}

/** Load the legacy single-draft (wizard prefill) if present. */
export function loadLegacyDraft(): { draft: Partial<DemoDraft>; ts: number } | null {
  if (typeof window === 'undefined') return null;
  const p = safeParse<{ draft: Partial<DemoDraft>; ts: number }>(window.localStorage.getItem(LEGACY_KEY));
  if (!p?.draft?.name || !p?.ts) return null;
  if (Date.now() - p.ts > TRIAL_MS) return null;
  return p;
}

export function loadOrders(id: string): DemoOrder[] {
  if (typeof window === 'undefined') return [];
  const arr = safeParse<DemoOrder[]>(window.localStorage.getItem(ordersKey(id)));
  return Array.isArray(arr) ? arr.filter((o) => o && Array.isArray(o.items)) : [];
}

export function saveOrder(id: string, order: DemoOrder): void {
  if (typeof window === 'undefined') return;
  try {
    const all = [order, ...loadOrders(id)].slice(0, 100);
    window.localStorage.setItem(ordersKey(id), JSON.stringify(all));
  } catch {}
}

export function updateOrderStatus(id: string, orderId: string, status: DemoOrder['status']): void {
  if (typeof window === 'undefined') return;
  try {
    const all = loadOrders(id).map((o) => (o.id === orderId ? { ...o, status } : o));
    window.localStorage.setItem(ordersKey(id), JSON.stringify(all));
  } catch {}
}

export const ORDER_FLOW: DemoOrder['status'][] = ['Recibido', 'Preparando', 'Listo', 'Entregado'];

export function nextStatus(s: DemoOrder['status']): DemoOrder['status'] {
  const i = ORDER_FLOW.indexOf(s);
  return ORDER_FLOW[Math.min(i + 1, ORDER_FLOW.length - 1)];
}

export function isTrialActive(createdAt: number): boolean {
  return Date.now() - createdAt <= TRIAL_MS;
}