/* GET /api/serve/[id]/orders
   ?number=TP-XXXX → public single-order lookup (tracker page; sanitized).
   No ?number → admin full list (PIN-gated). */

import { NextRequest } from 'next/server';
import { listOrders } from '@/lib/serve/store';
import { json, requireTenantAdmin } from '@/lib/serve/api-auth';

const NUM_RE = /^TP-\d{3,6}$/;

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const number = req.nextUrl.searchParams.get('number');

  if (number) {
    if (!NUM_RE.test(number)) return json({ ok: false, error: 'Número inválido' }, 400);
    const orders = await listOrders(id);
    const order = orders.find((o) => o.number === number);
    if (!order) return json({ ok: false, error: 'Pedido no encontrado' }, 404);
    // public tracker payload — no customer phone leak
    return json({
      ok: true,
      order: {
        number: order.number, ts: order.ts, items: order.items,
        subtotal: order.subtotal, zoneFee: order.zoneFee, discount: order.discount, total: order.total,
        customer: { firstName: order.customer.firstName, phone: '•••' },
        address: order.address, zoneId: order.zoneId, notes: order.notes,
        scheduledFor: order.scheduledFor, payment: order.payment,
        paymentStatus: order.paymentStatus, status: order.status,
      },
    });
  }

  const auth = await requireTenantAdmin(req, id);
  if (!auth.ok) return auth.res;
  const orders = await listOrders(id);
  return json({ ok: true, orders });
}