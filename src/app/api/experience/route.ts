import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSuperAdmin } from '@/lib/supabase-admin';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Attenda Experience Engine — experiences + analytics + public serving.

async function checkAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const admin = await isSuperAdmin(user.id);
  return admin ? user : null;
}

type EventKind = 'view' | 'start' | 'complete' | 'submit';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const db = getSupabaseAdmin();

  // ── Public fetch (published only) ─────────────────────────
  if (url.searchParams.get('public') === '1') {
    const slug = url.searchParams.get('slug') || '';
    const { data } = await db.from('corporate_experiences').select('slug, title, subtitle, mode, blocks').eq('slug', slug).eq('published', true).maybeSingle();
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ experience: data });
  }

  // ── Super-admin fetch ─────────────────────────────────────
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

  const slug = url.searchParams.get('slug');
  if (slug) {
    const { data: exp } = await db.from('corporate_experiences').select('*').eq('slug', slug).maybeSingle();
    if (!exp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const analytics = await expAnalytics(db, exp.id);
    return NextResponse.json({ experience: exp, analytics });
  }

  const { data: list } = await db.from('corporate_experiences').select('*').order('updated_at', { ascending: false });
  const exps = list || [];
  const withAnalytics = await Promise.all(exps.map(async (e) => ({ ...e, analytics: await expAnalytics(db, e.id) })));
  return NextResponse.json({ experiences: withAnalytics });
}

async function expAnalytics(db: ReturnType<typeof getSupabaseAdmin>, expId: string) {
  const { data } = await db.from('corporate_experience_events').select('kind, created_at').eq('experience_id', expId).order('created_at', { ascending: false }).limit(1000);
  const rows = data || [];
  const count = (k: EventKind) => rows.filter((r) => r.kind === k).length;
  const views = count('view');
  const completes = count('complete');
  return {
    views,
    starts: count('start'),
    completes,
    submits: count('submit'),
    completionPct: views ? Math.round((completes / views) * 100) : 0,
    lastActivity: rows.length ? rows[0].created_at : null,
  };
}

// POST /api/experience — super-admin mutations + public log-event.
export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin();
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = b.action;

  // ── Public event logging (published experiences only) ─────
  if (action === 'log-event') {
    const slug = String(b.slug || '');
    const kind = String(b.kind || '');
    if (!['view', 'start', 'complete', 'submit'].includes(kind)) {
      return NextResponse.json({ error: 'Bad kind' }, { status: 400 });
    }
    const { data: exp } = await db.from('corporate_experiences').select('id').eq('slug', slug).eq('published', true).maybeSingle();
    if (!exp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const contact = b.contact && typeof b.contact === 'object' ? b.contact : null;
    const meta = b.meta && typeof b.meta === 'object' ? b.meta : null;
    if (contact && JSON.stringify(contact).length > 4000) return NextResponse.json({ error: 'Too large' }, { status: 400 });
    if (meta && JSON.stringify(meta).length > 4000) return NextResponse.json({ error: 'Too large' }, { status: 400 });
    await db.from('corporate_experience_events').insert({
      experience_id: exp.id, kind, contact, meta,
    });
    return NextResponse.json({ ok: true });
  }

  // ── Super-admin mutations ─────────────────────────────────
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

  try {
    if (action === 'create') {
      const slug = String(b.slug || '').toLowerCase();
      if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: 'Slug must be a-z 0-9 dashes' }, { status: 400 });
      const { data, error } = await db.from('corporate_experiences').insert({
        slug, type: b.type || 'onboarding', title: String(b.title || 'Untitled'),
        subtitle: b.subtitle || null, mode: b.mode || 'hybrid',
        blocks: Array.isArray(b.blocks) ? b.blocks : [],
        published: false, created_by: admin.id,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, experience: data });
    }

    if (action === 'update') {
      const up: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof b.title === 'string') up.title = b.title;
      if (b.subtitle !== undefined) up.subtitle = b.subtitle;
      if (typeof b.mode === 'string') up.mode = b.mode;
      if (Array.isArray(b.blocks)) up.blocks = b.blocks;
      if (typeof b.published === 'boolean') up.published = b.published;
      const { error } = await db.from('corporate_experiences').update(up).eq('id', b.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'publish') {
      const { error } = await db.from('corporate_experiences').update({ published: !!b.published, updated_at: new Date().toISOString() }).eq('id', b.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'duplicate') {
      const { data: src } = await db.from('corporate_experiences').select('*').eq('id', b.id).maybeSingle();
      if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      let n = 1;
      let newSlug = `${src.slug}-copy`;
      // find free slug
      for (;;) {
        const { data: exists } = await db.from('corporate_experiences').select('id').eq('slug', newSlug).maybeSingle();
        if (!exists) break;
        n += 1;
        newSlug = `${src.slug}-copy-${n}`;
      }
      const { data, error } = await db.from('corporate_experiences').insert({
        slug: newSlug, type: src.type, title: `${src.title} (copy)`, subtitle: src.subtitle,
        mode: src.mode, blocks: src.blocks || [], published: false, created_by: admin.id,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, experience: data });
    }

    if (action === 'delete') {
      await db.from('corporate_experiences').delete().eq('id', b.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Server error' }, { status: 500 });
  }
}