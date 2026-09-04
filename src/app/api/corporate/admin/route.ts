import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

async function requireSuper(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId || !caller.isSuper) return null;
  return caller;
}

// GET /api/corporate/admin — everything the super admin console needs in one shot.
export async function GET(req: NextRequest) {
  const caller = await requireSuper(req);
  if (!caller) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  const db = getSupabaseAdmin();

  const [users, positions, userPositions, clients, assignments, pages, resp, kpis] = await Promise.all([
    db.from('corporate_users').select('*').order('created_at'),
    db.from('corporate_positions').select('*').order('sort_order'),
    db.from('corporate_user_positions').select('user_id, position_key'),
    db.from('corporate_clients').select('*').order('name'),
    db.from('corporate_client_assignments').select('*'),
    db.from('corporate_pages').select('*').order('sort_order'),
    db.from('corporate_responsibilities').select('*').order('sort_order'),
    db.from('corporate_kpis').select('*').order('sort_order'),
  ]);

  return NextResponse.json({
    users: users.data || [],
    positions: positions.data || [],
    userPositions: userPositions.data || [],
    clients: clients.data || [],
    assignments: assignments.data || [],
    pages: pages.data || [],
    responsibilities: resp.data || [],
    kpis: kpis.data || [],
  });
}

// POST /api/corporate/admin — action-dispatched mutations.
// actions: create-user | authorize | revoke | assign-client | unassign-client |
//          upsert-page | upsert-position | upsert-client | reset-onboarding | toggle-user
export async function POST(req: NextRequest) {
  const caller = await requireSuper(req);
  if (!caller) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  const db = getSupabaseAdmin();
  const b = await req.json().catch(() => ({}));
  const action = b.action;

  try {
    if (action === 'create-user') {
      // Creates auth user + corporate_users row in one call.
      const { data: created, error } = await db.auth.admin.createUser({
        email: b.email,
        password: b.password,
        email_confirm: true,
        user_metadata: { name: b.name },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      const uid = created.user!.id;
      const { error: e2 } = await db.from('corporate_users').insert({
        id: uid, email: b.email.toLowerCase(), name: b.name, title: b.title || null,
      });
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
      return NextResponse.json({ ok: true, user_id: uid });
    }

    if (action === 'authorize') {
      const { error } = await db.from('corporate_user_positions').upsert({
        user_id: b.user_id, position_key: b.position_key, authorized_by: caller.userId,
      }, { onConflict: 'user_id,position_key' });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'revoke') {
      await db.from('corporate_user_positions')
        .delete().eq('user_id', b.user_id).eq('position_key', b.position_key);
      return NextResponse.json({ ok: true });
    }

    if (action === 'assign-client') {
      const { error } = await db.from('corporate_client_assignments').upsert({
        user_id: b.user_id, client_id: b.client_id, position_key: b.position_key || null,
        assigned_by: caller.userId, active: true,
      }, { onConflict: 'user_id,client_id' });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'unassign-client') {
      await db.from('corporate_client_assignments').delete().eq('id', b.assignment_id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'upsert-page') {
      const { error } = await db.from('corporate_pages').upsert({
        slug: b.slug, title: b.title, audience: b.audience || 'universal',
        body: b.body, sort_order: b.sort_order ?? 0, published: b.published ?? true,
        updated_at: new Date().toISOString(),
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'upsert-position') {
      const { error } = await db.from('corporate_positions').upsert({
        key: b.key, title: b.title, description: b.description || null,
        icon: b.icon || 'briefcase', color: b.color || '#158A7C', sort_order: b.sort_order ?? 0,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'upsert-client') {
      // Adding client #2 = creating a client record (optionally attach a hotels row).
      const { data, error } = await db.from('corporate_clients').upsert({
        slug: b.slug, name: b.name, brand: b.brand || null, hotel_id: b.hotel_id || null,
        rooms: b.rooms || null, address: b.address || null,
        status: b.status || 'active', notes: b.notes || null,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, client: data });
    }

    if (action === 'edit-client') {
      // Update an existing client's details from the super admin console.
      const { data, error } = await db.from('corporate_clients').update({
        name: b.name, brand: b.brand || null, rooms: b.rooms || null,
        address: b.address || null, notes: b.notes || null, status: b.status || 'active',
      }).eq('id', b.client_id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, client: data });
    }

    if (action === 'reset-onboarding') {
      await db.from('corporate_users').update({
        onboarding_completed: false, onboarding_progress: [], confirmed_position: null,
      }).eq('id', b.user_id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle-active') {
      await db.from('corporate_users').update({ active: !!b.active }).eq('id', b.user_id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}