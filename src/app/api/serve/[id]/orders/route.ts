/* GET /api/serve/[id]/orders — admin: full order list (PIN-gated).
   Same contract as FV's admin orders endpoint. */

import { NextRequest } from 'next/server';
import { listOrders } from '@/lib/serve/store';
import { json, requireTenantAdmin } from '@/lib/serve/api-auth';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const auth = await requireTenantAdmin(req, id);
  if (!auth.ok) return auth.res;
  const orders = await listOrders(id);
  return json({ ok: true, orders });
}