/* Attenda Serve — blob-backed multi-tenant store.
   Same engine for demo + official tenants (only status differs).
   Money = cents everywhere. */

import { getStore } from '@netlify/blobs';
import {
  ServeProduct, ServeOrder, ServeSettings, ServeTenant, ServeOrderStatus,
  SERVE_STATUSES, SERVE_CATEGORIES, slugify, defaultSettings,
} from './types';

const TENANTS_KEY = 'serve/tenants.json';
const MEM: { tenants: ServeTenant[] | null; data: Map<string, { menu?: ServeProduct[]; orders?: ServeOrder[]; settings?: ServeSettings }> } = {
  tenants: null,
  data: new Map(),
};

let hasBlobs: boolean | null = null;
async function blobStore() {
  if (hasBlobs === null) {
    try {
      getStore({ name: 'attenda_serve', consistency: 'strong' });
      hasBlobs = true;
    } catch {
      hasBlobs = false;
    }
  }
  return hasBlobs;
}

function deepDefaultSettings(s: Partial<ServeSettings> | undefined): ServeSettings {
  const d = defaultSettings();
  if (!s) return d;
  return {
    ...d,
    ...s,
    zones: Array.isArray(s.zones) && s.zones.length ? s.zones : d.zones,
  };
}

/* ── tenants ─────────────────────────────────── */

export async function listTenants(): Promise<ServeTenant[]> {
  if (hasBlobs === false) return MEM.tenants ?? [];
  try {
    const store = getStore({ name: 'attenda_serve', consistency: 'strong' });
    const raw = await store.get(TENANTS_KEY, { type: 'json' });
    return raw ?? MEM.tenants ?? [];
  } catch {
    return MEM.tenants ?? [];
  }
}

export async function saveTenants(ts: ServeTenant[]): Promise<void> {
  MEM.tenants = ts;
  if (hasBlobs === false) return;
  try {
    const store = getStore({ name: 'attenda_serve', consistency: 'strong' });
    await store.setJSON(TENANTS_KEY, ts);
  } catch {}
}

export async function getTenant(id: string): Promise<ServeTenant | null> {
  const ts = await listTenants();
  return ts.find((t) => t.id === id) ?? null;
}

export type CreateTenantInput = {
  name: string;
  type: string;
  city: string;
  phone: string;
  email: string;
  logo: string | null;
  products: { name: string; price: number }[]; // price in soles from wizard
  status: 'demo' | 'official';
};

export async function createTenant(input: CreateTenantInput): Promise<ServeTenant> {
  const id = Date.now().toString(36);
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  const tenant: ServeTenant = {
    id, name: input.name, type: input.type, city: input.city,
    phone: input.phone.replace(/[^0-9]/g, ''),
    email: input.email, logo: input.logo, status: input.status,
    tagline: `${input.type}${input.city ? ' · ' + input.city : ''} — pedidos online directo a nuestro WhatsApp`,
    adminPin: pin,
    createdAt: Date.now(),
  };
  const ts = await listTenants();
  ts.push(tenant);
  await saveTenants(ts);

  // seed menu server-side from wizard products (wizard sends soles → cents)
  const base = input.products.length ? input.products : [{ name: 'Producto 1', price: 15 }];
  const spread = (n: number) => {
    const cats = ['principales', 'principales', 'extras', 'bebidas'];
    return SERVE_CATEGORIES[Math.min(n, 3)]?.id || 'principales';
  };
  const menu: ServeProduct[] = base.slice(0, 12).map((p, i) => ({
    slug: slugify(p.name) + (i > 0 && base.slice(0, i).some((x) => slugify(x.name) === slugify(p.name)) ? '-' + i : ''),
    name: p.name,
    short: `Del menú de ${input.name}`,
    category: i < base.length - 2 ? 'principales' : i === base.length - 2 ? 'extras' : 'bebidas',
    price: Math.round(p.price * 100),
    active: true,
    sortOrder: i,
  }));
  await writeMenu(id, menu);
  await writeSettings(id, deepDefaultSettings(undefined));
  return tenant;
}

/* ── menu ────────────────────────────────────── */

