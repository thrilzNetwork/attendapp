// ════════════════════════════════════════════════════════════════
//  TENANT DATA STORE — per-tenant namespaced persistence on blobs.
//  One physical store ('attenda_tenants'), keys prefixed t/<slug>/.
//  Full surface of the fukin engine store.ts (menu overrides, stock,
//  promos, orders, settings) + a leading tenant arg on every fn.
// ════════════════════════════════════════════════════════════════

import { getStore } from '@netlify/blobs'
import type { Order, Settings, Product, StockState, Promo } from './types'

const TTL = 1500
const cache = new Map<string, { at: number; val: unknown }>()

function blobsAvailable(): boolean {
  return !!process.env.NETLIFY_BLOBS_CONTEXT
}

async function storeGet<T>(slug: string, key: string, fallback: T): Promise<T> {
  const ck = slug + '/' + key
  const hit = cache.get(ck)
  if (hit && Date.now() - hit.at < TTL) return hit.val as T
  try {
    if (blobsAvailable()) {
      const store = getStore({ name: 'attenda_tenants', consistency: 'strong' })
      const raw = await store.get('t/' + slug + '/' + key, { type: 'text' })
      if (!raw) return fallback
      const val = JSON.parse(raw) as T
      cache.set(ck, { at: Date.now(), val })
      return val
    }
  } catch {
    // fall through to fallback
  }
  return fallback
}

async function storeSet(slug: string, key: string, val: unknown): Promise<void> {
  cache.delete(slug + '/' + key)
  try {
    if (blobsAvailable()) {
      const store = getStore({ name: 'attenda_tenants', consistency: 'strong' })
      await store.setJSON('t/' + slug + '/' + key, val)
      cache.set(slug + '/' + key, { at: Date.now(), val })
    }
  } catch {
    // persistence degraded
  }
}

/* ---------------- menu (full overrides over per-tenant base menu) ---------------- */

export type MenuOverride = {
  active?: boolean
  name?: string
  short?: string
  long?: string
  price?: number
  image?: string
}

function normalizeMenuOverrides(raw: unknown): Record<string, MenuOverride> {
  const out: Record<string, MenuOverride> = {}
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'boolean') out[k] = { active: v }
      else if (v && typeof v === 'object') out[k] = v as MenuOverride
    }
  }
  return out
}

export async function getMenu(slug: string): Promise<Product[]> {
  const overrides = normalizeMenuOverrides(await storeGet<Record<string, unknown>>(slug, 'menu.json', {}))
  const stock = await getStockMap(slug)
  const today = todayInTenantZone(slug)
  const base = await baseMenu(slug)
  return base.map((p) => {
    const o = overrides[p.slug] || {}
    const s = stock[p.slug]
    const auto86 = !!s && s.auto86Threshold > 0 && s.countDate === today && s.dailyCount >= s.auto86Threshold
    return {
      ...p,
      active: o.active ?? p.active,
      name: o.name ?? p.name,
      short: o.short ?? p.short,
      long: o.long ?? p.long,
      price: typeof o.price === 'number' ? o.price : p.price,
      image: o.image ?? p.image,
      soldOut: s ? s.soldOut || auto86 : false,
    }
  }).sort((a, b) => a.sortOrder - b.sortOrder)
}

/** Base menu = persisted full product list (written at provision), else [] */
async function baseMenu(slug: string): Promise<Product[]> {
  return storeGet<Product[]>(slug, 'products.json', [])
}

export async function seedMenu(slug: string, products: Product[]): Promise<void> {
  await storeSet(slug, 'products.json', products)
}

export async function updateProduct(slug: string, patch: MenuOverride & { slug: string; soldOut?: boolean; auto86Threshold?: number }): Promise<Product[]> {
  const overrides = normalizeMenuOverrides(await storeGet<Record<string, unknown>>(slug, 'menu.json', {}))
  const cur = overrides[patch.slug] || {}
  const next: MenuOverride = { ...cur }
  if (typeof patch.active === 'boolean') next.active = patch.active
  if (typeof patch.name === 'string' && patch.name.trim()) next.name = patch.name.trim()
  if (typeof patch.short === 'string') next.short = patch.short.trim()
  if (typeof patch.long === 'string') next.long = patch.long.trim()
  if (typeof patch.price === 'number') next.price = patch.price
  if (typeof patch.image === 'string' && patch.image.trim()) next.image = patch.image.trim()
  overrides[patch.slug] = next
  await storeSet(slug, 'menu.json', overrides)
  return getMenu(slug)
}

