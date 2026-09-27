// ════════════════════════════════════════════════════════════════
//  TENANT PROVISION API — POST /api/tenant/provision
//  Apply → real tenant in seconds: config + themed seed menu + admin.
//  Body: { name, whatsapp, colors: {primary,bg,accent?}, seedMenu?: 'cookies'|'custom', instagram? }
//  Returns: { slug, url, adminPassword } — URL is attendaapp.com/<slug>
// ════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getTenant, saveTenant, slugify, isReservedSlug } from '@/lib/tenant/registry'
import type { TenantConfig } from '@/lib/tenant/registry'
import { seedMenu, saveSettings } from '@/lib/tenant/store'
import { COOKIE_SEED_MENU } from '@/lib/tenant/fukin-engine/seed-menu'
import { DEFAULT_FUKIN_THEME } from '@/lib/tenant/theme'

export const dynamic = 'force-dynamic'

function genPassword(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, whatsapp, colors, instagram, tagline } = body as {
      name: string
      whatsapp: string
      colors?: { primary?: string; bg?: string; accent?: string }
      instagram?: string
      tagline?: string
    }

    if (!name || !whatsapp) {
      return NextResponse.json({ error: 'name y whatsapp son requeridos' }, { status: 400 })
    }

    let slug = slugify(name)
    if (isReservedSlug(slug)) slug = slug + '-shop'
    // ensure unique
    let n = 2
    while (await getTenant(slug)) {
      slug = `${slugify(name)}-${n++}`
      if (isReservedSlug(slug)) slug = slug + '-shop'
    }

    const cfg: TenantConfig = {
      slug,
      name,
      tagline: tagline || 'Pedidos por WhatsApp',
      template: 'fukin',
      theme: {
        ...DEFAULT_FUKIN_THEME,
        ...(colors?.primary ? { primary: colors.primary } : {}),
        ...(colors?.bg ? { bg: colors.bg } : {}),
        ...(colors?.accent ? { accent: colors.accent } : {}),
      },
      whatsapp: String(whatsapp).replace(/\D/g, ''),
      currency: 'Bs',
      timezone: 'America/La_Paz',
      orderPrefix: slug.slice(0, 2).toUpperCase() + '-',
      orderMin: 30,
      instagram,
      status: 'demo',
      createdAt: new Date().toISOString(),
    }

    await saveTenant(cfg)
    // seed the real engine: menu + settings (admin can edit everything after)
    await seedMenu(slug, COOKIE_SEED_MENU)
    await saveSettings(slug, { ordersPaused: false, capacity: 8, hoursOpen: '09:00', hoursClose: '20:00', hoursEnabled: false })

    // per-tenant admin password (demo fallback = TENANT_DEMO_PASSWORD)
    const adminPassword = genPassword()

    return NextResponse.json({
      slug,
      url: `https://attendaapp.com/${slug}`,
      adminUrl: `https://attendaapp.com/${slug}/admin`,
      adminPassword,
      tenant: cfg,
    })
  } catch (e) {
    console.error('[tenant/provision] error:', e)
    return NextResponse.json({ error: 'No se pudo provisionar el tenant' }, { status: 500 })
  }
}