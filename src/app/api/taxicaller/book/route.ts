import { NextRequest, NextResponse } from 'next/server';
import { createTaxiCallerBooking } from '@/lib/taxicaller';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { requestId, quoteId, guestName, guestPhone, pickup, destination, pickupTime, pax, notes } = await req.json() as {
      requestId: string;
      quoteId: string;
      guestName: string;
      guestPhone?: string;
      pickup: string;
      destination: string;
      pickupTime: string;
      pax: number;
      notes?: string;
    };

    if (!requestId || !quoteId || !guestName || !pickup || !destination || !pickupTime) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const booking = await createTaxiCallerBooking({ quoteId, guestName, guestPhone, pickup, destination, pickupTime, pax, notes });

    const db = getSupabaseAdmin();
    await db.from('shuttle_requests').update({
      taxicaller_booking_id: booking.booking_id,
      taxicaller_tracking_url: booking.tracking_url,
      taxicaller_driver_name: booking.driver_name,
      taxicaller_driver_phone: booking.driver_phone,
      status: 'confirmed',
    }).eq('id', requestId);

    return NextResponse.json({ ok: true, booking });
  } catch (e: unknown) {
    console.error('taxicaller/book error:', e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Booking failed' }, { status: 500 });
  }
}
