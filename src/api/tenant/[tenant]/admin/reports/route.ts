import { NextRequest, NextResponse } from 'next/server'
import { listOrders, getMenu, todayInTenantZone, lpDateOf } from '@/lib/tenant/store'
import { Order } from '@/lib/tenant/types'
import { requireAdmin } from '../auth'

export const dynamic = 'force-dynamic'

const REVENUE_STATUSES = new Set(['RECEIVED', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'])
const ACTIVE_STATUSES = new Set(['PENDING_PAYMENT', 'PAYMENT_CLAIMED', 'RECEIVED', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED'])

function summarize(orders: Order[]) {
  // Revenue = everything not cancelled (customer committed by placing the order).
  // Pending/unpaid orders count toward revenue and item ranking; only CANCELLED is excluded.
  const counted = orders.filter((o) => o.status !== 'CANCELLED')
  const revenue = counted.reduce((a, o) => a + o.total, 0)
  const net = counted.reduce((a, o) => a + o.subtotal - (o.discount || 0), 0)
  const delivery = revenue - net
  const discounts = counted.reduce((a, o) => a + (o.discount || 0), 0)
  const count = orders.length
  const pending = counted.filter((o) => o.paymentStatus === 'PENDING' || o.status === 'PENDING_PAYMENT').length
  const aov = count > 0 ? Math.round(revenue / count) : 0
  const cancelled = orders.filter((o) => o.status === 'CANCELLED').length
  const transferencia = counted.filter((o) => o.paymentMethod === 'TRANSFERENCIA_QR')
  const cash = counted.filter((o) => o.paymentMethod === 'CASH')
  const items: Record<string, { qty: number; revenue: number }> = {}
  for (const o of counted) {
    for (const it of o.items) {
      if (!items[it.name]) items[it.name] = { qty: 0, revenue: 0 }
      items[it.name].qty += it.qty
      items[it.name].revenue += it.lineTotal
    }
  }
  const topItems = Object.entries(items)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
  return {
    revenue,
    deliveryRevenue: delivery,
    discounts,
    orders: count,
    pending,
    aov,
    cancelled,
    paymentMix: { transferenciaPlin: { count: transferencia.length, revenue: transferencia.reduce((a, o) => a + o.total, 0) }, cash: { count: cash.length, revenue: cash.reduce((a, o) => a + o.total, 0) } },
    topItems: topItems.slice(0, 8),
  }
}

export async function GET(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  const err = requireAdmin(req)
  if (err) return err
  const all = (await listOrders(tenant, 1000))
  const menu = await getMenu(tenant, )

  const today = todayInTenantZone(tenant)
  const now = Date.now()
  const dayMs = 86_400_000

  const last7 = all.filter((o) => now - new Date(o.createdAt).getTime() <= 7 * dayMs)
  const last30 = all.filter((o) => now - new Date(o.createdAt).getTime() <= 30 * dayMs)
  const todayOrders = all.filter((o) => o.createdAt.slice(0, 10) === today)

  // daily revenue series for last 14 days (La Paz dates)
  const series: { date: string; revenue: number; orders: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * dayMs)
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(d)
    const dayOrders = all.filter((o) => o.createdAt.slice(0, 10) === key && o.status !== 'CANCELLED')
    series.push({ date: key, revenue: dayOrders.reduce((a, o) => a + o.total, 0), orders: dayOrders.length })
  }

  return NextResponse.json({
    today: summarize(todayOrders),
    last7: summarize(last7),
    last30: summarize(last30),
    series,
    liveOrders: all.filter((o) => ACTIVE_STATUSES.has(o.status)).slice(0, 10),
    stock: menu.filter((p) => p.soldOut).map((p) => p.name),
  })
}