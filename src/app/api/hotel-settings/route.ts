import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// PATCH /api/hotel-settings?hotelId=... { shuttle_dest_name?, shuttle_dest_address?, shuttle_destinations? }
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  if (!hotelId) return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

  // Legacy single-dest fields
  const scalarAllowed = ['shuttle_dest_name', 'shuttle_dest_address'];
  for (const key of scalarAllowed) {
    if (key in body) updates[key] = body[key] ?? null;
  }
  // Multi-destination JSONB array
  if ('shuttle_destinations' in body) {
    updates.shuttle_destinations = body.shuttle_destinations;
  }
  // Hotel identity fields (used by admin to correct the hotel's own address)
  if ('hotel_name' in body) updates.name = body.hotel_name ?? null;
  if ('hotel_address' in body) {
    updates.address = body.hotel_address ?? null;
    // Clear cached hotel coords so next vehicles poll re-geocodes
    updates.lat = null;
    updates.lng = null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  // Clear cached coords whenever legacy single address changes so next poll re-geocodes
  if ('shuttle_dest_address' in updates) {
    updates.shuttle_dest_lat = null;
    updates.shuttle_dest_lng = null;
  }

  const db = getSupabaseAdmin();
  const { error } = await db.from('hotels').update(updates).eq('id', hotelId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
