
import { NextRequest, NextResponse } from 'next/server'
import { getOrder } from '@/lib/tenant/store'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { tenant: string, number: string } }) {
  const { tenant, number } = params
  const order = await getOrder(tenant, number.toUpperCase())
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  return NextResponse.json(order)
}
