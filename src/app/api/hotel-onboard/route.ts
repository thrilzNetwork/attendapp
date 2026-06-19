import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isAllowedOrigin, originBlocked } from '@/lib/api-auth';

/**
 * Public self-onboarding endpoint.
 * A hotel GM/owner fills out the landing page form → this creates their hotel,
 * staff account, and auth user in one call. They land on /staff/setup to set
 * their password and walk into a working dashboard.
 *
 * Rate-limited by origin check only — no superadmin auth required.
 * Slug uniqueness is enforced server-side.
 */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  try {
    // Fast-fail: service key must be available for auth.admin.createUser
    if (!process.env.SUPABASE_SERVICE_KEY) {
      console.error('hotel-onboard: SUPABASE_SERVICE_KEY not configured');
      return NextResponse.json(
        { ok: false, error: 'Onboarding is not configured. Please contact support.' },
        { status: 503 },
      );
    }

    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    if (!isAllowedOrigin(origin, referer)) {
      return originBlocked();
    }

    const body = await req.json();
    const {
      propertyName,
      contactName,
      email,
      phone,
      rooms,
      message,
    } = body as {
      propertyName: string;
      contactName: string;
      email: string;
      phone?: string;
      rooms?: string;
      message?: string;
    };

    // Validate required fields
    if (!propertyName || !contactName || !email) {
      return NextResponse.json(
        { ok: false, error: 'Property name, contact name, and email are required.' },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    // Generate a unique slug
    let slug = slugify(propertyName);
    const { data: existing } = await admin
      .from('hotels')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      // Append a short random suffix to make it unique
      const suffix = Math.random().toString(36).slice(2, 6);
      slug = `${slug}-${suffix}`;
    }

    // 1. Create the hotel
    const { data: hotel, error: hotelErr } = await admin
      .from('hotels')
      .insert({
        slug,
        name: propertyName,
        admin_phone: phone || '',
        room_count: rooms ? parseInt(rooms) || 0 : 0,
        notification_email: email,
        address: '',
      })
      .select()
      .single();

    if (hotelErr) {
      console.error('hotel-onboard: hotel insert error:', hotelErr);
      return NextResponse.json(
        { ok: false, error: 'Failed to create property. Please try again.' },
        { status: 500 },
      );
    }

    // 2. Create the staff account (GM role)
    const { data: staff, error: staffErr } = await admin
      .from('staff_accounts')
      .insert({
        hotel_id: hotel.id,
        name: contactName,
        role: 'general_manager',
        email,
        phone: phone || '',
        permissions: ['orders', 'messages', 'shuttle', 'hotel', 'staff_mgmt', 'partners', 'qrcodes'],
        active: true,
      })
      .select()
      .single();

    if (staffErr) {
      console.error('hotel-onboard: staff insert error:', staffErr);
      // Roll back hotel creation
      await admin.from('hotels').delete().eq('id', hotel.id);
      return NextResponse.json(
        { ok: false, error: 'Failed to create staff account. Please try again.' },
        { status: 500 },
      );
    }

    // 3. Create the auth user (pre-confirmed, no email verification)
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2), // temp password, they'll set their own on /staff/setup
      email_confirm: true,
      user_metadata: {
        hotel_id: hotel.id,
        name: contactName,
        role: 'general_manager',
      },
    });

    if (authErr) {
      console.error('hotel-onboard: auth create error:', authErr);
      // Roll back
      await admin.from('staff_accounts').delete().eq('id', staff.id);
      await admin.from('hotels').delete().eq('id', hotel.id);
      return NextResponse.json(
        { ok: false, error: 'Failed to create account. Please try again.' },
        { status: 500 },
      );
    }

    // 4. Done — return setup URL so the client redirects
    return NextResponse.json({
      ok: true,
      hotel: { id: hotel.id, slug, name: hotel.name },
      setupUrl: `/staff/setup?email=${encodeURIComponent(email)}&hotel=${encodeURIComponent(slug)}`,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error';
    console.error('/api/hotel-onboard error:', message);
    return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
