/* Attenda Serve API — GET public bundle, POST order, PATCH admin.
   FV contracts: server-authoritative pricing, FV machine, PIN admin. */

import { NextRequest, NextResponse } from 'next/server';
import { getTenant, readMenu, writeMenu, readSettings, writeSettings, listOrders, writeOrders, isOpenNow, canAdvance } from '@/lib/serve/store';
import { createOrderForTenant } from '@/lib/serve/orders';
import { ServeSettings, SERVE_STATUSES } from '@/lib/serve/types';

type ServeOrderAddress = { street: string; apartment?: string; reference?: string };

export const dynamic = 'force-dynamic';

function j(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function unauthorized() {
  return j({ ok: false, error: 'PIN inválido' }, 401);
}

async function authed(req: NextRequest, id: string): Promise<{ ok: boolean; pin?: string }> {
  const tenant = await getTenant(id);
  if (!tenant) return { ok: false };
  const pin = req.headers.get('x-tenant-pin') || '';
  return { ok: pin === tenant.adminPin, pin };
}

/* ── GET: public bundle ─────────────────────── */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const tenant = await getTenant(id);
  if (!tenant) return j({ ok: false, error: 'Tenant no encontrado' }, 404);
  const [menu, settings, orders] = await Promise.all([readMenu(id), readSettings(id), listOrders(id)]);
  return j({
    ok: true,
    tenant: {
      id: tenant.id, name: tenant.name, type: tenant.type, city: tenant.city,
      phone: tenant.phone, email: tenant.email, logo: tenant.logo,
      tagline: tenant.tagline, status: tenant.status,
    },
    menu,
    settings: {
      hoursEnabled: settings.hoursEnabled,
      hoursOpen: settings.hoursOpen,
      hoursClose: settings.hoursClose,
      allowAfterHours: settings.allowAfterHours,
      ordersPaused: settings.ordersPaused,
      etaMin: settings.etaMin,
      etaMax: settings.etaMax,
      orderMin: settings.orderMin,
      zones: settings.zones,
      promoCode: settings.promoCode,
      promoDiscount: settings.promoDiscount,
      yapeNumber: settings.yapeNumber,
      yapeHolder: settings.yapeHolder,
    },
    open: isOpenNow(settings),
    serverTime: Date.now(),
  });
}

/* ── POST: create order (FV engine) ─────────── */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const tenant = await getTenant(id);
  if (!tenant) return j({ ok: false, error: 'Tenant no encontrado' }, 404);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: 'JSON inválido' }, 400);
  }
  const result = await createOrderForTenant(tenant, {
    items: (body.items as { slug: string; qty: number }[]) || [],
    zoneId: (body.zoneId as string) ?? null,
    payment: body.payment === 'CASH' ? 'CASH' : 'YAPE_PLIN',
    customer: (body.customer as { firstName: string; phone: string }) || { firstName: 'Cliente', phone: '' },
    address: (body.address as ServeOrderAddress) || null,
    notes: typeof body.notes === 'string' ? body.notes : undefined,
    scheduledFor: typeof body.scheduledFor === 'string' ? body.scheduledFor : undefined,
    promoCode: typeof body.promoCode === 'string' ? body.promoCode : undefined,
  });
  if (!result.ok) return j({ ok: false, error: result.error }, result.code);
  return j({ ok: true, order: result.order, waLink: result.waLink }, 201);
}

/* ── PATCH: admin actions (PIN-gated) ───────── */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const auth = await authed(req, id);
  if (!auth.ok) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: 'JSON inválido' }, 400);
  }

  // order actions
  if (typeof body.number === 'string') {
    const orders = await listOrders(id);
    const order = orders.find((o) => o.number === body.number);
    if (!order) return j({ ok: false, error: 'Pedido no encontrado' }, 404);
    const action = String(body.action || '');
    if (action === 'advance') {
      const next = canAdvance(order.status as (typeof SERVE_STATUSES)[number]);
      if (!next) return j({ ok: false, error: 'Estado terminal' }, 400);
      order.status = next;
      if (next === 'RECEIVED' && order.payment === 'YAPE_PLIN' && order.paymentStatus === 'PENDING_PAYMENT') {
        order.paymentStatus = 'CLAIMED';
      }
    } else if (action === 'cancel') {
      const i = (SERVE_STATUSES as readonly string[]).indexOf(order.status);
      if (i < 0 || order.status === 'DELIVERED') return j({ ok: false, error: 'No se puede cancelar' }, 400);
      order.status = 'CANCELLED';
    } else if (action === 'payment') {
      const ps = String(body.paymentStatus || '');
      if (ps === 'CLAIMED' || ps === 'PAID' || ps === 'PENDING_PAYMENT') order.paymentStatus = ps;
      else return j({ ok: false, error: 'paymentStatus inválido' }, 400);
    } else {
      return j({ ok: false, error: 'Acción desconocida' }, 400);
    }
    await writeOrders(id, orders);
    return j({ ok: true, order });
  }

  // menu edits
  if (Array.isArray(body.products)) {
    const menu = await readMenu(id);
    for (const patch of body.products as { slug: string; name?: string; price?: number; active?: boolean; sortOrder?: number }[]) {
      const p = menu.find((m) => m.slug === patch.slug);
      if (!p) continue;
      if (typeof patch.name === 'string' && patch.name.trim()) p.name = patch.name.trim();
      if (typeof patch.price === 'number' && patch.price >= 0) p.price = Math.round(patch.price);
      if (typeof patch.active === 'boolean') p.active = patch.active;
      if (typeof patch.sortOrder === 'number') p.sortOrder = patch.sortOrder;
    }
    await writeMenu(id, menu);
    return j({ ok: true, menu });
  }

  // settings
  if (body.settings && typeof body.settings === 'object') {
    const current = await readSettings(id);
    const s = body.settings as Partial<ServeSettings>;
    if (typeof s.hoursEnabled === 'boolean') current.hoursEnabled = s.hoursEnabled;
    if (typeof s.hoursOpen === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.hoursOpen)) current.hoursOpen = s.hoursOpen;
    if (typeof s.hoursClose === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.hoursClose)) current.hoursClose = s.hoursClose;
    if (typeof s.allowAfterHours === 'boolean') current.allowAfterHours = s.allowAfterHours;
    if (typeof s.ordersPaused === 'boolean') current.ordersPaused = s.ordersPaused;
    if (typeof s.etaMin === 'number') current.etaMin = Math.max(0, Math.min(180, s.etaMin));
    if (typeof s.etaMax === 'number') current.etaMax = Math.max(0, Math.min(180, s.etaMax));
    if (typeof s.orderMin === 'number' && s.orderMin >= 0) current.orderMin = Math.round(s.orderMin);
    if (Array.isArray(s.zones)) current.zones = s.zones.slice(0, 6);
    if (typeof s.yapeNumber === 'string') current.yapeNumber = s.yapeNumber.replace(/[^0-9]/g, '').slice(0, 15);
    if (typeof s.yapeHolder === 'string') current.yapeHolder = s.yapeHolder.slice(0, 40);
    if (typeof s.promoCode === 'string') current.promoCode = s.promoCode.trim().toUpperCase().slice(0, 24);
    if (typeof s.promoDiscount === 'number' && s.promoDiscount >= 0) current.promoDiscount = Math.round(s.promoDiscount);
    await writeSettings(id, current);
    return j({ ok: true, settings: current, open: isOpenNow(current) });
  }

  return j({ ok: false, error: 'Nada que actualizar' }, 400);
}
