/* Attenda Serve growth-network API.
   POST /api/serve/growth          → partner signup (affiliate | market_partner)
   GET  /api/serve/growth?code=    → resolve referral code (public: kind+country only)
   GET  /api/serve/growth?id=      → partner dashboard rollup (requires ?pin= NOT needed — id is unguessable)
   PATCH /api/serve/growth         → approve/suspend partner (superadmin only)
*/

import { NextRequest, NextResponse } from 'next/server';
import {
  createPartner, findPartnerByCode, getPartner, updatePartnerStatus,
  listPartners, partnerStats,
} from '@/lib/serve/growth';
import { listTenants } from '@/lib/serve/store';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const kind = b?.kind === 'market_partner' ? 'market_partner' : 'affiliate';
    const name = typeof b?.name === 'string' ? b.name.trim() : '';
    const email = typeof b?.email === 'string' ? b.email.trim() : '';
    if (!name || !email) return json({ ok: false, error: 'Nombre y email requeridos' }, 400);

    const country = typeof b?.country === 'string' ? b.country.trim().toUpperCase().slice(0, 2) : '';
    const mpCode = typeof b?.marketPartnerCode === 'string' ? b.marketPartnerCode.trim().toUpperCase() : '';
    let marketPartnerId: string | undefined;
    if (mpCode) {
      const mp = await findPartnerByCode(mpCode);
      if (mp && mp.kind === 'market_partner') marketPartnerId = mp.id;
    }

    const partner = await createPartner({
      kind, name, email,
      phone: typeof b?.phone === 'string' ? b.phone : '',
      country, city: typeof b?.city === 'string' ? b.city : undefined,
      marketPartnerId,
    });

    return json({ ok: true, partner: { id: partner.id, code: partner.code, kind: partner.kind, status: partner.status } });
  } catch {
    return json({ ok: false, error: 'Error registrando el partner' }, 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const id = req.nextUrl.searchParams.get('id');

    if (code) {
      const p = await findPartnerByCode(code);
      if (!p || p.status === 'suspended') return json({ ok: false, error: 'Código no válido' }, 404);
      // public: only what the wizard needs
      return json({ ok: true, partner: { code: p.code, kind: p.kind, name: p.name, country: p.country } });
    }

    if (id) {
      const p = await getPartner(id);
      if (!p) return json({ ok: false, error: 'Partner no encontrado' }, 404);
      const tenants = (await listTenants()).map((t) => ({
        id: t.id, status: t.status, referral: t.referral ?? null,
      }));
      const stats = await partnerStats(id, tenants);
      const all = await listPartners();
      const recruits = all.filter((x) => x.marketPartnerId === id).length;
      return json({ ok: true, partner: { id: p.id, name: p.name, kind: p.kind, code: p.code, country: p.country, status: p.status }, stats, recruits });
    }

    return json({ ok: false, error: 'code o id requerido' }, 400);
  } catch {
    return json({ ok: false, error: 'Error' }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  // approval is a superadmin action — requires X-Attenda-Key matching env
  const key = req.headers.get('x-attenda-key') || '';
  if (!process.env.ATTENDA_ADMIN_KEY || key !== process.env.ATTENDA_ADMIN_KEY) {
    return json({ ok: false, error: 'No autorizado' }, 401);
  }
  try {
    const b = await req.json();
    const id = typeof b?.id === 'string' ? b.id : '';
    const status = b?.status;
    if (!id || !['pending', 'approved', 'suspended'].includes(status)) {
      return json({ ok: false, error: 'id y status requeridos' }, 400);
    }
    await updatePartnerStatus(id, status);
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'Error' }, 500);
  }
}