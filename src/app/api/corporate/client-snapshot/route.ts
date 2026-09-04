import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';
export const dynamic = 'force-dynamic';

/**
 * GET /api/corporate/client-snapshot?slug=<client_slug>
 * Corporate-user-facing client snapshot for screen-share conversations:
 * rooms, team, property staff, activity, current problems, current goals,
 * productivity score — plus the platform-wide position growth path so any
 * team member sees "your position is not a ceiling."
 *
 * Access: corporate users may view clients they are assigned to;
 * super admins may view any client.
 */
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getSupabaseAdmin();

  const { data: user } = await db
    .from('corporate_users')
    .select('id, name, title, active')
    .eq('id', caller.userId)
    .maybeSingle();
  if (!user || !user.active) return NextResponse.json({ error: 'Not a corporate user' }, { status: 403 });

  const slug = req.nextUrl.searchParams.get('slug')?.slice(0, 100) || '';
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const { data: client } = await db
    .from('corporate_clients')
    .select('id, slug, name, brand, rooms, address, notes, status, hotel_id')
    .eq('slug', slug)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Assignment check — super admin bypasses.
  const { data: myAsg } = await db
    .from('corporate_client_assignments')
    .select('id')
    .eq('user_id', user.id)
    .eq('client_id', client.id)
    .eq('active', true)
    .maybeSingle();
  if (!myAsg && !caller.isSuper) {
    return NextResponse.json({ error: 'Not assigned to this client' }, { status: 403 });
  }

  const thirtyAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const sevenAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  // Team on this client (corporate side) + their positions.
  const [asgRes, myPosRes] = await Promise.all([
    db.from('corporate_client_assignments')
      .select('user_id, position_key, corporate_users(name, title)')
      .eq('client_id', client.id).eq('active', true),
    db.from('corporate_user_positions').select('position_key').eq('user_id', user.id),
  ]);

  const asg = asgRes.data || [];
  const teamUserIds = Array.from(new Set(asg.map((a: any) => a.user_id)));
  const { data: teamPosRows } = teamUserIds.length
    ? await db.from('corporate_user_positions').select('user_id, position_key').in('user_id', teamUserIds)
    : { data: [] };

  const team = asg.map((a: any) => {
    const keys = (teamPosRows || []).filter((r: any) => r.user_id === a.user_id).map((r: any) => r.position_key);
    return {
      name: a.corporate_users?.name || 'Team member',
      title: a.corporate_users?.title || null,
      positions: keys,
    };
  });

  // Platform-wide growth path (same for everyone — positions are not ceilings).
  const [posRes, respRes] = await Promise.all([
    db.from('corporate_positions').select('key, title, description, color').order('sort_order'),
    db.from('corporate_responsibilities').select('position_key, title, detail').order('sort_order'),
  ]);

  // Property-level data when the client is linked to a hotel.
  const hotelId = client.hotel_id;
  let propertyStaff: number | null = null;
  let activity: { last7: number; done30: number; pending30: number; inProgress30: number; openNow: number; byType: { type: string; count: number }[] } | null = null;

  if (hotelId) {
    const staffC = await db.from('staff_accounts').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId);
    propertyStaff = staffC.count ?? 0;

    const [c7, done30, pend30, prog30, open] = await Promise.all([
      db.from('requests').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId).gte('created_at', sevenAgo),
      db.from('requests').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('status', 'done').gte('created_at', thirtyAgo),
      db.from('requests').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('status', 'pending').gte('created_at', thirtyAgo),
      db.from('requests').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId).eq('status', 'in_progress').gte('created_at', thirtyAgo),
      db.from('requests').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId).in('status', ['pending', 'in_progress']),
    ]);

    const { data: openRows } = await db
      .from('requests').select('type')
      .eq('hotel_id', hotelId).in('status', ['pending', 'in_progress']).limit(500);
    const typeCount: Record<string, number> = {};
    (openRows || []).forEach((r: any) => {
      const t = (r.type || 'other').toString();
      typeCount[t] = (typeCount[t] || 0) + 1;
    });

    activity = {
      last7: c7.count ?? 0,
      done30: done30.count ?? 0,
      pending30: pend30.count ?? 0,
      inProgress30: prog30.count ?? 0,
      openNow: open.count ?? 0,
      byType: Object.entries(typeCount)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    };
  }

  // Goals: KPIs tied to the positions present on this client.
  const posKeys = Array.from(new Set([...(myPosRes.data || []).map((p: any) => p.position_key), ...asg.map((a: any) => a.position_key).filter(Boolean)])) as string[];
  const { data: kpiRows } = posKeys.length
    ? await db.from('corporate_kpis').select('position_key, name, target, unit, detail').in('position_key', posKeys).order('sort_order')
    : { data: [] };
  const posTitle = new Map((posRes.data || []).map((p: any) => [p.key, p.title]));
  const goals = (kpiRows || []).map((k: any) => ({ ...k, position_title: posTitle.get(k.position_key) || k.position_key }));

  // Productivity score: 30-day request completion rate (honest, simple).
  let productivity: { score: number; done: number; total: number } | null = null;
  if (activity) {
    const total = activity.done30 + activity.pending30 + activity.inProgress30;
    productivity = {
      score: total > 0 ? Math.round((activity.done30 / total) * 100) : 100,
      done: activity.done30,
      total,
    };
  }

  return NextResponse.json({
    me: { name: user.name, title: user.title, positions: (myPosRes.data || []).map((p: any) => p.position_key) },
    client,
    team,
    propertyStaff,
    activity,
    goals,
    productivity,
    growthPath: (posRes.data || []).map((p: any) => ({
      key: p.key,
      title: p.title,
      description: p.description,
      color: p.color,
      responsibilities: (respRes.data || []).filter((r: any) => r.position_key === p.key).slice(0, 4),
    })),
  });
}