export async function readMenu(id: string): Promise<ServeProduct[]> {
  if (hasBlobs === false) return MEM.data.get(id)?.menu ?? [];
  try {
    const store = getStore({ name: 'attenda_serve', consistency: 'strong' });
    const raw = await store.get(`serve/${id}/menu.json`, { type: 'json' });
    return raw ?? MEM.data.get(id)?.menu ?? [];
  } catch {
    return MEM.data.get(id)?.menu ?? [];
  }
}

export async function writeMenu(id: string, menu: ServeProduct[]): Promise<void> {
  MEM.data.set(id, { ...(MEM.data.get(id) || {}), menu });
  if (hasBlobs === false) return;
  try {
    const store = getStore({ name: 'attenda_serve', consistency: 'strong' });
    await store.setJSON(`serve/${id}/menu.json`, menu);
  } catch {}
}

/* ── settings ────────────────────────────────── */

export async function readSettings(id: string): Promise<ServeSettings> {
  if (hasBlobs === false) {
    return deepDefaultSettings(MEM.data.get(id)?.settings);
  }
  try {
    const store = getStore({ name: 'attenda_serve', consistency: 'strong' });
    const raw = await store.get(`serve/${id}/settings.json`, { type: 'json' });
    return deepDefaultSettings(raw ?? MEM.data.get(id)?.settings);
  } catch {
    return deepDefaultSettings(MEM.data.get(id)?.settings);
  }
}

export async function writeSettings(id: string, s: ServeSettings): Promise<void> {
  MEM.data.set(id, { ...(MEM.data.get(id) || {}), settings: s });
  if (hasBlobs === false) {
    MEM.data.set(id, { ...(MEM.data.get(id) || {}), settings: s });
    return;
  }
  try {
    const store = getStore({ name: 'attenda_serve', consistency: 'strong' });
    await store.setJSON(`serve/${id}/settings.json`, s);
  } catch {}
}

/* ── orders ──────────────────────────────────── */

export async function listOrders(id: string): Promise<ServeOrder[]> {
  if (hasBlobs === false) return MEM.data.get(id)?.orders ?? [];
  try {
    const store = getStore({ name: 'attenda_serve', consistency: 'strong' });
    const raw = await store.get(`serve/${id}/orders.json`, { type: 'json' });
    return raw ?? MEM.data.get(id)?.orders ?? [];
  } catch {
    return MEM.data.get(id)?.orders ?? [];
  }
}

export async function writeOrders(id: string, orders: ServeOrder[]): Promise<void> {
  MEM.data.set(id, { ...(MEM.data.get(id) || {}), orders });
  if (hasBlobs === false) return;
  try {
    const store = getStore({ name: 'attenda_serve', consistency: 'strong' });
    await store.setJSON(`serve/${id}/orders.json`, orders);
  } catch {}
}

export function nextOrderNumber(orders: ServeOrder[]): string {
  const n = orders.length + 1;
  return 'TP-' + String(n).padStart(4, '0');
}

/* FV status machine: PENDING_PAYMENT → RECEIVED → ACCEPTED → PREPARING
   → READY → DISPATCHED → DELIVERED. Cancelled only from non-terminal. */
export function canAdvance(s: ServeOrderStatus): ServeOrderStatus | null {
  const i = (SERVE_STATUSES as readonly string[]).indexOf(s);
  if (i < 0 || i >= SERVE_STATUSES.length - 1) return null;
  return SERVE_STATUSES[i + 1];
}

export function isOpenNow(s: ServeSettings): boolean {
  if (!s.hoursEnabled) return true;
  if (s.ordersPaused) return false;
  const lima = new Date(Date.now() + (5 * 60 + 60 * 60) * 1000 * -1); // UTC-5
  const hm = lima.toISOString().slice(11, 16);
  if (s.hoursOpen <= s.hoursClose) {
    return hm >= s.hoursOpen && hm < s.hoursClose;
  }
  return hm >= s.hoursOpen || hm < s.hoursClose; // overnight
}

export function openStateFor(settings: ServeSettings): { open: boolean; hoursEnabled: boolean; hoursOpen: string; hoursClose: string } {
  return {
    open: isOpenNow(settings),
    hoursEnabled: settings.hoursEnabled,
    hoursOpen: settings.hoursOpen,
    hoursClose: settings.hoursClose,
  };
}