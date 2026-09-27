
import { NextRequest, NextResponse } from 'next/server'
import { updateOrder, getOrder, deleteOrder } from '@/lib/tenant/store'
import type { Order } from '@/lib/tenant/types'
import { requireAdmin } from '../../auth'

export const dynamic = 'force-dynamic'

const ALLOWED: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAYMENT_CLAIMED', 'RECEIVED', 'CANCELLED'],
  PAYMENT_CLAIMED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export async function PATCH(req: NextRequest, { params }: { params: { tenant: string, number: string } }) {
  const err = requireAdmin(req)
  if (err) return err
  const { tenant, number } = params
  const body = await req.json()
  const { status, paymentStatus } = body as { status?: string; paymentStatus?: string }

  const order = await getOrder(tenant, number.toUpperCase())
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

  const patch: Partial<Order> = {}
  if (status) {
    if (!(ALLOWED[order.status] || []).includes(status)) {
      return NextResponse.json({ error: `Transicion invalida: ${order.status} -> ${status}` }, { status: 400 })
    }
    patch.status = status as never
  }
  if (paymentStatus) {
    if (!['PENDING', 'CLAIMED', 'PAID', 'UNPAID'].includes(paymentStatus)) {
      return NextResponse.json({ error: 'paymentStatus invalido' }, { status: 400 })
    }
    patch.paymentStatus = paymentStatus as never
  }
  const updated = await updateOrder(tenant, order.number, patch)
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { tenant: string, number: string } }) {
  const err = requireAdmin(req)
  if (err) return err
  const { tenant, number } = params
  const removed = await deleteOrder(tenant, number.toUpperCase())
  if (removed === 0) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true, removed })
}
