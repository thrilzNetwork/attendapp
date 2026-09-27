/* POST /api/serve/tenant — create a tenant (demo or official) from the wizard.
   Seeds menu server-side; the store exists immediately. */

import { NextRequest } from 'next/server';
import { createTenant } from '@/lib/serve/store';
import { json } from '@/lib/serve/api-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return json({ ok: false, error: 'Falta el nombre del negocio' }, 400);

    const products = Array.isArray(body?.products)
      ? body.products
          .filter((p: { name?: unknown }) => p && typeof p.name === 'string' && p.name.trim())
          .slice(0, 24)
          .map((p: { name: string; price?: unknown }) => ({ name: String(p.name).slice(0, 60), price: Number(p.price) || 0 }))
      : [];

    const tenant = await createTenant({
      name,
      type: typeof body?.type === 'string' ? body.type : 'Negocio local',
      city: typeof body?.city === 'string' ? body.city : '',
      phone: typeof body?.phone === 'string' ? body.phone : '',
      email: typeof body?.email === 'string' ? body.email : '',
      logo: typeof body?.logo === 'string' ? body.logo : null,
      tagline: typeof body?.tagline === 'string' ? body.tagline : '',
      products,
      status: body?.status === 'official' ? 'official' : 'demo',
    });

    return json({ ok: true, tenant: { id: tenant.id, adminPin: tenant.adminPin, name: tenant.name, status: tenant.status } });
  } catch {
    return json({ ok: false, error: 'Error creando el tenant' }, 500);
  }
}