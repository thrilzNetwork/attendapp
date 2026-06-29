import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryQuote } from '@/lib/uber-direct';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const fromAddress = p.get('fromAddress');
  const toAddress = p.get('toAddress');
  const fromLat = p.get('fromLat');
  const fromLng = p.get('fromLng');
  const toLat = p.get('toLat');
  const toLng = p.get('toLng');

  if (!fromAddress || !toAddress) {
    return NextResponse.json({ ok: false, reason: 'fromAddress and toAddress are required' }, { status: 400 });
  }

  try {
    const quote = await getDeliveryQuote({
      pickup_address: fromAddress,
      dropoff_address: toAddress,
      pickup_lat: fromLat ? parseFloat(fromLat) : undefined,
      pickup_lng: fromLng ? parseFloat(fromLng) : undefined,
      dropoff_lat: toLat ? parseFloat(toLat) : undefined,
      dropoff_lng: toLng ? parseFloat(toLng) : undefined,
    });
    return NextResponse.json({
      ok: true,
      feeCents: quote.fee_cents,
      fee_display: quote.fee_display,
      eta_minutes: quote.eta_minutes,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: e instanceof Error ? e.message : 'Quote failed' });
  }
}
