import { NextRequest, NextResponse } from 'next/server'
import { validatePromo } from '@/lib/tenant/store'

export const dynamic = 'force-dynamic'

/** Public promo preview for checkout: POST { code, subtotal } */
export async function POST(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  try {
    const body = await req.json()
    const code = typeof body.code === 'string' ? body.code : ''
    const subtotal = typeof body.subtotal === 'number' ? body.subtotal : 0
    if (!code.trim()) return NextResponse.json({ ok: false, discount: 0, reason: 'Ingresa un código' })
    const check = await validatePromo(tenant, code, subtotal)
    if (check.ok && check.promo) {
      // never leak internal fields (usedCount etc.)
      return NextResponse.json({ ok: true, discount: check.discount, code: check.promo.code })
    }
    return NextResponse.json({ ok: false, discount: 0, reason: check.reason || 'Código no válido' })
  } catch {
    return NextResponse.json({ ok: false, discount: 0, reason: 'Error validando código' }, { status: 400 })
  }
}