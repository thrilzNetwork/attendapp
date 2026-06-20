import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBouncieConfig, haversineDistanceMiles, HOTEL_ARRIVAL_RADIUS_MILES } from '@/lib/bouncie';

// Bouncie's tripData webhook sends `data` as an array of GPS samples, each
// shaped like { gps: { lat, lon, heading, speed }, speed, timestamp }. Older
// shapes put lat/lng directly on the object. Normalize the latest point.
function extractGps(payload: unknown): { lat: number; lng: number; speed: number; heading: number; accuracy: number; recordedAt: string } | null {
  const raw = payload as Record<string, unknown> | undefined;
  if (!raw) return null;
  // `data` may be an array of samples, a single object, or absent (fields on root)
  const dataField = raw.data;
  const sample = (Array.isArray(dataField) ? dataField[dataField.length - 1] : (dataField ?? raw)) as Record<string, unknown> | undefined;
  if (!sample) return null;
  const gps = (sample.gps ?? sample.location ?? sample) as Record<string, unknown>;
  const lat = (gps.lat ?? gps.latitude) as number | undefined;
  const lng = (gps.lon ?? gps.lng ?? gps.longitude) as number | undefined;
  if (lat === undefined || lat === null || lng === undefined || lng === null) return null;
  return {
    lat: Number(lat),
    lng: Number(lng),
    speed: Number((sample.speed ?? gps.speed ?? 0) as number) || 0,
    heading: Number((gps.heading ?? sample.heading ?? 0) as number) || 0,
    accuracy: Number((gps.accuracy ?? 0) as number) || 0,
    recordedAt: (sample.timestamp ?? sample.dt ?? gps.timestamp ?? new Date().toISOString()) as string,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Validate webhook secret only when Bouncie actually sends an auth header.
    // Bouncie's webhook config doesn't always attach one — if we hard-rejected
    // a missing header we'd silently drop every live GPS update.
    const authHeader = req.headers.get('authorization') || req.headers.get('x-bouncie-authorization') || req.headers.get('x-api-key');
    const { webhookSecret } = getBouncieConfig();
    if (webhookSecret && authHeader && authHeader !== webhookSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const eventType = body.eventType || body.type || 'unknown';
    const deviceId = body.deviceId || body.imei || body.vin || '';

    // Look up hotel by device id
    const db = getSupabaseAdmin();
    const { data: device } = await db
      .from('bouncie_devices')
      .select('hotel_id')
      .eq('device_id', deviceId)
      .maybeSingle();

    const hotelId = device?.hotel_id;

    // tripData contains live GPS during a trip
    if (eventType === 'tripData') {
      const gps = extractGps(body);
      if (gps && deviceId && hotelId) {
        await db.from('bouncie_locations').upsert(
          {
            device_id: deviceId,
            hotel_id: hotelId,
            lat: gps.lat,
            lng: gps.lng,
            speed_mph: gps.speed,
            heading: gps.heading,
            accuracy: gps.accuracy,
            recorded_at: gps.recordedAt,
            received_at: new Date().toISOString(),
          },
          { onConflict: 'device_id' }
        );

        // Geofence check: if shuttle is within 0.5 miles of hotel, insert a Shuttle Alert
        const { data: hotelRow } = await db.from('hotels').select('lat,lng').eq('id', hotelId).maybeSingle();
        if (hotelRow?.lat != null && hotelRow?.lng != null) {
          const distMiles = haversineDistanceMiles(gps.lat, gps.lng, Number(hotelRow.lat), Number(hotelRow.lng));
          if (distMiles <= HOTEL_ARRIVAL_RADIUS_MILES) {
            // Check if a Shuttle Alert was inserted in last 10 minutes to avoid spamming
            const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { data: recent } = await db.from('requests')
              .select('id')
              .eq('hotel_id', hotelId)
              .eq('type', 'Shuttle Alert')
              .gte('created_at', tenMinAgo)
              .limit(1);
            if (!recent || recent.length === 0) {
              await db.from('requests').insert({
                hotel_id: hotelId,
                guest_name: 'System',
                room: 'STAFF',
                type: 'Shuttle Alert',
                details: `Shuttle is arriving — ${distMiles.toFixed(2)} miles away`,
                status: 'pending',
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // tripStart
    if (eventType === 'tripStart') {
      const trip = body.data || body;
      if (trip.transactionId && deviceId && hotelId) {
        await db.from('bouncie_trips').upsert(
          {
            hotel_id: hotelId,
            device_id: deviceId,
            trip_id: trip.transactionId,
            start_at: trip.startTime || new Date().toISOString(),
            start_lat: trip.startLocation?.lat,
            start_lng: trip.startLocation?.lng,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'hotel_id,trip_id' }
        );
      }
    }

    // tripEnd / tripMetrics
    if (eventType === 'tripEnd' || eventType === 'tripMetrics') {
      const trip = body.data || body;
      if (trip.transactionId && deviceId && hotelId) {
        await db.from('bouncie_trips').upsert(
          {
            hotel_id: hotelId,
            device_id: deviceId,
            trip_id: trip.transactionId,
            end_at: trip.endTime || trip.timestamp || new Date().toISOString(),
            end_lat: trip.endLocation?.lat,
            end_lng: trip.endLocation?.lng,
            distance_miles: trip.distance?.value || trip.distanceMiles || 0,
            duration_seconds: trip.duration?.value || trip.durationSeconds || 0,
            max_speed_mph: trip.maxSpeed?.value || trip.maxSpeed || 0,
            average_speed_mph: trip.averageSpeed?.value || trip.averageSpeed || 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'hotel_id,trip_id' }
        );
      }
    }

    // Return 200 quickly so Bouncie stops retrying
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Bouncie webhook error:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
