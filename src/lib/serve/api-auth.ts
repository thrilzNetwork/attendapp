/* Attenda Serve — API helper: tenant PIN auth + JSON responses.
   Same pattern as FV's x-admin-token, scoped per tenant. */

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from './store';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Resolve tenant from the URL and verify its admin PIN header. */
export async function requireTenantAdmin(
  req: NextRequest,
  id: string,
): Promise<{ ok: true; tenantId: string } | { ok: false; res: NextResponse }> {
  const tenant = await getTenant(id);
  if (!tenant) return { ok: false, res: json({ ok: false, error: 'Tenant no encontrado' }, 404) };
  const pin = req.headers.get('x-tenant-pin') || '';
  if (!pin || pin !== tenant.adminPin) {
    return { ok: false, res: json({ ok: false, error: 'PIN incorrecto' }, 401) };
  }
  return { ok: true, tenantId: id };
}