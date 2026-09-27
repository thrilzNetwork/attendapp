/* GET  /api/serve/[id] — public read: tenant, menu, open state.
   POST /api/serve/[id]/order — create order (FV machine: RECIBIDO, TP-XXXX).
   PATCH /api/serve/[id]/order — admin: advance status / payment / cancel.
   PATCH /api/serve/[id]/menu — admin: edit products.
   PATCH /api/serve/[id]/settings — admin: hours, pauses, after-hours. */

import { NextRequest } from 'next/server';
import {
  getTenant, getMenu, listOrders, saveOrders, nextOrderNumber,
  getSettings, saveSettings, saveMenu,
} from '@/lib/serve/store';
import { isServeOpen, canCancel, nextServeStatus, type ServeOrder } from '@/lib/serve/types';
import { json, requireTenantAdmin } from '@/lib/serve/api-auth';

/* ── GET: public bundle for tenant pages ─────────────────────── */
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const tenant = await getTenant(id);
  if (!tenant) return json({ ok: false, error: 'Tenant no encontrado' }, 404);
  const [menu, settings] = await Promise.all([getMenu(id), getSettings(id)]);
  return json({
    ok: true,
    tenant: {
      id: tenant.id, name: tenant.name, type: tenant.type, city: tenant.city,
      phone: tenant.phone, logo: tenant.logo, tagline: tenant.tagline, status: tenant.status,
    },
    menu: menu.filter((p) => p.available),
    open: isServeOpen(settings),
  });
}

/* ── POST: create an order (customer) ────────────────────────── */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const tenant = await getTenant(id);
  if (!tenant) return json({ ok: false, error: 'Tenant no encontrado' }, 404);

  const settings = await getSettings(id);
  if (!isServeOpen(settings)) {
    return json({ ok: false, error: 'Cerrado ahora' }, 503);
  }

  let body: { items?: { slug?: string; name?: string; qty?: number; price?: number }[]; payment?: string; customerName?: string; customerPhone?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Body inválido' }, 400);
  }

  const items = (Array.isArray(body.items) ? body.items : [])
    .filter((i) => i && (typeof i.slug === 'string' || typeof i.name === 'string'))
    .slice(0, 30)
    .map((i) => ({
      slug: String(i.slug || ''),
      name: String(i.name || '').slice(0, 80),
      qty: Math.max(1, Math.min(50, Number(i.qty) || 1)),
      price: Math.max(0, Number(i.price) || 0),
    }));
  if (!items.length) return json({ ok: false, error: 'Carrito vacío' }, 400);

  // price server-side from the menu — never trust client totals
  const menu = await getMenu(id);
  for (const it of items) {
    const p = menu.find((x) => x.slug === it.slug && x.available);
    if (!p) return json({ ok: false, error: `Producto no disponible: ${it.slug}` }, 400);
    it.price = p.price;
    if (!it.name) it.name = p.name;
  }
  const total = items.reduce((a, i) => a + i.price * i.qty, 0);

  const order: ServeOrder = {
    id: 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    number: await nextOrderNumber(id),
    items,
    total,
    status: 'RECIBIDO',
    payment: body.payment === 'EFECTIVO' ? 'EFECTIVO' : 'YAPE',
    paymentStatus: body.payment === 'EFECTIVO' ? 'PAGADO' : 'PENDIENTE',
    customerName: String(body.customerName || '').slice(0, 60),
    customerPhone: String(body.customerPhone || '').replace(/[^0-9]/g, '').slice(0, 16),
    note: typeof body.note === 'string' ? body.note.slice(0, 200) : undefined,
    ts: Date.now(),
  };

  const all = await listOrders(id);
  all.unshift(order);
  await saveOrders(id, all.slice(0, 300));

  // WhatsApp deep link with the FV-formatted message
  const waNumber = tenant.phone || '';
  const lines = order.items.map((i) => `• ${i.qty}x ${i.name} — S/ ${(i.price * i.qty).toFixed(2)}`).join('\n');
  const waText = `*${tenant.name.toUpperCase()}* — NUEVO PEDIDO ${order.number}\n━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━\n*TOTAL: S/ ${total.toFixed(2)}*${order.note ? `\nNota: ${order.note}` : ''}\nPago: ${order.payment}`;
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}` : null;

  return json({ ok: true, order: { number: order.number, total: order.total, status: order.status }, waLink }, 201);
}

/* ── PATCH: admin actions (PIN-gated) ────────────────────────── */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const auth = await requireTenantAdmin(req, id);
  if (!auth.ok) return auth.res;

  let body: { number?: string; action?: string; status?: string; paymentStatus?: string; products?: { slug: string; name?: string; price?: number; available?: boolean }[]; settings?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Body inválido' }, 400);
  }

  /* menu edits */
  if (Array.isArray(body.products)) {
    const menu = await getMenu(id);
    for (const patch of body.products.slice(0, 50)) {
      const p = menu.find((x) => x.slug === patch.slug);
      if (!p) continue;
      if (typeof patch.name === 'string' && patch.name.trim()) p.name = patch.name.trim().slice(0, 60);
      if (typeof patch.price === 'number' && patch.price >= 0) p.price = Math.round(patch.price * 100) / 100;
      if (patch.available !== undefined) p.available = !!patch.available;
    }
    await saveMenu(id, menu);
    return json({ ok: true, menu });
  }

  /* settings edits */
  if (body.settings) {
    const next = await saveSettings(id, body.settings as Record<string, never>);
    return json({ ok: true, settings: next, open: isServeOpen(next) });
  }

  /* order actions */
  if (body.number && body.action) {
    const all = await listOrders(id);
    const order = all.find((o) => o.number === body.number);
    if (!order) return json({ ok: false, error: 'Pedido no encontrado' }, 404);

    if (body.action === 'advance') {
      if (order.status === 'ENTREGADO' || order.status === 'CANCELADO') {
        return json({ ok: false, error: `Transición inválida: ${order.status}` }, 400);
      }
      order.status = nextServeStatus(order.status);
    } else if (body.action === 'cancel') {
      if (!canCancel(order.status)) return json({ ok: false, error: `No se puede cancelar: ${order.status}` }, 400);
      order.status = 'CANCELADO';
    } else if (body.action === 'payment') {
      order.paymentStatus = body.paymentStatus === 'PAGADO' ? 'PAGADO' : 'PENDIENTE';
    } else {
      return json({ ok: false, error: 'Acción inválida' }, 400);
    }
    await saveOrders(id, all);
    return json({ ok: true, order: { number: order.number, status: order.status, paymentStatus: order.paymentStatus } });
  }

  return json({ ok: false, error: 'Acción no especificada' }, 400);
}