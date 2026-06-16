import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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

  const locationByDevice = new Map((locations || []).map(l => [l.device_id, l]));
  const merged = (devices || []).map(d => ({
    ...d,
    bouncie_locations: locationByDevice.get(d.device_id) ? [locationByDevice.get(d.device_id)] : [],
  }));

  return NextResponse.json({ ok: true, devices: merged });
}
