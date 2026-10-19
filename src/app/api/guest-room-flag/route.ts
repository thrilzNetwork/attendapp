import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { isAllowedOrigin } from '@/lib/api-auth';

/**
 * POST /api/guest-room-flag
 * Guest-side: when a guest requests housekeeping, mark their room with the
 * requested service (full / light) on the room board so housekeeping sees it
 * on the rooms grid. Service-role write, hotel-scoped by body.hotel_id —
 * same trust shape as guest-book-shuttle.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  if (!isAllowedOrigin(origin, referer)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { hotel_id, room_number, flag } = body;

    if (!hotel_id || !room_number || !flag) {
      return NextResponse.json({ error: 'hotel_id, room_number, and flag are required' }, { status: 400 });
    }
    if (!['full', 'light'].includes(flag)) {
      return NextResponse.json({ error: 'flag must be "full" or "light"' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Guard: the room must already exist on this hotel — blocks forged room rows
    // for arbitrary room numbers and never creates rooms.
    const { data: roomRow } = await supabase
      .from('hotel_rooms')
      .select('room_number')
      .eq('hotel_id', hotel_id)
      .eq('room_number', String(room_number).trim())
      .limit(1);
    if (!roomRow || roomRow.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Light per-IP throttle: 10 writes/min/IP (module-level memo; per-instance)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const nowMs = Date.now();
    const bucketKey = `grf:${ip}`;
    const g = globalThis as unknown as { __grfHits?: Map<string, number[]> };
    const hitsMap = g.__grfHits || new Map();
    g.__grfHits = hitsMap;
    const hits = (hitsMap.get(bucketKey) || []).filter((t: number) => nowMs - t < 60_000);
    if (hits.length >= 10) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    hits.push(nowMs);
    hitsMap.set(bucketKey, hits);
    const { error } = await supabase.from('room_status').upsert({
      hotel_id,
      room_number,
      service_flag: flag,
      service_flag_by: 'Guest request',
      service_flag_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'hotel_id,room_number', ignoreDuplicates: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to set room flag' }, { status: 500 });
  }
}