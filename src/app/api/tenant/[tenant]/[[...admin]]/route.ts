import { NextRequest, NextResponse } from 'next/server'
import {
  getMenu, getStockMap, updateProduct, setSoldOut, setAuto86Threshold,
  getPromos, savePromo, deletePromo, validatePromo, consumePromo,
  createOrder, getOrder, listOrders, updateOrder, deleteOrder,
  materializeScheduled, activeOrdersToday, recordSales,
  getSettings, saveSettings,
} from '@/lib/tenant/store'
import { getTenant, tenantAdminPassword } from '@/lib/tenant/registry'
import type { Order, OrderItem } from '@/lib/tenant/types'
import { ZONES, ORDER_MIN, CATEGORIES, DEFAULT_SETTINGS } from '@/lib/tenant/fukin-engine/menu'
import { UPSELLS } from '@/lib/tenant/fukin-engine/upsells'
import { lineUnitPrice } from '@/lib/tenant/fukin-engine/pricing'
import { buildWhatsAppMessage, waLink } from '@/lib/tenant/fukin-engine/whatsapp'
import { isOpenNowInLaPaz, isHHMMInsideHours, formatHoursRange, isValidHHMM } from '@/lib/tenant/fukin-engine/hours'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ tenant: string; admin?: string[] }> }

function deny(msg: string, status = 401) {
  return NextResponse.json({ error: msg }, { status })
}

/** Admin auth: bearer token == tenant admin password. */
function requireAdmin(req: NextRequest, token: string) {
  const provided = (req.headers.get('x-admin-token') || req.headers.get('authorization')?.replace(/^Bearer /i, '') || '').trim()
  if (!token || provided !== token) return deny('Contrasena incorrecta')
  return null
}

/** Tenant password from provisioned config (fallback to env for legacy). */
async function adminToken(tenant: string): Promise<string> {
  const cfg = await getTenant(tenant)
  return cfg ? tenantAdminPassword(cfg) : process.env.ADMIN_PASSWORD || ''
}

