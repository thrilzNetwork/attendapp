import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSuperAdmin } from '@/lib/supabase-admin';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { notifyNewTalent, notifyNewPartner, notifyOnboardedCredentials } from '@/lib/notify';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

// per-instance IP rate limit for public account creation (8/hour)
const acctAttempts = new Map<string, number[]>();

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
    const { data } = await db.from('corporate_experiences').select('slug, title, subtitle, mode, blocks, type').eq('slug', slug).eq('published', true).maybeSingle();
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
    const { data: exp } = await db.from('corporate_experiences').select('id, type').eq('slug', slug).eq('published', true).maybeSingle();
    if (!exp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const contact = b.contact && typeof b.contact === 'object' ? b.contact : null;
    const meta = b.meta && typeof b.meta === 'object' ? b.meta : null;
    if (contact && JSON.stringify(contact).length > 4000) return NextResponse.json({ error: 'Too large' }, { status: 400 });
    if (meta && JSON.stringify(meta).length > 4000) return NextResponse.json({ error: 'Too large' }, { status: 400 });
    await db.from('corporate_experience_events').insert({
      experience_id: exp.id, kind, contact, meta,
    });

    // ── Route submissions into the real pipeline (talent / partner) ──
    if (kind === 'submit' && contact) {
      const name = String(contact.name || '').trim();
      const email = String(contact.email || '').trim().toLowerCase();
      if (email && name) {
        const answers = Object.entries(contact)
          .filter(([k, v]) => !['name', 'email', 'phone', 'company'].includes(k) && String(v).trim())
          .map(([k, v]) => ({ question: k, answer: String(v).trim() }));
        try {
          if (exp.type === 'talent') {
            const skills = answers.filter((a) => a.answer.includes(',')).flatMap((a) => a.answer.split(',').map((s) => s.trim())).filter(Boolean);
            const story = answers.filter((a) => !a.answer.includes(',')).map((a) => a.answer).sort((x, y) => y.length - x.length)[0] || null;
            const { error } = await db.from('corporate_talent_pool').insert({
              full_name: name, email, phone: contact.phone || null,
              skills: skills.length ? skills : null,
              story,
              notes: answers.length ? JSON.stringify(answers) : null,
              source: 'experience-link',
            });
            if (!error) notifyNewTalent({ full_name: name, email, skills, story }).catch(() => {});
          } else if (exp.type === 'partner') {
            const company = String(contact.company || '').trim() || `${name}'s company`;
            const { error } = await db.from('corporate_partners').insert({
              company_name: company, contact_name: name, email, phone: contact.phone || null,
              category: answers[0]?.answer || null,
              offering: answers.length > 1 ? answers[answers.length - 1].answer : null,
              notes: answers.length ? JSON.stringify(answers) : null,
            });
            if (!error) notifyNewPartner({ company_name: company, contact_name: name, email, category: answers[0]?.answer || null }).catch(() => {});
          }
        } catch { /* pipeline insert must never block the public experience */ }
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ── Public onboarding account creation (published onboarding experiences only) ──
  if (action === 'create-account') {
    const slug = String(b.slug || '');
    const contact = b.contact && typeof b.contact === 'object' ? (b.contact as Record<string, string>) : null;
    if (!contact) return NextResponse.json({ error: 'Missing contact' }, { status: 400 });

    // basic per-instance IP rate limit — 8 attempts/hour
    const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const recent = (acctAttempts.get(ip) || []).filter((t) => now - t < 3600_000);
    if (recent.length >= 8) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    recent.push(now);
    acctAttempts.set(ip, recent);

    const name = String(contact.name || '').trim();
    const email = String(contact.email || '').trim().toLowerCase();
    const phone = String(contact.phone || '').trim() || null;
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Name and valid email required' }, { status: 400 });
    }

    const { data: exp } = await db.from('corporate_experiences').select('id, type').eq('slug', slug).eq('published', true).eq('type', 'onboarding').maybeSingle();
    if (!exp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const password = crypto.randomBytes(12).toString('base64url');
    try {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: name, phone, source: 'experience-onboarding' },
      });
      if (createErr) {
        if (/already|registered|exists/i.test(createErr.message || '')) {
          return NextResponse.json({ ok: true, creds: { username: email, password: null, existing: true } });
        }
        return NextResponse.json({ error: 'Could not create account' }, { status: 500 });
      }
      const userId = created.user?.id;
      if (!userId) return NextResponse.json({ error: 'Could not create account' }, { status: 500 });
      const { error: cuErr } = await db.from('corporate_users').upsert({
        id: userId, email, name, phone, active: true, onboarding_completed: false, onboarding_progress: [],
      });
      if (cuErr) console.error('corporate_users upsert failed:', cuErr.message);
      notifyOnboardedCredentials({ name, email, password }).catch(() => {});
      return NextResponse.json({ ok: true, creds: { username: email, password } });
    } catch {
      return NextResponse.json({ error: 'Could not create account' }, { status: 500 });
    }
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