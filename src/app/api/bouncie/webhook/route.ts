import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getBouncieConfig, haversineDistanceMiles, HOTEL_ARRIVAL_RADIUS_MILES } from '@/lib/bouncie';

export async function POST(req: NextRequest) {
  try {
    // Validate webhook secret
    const authHeader = req.headers.get('authorization') || req.headers.get('x-bouncie-authorization');
    const { webhookSecret } = getBouncieConfig();
    if (webhookSecret && authHeader !== webhookSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const eventType = body.eventType || body.type || 'unknown';
    const deviceId = body.deviceId || body.imei || '';

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
      const loc = body.data || body;
      if (loc.lat !== undefined && loc.lng !== undefined && deviceId && hotelId) {
        await db.from('bouncie_locations').upsert(
          {
            device_id: deviceId,
            hotel_id: hotelId,
            lat: loc.lat,
            lng: loc.lng,
            speed_mph: loc.speed || 0,
            heading: loc.heading || 0,
            accuracy: loc.accuracy || 0,
            odometer: loc.odometer || 0,
            recorded_at: loc.dt || new Date().toISOString(),
            received_at: new Date().toISOString(),
          },
          { onConflict: 'device_id' }
        );

        // Geofence check: if shuttle is within 0.5 miles of hotel, insert a Shuttle Alert
        const { data: hotelRow } = await db.from('hotels').select('lat,lng').eq('id', hotelId).maybeSingle();
        if (hotelRow?.lat != null && hotelRow?.lng != null) {
          const distMiles = haversineDistanceMiles(loc.lat, loc.lng, Number(hotelRow.lat), Number(hotelRow.lng));
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
