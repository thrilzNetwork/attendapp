import { NextRequest, NextResponse } from 'next/server'
import { getOrder, updateOrder } from '@/lib/tenant/store'

export const dynamic = 'force-dynamic'

/**
 * Public: customer taps "YA ENVIE MI PAGO" on the receipt page after sending
 * the Transferencia/Plin capture in WhatsApp. Flags the order for admin verification.
 * Idempotent — re-tapping does nothing once claimed/paid.
 */
export async function POST(_req: NextRequest, { params }: { params: { tenant: string, number: string } }) {
  const { tenant, number } = params
  const order = await getOrder(tenant, number.toUpperCase())
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

  if (order.paymentStatus === 'PAID') return NextResponse.json({ ok: true, already: true })
  if (order.status !== 'PENDING_PAYMENT' && order.paymentStatus !== 'PENDING') {
    return NextResponse.json({ ok: true, already: true })
  }

  const updated = await updateOrder(tenant, order.number, { status: 'PAYMENT_CLAIMED', paymentStatus: 'CLAIMED' })
  if (!updated) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true, status: updated.status, paymentStatus: updated.paymentStatus })
}