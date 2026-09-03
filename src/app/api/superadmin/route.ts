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

// ─── Audit log (§23) — fire-and-forget, never blocks the operation ──
async function audit(user: { id: string; email?: string }, action: string, entityType: string, entityId: string | null, label: string, meta?: Record<string, unknown>) {
  try {
    await supabaseAdmin.from('corporate_audit_log').insert({
      actor_user_id: user.id,
      actor_email: user.email || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: label,
      meta: meta || null,
    });
  } catch { /* audit must never block the operation */ }
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
      const insert: Record<string, unknown> = {};
      const cols: Record<string, unknown> = {
        slug: params.slug,
        name: params.name,
        website_url: params.websiteUrl || params.website_url,
        admin_phone: params.adminPhone || params.admin_phone,
        room_count: params.roomCount || params.room_count || 0,
        address: params.address,
        notification_email: params.adminEmail || params.notificationEmail || params.notification_email,
        google_review_url: params.googleReviewUrl || params.google_review_url,
        tripadvisor_url: params.tripadvisorUrl || params.tripadvisor_url,
        yelp_url: params.yelpUrl || params.yelp_url,
        brand: params.propertyType || params.brand || 'Hotel',
      };
      for (const [k, v] of Object.entries(cols)) {
        if (v !== null && v !== undefined && v !== '') insert[k] = v;
      }
      const { data, error } = await supabaseAdmin.from('hotels').insert(insert).select().single();
      if (error) throw new Error(error.message || JSON.stringify(error));
      await audit(user, 'create_hotel', 'hotel', (data as { id?: string })?.id || null, (data as { name?: string })?.name || params.name || 'Property');
      return NextResponse.json({ data });
    }

    if (action === 'delete_hotel') {
      const id = params.id;
      const { data: delHotel } = await supabaseAdmin.from('hotels').select('name').eq('id', id).maybeSingle();
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
      await audit(user, 'delete_hotel', 'hotel', id || null, (delHotel as { name?: string } | null)?.name || 'Property');
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle_hotel') {
      const { data: tHotel } = await supabaseAdmin.from('hotels').select('name').eq('id', params.hotelId).maybeSingle();
      await supabaseAdmin.from('hotels').update({ is_active: params.active }).eq('id', params.hotelId);
      await audit(user, 'toggle_hotel', 'hotel', params.hotelId || null, (tHotel as { name?: string } | null)?.name || 'Property', { is_active: params.active });
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
      if (error) throw new Error(error.message || JSON.stringify(error));
      // Strip pin_code from response
      const cleaned = data ? { ...data } : null;
      if (cleaned) delete cleaned.pin_code;
      await audit(user, 'create_staff', 'staff', cleaned?.id || null, (cleaned?.name as string) || 'Staff member', { hotel_id: staffData?.hotel_id, role: staffData?.role });
      return NextResponse.json({ ok: true, data: cleaned });
    }

    if (action === 'update_staff') {
      const { id, updates } = params;
      const { error } = await supabaseAdmin
        .from('staff_accounts')
        .update(updates)
        .eq('id', id);
      if (error) throw new Error(error.message || JSON.stringify(error));
      await audit(user, 'update_staff', 'staff', id || null, (updates?.name as string) || 'Staff member', { fields: Object.keys(updates || {}) });
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_staff_permissions') {
      const { id, permissions } = params;
      const { error } = await supabaseAdmin
        .from('staff_accounts')
        .update({ permissions })
        .eq('id', id);
      if (error) throw new Error(error.message || JSON.stringify(error));
      await audit(user, 'update_staff_permissions', 'staff', id || null, 'Staff permissions');
      return NextResponse.json({ ok: true });
    }

    // ─── Cross-property People (tenant staff) ──────────────────
    if (action === 'list_all_staff') {
      const { data, error } = await supabaseAdmin
        .from('staff_accounts')
        .select('id, hotel_id, name, email, role, active, created_at, hotels(name, slug)')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message || JSON.stringify(error));
      const cleaned = (data || []).map((s: Record<string, unknown>) => {
        const row = { ...s };
        delete row.pin_code;
        return row;
      });
      return NextResponse.json({ data: cleaned });
    }

    // ─── Hotel settings edit (safe column whitelist) ───────────
    if (action === 'update_hotel') {
      const { id, updates } = params;
      const allowed = ['name', 'address', 'room_count', 'admin_phone', 'notification_email', 'google_review_url', 'tripadvisor_url', 'yelp_url', 'brand', 'website_url'];
      const updateData: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates || {})) {
        if (allowed.includes(k) && v !== null && v !== undefined) updateData[k] = v;
      }
      if (!Object.keys(updateData).length) throw new Error('Nothing to update');
      const { error } = await supabaseAdmin.from('hotels').update(updateData).eq('id', id);
      if (error) throw new Error(error.message || JSON.stringify(error));
      await audit(user, 'update_hotel', 'hotel', id || null, (updateData.name as string) || 'Property settings', { fields: Object.keys(updateData) });
      return NextResponse.json({ ok: true });
    }

    // ─── Command Center overview ───────────────────────────────
    if (action === 'overview') {
      const [cu, cuInc, talent, partners, staffAll, rCorp, rTalent, rPartner, rHotel] = await Promise.all([
        supabaseAdmin.from('corporate_users').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('corporate_users').select('id', { count: 'exact' }).eq('onboarding_completed', false),
        supabaseAdmin.from('corporate_talent_pool').select('id', { count: 'exact' }),
        supabaseAdmin.from('corporate_partners').select('id', { count: 'exact' }),
        supabaseAdmin.from('staff_accounts').select('id', { count: 'exact' }),
        supabaseAdmin.from('corporate_users').select('name, email, created_at').order('created_at', { ascending: false }).limit(3),
        supabaseAdmin.from('corporate_talent_pool').select('name, email, created_at').order('created_at', { ascending: false }).limit(3),
        supabaseAdmin.from('corporate_partners').select('company, contact_name, created_at').order('created_at', { ascending: false }).limit(3),
        supabaseAdmin.from('hotels').select('name, created_at').order('created_at', { ascending: false }).limit(3),
      ]);
      const recent: { kind: string; label: string; at: string }[] = [
        ...(rCorp.data || []).map((r) => ({ kind: 'corporate', label: r.name || r.email || 'Member', at: r.created_at })),
        ...(rTalent.data || []).map((r) => ({ kind: 'talent', label: r.name || r.email || 'Candidate', at: r.created_at })),
        ...(rPartner.data || []).map((r) => ({ kind: 'partner', label: r.company || r.contact_name || 'Partner', at: r.created_at })),
        ...(rHotel.data || []).map((r) => ({ kind: 'hotel', label: r.name || 'Property', at: r.created_at })),
      ]
        .filter((r) => r.at)
        .sort((a, b) => (a.at < b.at ? 1 : -1))
        .slice(0, 6);
      return NextResponse.json({
        corporateUsers: cu.count || 0,
        corporateOnboardingIncomplete: cuInc.count || 0,
        talentCount: talent.count || 0,
        partnerCount: partners.count || 0,
        staffTotal: staffAll.count || 0,
        recent,
      });
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
      if (error) throw new Error(error.message || JSON.stringify(error));
      await audit(user, 'create_ops_tool', 'ops_tool', (data as { id?: string })?.id || null, params.name || 'Ops tool');
      return NextResponse.json({ data });
    }

    if (action === 'delete_ops_tool') {
      await supabaseAdmin.from('hotel_ops_tools').delete().eq('tool_key', params.key);
      await supabaseAdmin.from('ops_tools').delete().eq('id', params.id);
      await audit(user, 'delete_ops_tool', 'ops_tool', params.id || null, params.key || 'Ops tool');
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

    // ─── Feature flags ──────────────────────────────────────────
    if (action === 'get_hotel_features') {
      const { data } = await supabaseAdmin.from('hotels').select('features').eq('id', params.hotelId).single();
      return NextResponse.json({ data: data?.features || {} });
    }

    if (action === 'update_hotel_features') {
      await supabaseAdmin.from('hotels').update({ features: params.features }).eq('id', params.hotelId);
      await audit(user, 'update_hotel_features', 'hotel', params.hotelId || null, 'Feature flags');
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}