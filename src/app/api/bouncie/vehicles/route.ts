import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { calculateETA, getActiveBouncieToken, listBouncieVehicles } from '@/lib/bouncie';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  if (!hotelId) {
    return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const [{ data: connection }, { data: devices, error: devicesError }, { data: locations, error: locationsError }] = await Promise.all([
    db.from('bouncie_connections').select('id').eq('hotel_id', hotelId).maybeSingle(),
    db.from('bouncie_devices').select('*').eq('hotel_id', hotelId).eq('is_active', true),
    db.from('bouncie_locations').select('*').eq('hotel_id', hotelId),
  ]);

  if (devicesError) return NextResponse.json({ error: devicesError.message }, { status: 500 });
  if (locationsError) return NextResponse.json({ error: locationsError.message }, { status: 500 });

  // Not connected = no OAuth token at all
  if (!connection) {
    return NextResponse.json({ ok: true, connected: false, devices: [] });
  }

  // Pull live GPS from Bouncie API and refresh DB locations
  try {
    const accessToken = await getActiveBouncieToken(hotelId);
    const liveVehicles = await listBouncieVehicles(accessToken);
    for (const v of liveVehicles) {
      if (!v.deviceId) continue;
      // Upsert device record
      await db.from('bouncie_devices').upsert(
        { hotel_id: hotelId, device_id: v.deviceId, vehicle_name: v.name || '', is_active: true, is_shuttle: true, updated_at: new Date().toISOString() },
        { onConflict: 'hotel_id,device_id' }
      );
      // Upsert latest GPS location
      const gps = v.stats?.gps;
      if (gps?.lat !== undefined && gps?.lng !== undefined && gps.dt) {
        await db.from('bouncie_locations').upsert(
          { device_id: v.deviceId, hotel_id: hotelId, lat: gps.lat, lng: gps.lng, speed_mph: gps.speed || 0, heading: gps.heading || 0, accuracy: gps.accuracy || 0, recorded_at: gps.dt, received_at: new Date().toISOString() },
          { onConflict: 'device_id' }
        );
      }
    }
  } catch (err) {
    console.error('Bouncie live vehicle fetch failed (non-fatal):', err);
  }

  // Re-fetch devices + locations after live sync
  const [{ data: freshDevices }, { data: freshLocations }] = await Promise.all([
    db.from('bouncie_devices').select('*').eq('hotel_id', hotelId).eq('is_active', true),
    db.from('bouncie_locations').select('*').eq('hotel_id', hotelId),
  ]);

  // Fetch hotel lat/lng for ETA calculation
  const { data: hotel } = await db.from('hotels').select('lat,lng').eq('id', hotelId).maybeSingle();

  const locationByDevice = new Map((freshLocations || []).map(l => [l.device_id, l]));
  const merged = (freshDevices || []).map(d => {
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

  return NextResponse.json({ ok: true, connected: true, devices: merged });
}
