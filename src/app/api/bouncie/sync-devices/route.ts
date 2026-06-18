import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get('hotelId');
    if (!hotelId) {
      return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });
    }

    const { getActiveBouncieToken, listBouncieVehicles } = await import('@/lib/bouncie');
    const token = await getActiveBouncieToken(hotelId);
    const vehicles = await listBouncieVehicles(token);

    const db = getSupabaseAdmin();
    for (const v of vehicles) {
      if (!v.deviceId) continue;
      await db.from('bouncie_devices').upsert(
        {
          hotel_id: hotelId,
          device_id: v.deviceId,
          vehicle_name: v.name || '',
          vin: v.vin || '',
          imei: v.imei || '',
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'hotel_id,device_id' }
      );

      // Seed latest location if available
      const gps = v.stats?.gps;
      if (gps?.lat !== undefined && gps?.lng !== undefined && gps.dt) {
        await db.from('bouncie_locations').upsert(
          {
            device_id: v.deviceId,
            hotel_id: hotelId,
            lat: gps.lat,
            lng: gps.lng,
            speed_mph: gps.speed || 0,
            heading: gps.heading || 0,
            accuracy: gps.accuracy || 0,
            recorded_at: gps.dt,
            received_at: new Date().toISOString(),
          },
          { onConflict: 'device_id' }
        );
      }
    }

    return NextResponse.json({ ok: true, count: vehicles.length });
  } catch (e) {
    console.error('Bouncie sync devices error:', e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
