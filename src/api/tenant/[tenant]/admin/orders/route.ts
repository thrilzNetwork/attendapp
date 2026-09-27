
import { NextRequest, NextResponse } from 'next/server'
import { listOrders, materializeScheduled } from '@/lib/tenant/store'
import { requireAdmin } from '../auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  const err = requireAdmin(req)
  if (err) return err
  // Auto-flip scheduled pre-orders whose slot has arrived before listing.
  await materializeScheduled(tenant)
  const orders = await listOrders(tenant, 100)
  const visible = orders
  return NextResponse.json(visible)
}
