import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';
import { notifyNewPartner } from '@/lib/notify';

export const dynamic = 'force-dynamic';

/**
 * Public partnerships API — B2B partner intake for Attenda-level relationships
 * (procurement platforms like Reeco, distributors, tech & service companies).
 *
 * These are NOT hotel vendors (Sysco, restaurants, experiences) — those live
 * in the per-property Partners marketplace. Corporate partners plug into
 * ALL client properties at once.
 *
 * POST (public): apply to partner — rate-limited, honeypot-protected.
 * GET (super admin): full applications listing.
 * PATCH (super admin): review actions — status/rating/notes.
 */

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const cleanArr = (v: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(v)
    ? v.filter((s) => typeof s === 'string').map((s) => s.trim().slice(0, maxLen)).filter(Boolean).slice(0, maxItems)
    : [];

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

// --- POST: public application ----------------------------------------------

export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin();

  const ip = clientIp(req);
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db
    .from('corporate_partners')
    .select('id', { count: 'exact', head: true })
    .eq('source_ip', ip)
    .gte('created_at', tenMinAgo);
  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Too many applications from this network. Try again later.' },
      { status: 429 }
    );
  }

  const b = await req.json().catch(() => ({}));

  // Honeypot: bots fill every field; humans never see this one.
  if (clean(b.website_url, 100)) {
    return NextResponse.json({ ok: true, hidden: true }, { status: 200 });
  }

  const companyName = clean(b.companyName, 160);
  const contactName = clean(b.contactName, 120);
  const email = clean(b.email, 200).toLowerCase();
  if (!companyName || !contactName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: 'Company, contact name, and a valid email are required.' },
      { status: 400 }
    );
  }

  const payload = {
    company_name: companyName,
    contact_name: contactName,
    email,
    phone: clean(b.phone, 40) || null,
    website: clean(b.website, 200) || null,
    category: clean(b.category, 80) || null,
    offering: clean(b.offering, 1000) || null,
    coverage: clean(b.coverage, 200) || null,
    scale_readiness: clean(b.scaleReadiness, 120) || null,
    integrations: cleanArr(b.integrations, 12, 80),
    track_record: clean(b.trackRecord, 2000) || null,
    why_us: clean(b.whyUs, 1500) || null,
    context_property: clean(b.contextProperty, 160) || null,
    source_ip: ip,
  };

  const { error } = await db.from('corporate_partners').insert(payload);
  if (error) return NextResponse.json({ error: 'Submission failed. Try again.' }, { status: 500 });

  notifyNewPartner({
    company_name: companyName,
    contact_name: contactName,
    email,
    category: payload.category as string | null,
    coverage: payload.coverage as string | null,
    offering: payload.offering as string | null,
    scale_readiness: payload.scale_readiness as string | null,
  });

  // Fire-and-forget: log submit against a published partner experience (analytics)
  try {
    const { data: partnerExp } = await db
      .from('corporate_experiences')
      .select('id')
      .eq('type', 'partner')
      .eq('published', true)
      .limit(1)
      .maybeSingle();
    if (partnerExp) {
      await db.from('corporate_experience_events').insert({
        experience_id: partnerExp.id,
        kind: 'submit',
        contact: { name: contactName, email, company: companyName },
      });
    }
  } catch { /* analytics must never block submission */ }

  return NextResponse.json({ ok: true });
}

// --- GET: super admin listing ------------------------------------------------

export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId || !caller.isSuper) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('corporate_partners')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data || [] });
}

// --- PATCH: super admin review actions ----------------------------------------

export async function PATCH(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId || !caller.isSuper) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }
  const db = getSupabaseAdmin();
  const b = await req.json().catch(() => ({}));
  const id = clean(b.id, 100);
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.status === 'string') updates.status = clean(b.status, 40) || 'new';
  if (typeof b.notes === 'string') updates.notes = clean(b.notes, 2000) || null;
  if (Number.isInteger(b.rating) && (b.rating as number) >= 1 && (b.rating as number) <= 5)
    updates.rating = b.rating;

  const { error } = await db.from('corporate_partners').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}