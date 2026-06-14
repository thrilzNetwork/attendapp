import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-admin';

async function checkAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const admin = await isSuperAdmin(user.id);
  return admin ? user : null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await checkAdmin(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await req.json();

    // ─── Hotels admin ──────────────────────────────────────────
    if (action === 'get_hotels') {
      const { data } = await supabaseAdmin.from('hotels').select('*').order('created_at');
      return NextResponse.json({ data: data || [] });
    }

    if (action === 'create_hotel') {
      const { data, error } = await supabaseAdmin.from('hotels').insert(params).select().single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === 'delete_hotel') {
      const id = params.id;
      // Cascade delete
      await supabaseAdmin.from('partner_menu_items').delete().in('partner_id', (await supabaseAdmin.from('partners').select('id').eq('hotel_id', id)).data?.map(p => p.id) || []);
      await supabaseAdmin.from('partners').delete().eq('hotel_id', id);
      await supabaseAdmin.from('qr_codes').delete().eq('hotel_id', id);
      await supabaseAdmin.from('requests').delete().eq('hotel_id', id);
      await supabaseAdmin.from('messages').delete().eq('hotel_id', id);
      await supabaseAdmin.from('staff_accounts').delete().eq('hotel_id', id);
      await supabaseAdmin.from('attenda_fees').delete().eq('hotel_id', id);
      await supabaseAdmin.from('shuttle_routes').delete().eq('hotel_id', id);
      await supabaseAdmin.from('shuttle_requests').delete().eq('hotel_id', id);
      await supabaseAdmin.from('cruise_schedules').delete().eq('hotel_id', id);
      await supabaseAdmin.from('staff_checklists').delete().eq('hotel_id', id);
      await supabaseAdmin.from('staff_schedules').delete().eq('hotel_id', id);
      await supabaseAdmin.from('hotel_knowledge_base').delete().eq('hotel_id', id);
      await supabaseAdmin.from('hotel_rooms').delete().eq('hotel_id', id);
      await supabaseAdmin.from('hotel_ops_tools').delete().eq('hotel_id', id);
      await supabaseAdmin.from('hotels').delete().eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle_hotel') {
      await supabaseAdmin.from('hotels').update({ is_active: params.active }).eq('id', params.hotelId);
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle_clover') {
      await supabaseAdmin.from('partners').update({ clover_enabled: params.enabled }).eq('id', params.partnerId);
      return NextResponse.json({ ok: true });
    }

    // ─── Staff CRUD ─────────────────────────────────────────────
    if (action === 'create_staff') {
      const staffData = params.data || params;
      const { data, error } = await supabaseAdmin
        .from('staff_accounts')
        .insert(staffData)
        .select()
        .single();
      if (error) throw error;
      // Strip pin_code from response
      const cleaned = data ? { ...data } : null;
      if (cleaned) delete cleaned.pin_code;
      return NextResponse.json({ ok: true, data: cleaned });
    }

    if (action === 'update_staff') {
      const { id, updates } = params;
      const { error } = await supabaseAdmin
        .from('staff_accounts')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_staff_permissions') {
      const { id, permissions } = params;
      const { error } = await supabaseAdmin
        .from('staff_accounts')
        .update({ permissions })
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // ─── Ops Tools ─────────────────────────────────────────────
    if (action === 'get_ops_tools') {
      const { data } = await supabaseAdmin.from('ops_tools').select('*').order('name');
      return NextResponse.json({ data: data || [] });
    }

    if (action === 'create_ops_tool') {
      const { data, error } = await supabaseAdmin.from('ops_tools').insert({
        name: params.name,
        key: params.key,
        icon: params.icon || 'Tool',
        description: params.description || '',
        category: params.category || 'front_desk',
        is_built_in: false,
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === 'delete_ops_tool') {
      await supabaseAdmin.from('hotel_ops_tools').delete().eq('tool_key', params.key);
      await supabaseAdmin.from('ops_tools').delete().eq('id', params.id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'get_hotel_ops_tools') {
      const { data } = await supabaseAdmin.from('hotel_ops_tools').select('*').eq('hotel_id', params.hotelId);
      return NextResponse.json({ data: data || [] });
    }

    if (action === 'set_hotel_ops_tool') {
      await supabaseAdmin.from('hotel_ops_tools').upsert(
        { hotel_id: params.hotelId, tool_key: params.toolKey, enabled: params.enabled },
        { onConflict: 'hotel_id,tool_key' }
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}