export async function setProductActive(slug: string, productSlug: string, active: boolean): Promise<void> {
  const o = await normalizeMenuOverrides(await storeGet<Record<string, unknown>>(slug, 'menu.json', {}))
  o[productSlug] = { ...o[productSlug], active }
  await storeSet(slug, 'menu.json', o)
}

/* ---------------- stock / inventory ---------------- */

export async function getStockMap(slug: string): Promise<Record<string, StockState>> {
  const raw = await storeGet<Record<string, StockState>>(slug, 'stock.json', {})
  const today = todayInTenantZone(slug)
  let dirty = false
  for (const k of Object.keys(raw)) {
    if (raw[k].countDate !== today) {
      raw[k] = { ...raw[k], dailyCount: 0, countDate: today }
      dirty = true
    }
  }
  if (dirty) await storeSet(slug, 'stock.json', raw)
  return raw
}

export async function setSoldOut(slug: string, productSlug: string, soldOut: boolean): Promise<void> {
  const map = await getStockMap(slug)
  const cur = map[productSlug] || { slug: productSlug, soldOut: false, dailyCount: 0, countDate: todayInTenantZone(slug), auto86Threshold: 0 }
  map[productSlug] = { ...cur, slug: productSlug, soldOut }
  await storeSet(slug, 'stock.json', map)
}

export async function setAuto86Threshold(slug: string, productSlug: string, threshold: number): Promise<void> {
  const map = await getStockMap(slug)
  const cur = map[productSlug] || { slug: productSlug, soldOut: false, dailyCount: 0, countDate: todayInTenantZone(slug), auto86Threshold: 0 }
  map[productSlug] = { ...cur, slug: productSlug, auto86Threshold: Math.max(0, Math.min(200, Math.round(threshold))) }
  await storeSet(slug, 'stock.json', map)
}

export async function recordSales(slug: string, items: { slug: string; qty: number }[]): Promise<void> {
  if (!items.length) return
  const map = await getStockMap(slug)
  const today = todayInTenantZone(slug)
  for (const it of items) {
    const cur = map[it.slug] || { slug: it.slug, soldOut: false, dailyCount: 0, countDate: today, auto86Threshold: 0 }
    if (cur.countDate !== today) {
      cur.dailyCount = 0
      cur.countDate = today
    }
    cur.dailyCount += it.qty
    map[it.slug] = cur
  }
  await storeSet(slug, 'stock.json', map)
}

/* ---------------- promos ---------------- */

export async function getPromos(slug: string): Promise<Record<string, Promo>> {
  return storeGet<Record<string, Promo>>(slug, 'promos.json', {})
}

export async function savePromo(slug: string, promo: Promo): Promise<void> {
  const map = await getPromos(slug)
  map[promo.code.toUpperCase()] = promo
  await storeSet(slug, 'promos.json', map)
}

export async function deletePromo(slug: string, code: string): Promise<boolean> {
  const map = await getPromos(slug)
  const key = code.toUpperCase()
  if (!map[key]) return false
  delete map[key]
  await storeSet(slug, 'promos.json', map)
  return true
}

export type PromoCheck = { ok: boolean; discount: number; reason?: string; promo?: Promo }

export async function validatePromo(slug: string, code: string, subtotal: number): Promise<PromoCheck> {
  const key = (code || '').trim().toUpperCase()
  if (!key) return { ok: false, discount: 0, reason: 'Ingresa un código' }
  const map = await getPromos(slug)
  const p = map[key]
  if (!p || !p.active) return { ok: false, discount: 0, reason: 'Código no válido' }
  const now = new Date().toISOString()
  if (p.startsAt && now < p.startsAt) return { ok: false, discount: 0, reason: 'Aún no vigente' }
  if (p.endsAt && now > p.endsAt) return { ok: false, discount: 0, reason: 'Promoción expirada' }
  if (p.maxUses > 0 && p.usedCount >= p.maxUses) return { ok: false, discount: 0, reason: 'Promoción agotada' }
  if (subtotal < p.minSubtotal) {
    return { ok: false, discount: 0, reason: `Requiere mínimo Bs ${(p.minSubtotal / 100).toFixed(2)}` }
  }
  const discount = p.type === 'PERCENT' ? Math.round((subtotal * p.value) / 100) : Math.min(p.value, subtotal)
  return { ok: true, discount, promo: p }
}

