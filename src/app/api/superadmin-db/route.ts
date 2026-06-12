import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    // Require shared API key
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Origin check — soft gate against non-browser clients
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    if (!isAllowedOrigin(origin, referer)) {
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
      if (error) throw error;
      return NextResponse.json({ ok: true, hotel });
    }

    if (action === 'list_hotels') {
      const { data: hotels, error } = await supabaseAdmin.from('hotels').select('*').order('created_at');
      if (error) throw error;
      return NextResponse.json({ ok: true, hotels: hotels || [] });
    }

    if (action === 'create_staff') {
      const insert: Record<string, unknown> = {};
      const fields: [string, unknown][] = [
        ['hotel_id', data.hotel_id],
        ['name', data.name],
        ['role', data.role || 'staff'],
        ['email', data.email || ''],
        ['phone', data.phone || ''],
        ['pin_code', data.pin_code],
        ['permissions', data.permissions || ['orders', 'messages', 'shuttle']],
        ['vendor_type', data.vendor_type],
        ['hire_date', data.hire_date],
        ['min_hours', data.min_hours || 0],
        ['employment_type', data.employment_type],
        ['active', true],
      ];
      for (const [k, v] of fields) {
        if (v !== null && v !== undefined) insert[k] = v;
      }
      const { data: staff, error } = await supabaseAdmin.from('staff_accounts').insert(insert).select().single();
      if (error) throw error;
      return NextResponse.json({ ok: true, staff });
    }

    if (action === 'update_staff') {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data.updates || {})) {
        if (v !== null && v !== undefined) updates[k] = v;
      }
      const { error } = await supabaseAdmin.from('staff_accounts').update(updates).eq('id', data.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_staff_permissions') {
      const { error } = await supabaseAdmin.from('staff_accounts').update({ permissions: data.permissions }).eq('id', data.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_hotel') {
      const cfg = data.config;
      const updateData: Record<string, unknown> = {};
      const knownCols: Record<string, unknown> = {
        name: cfg.name,
        brand: cfg.brand,
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
        facilities_content: cfg.facilitiesContent || [],
        safety_content: cfg.safetyContent || {},
        transport_content: cfg.transportContent || {},
        food_content: cfg.foodContent || {},
        nearby_intro: cfg.nearbyIntro || {},
      };
      for (const [k, v] of Object.entries(knownCols)) {
        if (v !== null && v !== undefined) updateData[k] = v;
      }
      const { error } = await supabaseAdmin.from('hotels').update(updateData).eq('slug', cfg.slug);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('/api/superadmin-db error:', message, err instanceof Error ? err.stack : '');
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
