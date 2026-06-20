import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { calculateETA, detectShuttleDirection, getActiveBouncieToken, listBouncieVehicles, normalizeBouncieVehicle } from '@/lib/bouncie';
import { geocodeAddress } from '@/lib/geocode';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  if (!hotelId) {
    return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: connection } = await db.from('bouncie_connections').select('id').eq('hotel_id', hotelId).maybeSingle();

  // Not connected = no OAuth token at all
  if (!connection) {
    return NextResponse.json({ ok: true, connected: false, devices: [] });
  }

  // Pull live GPS from Bouncie API and refresh DB locations
  let syncError: string | null = null;
  try {
    const accessToken = await getActiveBouncieToken(hotelId);
    const liveVehicles = await listBouncieVehicles(accessToken);
    for (const raw of liveVehicles) {
      const v = normalizeBouncieVehicle(raw);
      if (!v) continue;
      await db.from('bouncie_devices').upsert(
        { hotel_id: hotelId, device_id: v.deviceId, vehicle_name: v.name, is_active: true, is_shuttle: true, updated_at: new Date().toISOString() },
        { onConflict: 'hotel_id,device_id' }
      );
      if (v.gps) {
        await db.from('bouncie_locations').upsert(
          { device_id: v.deviceId, hotel_id: hotelId, lat: v.gps.lat, lng: v.gps.lng, speed_mph: v.gps.speed, heading: v.gps.heading, accuracy: v.gps.accuracy, recorded_at: v.gps.recordedAt, received_at: new Date().toISOString() },
          { onConflict: 'device_id' }
        );
      }
    }
  } catch (err) {
    syncError = err instanceof Error ? err.message : String(err);
    console.error('Bouncie live vehicle fetch failed:', syncError);
  }

  // Re-fetch devices + locations after live sync
  const [{ data: freshDevices }, { data: freshLocations }] = await Promise.all([
    db.from('bouncie_devices').select('*').eq('hotel_id', hotelId).eq('is_active', true),
    db.from('bouncie_locations').select('*').eq('hotel_id', hotelId),
  ]);

  // Fetch hotel + shuttle destination coordinates.
  // Auto-geocode either if coordinates are missing (staff never enter them manually).
  let { data: hotel } = await db
    .from('hotels')
    .select('lat,lng,name,address,shuttle_dest_name,shuttle_dest_address,shuttle_dest_lat,shuttle_dest_lng')
    .eq('id', hotelId)
    .maybeSingle();

  if (hotel && (hotel.lat == null || hotel.lng == null) && hotel.address) {
    const geo = await geocodeAddress(`${hotel.name || ''}, ${hotel.address}`.trim().replace(/^,\s*/, ''))
      || await geocodeAddress(hotel.address);
    if (geo) {
      await db.from('hotels').update({ lat: geo.lat, lng: geo.lng }).eq('id', hotelId);
      hotel = { ...hotel, lat: geo.lat, lng: geo.lng };
    }
  }

  // Auto-geocode destination if address is set but coords are missing
  if (hotel && hotel.shuttle_dest_address && (hotel.shuttle_dest_lat == null || hotel.shuttle_dest_lng == null)) {
    const query = hotel.shuttle_dest_name
      ? `${hotel.shuttle_dest_name}, ${hotel.shuttle_dest_address}`
      : hotel.shuttle_dest_address;
    const geo = await geocodeAddress(query) || await geocodeAddress(hotel.shuttle_dest_address);
    if (geo) {
      await db.from('hotels').update({ shuttle_dest_lat: geo.lat, shuttle_dest_lng: geo.lng }).eq('id', hotelId);
      hotel = { ...hotel, shuttle_dest_lat: geo.lat, shuttle_dest_lng: geo.lng };
    }
  }

  const hotelCoords = hotel?.lat != null && hotel?.lng != null
    ? { lat: Number(hotel.lat), lng: Number(hotel.lng) }
    : null;

  const destCoords = hotel?.shuttle_dest_lat != null && hotel?.shuttle_dest_lng != null
    ? { lat: Number(hotel.shuttle_dest_lat), lng: Number(hotel.shuttle_dest_lng) }
    : null;

  const destName = hotel?.shuttle_dest_name || hotel?.shuttle_dest_address || null;

  const locationByDevice = new Map((freshLocations || []).map(l => [l.device_id, l]));
  const merged = (freshDevices || []).map(d => {
    const loc = locationByDevice.get(d.device_id);

    // ETA to hotel (returning leg)
    let etaToHotel: { distanceMiles: number; etaMinutes: number } | null = null;
    if (loc && hotelCoords) {
      etaToHotel = calculateETA(loc.lat, loc.lng, hotelCoords.lat, hotelCoords.lng, loc.speed_mph || 0);
    }

    // ETA to destination (outbound leg)
    let etaToDest: { distanceMiles: number; etaMinutes: number } | null = null;
    if (loc && destCoords) {
      etaToDest = calculateETA(loc.lat, loc.lng, destCoords.lat, destCoords.lng, loc.speed_mph || 0);
    }

    // Direction detection
    let shuttleDirection: string | null = null;
    if (loc && hotelCoords && destCoords) {
      shuttleDirection = detectShuttleDirection(loc.lat, loc.lng, hotelCoords.lat, hotelCoords.lng, destCoords.lat, destCoords.lng);
    }

    return {
      ...d,
      bouncie_locations: loc ? [loc] : [],
      // Legacy single-ETA field = ETA to hotel (used by older UI paths)
      eta: etaToHotel,
      etaToHotel,
      etaToDest,
      shuttleDirection,
    };
  });

  return NextResponse.json({
    ok: true,
    connected: true,
    devices: merged,
    syncError,
    hotelCoords,
    destCoords,
    destName,
  });
}
