/* Attenda Serve — FV-style order creation engine (multi-tenant).
   Lives in its own module so the API route stays thin. */

import {
  ServeProduct, ServeOrder, ServeSettings, ServeTenant,
} from './types';
import { readMenu, readSettings, listOrders, writeOrders, nextOrderNumber, isOpenNow } from './store';

export type CreateOrderInput = {
  items: { slug: string; qty: number }[];
  zoneId: string | null; // null = retiro en tienda
  payment: 'YAPE_PLIN' | 'CASH';
  customer: { firstName: string; phone: string };
  address?: { street: string; apartment?: string; reference?: string } | null;
  notes?: string;
  scheduledFor?: string; // 'HH:MM' when programado
  promoCode?: string;
};

export type CreateOrderResult =
  | { ok: true; order: ServeOrder; waLink: string | null }
  | { ok: false; code: number; error: string };

export function checkOpen(settings: ServeSettings): boolean {
  return isOpenNow(settings);
}

export async function createOrderForTenant(tenant: ServeTenant, input: CreateOrderInput): Promise<CreateOrderResult> {
  const settings = await readSettings(tenant.id);
  if (settings.ordersPaused) return { ok: false, code: 503, error: 'Pedidos pausados por ahora' };

  const closedNow = !isOpenNow(settings);
  if (closedNow && !settings.allowAfterHours && !input.scheduledFor) {
    return { ok: false, code: 503, error: 'Cerrado ahora' };
  }

  const menu = await readMenu(tenant.id);
  const items = (input.items || [])
    .map((it) => {
      const p = menu.find((m) => m.slug === it.slug && m.active);
      if (!p) return null;
      const qty = Math.max(1, Math.min(99, Math.floor(it.qty)));
      return { slug: p.slug, name: p.name, qty, price: p.price };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (!items.length) return { ok: false, code: 400, error: 'Carrito vacío' };

  const subtotal = items.reduce((a, x) => a + x.price * x.qty, 0);
  if (settings.orderMin > 0 && subtotal < settings.orderMin) {
    return { ok: false, code: 400, error: `Mínimo de pedido S/ ${(settings.orderMin / 100).toFixed(2)}` };
  }

  // zone fee — only if the customer picked a real delivery zone (not pickup)
  const zone = input.zoneId ? settings.zones.find((z) => z.id === input.zoneId) : null;
  if (input.zoneId && !zone) return { ok: false, code: 400, error: 'Zona no válida' };
  if (zone && zone.id !== 'pickup' && !(input.address && input.address.street)) {
    return { ok: false, code: 400, error: 'Falta la dirección' };
  }
  const zoneFee = zone ? zone.fee : 0;

  // promo
  let discount = 0;
  if (input.promoCode && settings.promoCode && input.promoCode.toUpperCase() === settings.promoCode.toUpperCase()) {
    discount = Math.min(settings.promoDiscount, subtotal);
  }

  const total = Math.max(0, subtotal - discount) + zoneFee;
  if (input.payment === 'YAPE_PLIN' && (!settings.yapeNumber || !settings.yapeHolder)) {
    // demo tenants may not have Yape configured yet — fall back to CASH semantics
    return { ok: false, code: 400, error: 'Yape no configurado para esta demo' };
  }

  const orders = await listOrders(tenant.id);
  const order: ServeOrder = {
    number: nextOrderNumber(orders),
    ts: Date.now(),
    items,
    subtotal,
    zoneFee,
    discount,
    total,
    customer: { firstName: input.customer.firstName.trim(), phone: input.customer.phone.replace(/[^0-9]/g, '') },
    address: input.address ?? null,
    zoneId: input.zoneId ?? null,
    notes: input.notes?.trim() || undefined,
    scheduledFor: input.scheduledFor || undefined,
    payment: input.payment,
    paymentStatus: input.payment === 'CASH' ? 'PAID' : 'PENDING_PAYMENT',
    status: 'PENDING_PAYMENT',
  };
  orders.push(order);
  await writeOrders(tenant.id, orders);

  const waLink = tenant.phone
    ? `https://wa.me/${tenant.phone}?text=${encodeURIComponent(waText(tenant, order, settings))}`
    : null;
  return { ok: true, order, waLink };
}

export function waText(tenant: ServeTenant, order: ServeOrder, settings: ServeSettings): string {
  const lines: string[] = [];
  lines.push(`*NUEVO PEDIDO ${order.number}* — ${tenant.name}`);
  for (const it of order.items) lines.push(`${it.qty}x ${it.name} — S/ ${((it.price * it.qty) / 100).toFixed(2)}`);
  lines.push('');
  if (order.discount > 0) lines.push(`Descuento: -S/ ${(order.discount / 100).toFixed(2)}`);
  if (order.zoneFee > 0) lines.push(`Delivery: S/ ${(order.zoneFee / 100).toFixed(2)}`);
  lines.push(`*TOTAL: S/ ${(order.total / 100).toFixed(2)}*`);
  lines.push('');
  lines.push(`Cliente: ${order.customer.firstName} (${order.customer.phone})`);
  if (order.address && order.address.street) {
    lines.push(`Dirección: ${order.address.street}${order.address.apartment ? ' ' + order.address.apartment : ''}`);
    if (order.address.reference) lines.push(`Ref: ${order.address.reference}`);
  } else {
    lines.push('Modalidad: Retiro en tienda');
  }
  if (order.scheduledFor) lines.push(`Entrega programada: ${order.scheduledFor}`);
  if (order.notes) lines.push(`Notas: ${order.notes}`);
  lines.push(`Pago: ${order.payment === 'CASH' ? 'Efectivo' : 'Yape/Plin'}`);
  return lines.join('\n');
}