import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { calculateETA } from '@/lib/bouncie';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  if (!hotelId) {
    return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const [{ data: devices, error: devicesError }, { data: locations, error: locationsError }] = await Promise.all([
    db.from('bouncie_devices').select('*').eq('hotel_id', hotelId).eq('is_active', true),
    db.from('bouncie_locations').select('*').eq('hotel_id', hotelId),
  ]);

  if (devicesError) return NextResponse.json({ error: devicesError.message }, { status: 500 });
  if (locationsError) return NextResponse.json({ error: locationsError.message }, { status: 500 });

  // Fetch hotel lat/lng for ETA calculation
  const { data: hotel } = await db.from('hotels').select('lat,lng').eq('id', hotelId).maybeSingle();

  const locationByDevice = new Map((locations || []).map(l => [l.device_id, l]));
  const merged = (devices || []).map(d => {
    const loc = locationByDevice.get(d.device_id);
    let eta: { distanceMiles: number; etaMinutes: number } | null = null;
    if (loc && hotel?.lat != null && hotel?.lng != null) {
      eta = calculateETA(loc.lat, loc.lng, Number(hotel.lat), Number(hotel.lng), loc.speed_mph || 0);
    }
    return {
      ...d,
      bouncie_locations: loc ? [loc] : [],
      eta,
    };
  });

  return NextResponse.json({ ok: true, devices: merged });
}
