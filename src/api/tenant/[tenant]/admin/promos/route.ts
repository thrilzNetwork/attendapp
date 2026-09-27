import { NextRequest, NextResponse } from 'next/server'
import { getPromos, savePromo, deletePromo } from '@/lib/tenant/store'
import { Promo } from '@/lib/tenant/types'
import { requireAdmin } from '../auth'

export const dynamic = 'force-dynamic'

function cleanBody(body: Partial<Promo>): Promo | { error: string } {
  const code = (body.code || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return { error: 'Código: 3-20 letras/números' }
  const type = body.type === 'FLAT' ? 'FLAT' : body.type === 'PERCENT' ? 'PERCENT' : null
  if (!type) return { error: 'Tipo inválido' }
  const value = Math.round(Number(body.value))
  if (!Number.isFinite(value) || value <= 0) return { error: 'Valor inválido' }
  if (type === 'PERCENT' && value > 100) return { error: 'Porcentaje máx 100' }
  if (type === 'FLAT' && value > 100000) return { error: 'Monto muy alto' }
  const promo: Promo = {
    code,
    type,
    value,
    minSubtotal: Math.max(0, Math.round(Number(body.minSubtotal) || 0)),
    active: body.active !== false,
    maxUses: Math.max(0, Math.round(Number(body.maxUses) || 0)),
    usedCount: Math.max(0, Math.round(Number(body.usedCount) || 0)),
    startsAt: typeof body.startsAt === 'string' && body.startsAt ? body.startsAt : undefined,
    endsAt: typeof body.endsAt === 'string' && body.endsAt ? body.endsAt : undefined,
    note: typeof body.note === 'string' ? body.note.trim() : undefined,
  }
  return promo
}

export async function GET(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  const err = requireAdmin(req)
  if (err) return err
  const map = await getPromos(tenant, )
  return NextResponse.json(Object.values(map))
}

export async function POST(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  const err = requireAdmin(req)
  if (err) return err
  const body = await req.json()
  const promo = cleanBody(body)
  if ('error' in promo) return NextResponse.json(promo, { status: 400 })
  await savePromo(tenant, promo)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  const err = requireAdmin(req)
  if (err) return err
  const code = req.nextUrl.searchParams.get('code') || ''
  const ok = await deletePromo(tenant, code)
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 })
}