import { NextRequest, NextResponse } from 'next/server'
import { getMenu, createOrder, getSettings, listOrders, recordSales, validatePromo, consumePromo, activeOrdersToday } from '@/lib/tenant/store'
import { Order, OrderItem, CartLine } from '@/lib/tenant/types'
import { getTenant } from '@/lib/tenant/registry'
import { SEED_ZONES, SEED_ORDER_MIN } from '@/lib/tenant/fukin-engine/seed-menu'
import { isOpenNowInLaPaz, isHHMMInsideHours, formatHoursRange } from '@/lib/tenant/fukin-engine/hours'
import { lineUnitPrice } from '@/lib/tenant/fukin-engine/pricing'
import { UPSELLS } from '@/lib/tenant/fukin-engine/upsells'  // per-tenant upsells later
import { buildWhatsAppMessage, waLink } from '@/lib/tenant/fukin-engine/whatsapp'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  const cfg = await getTenant(tenant)
  if (!cfg) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  try {
    const body = await req.json()
    const { customer, address, zoneId, paymentMethod, notes, items, promoCode, upsells, scheduledFor } = body as {
      customer: { firstName: string; phone: string }
      address: { street: string; apartment?: string; reference?: string }
      zoneId: string
      paymentMethod: 'TRANSFERENCIA_QR' | 'CASH'
      notes?: string
      items: CartLine[]
      promoCode?: string
      upsells?: { id: string; qty: number }[]
      /** 'HH:MM' inside opening hours — buy now, deliver later (e.g. order at noon for 20:30) */
      scheduledFor?: string
    }

    if (!customer?.firstName || !customer?.phone || !address?.street || !Array.isArray(items) || !items.length) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const zone = SEED_ZONES.find((z) => z.id === zoneId && z.active)
    if (!zone) return NextResponse.json({ error: 'Zona no disponible' }, { status: 400 })

    const settings = await getSettings(tenant, )
    if (settings.ordersPaused) {
      return NextResponse.json({ error: 'Estamos a full — pedidos pausados por ahora.' }, { status: 503 })
    }
    // Scheduled pre-orders (buy in advance for a slot inside opening hours) skip the open-now gate.
    let schedule: string | undefined
    if (typeof scheduledFor === 'string' && scheduledFor.trim()) {
      const slot = scheduledFor.trim()
      if (!isHHMMInsideHours(slot, settings)) {
        return NextResponse.json(
          { error: `Horario no válido — programamos entregas entre ${formatHoursRange(settings.hoursOpen, settings.hoursClose)}.` },
          { status: 400 },
        )
      }
      schedule = slot
    }
    if (!isOpenNowInLaPaz(settings) && !schedule) {
      return NextResponse.json(
        { error: `Cerrado ahora — atendemos todos los días de ${formatHoursRange(settings.hoursOpen, settings.hoursClose)}.` },
        { status: 503 },
      )
    }
    const activeNow = await activeOrdersToday(tenant, )
    if (activeNow >= settings.capacity) {
      return NextResponse.json({ error: 'Cocina a máxima capacidad — intenta en unos minutos.' }, { status: 503 })
    }

    const menu = await getMenu(tenant, )
    const orderItems: OrderItem[] = []
    let subtotal = 0
    const soldOutSlugs: string[] = []
    const skippedSoldOutNames: string[] = []

    for (const line of items) {
      const product = menu.find((p) => p.slug === line.slug && p.active)
      if (!product) return NextResponse.json({ error: `Producto no disponible: ${line.slug}` }, { status: 400 })
      if (product.soldOut) {
        soldOutSlugs.push(product.slug)
        skippedSoldOutNames.push(product.name)
        continue
      }
      if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 20) {
        return NextResponse.json({ error: 'Cantidad invalida' }, { status: 400 })
      }
      const unit = lineUnitPrice(product, line.mods || {})
      subtotal += unit * line.qty
      const modNames: string[] = []
      for (const g of product.groups) {
        for (const modId of (line.mods || {})[g.id] || []) {
          const mod = g.modifiers.find((m) => m.id === modId)
          if (mod) {
            const skipNeutral = !mod.price && (mod.id.startsWith('c-') || mod.id === 'sp-ninguna' || (g.id !== 'sabor' && !mod.id.startsWith('sp-')))
            if (!skipNeutral) modNames.push(mod.price ? `${mod.name} (+Bs${(mod.price / 100).toFixed(2)})` : mod.name)
          }
        }
      }
      orderItems.push({ name: product.name, qty: line.qty, mods: modNames, notes: line.notes, lineTotal: unit * line.qty })
    }

    if (soldOutSlugs.length === items.length) {
      return NextResponse.json({ error: 'Todo tu carrito está agotado. Actualiza el menú.' }, { status: 400 })
    }

    // Upsells: server-priced add-ons shown in checkout summary
    if (Array.isArray(upsells)) {
      for (const up of upsells) {
        const def = UPSELLS.find((u) => u.id === up.id && u.active)
        if (!def) continue
        const qty = Number.isInteger(up.qty) && up.qty >= 1 && up.qty <= 10 ? up.qty : 1
        subtotal += def.price * qty
        orderItems.push({ name: `${def.name} · ADD-ON`, qty, mods: [], lineTotal: def.price * qty, kind: 'upsell' })
      }
    }

    if (subtotal < SEED_ORDER_MIN) {
      return NextResponse.json({ error: `Pedido minimo Bs ${(SEED_ORDER_MIN / 100).toFixed(2)}` }, { status: 400 })
    }

    // Promo: validated server-side only — the client price is never trusted
    let discount = 0
    let appliedPromo: string | undefined
    if (promoCode && typeof promoCode === 'string') {
      const check = await validatePromo(tenant, promoCode, subtotal)
      if (!check.ok) return NextResponse.json({ error: `Promo: ${check.reason}` }, { status: 400 })
      discount = check.discount
      appliedPromo = check.promo!.code
    }

    const deliveryFee = zone.fee
    const total = Math.max(0, subtotal - discount) + deliveryFee
    const existing = await listOrders(tenant, 1000)
    const maxExisting = existing.reduce((m, o) => Math.max(m, parseInt(o.number.replace('CO-', ''), 10) || 0), 141)
    const nextNum = maxExisting + 1
    const number = `CO-${String(nextNum).padStart(4, '0')}`

    const order: Order = {
      number,
      createdAt: new Date().toISOString(),
      source: 'DIRECT',
      // Pre-orders hold in SCHEDULED until their slot, then auto-flow to RECEIVED (kitchen).
      // Transferencia orders stay PENDING_PAYMENT until paid; materializeScheduled flips paid/cash
      // SCHEDULED orders to RECEIVED when the slot arrives.
      status: schedule ? (paymentMethod === 'CASH' ? 'SCHEDULED' : 'PENDING_PAYMENT') : paymentMethod === 'CASH' ? 'RECEIVED' : 'PENDING_PAYMENT',
      paymentMethod,
      paymentStatus: paymentMethod === 'CASH' ? 'UNPAID' : 'PENDING',
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
    // Record sold units AFTER the order is durably saved (products only, not upsells)
    await recordSales(tenant, items.filter((l) => !soldOutSlugs.includes(l.slug)).map((l) => ({ slug: l.slug, qty: l.qty })))
    if (appliedPromo) await consumePromo(tenant, appliedPromo)

    const message = buildWhatsAppMessage(order, cfg)
    return NextResponse.json(
      {
        ok: true,
        number: order.number,
        status: order.status,
        waLink: waLink(message, cfg),
        soldOutRemoved: skippedSoldOutNames.length > 0 ? skippedSoldOutNames : undefined,
      },
      { status: 201 },
    )
  } catch (e) {
    console.error('order create error', e)
    return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 })
  }
}