async function isAdminOrder(req: NextRequest, token: string) {
  const provided = (req.headers.get('x-admin-token') || '').trim()
  return !!token && provided === token
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { tenant, admin } = await ctx.params
  const seg = admin || []
  const token = await adminToken(tenant)
  const cfg = await getTenant(tenant)
  if (!cfg) return deny('Tenant no encontrado', 404)

  /* ---------- PUBLIC STORE API (no auth) ---------- */
  if (seg[0] === 'store') {
    if (seg[1] === 'menu') {
      const menu = await getMenu(tenant)
      return NextResponse.json(menu.filter((p) => p.active))
    }
    if (seg[1] === 'upsells') {
      return NextResponse.json(UPSELLS.filter((u) => u.active).map(({ id, name, price, image, active }) => ({ id, name, price, image, active })))
    }
    if (seg[1] === 'hours') {
      const settings = await getSettings(tenant)
      return NextResponse.json({
        hoursEnabled: settings.hoursEnabled,
        hoursOpen: settings.hoursOpen,
        hoursClose: settings.hoursClose,
        isOpenNow: isOpenNowInLaPaz(settings),
      })
    }
  }

  if (seg[0] === 'orders' && seg.length === 2 && seg[1]) {
    const order = await getOrder(tenant, seg[1].toUpperCase())
    if (!order) return deny('Pedido no encontrado', 404)
    return NextResponse.json(order)
  }

  /* ---------- ADMIN API (auth) ---------- */
  const err = requireAdmin(req, token)
  if (err) return err

  if (seg[0] === 'admin') {
    const sub = seg.slice(1)

    if (sub[0] === 'orders') {
      if (sub.length === 1) {
        await materializeScheduled(tenant)
        const orders = await listOrders(tenant, 100)
        return NextResponse.json(orders)
      }
    }

    if (sub[0] === 'inventory') {
      const [products, stock] = await Promise.all([getMenu(tenant), getStockMap(tenant)])
      return NextResponse.json(products.map((p) => ({ ...p, stock: stock[p.slug] || null })))
    }

    if (sub[0] === 'promos' && sub.length === 1) {
      const map = await getPromos(tenant)
      return NextResponse.json(Object.values(map))
    }

    if (sub[0] === 'settings' && sub.length === 1) {
      return NextResponse.json(await getSettings(tenant))
    }

    if (sub[0] === 'reports' && sub.length === 1) {
      const all = await listOrders(tenant, 1000)
      const menu = await getMenu(tenant)
      const now = Date.now()
      const dayMs = 86_400_000
      const REVENUE_STATUSES = new Set(['RECEIVED', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'])
      const ACTIVE_STATUSES = new Set(['PENDING_PAYMENT', 'PAYMENT_CLAIMED', 'RECEIVED', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED'])
      const summarize = (orders: typeof all) => {
        const counted = orders.filter((o) => o.status !== 'CANCELLED')
        const revenue = counted.reduce((a, o) => a + o.total, 0)
        const net = counted.reduce((a, o) => a + o.subtotal - (o.discount || 0), 0)
        const delivery = revenue - net
        const count = orders.length
        return {
          revenue, deliveryRevenue: delivery, discounts: counted.reduce((a, o) => a + (o.discount || 0), 0), count,
          orders: count, delivered: counted.filter((o) => o.status === 'DELIVERED').length,
          pending: counted.filter((o) => o.paymentStatus === 'PENDING' || o.status === 'PENDING_PAYMENT').length,
          aov: count > 0 ? Math.round(revenue / count) : 0,
          cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
          revenueStatuses: [...REVENUE_STATUSES].length,
          cash: { count: counted.filter((o) => o.paymentMethod === 'CASH').length, revenue: counted.filter((o) => o.paymentMethod === 'CASH').reduce((a, o) => a + o.total, 0) },
          items: (() => {
            const items: Record<string, { qty: number; revenue: number }> = {}
            for (const o of counted) { for (const it of o.items) { if (!items[it.name]) items[it.name] = { qty: 0, revenue: 0 }
              items[it.name].qty += it.qty; items[it.name].revenue += it.lineTotal } }
            return Object.entries(items).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 8)
          })(),
          __active: [...ACTIVE_STATUSES].length,
        }
      }
      const today = (new Date()).toISOString().slice(0, 10)
      void today
      return NextResponse.json({
        today: summarize(all.filter((o) => now - new Date(o.createdAt).getTime() <= dayMs)),
        last7: summarize(all.filter((o) => now - new Date(o.createdAt).getTime() <= 7 * dayMs)),
        last30: summarize(all.filter((o) => now - new Date(o.createdAt).getTime() <= 30 * dayMs)),
        liveOrders: all.filter((o) => ACTIVE_STATUSES.has(o.status)).slice(0, 10),
        stock: menu.filter((p) => p.soldOut).map((p) => p.name),
      })
    }

    // admin/orders/[number] handled above only for GET-less PATCH/DELETE — full impl in PATCH/DELETE exports
  }

  return deny('Ruta desconocida', 404)
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { tenant, admin } = await ctx.params
  const seg = admin || []
  const token = await adminToken(tenant)
  const cfg = await getTenant(tenant)
  if (!cfg) return deny('Tenant no encontrado', 404)

  /* ---------- PUBLIC ---------- */
  // Customer order create: /api/orders → tenantApi → /api/tenant/<t>/orders
  if (seg[0] === 'orders' && seg.length === 1) {
    try {
      const body = await req.json()
      const { customer, address, zoneId, paymentMethod, notes, items, promoCode, upsells, scheduledFor } = body as {
        customer: { firstName: string; phone: string }
        address: { street: string; apartment?: string; reference?: string }
        zoneId: string
        paymentMethod: 'TRANSFERENCIA_QR' | 'CASH'
        notes?: string
        items: { slug: string; qty: number; mods?: Record<string, string[]>; notes?: string }[]
        promoCode?: string
        upsells?: { id: string; qty: number }[]
        scheduledFor?: string
      }
      if (!customer?.firstName || !customer?.phone || !address?.street || !Array.isArray(items) || !items.length) {
        return deny('Datos incompletos', 400)
      }
      const zone = ZONES.find((z) => z.id === zoneId && z.active)
      if (!zone) return deny('Zona no disponible', 400)
      const adminFlag = await isAdminOrder(req, token)
      const settings = await getSettings(tenant)
      if (settings.ordersPaused && !adminFlag) {
        return deny('Estamos a full — pedidos pausados por ahora.', 503)
      }
      let schedule: string | undefined
      if (typeof scheduledFor === 'string' && scheduledFor.trim()) {
        const slot = scheduledFor.trim()
        if (!isHHMMInsideHours(slot, settings)) {
          return deny(`Horario no válido — programamos entregas entre ${formatHoursRange(settings.hoursOpen, settings.hoursClose)}.`, 400)
        }
        schedule = slot
      }
      if (!isOpenNowInLaPaz(settings) && !schedule && !adminFlag) {
        return deny(`Cerrado ahora — atendemos de ${formatHoursRange(settings.hoursOpen, settings.hoursClose)}.`, 503)
      }
      const activeNow = await activeOrdersToday(tenant)
      if (activeNow >= settings.capacity && !adminFlag) {
        return deny('Cocina a máxima capacidad — intenta en unos minutos.', 503)
      }

      const menu = await getMenu(tenant)
      const orderItems: OrderItem[] = []
      let subtotal = 0
      const soldOutSlugs: string[] = []
      const skipped: string[] = []
      for (const line of items) {
        const product = menu.find((p) => p.slug === line.slug && p.active)
        if (!product) return deny(`Producto no disponible: ${line.slug}`, 400)
        if (product.soldOut && !adminFlag) { soldOutSlugs.push(product.slug); skipped.push(product.name); continue }
        if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 20) return deny('Cantidad invalida', 400)
        const unit = lineUnitPrice(product, (line.mods || {}) as Record<string, string[]>)
        subtotal += unit * line.qty
        const modNames: string[] = []
        for (const g of product.groups || []) {
          for (const modId of (line.mods || {})[g.id] || []) {
            const mod = g.modifiers.find((m) => m.id === modId)
            if (mod) modNames.push(mod.price ? `${mod.name} (+Bs ${(mod.price / 100).toFixed(2)})` : mod.name)
          }
        }
        orderItems.push({ name: product.name, qty: line.qty, mods: modNames, notes: line.notes, lineTotal: unit * line.qty })
      }
      if (soldOutSlugs.length === items.length && !adminFlag) {
        return deny('Todo tu carrito está agotado. Actualiza el menú.', 400)
      }
      if (Array.isArray(upsells)) {
        for (const up of upsells) {
          const def = UPSELLS.find((u) => u.id === up.id && u.active)
          if (!def) continue
          const qty = Number.isInteger(up.qty) && up.qty >= 1 && up.qty <= 10 ? up.qty : 1
          subtotal += def.price * qty
          orderItems.push({ name: `${def.name} · ADD-ON`, qty, mods: [], lineTotal: def.price * qty })
        }
      }
      if (subtotal < ORDER_MIN) {
        return deny(`Pedido minimo Bs ${(ORDER_MIN / 100).toFixed(2)}`, 400)
      }
      let discount = 0
      let appliedPromo: string | undefined
      if (promoCode && typeof promoCode === 'string') {
        const check = await validatePromo(tenant, promoCode, subtotal)
        if (!adminFlag) {
          if (!check.ok) return deny(`Promo: ${check.reason}`, 400)
          discount = check.discount
          appliedPromo = check.promo!.code
        }
      }
      const deliveryFee = adminFlag ? 0 : zone.fee
      const total = Math.max(0, subtotal - discount) + deliveryFee
      const existing = await listOrders(tenant, 1000)
      const maxExisting = existing.reduce((m, o) => Math.max(m, parseInt(o.number.replace('CO-', ''), 10) || 0), 0)
      const nextNum = maxExisting + 1
      const number = `CO-${String(nextNum).padStart(4, '0')}`
      const order: Order = {
        number,
        createdAt: new Date().toISOString(),
        source: 'DIRECT',
        status: adminFlag ? 'RECEIVED' : schedule ? (paymentMethod === 'CASH' ? 'SCHEDULED' : 'PENDING_PAYMENT') : paymentMethod === 'CASH' ? 'RECEIVED' : 'PENDING_PAYMENT',
        paymentMethod,
        paymentStatus: adminFlag ? (paymentMethod === 'CASH' ? 'UNPAID' : 'PAID') : paymentMethod === 'CASH' ? 'UNPAID' : 'PENDING',
        customer: { firstName: customer.firstName.trim(), phone: customer.phone.trim() },
        scheduledFor: schedule,
        address: { district: zone.name, street: address.street.trim(), apartment: address.apartment?.trim(), reference: address.reference?.trim() },
        zoneId,
        items: orderItems,
        subtotal,
        deliveryFee,
        total,
        notes: notes?.trim() || undefined,
        promoCode: appliedPromo,
        discount: discount > 0 ? discount : undefined,
      }
      await createOrder(tenant, order)
      await recordSales(tenant, items.filter((l) => !soldOutSlugs.includes(l.slug)).map((l) => ({ slug: l.slug, qty: l.qty })))
      if (appliedPromo) await consumePromo(tenant, appliedPromo)
      return NextResponse.json({
        ok: true,
        number: order.number,
        status: order.status,
        waLink: adminFlag ? undefined : waLink(buildWhatsAppMessage(order, cfg), cfg),
        soldOutRemoved: skipped.length > 0 ? skipped : undefined,
      }, { status: 201 })
    } catch (e) {
      console.error('tenant order create error', e)
      return deny('Error al crear el pedido', 500)
    }
  }

  if (seg[0] === 'orders' && seg.length === 3 && seg[2] === 'claim') {
    const number = seg[1].toUpperCase()
    const order = await getOrder(tenant, number)
    if (!order) return deny('Pedido no encontrado', 404)
    if (order.paymentStatus === 'PAID') return NextResponse.json({ ok: true, already: true })
    if (order.status !== 'PENDING_PAYMENT' && order.paymentStatus !== 'PENDING') {
      return NextResponse.json({ ok: true, already: true })
    }
    const updated = await updateOrder(tenant, order.number, { status: 'PAYMENT_CLAIMED', paymentStatus: 'CLAIMED' })
    if (!updated) return deny('Pedido no encontrado', 404)
    return NextResponse.json({ ok: true, status: updated.status, paymentStatus: updated.paymentStatus })
  }

  // Admin login
  if (seg[0] === 'admin' && seg[1] === 'login') {
    const body = await req.json()
    const password = (body.password || '').trim()
    if (!token || password !== token) return deny('Contrasena incorrecta')
    return NextResponse.json({ ok: true, token })
  }

  if (seg[0] === 'promos' && seg[1] === 'validate' && seg.length === 2) {
    try {
      const body = await req.json()
      const code = typeof body.code === 'string' ? body.code : ''
      const subtotal = typeof body.subtotal === 'number' ? body.subtotal : 0
      if (!code.trim()) return NextResponse.json({ ok: false, discount: 0, reason: 'Ingresa un código' })
      const check = await validatePromo(tenant, code, subtotal)
      if (check.ok && check.promo) return NextResponse.json({ ok: true, discount: check.discount, code: check.promo.code })
      return NextResponse.json({ ok: false, discount: 0, reason: check.reason || 'Código no válido' })
    } catch {
      return NextResponse.json({ ok: false, discount: 0, reason: 'Error validando código' }, { status: 400 })
    }
  }

  /* ---------- ADMIN (auth) ---------- */
  const err = requireAdmin(req, token)
  if (err) return err

  if (seg[0] === 'admin' && seg[1] === 'promos') {
    const body = await req.json()
    const code = (body.code || '').trim().toUpperCase()
    if (!/^[A-Z0-9]{3,20}$/.test(code)) return deny('Código: 3-20 letras/números', 400)
    const type = body.type === 'FLAT' ? 'FLAT' : body.type === 'PERCENT' ? 'PERCENT' : null
    if (!type) return deny('Tipo inválido', 400)
    const value = Math.round(Number(body.value))
    if (!Number.isFinite(value) || value <= 0) return deny('Valor inválido', 400)
    const promo = {
      code, type, value,
      minSubtotal: Math.max(0, Math.round(Number(body.minSubtotal) || 0)),
      active: body.active !== false,
      maxUses: Math.max(0, Math.round(Number(body.maxUses) || 0)),
      usedCount: Math.max(0, Math.round(Number(body.usedCount) || 0)),
    }
    await savePromo(tenant, promo as never)
    return NextResponse.json({ ok: true })
  }

  return deny('Ruta desconocida', 404)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { tenant, admin } = await ctx.params
  const seg = admin || []
  const token = await adminToken(tenant)
  const cfg = await getTenant(tenant)
  if (!cfg) return deny('Tenant no encontrado', 404)
  const err = requireAdmin(req, token)
  if (err) return err

  // admin/orders/[number]
  if (seg[0] === 'admin' && seg[1] === 'orders' && seg[2]) {
    const number = seg[2].toUpperCase()
    const body = await req.json()
    const { status, paymentStatus } = body as { status?: string; paymentStatus?: string }
    const order = await getOrder(tenant, number)
    if (!order) return deny('Pedido no encontrado', 404)
    const ALLOWED: Record<string, string[]> = {
      PENDING_PAYMENT: ['PAYMENT_CLAIMED', 'RECEIVED', 'CANCELLED'],
      PAYMENT_CLAIMED: ['RECEIVED', 'CANCELLED'],
      SCHEDULED: ['RECEIVED', 'CANCELLED'],
      RECEIVED: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['DISPATCHED'],
      DISPATCHED: ['DELIVERED'],
      DELIVERED: [], CANCELLED: [],
    }
    const patch: Parameters<typeof updateOrder>[2] = {}
    if (status) {
      if (!(ALLOWED[order.status] || []).includes(status)) {
        return deny(`Transicion invalida: ${order.status} -> ${status}`, 400)
      }
      patch.status = status as never
    }
    if (paymentStatus) {
      if (!['PENDING', 'CLAIMED', 'PAID', 'UNPAID'].includes(paymentStatus)) return deny('paymentStatus invalido', 400)
      patch.paymentStatus = paymentStatus as never
    }
    const updated = await updateOrder(tenant, order.number, patch)
    return NextResponse.json(updated)
  }

  // admin/menu/[slug]
  if (seg[0] === 'admin' && seg[1] === 'menu' && seg[2]) {
    const slug = seg[2]
    const body = await req.json()
    const exists = (await getMenu(tenant)).some((p) => p.slug === slug)
    if (!exists) return deny('Producto no encontrado', 404)
    const patch: Record<string, unknown> = {}
    for (const key of ['active', 'name', 'short', 'long', 'price', 'image', 'proteinBadge', 'comboTag'] as const) {
      if (body[key] !== undefined) patch[key] = body[key]
    }
    if (Object.keys(patch).length > 0) await updateProduct(tenant, patch as never)
    if (typeof body.soldOut === 'boolean') await setSoldOut(tenant, slug, body.soldOut)
    if (typeof body.auto86Threshold === 'number') await setAuto86Threshold(tenant, slug, body.auto86Threshold)
    return NextResponse.json({ ok: true })
  }

  // admin/settings
  if (seg[0] === 'admin' && seg[1] === 'settings') {
    const body = await req.json()
    const current = await getSettings(tenant)
    const next = {
      ordersPaused: typeof body.ordersPaused === 'boolean' ? body.ordersPaused : current.ordersPaused,
      capacity: typeof body.capacity === 'number' ? Math.max(1, Math.min(50, body.capacity)) : current.capacity,
      hoursOpen: typeof body.hoursOpen === 'string' && isValidHHMM(body.hoursOpen) ? body.hoursOpen : current.hoursOpen,
      hoursClose: typeof body.hoursClose === 'string' && isValidHHMM(body.hoursClose) ? body.hoursClose : current.hoursClose,
      hoursEnabled: typeof body.hoursEnabled === 'boolean' ? body.hoursEnabled : current.hoursEnabled,
    }
    await saveSettings(tenant, next)
    return NextResponse.json(next)
  }

  return deny('Ruta desconocida', 404)
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { tenant, admin } = await ctx.params
  const seg = admin || []
  const token = await adminToken(tenant)
  const cfg = await getTenant(tenant)
  if (!cfg) return deny('Tenant no encontrado', 404)
  const err = requireAdmin(req, token)
  if (err) return err

  if (seg[0] === 'admin' && seg[1] === 'orders' && seg[2]) {
    const removed = await deleteOrder(tenant, seg[2].toUpperCase())
    if (removed === 0) return deny('Pedido no encontrado', 404)
    return NextResponse.json({ ok: true, removed })
  }

  if (seg[0] === 'admin' && seg[1] === 'promos') {
    const code = req.nextUrl.searchParams.get('code') || ''
    const ok = await deletePromo(tenant, code)
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 })
  }

  return deny('Ruta desconocida', 404)
}
