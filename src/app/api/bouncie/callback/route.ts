import { NextRequest, NextResponse } from 'next/server';
import { exchangeBouncieCode, getActiveBouncieToken, listBouncieVehicles } from '@/lib/bouncie';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');

  let hotelId = '';
  try {
    const parsed = stateRaw ? JSON.parse(stateRaw) : {};
    hotelId = parsed.hotelId || '';
  } catch {
    hotelId = stateRaw || '';
  }

  if (!code || !hotelId) {
    return NextResponse.redirect(new URL(`/staff?tab=shuttle&error=bouncie_missing_params`, req.url));
  }

  try {
    const tokens = await exchangeBouncieCode(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const db = getSupabaseAdmin();
    await db.from('bouncie_connections').upsert(
      {
        hotel_id: hotelId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'hotel_id' }
    );

    // Sync devices inline — no HTTP fetch needed, avoids APP_URL issues
    try {
      const accessToken = await getActiveBouncieToken(hotelId);
      const vehicles = await listBouncieVehicles(accessToken);
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
            is_shuttle: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'hotel_id,device_id' }
        );
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
    } catch (syncErr) {
      console.error('Bouncie device sync failed (non-fatal):', syncErr);
    }

    return NextResponse.redirect(new URL(`/staff?tab=shuttle&bouncie_connected=1`, req.url));
  } catch (e) {
    console.error('Bouncie callback error:', e);
    return NextResponse.redirect(new URL(`/staff?tab=shuttle&error=bouncie_oauth_failed`, req.url));
  }
}

