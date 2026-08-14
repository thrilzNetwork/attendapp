import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { calculateETA } from '@/lib/bouncie';

/**
 * ElevenLabs server tool: Get live shuttle GPS location.
 * Called by the agent when a guest asks "where is the shuttle?" or "how long until shuttle arrives?"
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hotel_id = body.hotel_id || '7feb88fa-a72c-4c5d-b094-b4948bdab1d7';

    const supabase = getSupabaseAdmin();

    // Get all shuttle devices for this hotel
    const { data: devices, error: devError } = await supabase
      .from('bouncie_devices')
      .select('device_id, vehicle_name, is_shuttle, is_active')
      .eq('hotel_id', hotel_id)
      .eq('is_shuttle', true)
      .eq('is_active', true);

    if (devError) throw devError;

    if (!devices || devices.length === 0) {
      return NextResponse.json({
        ok: false,
        message: 'No shuttle vehicles are currently tracked for this property.',
      });
    }

    // Get latest GPS location for each device
    const deviceIds = devices.map((d: Record<string, unknown>) => d.device_id as string);
    const { data: locations, error: locError } = await supabase
      .from('bouncie_locations')
      .select('device_id, lat, lng, speed_mph, heading, recorded_at, received_at')
      .in('device_id', deviceIds)
      .order('received_at', { ascending: false });

    if (locError) throw locError;

    // Get hotel coordinates for ETA calculation
    const { data: hotel } = await supabase
      .from('hotels')
      .select('name, lat, lng')
      .eq('id', hotel_id)
      .maybeSingle();

    // Build a map of device_id → latest location
    const locMap: Record<string, Record<string, unknown>> = {};
    if (locations) {
      for (const loc of locations) {
        const l = loc as Record<string, unknown>;
        const did = l.device_id as string;
        if (!locMap[did]) locMap[did] = l;
      }
    }

    const shuttles = devices.map((d: Record<string, unknown>) => {
      const loc = locMap[d.device_id as string] || null;
      let eta: { distanceMiles: number; etaMinutes: number } | null = null;
      if (loc && hotel?.lat != null && hotel?.lng != null) {
        eta = calculateETA(
          Number(loc.lat), Number(loc.lng),
          Number(hotel.lat), Number(hotel.lng),
          Number(loc.speed_mph) || 0
        );
      }
      return {
        vehicle_name: d.vehicle_name,
        is_active: d.is_active,
        gps: loc ? {
          lat: Number(loc.lat),
          lng: Number(loc.lng),
          speed_mph: Number(loc.speed_mph) || 0,
          heading: Number(loc.heading) || 0,
          recorded_at: loc.recorded_at,
        } : null,
        distance_miles: eta?.distanceMiles ?? null,
        eta_minutes: eta?.etaMinutes ?? null,
      };
    });

    const activeShuttles = shuttles.filter(s => s.gps !== null);

    if (activeShuttles.length === 0) {
      return NextResponse.json({
        ok: false,
        message: 'Shuttle is currently offline — no GPS data available. The shuttle may be parked in a garage.',
      });
    }

    const s = activeShuttles[0];
    const gps = s.gps!;
    const etaText = s.eta_minutes !== null
      ? `The shuttle is ${s.distance_miles?.toFixed(1)} miles away and should arrive in approximately ${s.eta_minutes} minutes.`
      : 'Unable to calculate ETA — hotel location not configured.';

    return NextResponse.json({
      ok: true,
      shuttle: s,
      message: `${s.vehicle_name} is currently at ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}, traveling at ${gps.speed_mph} mph. ${etaText}`,
    });
  } catch (e) {
    console.error('Shuttle GPS tool error:', e);
    return NextResponse.json({ error: 'Failed to get shuttle location' }, { status: 500 });
  }
}