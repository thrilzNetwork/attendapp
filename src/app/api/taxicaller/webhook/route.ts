import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const STATUS_MAP: Record<string, string> = {
  driver_assigned: 'assigned',
  pickup_started: 'in-progress',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'cancelled',
};

export async function POST(req: NextRequest) {
  try {
    // Optionally verify webhook secret
    const secret = process.env.TAXICALLER_WEBHOOK_SECRET;
    if (secret) {
      const sig = req.headers.get('x-taxicaller-signature');
      if (sig !== secret) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = await req.json() as {
      event: string;
      booking_id: string;
      driver?: { name: string; phone: string };
    };

    const { event, booking_id, driver } = body;
    if (!booking_id) return NextResponse.json({ received: true });

    const db = getSupabaseAdmin();
    const mappedStatus = STATUS_MAP[event];

    const updates: Record<string, string> = {};
    if (mappedStatus) updates.status = mappedStatus;
    if (driver?.name) updates.taxicaller_driver_name = driver.name;
    if (driver?.phone) updates.taxicaller_driver_phone = driver.phone;

    if (Object.keys(updates).length > 0) {
      await db.from('shuttle_requests').update(updates).eq('taxicaller_booking_id', booking_id);
      // Mirror status to requests table for staff OrdersView
      if (updates.status) {
        await db.from('requests').update({ status: updates.status }).eq('taxicaller_booking_id', booking_id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: unknown) {
    console.error('taxicaller/webhook error:', e);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
