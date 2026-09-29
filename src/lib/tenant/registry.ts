// ════════════════════════════════════════════════════════════════
//  TENANT REGISTRY — every tenant/vendor/biz lives as a PATH on
//  attendaapp.com (/<slug>). No new domains, no new sites, ever.
//  Config lives in blobs ('attenda_tenants' store, key 'tenants:index').
// ════════════════════════════════════════════════════════════════

export type TenantTheme = {
  bg: string
  panel: string
  line: string
  primary: string
  cream: string
  accent: string
  text: string
}

export type TenantBrand = {
  wordA: string
  wordB: string
  botName: string
  marquee: string[]
  heroLines: string[]
  heroAccent: string
  heroPara: string
  stats: { v: string; l: string }[]
  zone0Name: string
  eta: string
  menuEyebrow: string
  menuTitle: string
  whyEyebrow: string
  whyTitle: string
  whyItems: { t: string; d: string }[]
  ctaTitle: string
  ctaSub: string
  footerLine: string
  navWhy: string
  heroCat: string
  cuisine: string[]
  opens: string
  closes: string
}

/** Template brand defaults: Cookies Organic (midnight demo tenant). */
export const COOKIE_BRAND: TenantBrand = {
  wordA: 'COOKIES',
  wordB: 'ORGANIC',
  botName: 'MIDNIGHT BOT',
  marquee: ['HORNEADAS AL MOMENTO', 'CHIPS DE CHOCOLATE REAL', 'MASA ORGÁNICA', 'DELIVERY MEDIANOCHE', 'SALIDAS 22:00 - 02:00'],
  heroLines: ['HORNEADO', 'EN LA MADRUGADA.', '100% ORGÁNICO.'],
  heroAccent: 'MADRUGADA.',
  heroPara: 'Cookies orgánicas horneadas a medianoche — con chips de chocolate reales y nada artificial. Delivery en Santa Cruz.',
  stats: [
    { v: '12h', l: 'Masa fermentada' },
    { v: '25-40', l: 'Min delivery' },
    { v: '100%', l: 'Orgánico' },
  ],
  zone0Name: 'Equipetrol',
  eta: '25-40 min',
  menuEyebrow: 'El menú',
  menuTitle: 'Horneado hoy, entrega esta noche',
  whyEyebrow: 'Por qué Cookies Organic',
  whyTitle: 'Masa real, chocolate real. Horneado la noche misma.',
  whyItems: [
    { t: 'Ingredientes orgánicos', d: 'Masa fermentada, mantequilla real, chips de chocolate de verdad. Nada artificial.' },
    { t: 'Delivery medianoche', d: 'Hornos encendidos hasta las 2am en Equipetrol: 25-40 min en tu zona.' },
    { t: 'Horneado al momento', d: 'Salen del horno cuando las pides, nunca de vitrina. Calientes siempre.' },
  ],
  ctaTitle: '¿Antojo de medianoche?',
  ctaSub: 'Pide en 2 minutos. Paga con QR, transferencia o efectivo.',
  footerLine: 'Horneado orgánico · Cookies at Midnight · Santa Cruz, Bolivia',
  navWhy: 'Por qué CO',
  heroCat: 'Cookies',
  cuisine: ['Bakery', 'Desserts'],
  opens: '22:00',
  closes: '02:00',
}

/** Fukin itself — the template keeps its own words when rendering fukinvegan. */
export const FV_BRAND: TenantBrand = {
  wordA: "FUKIN'",
  wordB: 'VEGAN',
  botName: 'FV BOT',
  marquee: ['SMASH BRUTAL', 'ALTO EN PROTEÍNA', '100% VEGANO', 'SIN UNA GOTA DE CARNE', 'DELIVERY SURCO 25-35 MIN'],
  heroLines: ['FAST FOOD', 'ALTO EN PROTEÍNA.', '100% VEGANO.'],
  heroAccent: 'BRUTAL.',
  heroPara: 'Smash burgers veganas con todo el sabor y la proteína que esperas — sin una gota de carne. Delivery en Santiago de Surco, Lima.',
  stats: [
    { v: '16g+', l: 'Proteína por patty' },
    { v: '25-35', l: 'Min delivery' },
    { v: '100%', l: 'Vegano' },
  ],
  zone0Name: 'Santiago de Surco',
  eta: '25-35 min',
  menuEyebrow: 'El menú',
  menuTitle: '100% plant-based, hecho en casa',
  whyEyebrow: "Por qué Fukin' Vegan",
  whyTitle: 'Sabor primero. La proteína sorprende. Que es vegano, ni se nota.',
  whyItems: [
    { t: 'Alta en proteína', d: 'Hasta 32g+ por burger (solo de las patties). Plant-based, no plant-flavored.' },
    { t: 'Delivery rápido', d: 'Cocinamos por lotes en Surco: 25-35 min en tus zonas de entrega.' },
    { t: '100% vegano', d: 'Cero carne, cero lácteos, cero excusas. Sabor brutal igual.' },
  ],
  ctaTitle: '¿Listo para romper la dieta?',
  ctaSub: 'Pide en 2 minutos. Paga con Yape, Plin o efectivo.',
  footerLine: 'Fast food brutal · Alto en proteína · 100% vegano · Santiago de Surco, Lima',
  navWhy: 'Por qué FV',
  heroCat: 'burgers',
  cuisine: ['Vegan', 'Fast Food'],
  opens: '12:00',
  closes: '23:00',
}

