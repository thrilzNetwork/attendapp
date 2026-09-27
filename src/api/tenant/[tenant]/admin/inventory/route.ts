import { NextRequest, NextResponse } from 'next/server'
import { getMenu, getStockMap } from '@/lib/tenant/store'
import { requireAdmin } from '../auth'

export const dynamic = 'force-dynamic'

/** Full inventory board: products + live stock state */
export async function GET(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  const err = requireAdmin(req)
  if (err) return err
  const [products, stock] = await Promise.all([getMenu(tenant, ), getStockMap(tenant, )])
  return NextResponse.json(
    products.map((p) => ({ slug: p.slug, name: p.name, category: p.category, active: p.active, soldOut: p.soldOut || false, image: p.image, stock: stock[p.slug] || null })),
  )
}