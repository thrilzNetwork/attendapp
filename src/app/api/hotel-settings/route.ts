import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// PATCH /api/hotel-settings?hotelId=... { shuttle_dest_name, shuttle_dest_address }
// Clears cached lat/lng so the next vehicles poll auto-geocodes the new address.
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  if (!hotelId) return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const allowed = ['shuttle_dest_name', 'shuttle_dest_address'];
  const updates: Record<string, string | null> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] ?? null;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  // Clear cached coords whenever address changes so next poll re-geocodes
  if ('shuttle_dest_address' in updates) {
    updates.shuttle_dest_lat = null;
    updates.shuttle_dest_lng = null;
  }

  const db = getSupabaseAdmin();
  const { error } = await db.from('hotels').update(updates).eq('id', hotelId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
