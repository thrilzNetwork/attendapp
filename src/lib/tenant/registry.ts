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

export type TenantConfig = {
  slug: string
  name: string
  tagline: string
  template: string            // 'fukin' for now — the only template
  theme: TenantTheme
  whatsapp: string            // digits, no +
  currency: string            // 'Bs'
  timezone: string            // e.g. 'America/La_Paz'
  orderPrefix: string         // e.g. 'CO-'
  orderMin: number
  instagram?: string
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
  const envKey = 'TENANT_ADMIN_PASSWORD_' + cfg.slug.toUpperCase().replace(/-/g, '_')
  return process.env[envKey] || process.env.TENANT_DEMO_PASSWORD || ''
}