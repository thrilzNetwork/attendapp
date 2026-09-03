import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/corporate/announcements — company feed for corporate members.
// Super admins see everything; members see 'all' + their authorized positions.
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();

  const { data: me } = await db.from('corporate_users').select('id, active').eq('id', caller.userId).maybeSingle();
  if (!me || !me.active) return NextResponse.json({ error: 'Not a corporate user' }, { status: 403 });

  const [rows, myPos] = await Promise.all([
    db.from('corporate_announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(30),
    db.from('corporate_user_positions').select('position_key').eq('user_id', caller.userId),
  ]);

  const posKeys = (myPos.data || []).map((r) => r.position_key);
  const visible = (rows.data || []).filter((a) => {
    if (a.audience !== 'positions') return true;
    return (a.position_keys || []).some((k: string) => posKeys.includes(k));
  });

  return NextResponse.json({ announcements: visible });
}

// POST /api/corporate/announcements — super admin publishes company announcements.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId || !caller.isSuper) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  const db = getSupabaseAdmin();
  const b = await req.json().catch(() => ({}));

  if (b.action === 'create') {
    if (!b.title || !b.body) return NextResponse.json({ error: 'Title and body required' }, { status: 400 });
    const audience = b.audience === 'positions' ? 'positions' : 'all';
    const position_keys = Array.isArray(b.position_keys) ? b.position_keys.slice(0, 20).map(String) : [];
    const { data, error } = await db.from('corporate_announcements').insert({
      title: String(b.title).slice(0, 200),
      body: String(b.body).slice(0, 4000),
      audience, position_keys,
      pinned: !!b.pinned,
      created_by: caller.userId,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, announcement: data });
  }

  if (b.action === 'delete') {
    await db.from('corporate_announcements').delete().eq('id', b.id);
    return NextResponse.json({ ok: true });
  }

  if (b.action === 'toggle-pin') {
    const { data: row } = await db.from('corporate_announcements').select('pinned').eq('id', b.id).maybeSingle();
    await db.from('corporate_announcements').update({ pinned: !row?.pinned }).eq('id', b.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}