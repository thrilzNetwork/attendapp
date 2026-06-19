import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createUberDelivery, getUberDelivery } from '@/lib/uber-direct';

export async function POST(req: NextRequest) {
  const { action, requestId } = await req.json();
  const db = getSupabaseAdmin();

  if (action === 'dispatch') {
    // Load the order
    const { data: order, error: oErr } = await db
      .from('requests')
      .select('*, partners(name, address, phone), hotels(name, address, phone)')
      .eq('id', requestId)
      .maybeSingle();
    if (oErr || !order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });

    if (order.uber_delivery_id) {
      return NextResponse.json({ ok: false, error: 'Already dispatched' }, { status: 400 });
    }

    const partner = order.partners as { name: string; address: string; phone: string } | null;
    const hotel = order.hotels as { name: string; address: string; phone: string } | null;

    if (!partner?.address || !hotel?.address) {
      return NextResponse.json({ ok: false, error: 'Missing pickup or dropoff address' }, { status: 400 });
    }

    // Parse items from details string for manifest
    const items = [{ name: order.details, quantity: 1, price: Number(order.total_amount || 0) }];

    const delivery = await createUberDelivery({
      pickupAddress: partner.address,
      pickupName: partner.name,
      pickupPhone: partner.phone || '+19543000000',
      dropoffAddress: hotel.address + ', Fort Lauderdale, FL',
      dropoffName: `${hotel.name} — Room ${order.room}`,
      dropoffPhone: hotel.phone || '+19543000000',
      dropoffNotes: `Guest: ${order.guest_name}, Room ${order.room}. ${order.details}`,
      items,
      externalId: requestId,
    });

    await db.from('requests').update({
      uber_delivery_id: delivery.id,
      uber_tracking_url: delivery.tracking_url,
      uber_status: delivery.status,
      uber_fee_cents: Math.round((delivery.fee?.total || 0)),
      delivery_method: 'uber_direct',
    }).eq('id', requestId);

    return NextResponse.json({
      ok: true,
      deliveryId: delivery.id,
      trackingUrl: delivery.tracking_url,
      status: delivery.status,
      feeCents: delivery.fee?.total,
    });
  }

  if (action === 'status') {
    const { data: order } = await db.from('requests').select('uber_delivery_id, uber_status, uber_tracking_url').eq('id', requestId).maybeSingle();
    if (!order?.uber_delivery_id) return NextResponse.json({ ok: false, error: 'No delivery found' }, { status: 404 });

    const delivery = await getUberDelivery(order.uber_delivery_id);
    await db.from('requests').update({ uber_status: delivery.status }).eq('id', requestId);

    return NextResponse.json({ ok: true, status: delivery.status, trackingUrl: order.uber_tracking_url, courier: delivery.courier });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
