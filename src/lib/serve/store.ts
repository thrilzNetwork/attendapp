/* Attenda Serve — blob-backed multi-tenant store (FV store.ts port).
   Netlify Blobs with strong consistency; per-tenant keys:
   serve/tenants.json            — tenant registry
   serve/<id>/menu.json          — product overrides (seed from wizard)
   serve/<id>/orders.json        — order list
   serve/<id>/settings.json      — hours, pauses, currency
   In-memory fallback for local dev (same shape as FV store). */

import {
  DEFAULT_SERVE_SETTINGS, type ServeOrder, type ServeProduct,
  type ServeSettings, type ServeTenant,
} from './types';

const MEM: { tenants: ServeTenant[]; data: Map<string, Record<string, unknown>> } = {
  tenants: [],
  data: new Map(),
};

function blobsAvailable(): boolean {
  return !!process.env.NETLIFY_BLOBS_CONTEXT;
}

async function storeGet<T>(key: string, fallback: T): Promise<T> {
  if (blobsAvailable()) {
    try {
      const { getStore } = await import('@netlify/blobs');
      const store = getStore({ name: 'attenda-serve', consistency: 'strong' });
      const raw = await store.get(key, { type: 'text' });
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      /* fall through */
    }
  }
  if (key === 'serve/tenants.json') return (MEM.tenants as unknown) as T;
  const t = MEM.data.get(key) || {};
  const slot = key.endsWith('orders.json') ? 'orders' : key.endsWith('menu.json') ? 'menu' : 'settings';
  const val = (t as Record<string, unknown>)[slot];
  return (val !== undefined ? val : fallback) as T;
}

async function storeSet(key: string, val: unknown): Promise<void> {
  if (blobsAvailable()) {
    try {
      const { getStore } = await import('@netlify/blobs');
      const store = getStore({ name: 'attenda-serve', consistency: 'strong' });
      await store.setJSON(key, val);
      return;
    } catch {
      /* persistence degraded */
    }
  }
  if (key === 'serve/tenants.json') MEM.tenants = val as ServeTenant[];
  else {
    const slot = key.endsWith('orders.json') ? 'orders' : key.endsWith('menu.json') ? 'menu' : 'settings';
    const t = MEM.data.get(key) || {};
    t[slot as 'orders' | 'menu' | 'settings'] = val;
    MEM.data.set(key, t);
  }
}

/* ───────────────────────── tenants ───────────────────────── */

export async function listTenants(): Promise<ServeTenant[]> {
  return storeGet<ServeTenant[]>('serve/tenants.json', []);
}

export async function getTenant(id: string): Promise<ServeTenant | null> {
  const all = await listTenants();
  return all.find((t) => t.id === id) || null;
}

export type NewTenantInput = {
  name: string;
  type: string;
  city?: string;
  phone?: string;
  email?: string;
  logo?: string | null;
  tagline?: string;
  products?: { name: string; price: number }[];
  status?: 'demo' | 'official';
};

export async function createTenant(input: NewTenantInput): Promise<ServeTenant> {
  const all = await listTenants();
  // cap registry growth: keep 50 most recent, purge oldest demo-only tenants
  if (all.length >= 50) {
    const official = all.filter((t) => t.status === 'official');
    const demos = all.filter((t) => t.status !== 'official').sort((a, b) => b.createdAt - a.createdAt);
    all.length = 0;
    all.push(...official, ...demos.slice(0, 49 - official.length));
  }
  const id = 'tp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const adminPin = String(Math.floor(1000 + Math.random() * 9000));
  const tenant: ServeTenant = {
    id,
    name: input.name.trim().slice(0, 60),
    type: input.type || 'Negocio local',
    city: input.city?.slice(0, 60) || '',
    phone: (input.phone || '').replace(/[^0-9]/g, ''),
    email: input.email?.slice(0, 120) || '',
    logo: input.logo && input.logo.startsWith('data:image') ? input.logo : null,
    tagline: input.tagline?.slice(0, 140) || '',
    adminPin,
    status: input.status || 'demo',
    createdAt: Date.now(),
  };
  all.push(tenant);
  await storeSet('serve/tenants.json', all);

  // seed menu from the wizard's products
  const products: ServeProduct[] = (input.products || []).filter((p) => p && p.name?.trim()).slice(0, 24).map((p, i) => ({
    slug: p.name.toLowerCase().trim().replace(/[^a-z0-9áéíóúñü]+/g, '-').replace(/^-+|-+$/g, '') || `producto-${i + 1}`,
    name: p.name.trim().slice(0, 60),
    category: 'menú',
    price: Math.max(0, Math.round((p.price || 0) * 100) / 100),
    available: true,
    sortOrder: i,
  }));
  await storeSet(`serve/${id}/menu.json`, products);
  await storeSet(`serve/${id}/settings.json`, { ...DEFAULT_SERVE_SETTINGS });
  await storeSet(`serve/${id}/orders.json`, []);
  return tenant;
}

