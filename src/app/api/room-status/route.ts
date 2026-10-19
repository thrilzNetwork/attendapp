import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller, resolveHotelScope } from '@/lib/supabase-admin';
import { isAllowedOrigin } from '@/lib/api-auth';

/**
 * POST /api/room-status  (staff, authed)
 * Body: { room_number, status?, hotelId?, staffName? }
 * Hotel scope is resolved from the staff session server-side. Staff can only
 * touch their own hotel; supers can pass hotelId explicitly.
 */
export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.room_number) {
    return NextResponse.json({ error: 'room_number required' }, { status: 400 });
  }
  const hotelId = resolveHotelScope(caller, body.hotelId);
  if (!hotelId) return NextResponse.json({ error: 'No hotel scope' }, { status: 403 });

  const roomNumber = String(body.room_number).trim();
  if (!/^[A-Za-z0-9-]{1,10}$/.test(roomNumber)) {
    return NextResponse.json({ error: 'Invalid room number' }, { status: 400 });
  }

  const staffName = String(body.staffName || caller.email || 'Staff').slice(0, 80);
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    hotel_id: hotelId, room_number: roomNumber, updated_at: now,
  };
  if (body.status) {
    const allowed = ['clean', 'dirty', 'inspected', 'out_of_order'];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    row.status = body.status;
    if (body.status === 'clean') { row.cleaned_by = staffName; row.cleaned_at = now; }
    if (body.status === 'inspected') { row.inspected_by = staffName; row.inspected_at = now; }
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('room_status')
    .upsert(row, { onConflict: 'hotel_id,room_number', ignoreDuplicates: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * GET /api/room-status?hotelId=…  (staff, authed)
 */
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const hotelId = resolveHotelScope(caller, req.nextUrl.searchParams.get('hotelId'));
  if (!hotelId) return NextResponse.json({ error: 'No hotel scope' }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('room_status')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('room_number');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rooms: data || [] });
}
