import { NextRequest, NextResponse } from 'next/server'
import { seedMenu, saveSettings } from '@/lib/tenant/store'
import { getTenant, tenantAdminPassword } from '@/lib/tenant/registry'
import { COOKIE_SEED_MENU } from '@/lib/tenant/fukin-engine/seed-menu'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await ctx.params
  const cfg = await getTenant(tenant)
  if (!cfg) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
  const provided = (req.headers.get('x-admin-token') || '').trim()
  if (!provided || provided !== tenantAdminPassword(cfg)) {
    return NextResponse.json({ error: 'Contrasena incorrecta' }, { status: 401 })
  }
  await seedMenu(tenant, COOKIE_SEED_MENU.map((p) => ({ ...p })))
  await saveSettings(tenant, { ordersPaused: false, capacity: 8, hoursOpen: '09:00', hoursClose: '20:00', hoursEnabled: false })
  return NextResponse.json({ ok: true, seeded: COOKIE_SEED_MENU.length })
}
