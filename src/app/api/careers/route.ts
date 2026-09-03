import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';
import { notifyNewTalent } from '@/lib/notify';
export const dynamic = 'force-dynamic';

/**
 * Public careers API — the candidate-facing side of the corporate talent track.
 *
 * POST /api/careers (public): submit yourself to the talent pool.
 *   No position gate — candidates bring skills/experience; Attenda offers a
 *   position based on fit. Rate-limited per IP; honeypot-protected.
 *
 * GET /api/careers (super admin only): full talent pool listing.
 * PATCH (super admin only): review actions — status/position_suggestion/rating/notes.
 */

// --- helpers ---------------------------------------------------------------

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const cleanArr = (v: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(v)
    ? v
        .filter((s) => typeof s === 'string')
        .map((s) => s.trim().slice(0, maxLen))
        .filter(Boolean)
        .slice(0, maxItems)
    : [];

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

// --- POST: public submission ----------------------------------------------

export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin();

  // Per-IP rate limit: 5 submissions / 10 min (works across lambda instances
  // because it counts real rows).
  const ip = clientIp(req);
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db
    .from('corporate_talent_pool')
    .select('id', { count: 'exact', head: true })
    .eq('source_ip', ip)
    .gte('created_at', tenMinAgo);
  if ((count ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'Too many submissions from this network. Try again later.' },
      { status: 429 }
    );
  }

  const b = await req.json().catch(() => ({}));

  // Honeypot: bots fill every field; humans never see this one.
  if (clean(b.website, 100)) {
    return NextResponse.json({ ok: true, hidden: true }, { status: 200 });
  }

  const fullName = clean(b.fullName, 120);
  const email = clean(b.email, 200).toLowerCase();
  if (!fullName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Name and a valid email are required.' }, { status: 400 });
  }

  const links = (b && typeof b.links === 'object' && b.links !== null ? b.links : {}) as Record<string, unknown>;

  const payload = {
    full_name: fullName,
    email,
    phone: clean(b.phone, 40) || null,
    location: clean(b.location, 120) || null,
    links: {
      linkedin: clean(links.linkedin, 200) || null,
      portfolio: clean(links.portfolio, 200) || null,
    },
    years_experience: clean(b.yearsExperience, 40) || null,
    industries: cleanArr(b.industries, 10, 60),
    skills: cleanArr(b.skills, 15, 60),
    story: clean(b.story, 2000) || null,
    superpower: clean(b.superpower, 300) || null,
    availability: clean(b.availability, 200) || null,
    expectations: clean(b.expectations, 500) || null,
    source_ip: ip,
    source: 'careers-page',
  };

  const { error } = await db.from('corporate_talent_pool').insert(payload);
  if (error) return NextResponse.json({ error: 'Submission failed. Try again.' }, { status: 500 });

  notifyNewTalent({
    full_name: fullName,
    email,
    years_experience: payload.years_experience as string | null,
    skills: payload.skills as string[],
    superpower: payload.superpower as string | null,
    story: payload.story as string | null,
  });

  // Fire-and-forget: log submit against a published talent experience (analytics)
  try {
    const { data: talentExp } = await db
      .from('corporate_experiences')
      .select('id')
      .eq('type', 'talent')
      .eq('published', true)
      .limit(1)
      .maybeSingle();
    if (talentExp) {
      await db.from('corporate_experience_events').insert({
        experience_id: talentExp.id,
        kind: 'submit',
        contact: { name: fullName, email },
      });
    }
  } catch { /* analytics must never block submission */ }

  return NextResponse.json({ ok: true });
}

// --- GET: super admin pool listing -----------------------------------------

export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId || !caller.isSuper) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('corporate_talent_pool')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ candidates: data || [] });
}

// --- PATCH: super admin review actions --------------------------------------

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
  if (typeof b.positionSuggestion === 'string')
    updates.position_suggestion = clean(b.positionSuggestion, 80) || null;
  if (typeof b.notes === 'string') updates.notes = clean(b.notes, 2000) || null;
  if (Number.isInteger(b.rating) && (b.rating as number) >= 1 && (b.rating as number) <= 5)
    updates.rating = b.rating;
  if (typeof b.stage === 'string') updates.stage = clean(b.stage, 40) || 'new';

  const { error } = await db.from('corporate_talent_pool').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}