export async function updateTenant(id: string, patch: Partial<ServeTenant>): Promise<ServeTenant | null> {
  const all = await listTenants();
  const i = all.findIndex((t) => t.id === id);
  if (i < 0) return null;
  const clean: Partial<ServeTenant> = {};
  if (patch.name !== undefined) clean.name = String(patch.name).slice(0, 60);
  if (patch.type !== undefined) clean.type = String(patch.type).slice(0, 40);
  if (patch.city !== undefined) clean.city = String(patch.city).slice(0, 60);
  if (patch.phone !== undefined) clean.phone = String(patch.phone).replace(/[^0-9]/g, '').slice(0, 16);
  if (patch.email !== undefined) clean.email = String(patch.email).slice(0, 120);
  if (patch.logo !== undefined) clean.logo = patch.logo && String(patch.logo).startsWith('data:image') ? patch.logo : null;
  if (patch.tagline !== undefined) clean.tagline = String(patch.tagline).slice(0, 140);
  if (patch.adminPin !== undefined) clean.adminPin = String(patch.adminPin).replace(/[^0-9]/g, '').slice(0, 8) || all[i].adminPin;
  if (patch.status !== undefined && (patch.status === 'demo' || patch.status === 'official')) clean.status = patch.status;
  const merged = { ...all[i], ...clean };
  all[i] = merged;
  await storeSet('serve/tenants.json', all);
  return merged;
}

/* ───────────────────────── menu ───────────────────────── */

export async function getMenu(id: string): Promise<ServeProduct[]> {
  return storeGet<ServeProduct[]>(`serve/${id}/menu.json`, []);
}

export async function saveMenu(id: string, products: ServeProduct[]): Promise<void> {
  await storeSet(`serve/${id}/menu.json`, products);
}

/* ───────────────────────── orders ───────────────────────── */

export async function listOrders(id: string): Promise<ServeOrder[]> {
  return storeGet<ServeOrder[]>(`serve/${id}/orders.json`, []);
}

export async function saveOrders(id: string, orders: ServeOrder[]): Promise<void> {
  await storeSet(`serve/${id}/orders.json`, orders);
}

export async function nextOrderNumber(id: string): Promise<string> {
  const all = await listOrders(id);
  const maxN = all.reduce((a, o) => {
    const m = /^TP-(\d+)$/.exec(o.number);
    return m ? Math.max(a, Number(m[1])) : a;
  }, 0);
  return `TP-${String(maxN + 1).padStart(4, '0')}`;
}

/* ───────────────────────── settings ───────────────────────── */

export async function getSettings(id: string): Promise<ServeSettings> {
  const stored = await storeGet<Partial<ServeSettings>>(`serve/${id}/settings.json`, {});
  return { ...DEFAULT_SERVE_SETTINGS, ...stored };
}

export async function saveSettings(id: string, patch: Partial<ServeSettings>): Promise<ServeSettings> {
  const cur = await getSettings(id);
  const next: ServeSettings = { ...cur };
  if (patch.hoursOpen !== undefined && /^([01]?\d|2[0-3]):[0-5]\d$/.test(patch.hoursOpen)) next.hoursOpen = patch.hoursOpen;
  if (patch.hoursClose !== undefined && /^([01]?\d|2[0-3]):[0-5]\d$/.test(patch.hoursClose)) next.hoursClose = patch.hoursClose;
  if (patch.hoursEnabled !== undefined) next.hoursEnabled = !!patch.hoursEnabled;
  if (patch.ordersPaused !== undefined) next.ordersPaused = !!patch.ordersPaused;
  if (patch.allowAfterHours !== undefined) next.allowAfterHours = !!patch.allowAfterHours;
  if (patch.currency !== undefined && /^[A-Za-z$]{1,3}\/?$/.test(patch.currency)) next.currency = patch.currency.slice(0, 3);
  await storeSet(`serve/${id}/settings.json`, next);
  return next;
}