export async function consumePromo(slug: string, code: string): Promise<void> {
  const map = await getPromos(slug)
  const p = map[code.toUpperCase()]
  if (!p) return
  p.usedCount += 1
  await storeSet(slug, 'promos.json', map)
}

/* ---------------- orders ---------------- */

export async function createOrder(slug: string, order: Order): Promise<void> {
  const orders = await storeGet<Order[]>(slug, 'orders.json', [])
  orders.unshift(order)
  await storeSet(slug, 'orders.json', orders.slice(0, 500))
}

export async function getOrder(slug: string, number: string): Promise<Order | null> {
  const orders = await storeGet<Order[]>(slug, 'orders.json', [])
  const all = orders.filter((o) => o.number === number)
  if (all.length === 0) return null
  return all.find((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED') || all[0]
}

export async function listOrders(slug: string, limit = 100): Promise<Order[]> {
  const orders = await storeGet<Order[]>(slug, 'orders.json', [])
  return orders.slice(0, limit)
}

export async function updateOrder(slug: string, number: string, patch: Partial<Order>): Promise<Order | null> {
  const orders = await storeGet<Order[]>(slug, 'orders.json', [])
  const matches = orders.filter((o) => o.number === number)
  if (matches.length === 0) return null
  const target = matches.find((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED') || matches[0]
  const idx = orders.indexOf(target)
  orders[idx] = { ...orders[idx], ...patch }
  await storeSet(slug, 'orders.json', orders)
  return orders[idx]
}

export async function deleteOrder(slug: string, number: string): Promise<number> {
  const orders = await storeGet<Order[]>(slug, 'orders.json', [])
  const kept = orders.filter((o) => o.number !== number)
  const removed = orders.length - kept.length
  if (removed > 0) await storeSet(slug, 'orders.json', kept)
  return removed
}

export async function materializeScheduled(slug: string): Promise<void> {
  const orders = await storeGet<Order[]>(slug, 'orders.json', [])
  if (!orders.some((o) => o.status === 'SCHEDULED' && o.scheduledFor)) return
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }))
  const nowMin = now.getHours() * 60 + now.getMinutes()
  let changed = false
  for (const o of orders) {
    if (o.status !== 'SCHEDULED' || !o.scheduledFor) continue
    const [h, m] = o.scheduledFor.split(':').map(Number)
    if (nowMin >= h * 60 + m) {
      o.status = 'RECEIVED'
      changed = true
    }
  }
  if (changed) await storeSet(slug, 'orders.json', orders)
}

export async function activeOrdersToday(slug: string): Promise<number> {
  const orders = await listOrders(slug, 1000)
  const today = todayInTenantZone(slug)
  const staleCutoff = Date.now() - 2 * 3600_000
  return orders.filter((o) => {
    if (o.createdAt.slice(0, 10) !== today) return false
    if (o.status === 'CANCELLED' || o.status === 'DELIVERED') return false
    if ((o.status === 'PENDING_PAYMENT' || o.status === 'PAYMENT_CLAIMED') && new Date(o.createdAt).getTime() < staleCutoff) return false
    return true
  }).length
}

/* ---------------- settings ---------------- */

const DEFAULT_SETTINGS: Settings = {
  ordersPaused: false,
  capacity: 8,
  hoursOpen: '09:00',
  hoursClose: '20:00',
  hoursEnabled: false,
}

export async function getSettings(slug: string): Promise<Settings> {
  const stored = await storeGet<Partial<Settings>>(slug, 'settings.json', {})
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveSettings(slug: string, s: Settings): Promise<void> {
  await storeSet(slug, 'settings.json', s)
}

export function todayInTenantZone(slug: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date())
}

export function lpDateOf(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date(iso))
}