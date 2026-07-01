import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    // Require shared API key
    const hasValidKey = validateApiKey(req);
    if (!hasValidKey) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Origin check — soft gate against non-browser clients.
    // Skip if API key is valid (the key is the real auth).
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    if (!hasValidKey && !isAllowedOrigin(origin, referer)) {
      return originBlocked();
    }

    const { action, data } = await req.json();

    if (action === 'create_hotel') {
      const insert: Record<string, unknown> = {};
      const guestCols: Record<string, unknown> = {
        slug: data.slug,
        name: data.name,
        website_url: data.websiteUrl,
        admin_phone: data.adminPhone,
        room_count: data.roomCount,
        address: data.address,
        notification_email: data.adminEmail || data.notificationEmail,
        google_review_url: data.googleReviewUrl,
        tripadvisor_url: data.tripadvisorUrl,
        yelp_url: data.yelpUrl,
      };
      for (const [k, v] of Object.entries(guestCols)) {
        if (v !== null && v !== undefined && v !== '') insert[k] = v;
      }
      const { data: hotel, error } = await supabaseAdmin.from('hotels').insert(insert).select().single();
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true, hotel });
    }

    if (action === 'list_hotels') {
      const { data: hotels, error } = await supabaseAdmin.from('hotels').select('*').order('created_at');
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true, hotels: hotels || [] });
    }

    if (action === 'create_staff') {
      const insert: Record<string, unknown> = {};
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      // Issue a one-time setup token (used by the password-setup flow for staff + vendors)
      const setupToken = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '');
      const setupExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days
      const fields: [string, unknown][] = [
        ['hotel_id', data.hotel_id],
        ['name', data.name],
        ['role', data.role || 'staff'],
        ['pin_code', pin],
        ['email', data.email || ''],
        ['phone', data.phone || ''],
        ['permissions', data.permissions || ['orders', 'messages', 'shuttle']],
        ['department', data.department],
        ['vendor_type', data.vendor_type],
        ['partner_id', data.partner_id],
        ['positions', data.positions],
        ['hire_date', data.hire_date],
        ['min_hours', data.min_hours || 0],
        ['employment_type', data.employment_type],
        ['setup_token', setupToken],
        ['setup_token_expires_at', setupExpires],
        ['active', true],
      ];
      for (const [k, v] of fields) {
        if (v !== null && v !== undefined) insert[k] = v;
      }
      const { data: staff, error } = await supabaseAdmin.from('staff_accounts').insert(insert).select().single();
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true, staff, setupToken });
    }

    if (action === 'update_staff') {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data.updates || {})) {
        if (v !== null && v !== undefined) updates[k] = v;
      }
      const { error } = await supabaseAdmin.from('staff_accounts').update(updates).eq('id', data.id);
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_staff_permissions') {
      const { error } = await supabaseAdmin.from('staff_accounts').update({ permissions: data.permissions }).eq('id', data.id);
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_hotel') {
      const cfg = data.config;
      const updateData: Record<string, unknown> = {};
      const knownCols: Record<string, unknown> = {
        name: cfg.name,
        brand: cfg.propertyType || cfg.brand,
        address: cfg.address,
        wifi_name: cfg.wifiName,
        wifi_password: cfg.wifiPassword,
        front_desk_phone: cfg.frontDeskPhone,
        manager_name: cfg.managerName,
        welcome_letter: cfg.welcomeLetter,
        notification_email: cfg.notificationEmail,
        admin_phone: cfg.adminPhone,
        website_url: cfg.websiteUrl,
        room_count: cfg.roomCount,
        google_review_url: cfg.googleReviewUrl,
        tripadvisor_url: cfg.tripadvisorUrl,
        yelp_url: cfg.yelpUrl,
        team_photo_url: cfg.teamPhotoUrl,
        google_sheet_url: cfg.googleSheetUrl,
        apps_script_url: cfg.appsScriptUrl,
        service_account_email: cfg.serviceAccountEmail,
        custom_review_links: cfg.customReviewLinks || [],
        week_starts_on: cfg.weekStartsOn || 'Sunday',
        payment_type: cfg.paymentType || '',
        last_payment: cfg.lastPayment || '',
        gm_notes: cfg.gmNotes || '',
        brand_color: cfg.brandColor,
        facilities_content: cfg.facilitiesContent || [],
        safety_content: cfg.safetyContent || {},
        transport_content: cfg.transportContent || {},
        food_content: cfg.foodContent || {},
        nearby_intro: cfg.nearbyIntro || {},
        position_budgets: cfg.positionBudgets || [],
      };
      for (const [k, v] of Object.entries(knownCols)) {
        if (v !== null && v !== undefined) updateData[k] = v;
      }
      const { error } = await supabaseAdmin.from('hotels').update(updateData).eq('slug', cfg.slug);
      if (error) throw new Error(error.message || JSON.stringify(error));
      return NextResponse.json({ ok: true });
    }

    if (action === 'hotel_metrics') {
      // Returns per-hotel live stats for superadmin command center
      // All queries use admin client — reads across all tenants safely
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const [hotelsRes, staffRes, requestsRes] = await Promise.all([
        supabaseAdmin.from('hotels').select('id, is_active').order('created_at'),
        supabaseAdmin.from('staff_accounts').select('hotel_id').eq('active', true),
        supabaseAdmin.from('requests').select('hotel_id, created_at, status').gte('created_at', todayStr),
      ]);

      const metrics: Record<string, { staff: number; requests_today: number; pending: number; last_activity: string | null; is_active: boolean }> = {};
      for (const h of hotelsRes.data || []) {
        metrics[h.id] = { staff: 0, requests_today: 0, pending: 0, last_activity: null, is_active: h.is_active ?? true };
      }
      for (const s of staffRes.data || []) {
        if (metrics[s.hotel_id]) metrics[s.hotel_id].staff++;
      }
      for (const r of requestsRes.data || []) {
        if (metrics[r.hotel_id]) {
          metrics[r.hotel_id].requests_today++;
          if (r.status === 'pending') metrics[r.hotel_id].pending++;
          if (!metrics[r.hotel_id].last_activity || r.created_at > metrics[r.hotel_id].last_activity!) {
            metrics[r.hotel_id].last_activity = r.created_at;
          }
        }
      }
      return NextResponse.json({ ok: true, metrics });
    }

    if (action === 'toggle_hotel_active') {
      const { hotel_id, active } = data;
      const { error } = await supabaseAdmin.from('hotels').update({ is_active: active }).eq('id', hotel_id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }


  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('/api/superadmin-db error:', message, err instanceof Error ? err.stack : '');
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
