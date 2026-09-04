import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/corporate/onboarding — pages for this user:
// all universal pages + pages for each AUTHORIZED position.
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();

  const { data: user } = await db.from('corporate_users').select('*').eq('id', caller.userId).maybeSingle();
  if (!user || !user.active) return NextResponse.json({ error: 'Not a corporate user' }, { status: 403 });

  const { data: authPos } = await db
    .from('corporate_user_positions').select('position_key').eq('user_id', user.id);
  const keys = (authPos || []).map((p: any) => p.position_key);

  const { data: pages } = await db
    .from('corporate_pages')
    .select('slug, title, audience, body, sort_order')
    .eq('published', true)
    .or(`audience.eq.universal${keys.length ? `,audience.in.(${keys.join(',')})` : ''}`)
    .order('sort_order');

  const progress: string[] = Array.isArray(user.onboarding_progress) ? user.onboarding_progress : [];
  const { data: positions } = await db
    .from('corporate_positions').select('key, title').in('key', keys.length ? keys : ['__none__']);

  return NextResponse.json({
    pages: pages || [],
    progress,
    authorizedKeys: keys,
    authorizedTitles: (positions || []).map((p: any) => p.title),
    confirmedPosition: user.confirmed_position,
    onboardingCompleted: !!user.onboarding_completed,
    responsibilities: keys.length
      ? (await db.from('corporate_responsibilities').select('position_key, title, detail').in('position_key', keys).order('sort_order')).data || []
      : [],
    kpis: keys.length
      ? (await db.from('corporate_kpis').select('position_key, name, target, unit, detail').in('position_key', keys).order('sort_order')).data || []
      : [],
  });
}

// POST /api/corporate/onboarding
// actions: complete-step | confirm-position | complete
// Confirmation records intent ONLY — permissions live in corporate_user_positions,
// granted exclusively by super admin.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  const { data: user } = await db.from('corporate_users').select('*').eq('id', caller.userId).maybeSingle();
  if (!user || !user.active) return NextResponse.json({ error: 'Not a corporate user' }, { status: 403 });

  if (action === 'complete-step') {
    const slug: string = body.slug;
    const progress: string[] = Array.isArray(user.onboarding_progress) ? [...user.onboarding_progress] : [];
    if (slug && !progress.includes(slug)) progress.push(slug);
    await db.from('corporate_users').update({ onboarding_progress: progress }).eq('id', user.id);
    return NextResponse.json({ ok: true, progress });
  }

  if (action === 'confirm-position') {
    const key: string = body.position_key || '';
    const { data: allowed } = await db
      .from('corporate_user_positions').select('position_key').eq('user_id', user.id).eq('position_key', key).maybeSingle();
    if (!allowed) {
      // Confirming an unauthorized position is refused — it never grants permissions.
      return NextResponse.json({ error: 'Position not authorized by super admin' }, { status: 403 });
    }
    await db.from('corporate_users').update({ confirmed_position: key }).eq('id', user.id);
    return NextResponse.json({ ok: true, confirmed: key });
  }

  if (action === 'complete') {
    // Gate: every assigned page + a confirmed position required.
    const { data: authPos } = await db
      .from('corporate_user_positions').select('position_key').eq('user_id', user.id);
    const keys = (authPos || []).map((p: any) => p.position_key);
    const { data: pages } = await db
      .from('corporate_pages').select('slug').eq('published', true)
      .or(`audience.eq.universal${keys.length ? `,audience.in.(${keys.join(',')})` : ''}`);
    const progress: string[] = Array.isArray(user.onboarding_progress) ? user.onboarding_progress : [];
    const missing = (pages || []).filter((p: any) => !progress.includes(p.slug));
    if (missing.length) return NextResponse.json({ error: 'Incomplete', missing: missing.map((m: any) => m.slug) }, { status: 400 });
    if (!user.confirmed_position || !keys.includes(user.confirmed_position)) {
      return NextResponse.json({ error: 'Confirm your position first' }, { status: 400 });
    }
    await db.from('corporate_users').update({ onboarding_completed: true }).eq('id', user.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}