import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getActiveBouncieToken, listBouncieTrips } from '@/lib/bouncie';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  if (!hotelId) {
    return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Get all devices for this hotel
  const { data: devices } = await db
    .from('bouncie_devices')
    .select('device_id')
    .eq('hotel_id', hotelId)
    .eq('is_active', true);

  // Pull live trips from Bouncie API for each device
  if (devices && devices.length > 0) {
    try {
      const accessToken = await getActiveBouncieToken(hotelId);
      const startsAfter = `${date}T00:00:00Z`;
      const endsBefore = `${date}T23:59:59Z`;

      for (const { device_id } of devices) {
        const liveTrips = await listBouncieTrips(accessToken, device_id, {
          startsAfter,
          endsBefore,
          limit: 50,
        }).catch(() => [] as unknown[]);

        for (const t of liveTrips as Record<string, unknown>[]) {
          if (!t.tripId) continue;
          await db.from('bouncie_trips').upsert(
            {
              hotel_id: hotelId,
              device_id,
              trip_id: t.tripId as string,
              start_at: t.startTime as string,
              end_at: (t.endTime as string) || null,
              distance_miles: (t.distance as number) || 0,
              duration_seconds: (t.duration as number) || 0,
              start_lat: (t.startLocation as Record<string, number>)?.lat ?? null,
              start_lng: (t.startLocation as Record<string, number>)?.lon ?? null,
              end_lat: (t.endLocation as Record<string, number>)?.lat ?? null,
              end_lng: (t.endLocation as Record<string, number>)?.lon ?? null,
            },
            { onConflict: 'trip_id' }
          );
        }
      }
    } catch (err) {
      console.error('Bouncie live trip fetch failed (non-fatal):', err);
    }
  }

  // Return today's trips from DB (now fresh)
  const { data, error } = await db
    .from('bouncie_trips')
    .select('*')
    .eq('hotel_id', hotelId)
    .gte('start_at', `${date}T00:00:00Z`)
    .lte('start_at', `${date}T23:59:59Z`)
    .order('start_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, trips: data || [] });
}
