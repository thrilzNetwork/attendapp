import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryQuote } from '@/lib/uber-direct';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  if (!process.env.UBER_DIRECT_CLIENT_ID) {
    return NextResponse.json({ ok: false, reason: 'not_configured' });
  }
  const { searchParams } = new URL(req.url);
  const partnerId = searchParams.get('partnerId');
  const hotelId = searchParams.get('hotelId');
  if (!partnerId || !hotelId) return NextResponse.json({ ok: false, reason: 'missing_params' });

  const [{ data: partner }, { data: hotel }] = await Promise.all([
    supabaseAdmin.from('partners').select('name,address,lat,lng,phone').eq('id', partnerId).maybeSingle(),
    supabaseAdmin.from('hotels').select('name,address,lat,lng').eq('id', hotelId).maybeSingle(),
  ]);

  if (!partner?.address || !hotel?.address) return NextResponse.json({ ok: false, reason: 'missing_address' });

  try {
    const quote = await getDeliveryQuote({
      pickup_address: partner.address,
      dropoff_address: hotel.address,
      pickup_lat: partner.lat ?? undefined,
      pickup_lng: partner.lng ?? undefined,
      dropoff_lat: hotel.lat ?? undefined,
      dropoff_lng: hotel.lng ?? undefined,
    });
    return NextResponse.json({ ok: true, quote });
  } catch {
    return NextResponse.json({ ok: false, reason: 'unavailable' });
  }
}
