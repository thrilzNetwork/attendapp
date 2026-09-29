// ════════════════════════════════════════════════════════════════
//  ONBOARDING WIZARD SUBMISSION API — POST /api/tenant/onboard
//  Accepts the wizard's full payload, provisions a REAL tenant:
//  their brand (palette/wordmark/copy), their seed items, 24h demo
//  TTL, working inline adminPassword. Returns the 3 links + password.
//  Prices arrive in DISPLAY units (Bs) and are stored as cents.
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getTenant, saveTenant, slugify, isReservedSlug } from '@/lib/tenant/registry'
import type { TenantConfig, TenantBrand } from '@/lib/tenant/registry'
import { seedMenu, saveSettings } from '@/lib/tenant/store'
import { COOKIE_SEED_MENU } from '@/lib/tenant/fukin-engine/seed-menu'
import { DEFAULT_FUKIN_THEME } from '@/lib/tenant/theme'
import type { Product } from '@/lib/tenant/types'

export const dynamic = 'force-dynamic'

function genPassword(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
}

type WizardItem = { name: string; price: number; category?: string; description?: string }

const VERTICALS = ['Comida', 'Bebidas', 'Postres', 'Menú']

/** Guess the business vertical from item names (drives cuisine + wordmark fallback). */
function brandVertical(items?: WizardItem[]): string {
  if (!items || !items.length) return 'Delivery'
  const all = items.map((i) => `${i.name} ${i.description || ''}`).join(' ').toLowerCase()
  if (/cookie|galleta|postre|brownie|torta|pastel/.test(all)) return 'Postres'
  if (/café|coffee|java|latte|brew/.test(all)) return 'Café'
  if (/pizza/.test(all)) return 'Pizza'
  if (/burger|hamburgues/.test(all)) return 'Burgers'
  if (/sushi|poke/.test(all)) return 'Sushi'
  return 'Comida'
}

/** The live-menu category that feeds the hero photo grid + menu preview. */
function brandHeroCat(items?: WizardItem[]): string {
  if (!items || !items.length) return 'Menú'
  const counts = new Map<string, number>()
  for (const it of items) counts.set(it.category || 'Menú', (counts.get(it.category || 'Menú') || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, whatsapp, city, tagline, instagram, primary, accent,
      items, brandLine, hours,
    } = body as {
      name: string; whatsapp: string; city?: string; tagline?: string; instagram?: string
      primary?: string; accent?: string
      items?: WizardItem[]; brandLine?: string
      hours?: { opens: string; closes: string }
    }

    if (!name || !whatsapp) {
      return NextResponse.json({ error: 'name y whatsapp son requeridos' }, { status: 400 })
    }
    if (items && (!Array.isArray(items) || items.length > 12)) {
      return NextResponse.json({ error: 'Máximo 12 items' }, { status: 400 })
    }

    // ── slug + uniqueness (same policy as provision) ──
    let slug = slugify(name)
    if (isReservedSlug(slug)) slug = slug + '-shop'
    let n = 2
    while (await getTenant(slug)) {
      slug = `${slugify(name)}-${n++}`
      if (isReservedSlug(slug)) slug = slug + '-shop'
    }

    // ── palette: wizard colors drive the whole fv-theme ──
    const theme: TenantConfig['theme'] = {
      ...DEFAULT_FUKIN_THEME,
      ...(primary ? { primary } : {}),
      ...(accent ? { accent } : {}),
    }

    const createdAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    const adminPassword = genPassword()

    // ── brand copy: wordmark halves from the NAME, rest derived from items/city ──
    const words = name.trim().split(/\s+/).filter(Boolean)
    const vertical = brandVertical(items)
    const brand: Partial<TenantBrand> = {
      wordA: (words[0] || name).toUpperCase(),
      wordB: (words[1] || vertical).toUpperCase(),
      botName: `${(words[0] || name).toUpperCase()} BOT`,
      menuTitle: brandLine || 'Hecho al momento, directo a tu puerta',
      ctaSub: 'Pide en 2 minutos. Paga con QR, transferencia o efectivo.',
      footerLine: `${name} · ${city || 'Delivery local'}`,
      zone0Name: city || 'Zona central',
      heroCat: brandHeroCat(items),
      cuisine: [vertical],
      opens: hours?.opens || '09:00',
      closes: hours?.closes || '22:00',
    }

    // ── seed items: THEIR items, branded placeholder tiles ──
    const seedItems: Product[] = (items || []).map((it, i) => ({
      slug: slugify(it.name) || `item-${i + 1}`,
      name: it.name.toUpperCase(),
      short: it.description || `${it.name}`,
      long: it.description || `${it.name} — hecho al momento.`,
      category: it.category || 'Menú',
      price: Math.round((Number(it.price) || 0) * 100),
      image: `/images/t/generic-item.svg`,
      active: true,
      featured: i < 4,
      proteinVerified: true,
      sortOrder: i + 1,
      groups: [],
    }))

    const menu = seedItems.length ? seedItems : COOKIE_SEED_MENU

    const cfg: TenantConfig = {
      slug,
      name,
      tagline: tagline || 'Pedidos por WhatsApp',
      template: 'fukin',
      theme,
      brand,
      whatsapp: String(whatsapp).replace(/\D/g, ''),
      currency: 'Bs',
      timezone: 'America/La_Paz',
      orderPrefix: slug.slice(0, 2).toUpperCase() + '-',
      orderMin: 2000,
      instagram,
      adminPassword,
      expiresAt,
      status: 'demo',
      createdAt,
    }

    await saveTenant(cfg)
    await seedMenu(slug, menu)
    await saveSettings(slug, {
      ordersPaused: false, capacity: 8,
      hoursOpen: hours?.opens || '09:00',
      hoursClose: hours?.closes || '22:00',
      hoursEnabled: false,
    })

    return NextResponse.json({
      ok: true,
      slug,
      url: `https://attendaapp.com/${slug}`,
      menuUrl: `https://attendaapp.com/${slug}/menu`,
      adminUrl: `https://attendaapp.com/${slug}/admin`,
      adminPassword,
      expiresAt,
    })
  } catch (e) {
    console.error('[tenant/onboard] error:', e)
    return NextResponse.json({ error: 'No se pudo crear el tenant de demo' }, { status: 500 })
  }
}