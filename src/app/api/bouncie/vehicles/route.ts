import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { BouncieAuthError, calculateETA, detectShuttleDirection, getActiveBouncieToken, listBouncieVehicles, normalizeBouncieVehicle } from '@/lib/bouncie';
import { geocodeAddress } from '@/lib/geocode';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  if (!hotelId) return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: connection } = await db.from('bouncie_connections').select('id').eq('hotel_id', hotelId).maybeSingle();
  if (!connection) return NextResponse.json({ ok: true, connected: false, devices: [] });

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
      // Persist fuel level when Bouncie reports it (forward-compatible; column may not exist on older schemas)
      if (v.fuelPercent != null) {
        try {
          await db.from('bouncie_devices').update({ fuel_percent: v.fuelPercent }).eq('hotel_id', hotelId).eq('device_id', v.deviceId);
        } catch { /* fuel column not present — skip */ }
      }
    }
  } catch (err) {
    if (err instanceof BouncieAuthError) {
      return NextResponse.json({ ok: true, connected: false, needsReauth: true, devices: [] });
    }
    syncError = err instanceof Error ? err.message : String(err);
    console.error('Bouncie live vehicle fetch failed:', syncError);
  }

  const [{ data: freshDevices }, { data: freshLocations }] = await Promise.all([
    db.from('bouncie_devices').select('*').eq('hotel_id', hotelId).eq('is_active', true),
    db.from('bouncie_locations').select('*').eq('hotel_id', hotelId),
  ]);

  // Hotel record — includes lat/lng + all destination config
  let { data: hotel } = await db
    .from('hotels')
    .select('lat,lng,name,address,shuttle_dest_name,shuttle_dest_address,shuttle_dest_lat,shuttle_dest_lng,shuttle_destinations')
    .eq('id', hotelId)
    .maybeSingle();

  // Auto-geocode hotel if missing coords
  if (hotel && (hotel.lat == null || hotel.lng == null) && hotel.address) {
    const geo = await geocodeAddress(`${hotel.name || ''}, ${hotel.address}`.trim().replace(/^,\s*/, ''))
      || await geocodeAddress(hotel.address);
    if (geo) {
      await db.from('hotels').update({ lat: geo.lat, lng: geo.lng }).eq('id', hotelId);
      hotel = { ...hotel, lat: geo.lat, lng: geo.lng };
    }
  }

  const hotelCoords = hotel?.lat != null && hotel?.lng != null
    ? { lat: Number(hotel.lat), lng: Number(hotel.lng) }
    : null;

  // Build destinations list from the new multi-dest array
  interface DestEntry { name: string; address: string; lat: number | null; lng: number | null }
  const destinations: DestEntry[] = Array.isArray(hotel?.shuttle_destinations) ? [...hotel.shuttle_destinations] : [];

  // Migrate legacy single-destination fields into the array (one-time, transparent)
  if (hotel?.shuttle_dest_address && !destinations.some(d => d.address === hotel!.shuttle_dest_address)) {
    let lat: number | null = hotel.shuttle_dest_lat ?? null;
    let lng: number | null = hotel.shuttle_dest_lng ?? null;
    if (lat == null || lng == null) {
      const q = hotel.shuttle_dest_name ? `${hotel.shuttle_dest_name}, ${hotel.shuttle_dest_address}` : hotel.shuttle_dest_address;
      const geo = await geocodeAddress(q) || await geocodeAddress(hotel.shuttle_dest_address);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }
    destinations.unshift({ name: hotel.shuttle_dest_name || hotel.shuttle_dest_address, address: hotel.shuttle_dest_address, lat, lng });
    await db.from('hotels').update({ shuttle_destinations: destinations }).eq('id', hotelId);
  }

  // Geocode any destinations that are missing coords
  let destsDirty = false;
  for (const dest of destinations) {
    if (dest.address && (dest.lat == null || dest.lng == null)) {
      const geo = await geocodeAddress(`${dest.name}, ${dest.address}`) || await geocodeAddress(dest.address);
      if (geo) { dest.lat = geo.lat; dest.lng = geo.lng; destsDirty = true; }
    }
  }
  if (destsDirty) {
    await db.from('hotels').update({ shuttle_destinations: destinations }).eq('id', hotelId);
  }

  const validDests = destinations.filter(d => d.lat != null && d.lng != null);

  const locationByDevice = new Map((freshLocations || []).map(l => [l.device_id, l]));
  const merged = (freshDevices || []).map(d => {
    const loc = locationByDevice.get(d.device_id);

    // Pick active destination = nearest one to current shuttle position
    let activeDest: DestEntry | null = null;
    if (loc && validDests.length > 0) {
      activeDest = validDests.reduce((nearest, dest) => {
        const { distanceMiles: da } = calculateETA(loc.lat, loc.lng, dest.lat!, dest.lng!, 0);
        const { distanceMiles: dn } = calculateETA(loc.lat, loc.lng, nearest.lat!, nearest.lng!, 0);
        return da < dn ? dest : nearest;
      });
    }

    const destCoords = activeDest ? { lat: activeDest.lat!, lng: activeDest.lng! } : null;

    const etaToHotel = (loc && hotelCoords)
      ? calculateETA(loc.lat, loc.lng, hotelCoords.lat, hotelCoords.lng, loc.speed_mph || 0)
      : null;
    const etaToDest = (loc && destCoords)
      ? calculateETA(loc.lat, loc.lng, destCoords.lat, destCoords.lng, loc.speed_mph || 0)
      : null;
    const shuttleDirection = (loc && hotelCoords && destCoords)
      ? detectShuttleDirection(loc.lat, loc.lng, hotelCoords.lat, hotelCoords.lng, destCoords.lat, destCoords.lng, loc.heading, loc.speed_mph || 0)
      : null;

    // Parked = device not moving for 10+ min (speed ≤ 2 and position not refreshed recently).
    // Derived server-side so every UI surface shows a consistent parked state.
    const locAgeMin = loc?.recorded_at ? (Date.now() - new Date(loc.recorded_at).getTime()) / 60000 : null;
    const isParked = loc ? (loc.speed_mph || 0) <= 2 && (locAgeMin == null || locAgeMin >= 5) : false;

    return {
      ...d,
      bouncie_locations: loc ? [{ ...loc, is_parked: isParked }] : [],
      fuel_percent: (d as Record<string, unknown>).fuel_percent ?? null,
      eta: etaToHotel,
      etaToHotel,
      etaToDest,
      shuttleDirection,
      activeDestName: activeDest?.name || null,
    };
  });

  return NextResponse.json({
    ok: true,
    connected: true,
    devices: merged,
    syncError,
    hotelCoords,
    hotelName: hotel?.name || null,
    hotelAddress: hotel?.address || null,
    destinations,
    // legacy single-dest fields for older UI paths
    destCoords: validDests[0] ? { lat: validDests[0].lat, lng: validDests[0].lng } : null,
    destName: validDests[0]?.name || null,
  });
}
