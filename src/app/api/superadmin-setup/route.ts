import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * Superadmin setup API — uses service_role key to bypass RLS.
 * POST: create/register superadmin, create hotels, create staff
 * GET: check if superadmin slot exists
 */
const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';

async function verifySession(token: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbW1zdGF0cnNlbmlkbGdqb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTE5MjAsImV4cCI6MjA5NDE4NzkyMH0.1pnioO5Y_3pW2LTaYc9aliRwTkGhX2cTNLrK9jI1P-4';
  const anonClient = createClient(SUPABASE_URL, anonKey);
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function isAdmin(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('superadmin_config')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

async function runBootstrap(admin: ReturnType<typeof getSupabaseAdmin>) {
  const results: Record<string, unknown> = {};

  // 1. Check if our staff already exist
  const { data: existingStaff } = await admin
    .from('staff_accounts')
    .select('id')
    .eq('hotel_id', 'f1f8de36-3126-4ba8-9cc6-b11cefb276ca')
    .limit(1);
  if (existingStaff && existingStaff.length > 0) {
    return NextResponse.json({ ok: true, message: 'Already bootstrapped' });
  }

  // 2. Create or update hotel
  const { data: hotel } = await admin
    .from('hotels')
    .upsert({
      slug: 'bw-ftl-10272',
      name: 'Best Western Fort Lauderdale Airport',
      address: '1700 W Commercial Blvd, Fort Lauderdale, FL 33309',
      admin_phone: '+19547603100',
      room_count: 103,
      notification_email: 'gm@bwftl10272.com',
    }, { onConflict: 'slug' })
    .select()
    .single();
  if (!hotel) throw new Error('Failed to create/update hotel');
  results.hotel = hotel;

  // 3. Create staff accounts
  const staffToCreate = [
    { name: 'Alejandro Soria', role: 'general_manager', permissions: ['orders', 'messages', 'shuttle', 'staff_management', 'checklists', 'schedules', 'reports'] },
    { name: 'Front Desk Agent', role: 'front_desk', permissions: ['orders', 'messages', 'shuttle'] },
    { name: 'Housekeeping', role: 'housekeeping', permissions: ['orders'] },
  ];
  const createdStaff: unknown[] = [];
  for (const s of staffToCreate) {
    const { data: staff, error: staffErr } = await admin.from('staff_accounts').insert({
      hotel_id: hotel.id,
      name: s.name,
      role: s.role,
      permissions: s.permissions,
      active: true,
    }).select().single();
    if (staffErr) throw new Error(`Staff create (${s.name}): ${staffErr.message}`);
    createdStaff.push(staff);
  }
  results.staff = createdStaff;

  return NextResponse.json({ ok: true, results });
}

export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json();

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // ─── Regular session-based auth ────────────────────────────
    const user = await verifySession(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    }

    // ─── Superadmin registration ───────────────────────────────
    if (action === 'register') {
      const { data: existing } = await admin
        .from('superadmin_config')
        .select('id, user_id, email')
        .maybeSingle();

      if (existing) {
        if (existing.user_id === user.id) {
          return NextResponse.json({ ok: true, existing: true, email: existing.email, user_id: existing.user_id });
        }
        return NextResponse.json({ ok: false, error: 'Super admin already exists' }, { status: 403 });
      }

      const { error: insertErr } = await admin
        .from('superadmin_config')
        .insert({ user_id: user.id, email: user.email });

      if (insertErr) {
        return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, existing: false, email: user.email, user_id: user.id });
    }

    // ─── Admin check for other actions ─────────────────────────
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ ok: false, error: 'Not authorized' }, { status: 403 });
    }

    if (action === 'bootstrap') {
      return await runBootstrap(admin);
    }

    // No action — return existing config (used by checkSlot)
    if (!action) {
      const { data: config } = await admin
        .from('superadmin_config')
        .select('user_id, email')
        .maybeSingle();
      if (!config) {
        return NextResponse.json({ ok: false, error: 'No config' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, existing: true, user_id: config.user_id, email: config.email });
    }

    if (action === 'list_hotels') {
      const { data } = await admin.from('hotels').select('*').order('created_at');
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
      };
      for (const [k, v] of Object.entries(cols)) {
        if (v !== null && v !== undefined && v !== '') insert[k] = v;
      }
      const { data, error } = await admin.from('hotels').insert(insert).select().single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, hotel: data });
    }

    if (action === 'get_hotel_id') {
      const slug = params.slug;
      const { data } = await admin
        .from('hotels')
        .select('id, slug, name')
        .eq('slug', slug)
        .maybeSingle();
      if (!data) {
        return NextResponse.json({ ok: false, error: `Hotel not found: ${slug}` }, { status: 404 });
      }
      return NextResponse.json({ ok: true, hotel: data });
    }

    if (action === 'create_staff') {
      const insert: Record<string, unknown> = {};
      const fields: [string, unknown][] = [
        ['hotel_id', params.hotel_id],
        ['name', params.name],
        ['role', params.role || 'staff'],
        ['email', params.email || ''],
        ['phone', params.phone || ''],
        ['permissions', params.permissions || ['orders', 'messages', 'shuttle']],
        ['vendor_type', params.vendor_type || null],
        ['hire_date', params.hire_date || null],
        ['min_hours', params.min_hours || 0],
        ['employment_type', params.employment_type || null],
        ['active', true],
      ];
      for (const [k, v] of fields) {
        if (v !== null && v !== undefined) insert[k] = v;
      }
      const { data, error } = await admin.from('staff_accounts').insert(insert).select().single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, staff: data });
    }

    if (action === 'list_staff') {
      const hotelId = params.hotel_id;
      let query = admin.from('staff_accounts').select('*');
      if (hotelId) query = query.eq('hotel_id', hotelId);
      const { data, error } = await query.order('created_at');
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, data: data || [] });
    }

    if (action === 'create_shuttle_route') {
      const insert: Record<string, unknown> = {
        hotel_id: params.hotel_id,
        name: params.name,
        type: params.type || 'airport',
        direction: params.direction || 'to_hotel',
        pickup_location: params.pickup_location,
        dropoff_location: params.dropoff_location,
        schedule: params.schedule || [],
        is_active: params.is_active !== undefined ? params.is_active : true,
      };
      const { data, error } = await admin.from('shuttle_routes').insert(insert).select().single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, route: data });
    }

    if (action === 'list_shuttle_routes') {
      const hotelId = params.hotel_id;
      let query = admin.from('shuttle_routes').select('*');
      if (hotelId) query = query.eq('hotel_id', hotelId);
      const { data, error } = await query.order('name');
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, data: data || [] });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error';
    console.error('/api/superadmin-setup error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  // Only returns whether a superadmin slot exists — no user data leaked
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from('superadmin_config')
      .select('id')
      .maybeSingle();
    return NextResponse.json({ exists: !!data });
  } catch {
    return NextResponse.json({ exists: false });
  }
}