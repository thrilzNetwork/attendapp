import { NextRequest, NextResponse } from 'next/server';
import { getTaxiCallerQuote } from '@/lib/taxicaller';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { pickup, destination, pax, pickupTime } = await req.json() as {
      pickup: string;
      destination: string;
      pax: number;
      pickupTime: string;
    };

    if (!pickup || !destination || !pax || !pickupTime) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const quote = await getTaxiCallerQuote({ pickup, destination, pax, pickupTime });

    const surcharge_cents = Math.round(quote.base_fare_cents * 0.10);
    const total_cents = quote.base_fare_cents + surcharge_cents;

    return NextResponse.json({
      ok: true,
      quoteId: quote.quoteId,
      base_fare_cents: quote.base_fare_cents,
      surcharge_cents,
      total_cents,
      currency: quote.currency,
      estimated_mins: quote.estimated_mins,
      vehicle_type: quote.vehicle_type,
    });
  } catch (e: unknown) {
    console.error('taxicaller/quote error:', e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Quote failed' }, { status: 500 });
  }
}