export type TenantConfig = {
  slug: string
  name: string
  tagline: string
  template: string            // 'fukin' for now — the only template
  theme: TenantTheme
  brand?: Partial<TenantBrand> // landing copy overrides — fukin shape, per-tenant words
  whatsapp: string            // digits, no +
  currency: string            // 'Bs'
  timezone: string            // e.g. 'America/La_Paz'
  orderPrefix: string         // e.g. 'CO-'
  orderMin: number
  instagram?: string
  adminPassword?: string       // provision-generated demo password (persisted so the admin token actually works)
  expiresAt?: string           // ISO — demo TTL (24h for web-provisioned demos); cleared on activation
  status: 'demo' | 'active'
  createdAt: string
}

import { getStore } from '@netlify/blobs'

const INDEX_KEY = 'tenants:index'
const RESERVED = new Set(['api', '_next', 'favicon.ico', 'icon.svg', 'robots.txt', 'sitemap.xml', 'images', 'fonts', 'hospitality', 'transportation', 'serve', 'ecosystem', 'company', 'insights', 'contact', 'privacy', 'terms', 'careers', 'apply', 'welcome', 'partner', 'vendor', 'admin', 'superadmin', 'account', 'track', 'message', 'confirmation', 'review', 'safety', 'facilities', 'hubs', 'nearby', 'staff', 'blog', 'cookiesorganic'])

function blobsAvailable(): boolean {
  return !!(
    process.env.NETLIFY_BLOBS_CONTEXT ||
    process.env.NETLIFY_DEPLOY_ID ||
    process.env.NETLIFY_DEV
  )
}

export async function tenantIndex(): Promise<Record<string, TenantConfig>> {
  try {
    if (!blobsAvailable()) return {}
    const store = getStore({ name: 'attenda_tenants', consistency: 'strong' })
    const raw = await store.get(INDEX_KEY, { type: 'text' })
    return raw ? (JSON.parse(raw) as Record<string, TenantConfig>) : {}
  } catch {
    return {}
  }
}

export async function getTenant(slug: string): Promise<TenantConfig | null> {
  const idx = await tenantIndex()
  return idx[slug.toLowerCase()] ?? null
}

export async function saveTenant(cfg: TenantConfig): Promise<void> {
  const store = getStore({ name: 'attenda_tenants', consistency: 'strong' })
  const idx = await tenantIndex()
  idx[cfg.slug.toLowerCase()] = cfg
  await store.setJSON(INDEX_KEY, idx)
}

export function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 40) || 'tenant'
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug.toLowerCase())
}

// Per-tenant admin password: env TENANT_ADMIN_PASSWORD_<SLUG> (upper, - → _)
// falls back to TENANT_DEMO_PASSWORD for demo tenants.
export function tenantAdminPassword(cfg: TenantConfig): string {
  // env per-tenant override wins (paying tenants rotate via Netlify env); inline provision password next; env demo fallback last.
  const envKey = 'TENANT_ADMIN_PASSWORD_' + cfg.slug.toUpperCase().replace(/-/g, '_')
  return process.env[envKey] || cfg.adminPassword || process.env.TENANT_DEMO_PASSWORD || ''
}

/** Demo TTL: web-provisioned demos expire 24h after creation. */
export function isTenantExpired(cfg: TenantConfig, now = new Date()): boolean {
  if (cfg.status !== 'demo' || !cfg.expiresAt) return false
  return now.getTime() >= new Date(cfg.expiresAt).getTime()
}

/** Resolved brand strings. Fukin tenants keep FV words; everyone else gets COOKIE_BRAND layered with cfg.brand. */
export function brandOf(cfg: TenantConfig): TenantBrand {
  const base: TenantBrand = cfg.slug === 'fukinvegan' || cfg.slug === 'fukin-vegan' ? FV_BRAND : COOKIE_BRAND
  return { ...base, ...(cfg.brand || {}) }
}
