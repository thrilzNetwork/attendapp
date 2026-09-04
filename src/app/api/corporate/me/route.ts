import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';
import { noStoreJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

// GET /api/corporate/me
// Session → corporate user + authorized positions (super-admin granted only) +
// confirmed position (display only, never grants) + onboarding state + client assignments.
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getSupabaseAdmin();

  const { data: user, error: userErr } = await db
    .from('corporate_users')
    .select('*')
    .eq('id', caller.userId)
    .maybeSingle();

  if (!user || !user.active) {
    return NextResponse.json({
      error: 'Not a corporate user',
      corporate: false,
      debug: {
        userId: caller.userId,
        email: caller.email,
        isSuper: caller.isSuper,
        lookupError: userErr ? `${userErr.code || ''} ${userErr.message}` : null,
        rowFound: !!user,
        activeField: user ? user.active : null,
      },
    }, { status: 403 });
  }

  // Authorized positions — granted ONLY by super admin via corporate_user_positions.
  const { data: authPos } = await db
    .from('corporate_user_positions')
    .select('position_key, authorized_at, corporate_positions(title, icon, color)')
    .eq('user_id', user.id);

  // Client assignments — separate from permissions.
  const { data: assignments } = await db
    .from('corporate_client_assignments')
    .select('id, client_id, position_key, active, corporate_clients(id, slug, name, brand, rooms, status, hotel_id)')
    .eq('user_id', user.id)
    .eq('active', true);

  const authorized = (authPos || []).map((p: any) => ({
    key: p.position_key,
    title: p.corporate_positions?.title || p.position_key,
    icon: p.corporate_positions?.icon || 'briefcase',
    color: p.corporate_positions?.color || '#158A7C',
    authorized_at: p.authorized_at,
  }));

  // Duties — responsibilities tied to the user's authorized positions.
  const posKeys = authorized.map((p) => p.key);
  const { data: dutiesRows } = posKeys.length
    ? await db.from('corporate_responsibilities').select('position_key, title, detail').in('position_key', posKeys).order('sort_order')
    : { data: [] as any[] };

  return noStoreJson({
    corporate: true,
    user,
    authorizedPositions: authorized,
    confirmedPosition: user.confirmed_position, // display-only
    onboardingCompleted: !!user.onboarding_completed,
    onboardingProgress: user.onboarding_progress || [],
    duties: dutiesRows || [],
    assignments: (assignments || []).map((a: any) => ({
      id: a.id,
      position_key: a.position_key,
      client: a.corporate_clients,
    })),
    isSuperAdmin: caller.isSuper,
  });
}