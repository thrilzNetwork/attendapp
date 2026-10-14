import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Public guest-safe hotel config: served to UNAUTHENTICATED guest devices
// (scanned QR flows, printed welcome letters). Deliberately a whitelist —
// ops internals (gm notes, position budgets, payment/contact internals,
// integrations) are NEVER exposed here.
const GUEST_SAFE_COLUMNS = [
  'id', 'slug', 'name', 'address', 'brand_color', 'welcome_letter',
  'manager_name', 'team_photo_url', 'front_desk_phone', 'room_count',
  'wifi_name', 'wifi_password', 'google_review_url', 'tripadvisor_url',
  'yelp_url', 'custom_review_links', 'brand', 'features',
  'has_free_shuttle', 'shuttle_start_time', 'shuttle_end_time',
  'shuttle_days', 'shuttle_capacity', 'shuttle_pickup_location',
  'shuttle_notes', 'week_starts_on', 'timezone',
  'facilities_content', 'safety_content', 'transport_content',
  'food_content', 'nearby_intro',
];

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || '';
  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) {
    return NextResponse.json({ error: 'bad slug' }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('hotels')
    .select(GUEST_SAFE_COLUMNS.join(','))
    .eq('slug', slug)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}