import { NextRequest, NextResponse } from 'next/server';
import { getBestQuote } from '@/lib/delivery';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Without this the GET is prerendered at build time, where provider credentials
// are unset — baking a permanent {ok:false} response into the deploy regardless
// of what the runtime env actually has.
export const dynamic = 'force-dynamic';

/**
 * Delivery quote for a partner→hotel order.
 *
 * Named uber-direct for URL stability (the guest-ordering page already calls
 * this path) but no longer tied to Uber: it walks the same fallback chain as
 * dispatch, so quoting works even while Uber Direct's account is disabled —
 * which is the exact situation that motivated building the chain.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partnerId = searchParams.get('partnerId');
  const hotelId = searchParams.get('hotelId');
  if (!partnerId || !hotelId) return NextResponse.json({ ok: false, reason: 'missing_params' });

  const [{ data: partner }, { data: hotel }] = await Promise.all([
    supabaseAdmin.from('partners').select('name,address,lat,lng,phone,delivery_providers').eq('id', partnerId).maybeSingle(),
    supabaseAdmin.from('hotels').select('name,address,lat,lng').eq('id', hotelId).maybeSingle(),
  ]);

  if (!partner?.address || !hotel?.address) return NextResponse.json({ ok: false, reason: 'missing_address' });

  try {
    const { quote } = await getBestQuote(
      {
        partner_id: partnerId,
        pickup: { name: partner.name, address: partner.address, lat: partner.lat ?? undefined, lng: partner.lng ?? undefined, phone: partner.phone ?? undefined },
        dropoff: { name: hotel.name, address: hotel.address, lat: hotel.lat ?? undefined, lng: hotel.lng ?? undefined },
      },
      partner.delivery_providers,
    );
    return NextResponse.json({
      ok: true,
      quote: {
        id: quote.id,
        provider: quote.provider,
        fee_cents: quote.courier_fee_cents,
        fee_display: `$${(quote.courier_fee_cents / 100).toFixed(2)}`,
        eta_minutes: quote.eta_minutes,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: 'unavailable' });
  }
}
