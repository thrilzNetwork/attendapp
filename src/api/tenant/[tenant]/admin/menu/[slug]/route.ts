import { NextRequest, NextResponse } from 'next/server'
import { getMenu, updateProduct, getStockMap, setSoldOut, setAuto86Threshold } from '@/lib/tenant/store'
import { requireAdmin } from '../../auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  const err = await requireAuth(req)
  if (err) return err
  const [products, stock] = await Promise.all([getMenu(tenant, ), getStockMap(tenant, )])
  return NextResponse.json(
    products.map((p) => ({ ...p, stock: stock[p.slug] || null })),
  )
}

type PatchBody = {
  active?: boolean
  name?: string
  short?: string
  long?: string
  price?: number
  image?: string
  soldOut?: boolean
  auto86Threshold?: number
}

export async function PATCH(req: NextRequest, { params }: { params: { tenant: string, slug: string } }) {
  const err = await requireAuth(req)
  if (err) return err
  const { tenant, slug } = params
  const body = (await req.json()) as PatchBody
  const exists = (await getMenu(tenant, )).some((p) => p.slug === slug)
  if (!exists) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  const productPatch: Record<string, unknown> = {}
  for (const key of ['active', 'name', 'short', 'long', 'price', 'image'] as const) {
    if (body[key] !== undefined) productPatch[key] = body[key]
  }
  if (Object.keys(productPatch).length > 0) {
    await updateProduct(tenant, { ...productPatch, slug } as never)
  }
  if (typeof body.soldOut === 'boolean') await setSoldOut(tenant, slug, body.soldOut)
  if (typeof body.auto86Threshold === 'number') await setAuto86Threshold(tenant, slug, body.auto86Threshold)

  return NextResponse.json({ ok: true })
}

async function requireAuth(req: NextRequest) {
  const { requireAdmin } = await import('../../auth')
  return requireAdmin(req)
}