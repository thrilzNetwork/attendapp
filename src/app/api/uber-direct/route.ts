import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createUberDelivery, getUberDelivery } from '@/lib/uber-direct';

export async function POST(req: NextRequest) {
  const { action, requestId, mode } = await req.json();
  // mode: 'food' (default) | 'transport'
  const db = getSupabaseAdmin();
  const isTransport = mode === 'transport';

  if (action === 'dispatch') {
    if (isTransport) {
      // shuttle_requests: hotel is pickup, guest destination is dropoff
      const { data: trip, error } = await db
        .from('shuttle_requests')
        .select('*, hotels(name, address, phone)')
        .eq('id', requestId)
        .maybeSingle();
      if (error || !trip) return NextResponse.json({ ok: false, error: 'Trip not found' }, { status: 404 });
      if (trip.uber_delivery_id) return NextResponse.json({ ok: false, error: 'Already dispatched' }, { status: 400 });

      const hotel = trip.hotels as { name: string; address: string; phone: string } | null;
      if (!hotel?.address) return NextResponse.json({ ok: false, error: 'Hotel address not set' }, { status: 400 });
      if (!trip.destination) return NextResponse.json({ ok: false, error: 'No destination on trip' }, { status: 400 });

      const when = [trip.date, trip.time ? `at ${trip.time}` : ''].filter(Boolean).join(' ');
      const delivery = await createUberDelivery({
        pickupAddress: `${hotel.address}, Fort Lauderdale, FL`,
        pickupName: hotel.name,
        pickupPhone: hotel.phone || '+19543000000',
        dropoffAddress: trip.destination,
        dropoffName: `${trip.guest_name} (Room ${trip.room_number})`,
        dropoffPhone: '+19543000000',
        dropoffNotes: `Guest: ${trip.guest_name}, Room ${trip.room_number}. ${trip.pax} pax. ${when}. ${trip.notes || ''}`.trim(),
        items: [{ name: `Transport for ${trip.guest_name}`, quantity: trip.pax || 1, price: 0 }],
        externalId: requestId,
      });

      await db.from('shuttle_requests').update({
        uber_delivery_id: delivery.id,
        uber_tracking_url: delivery.tracking_url,
        uber_status: delivery.status,
        uber_fee_cents: Math.round(delivery.fee?.total || 0),
        status: 'assigned',
      }).eq('id', requestId);

      return NextResponse.json({
        ok: true,
        deliveryId: delivery.id,
        trackingUrl: delivery.tracking_url,
        status: delivery.status,
        feeCents: delivery.fee?.total,
      });
    }

    // Food order: partner is pickup, hotel is dropoff
    const { data: order, error: oErr } = await db
      .from('requests')
      .select('*, partners(name, address, phone), hotels(name, address, phone)')
      .eq('id', requestId)
      .maybeSingle();
    if (oErr || !order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    if (order.uber_delivery_id) return NextResponse.json({ ok: false, error: 'Already dispatched' }, { status: 400 });

    const partner = order.partners as { name: string; address: string; phone: string } | null;
    const hotel = order.hotels as { name: string; address: string; phone: string } | null;
    if (!partner?.address || !hotel?.address) {
      return NextResponse.json({ ok: false, error: 'Missing pickup or dropoff address' }, { status: 400 });
    }

    const delivery = await createUberDelivery({
      pickupAddress: partner.address,
      pickupName: partner.name,
      pickupPhone: partner.phone || '+19543000000',
      dropoffAddress: `${hotel.address}, Fort Lauderdale, FL`,
      dropoffName: `${hotel.name} — Room ${order.room}`,
      dropoffPhone: hotel.phone || '+19543000000',
      dropoffNotes: `Guest: ${order.guest_name}, Room ${order.room}. ${order.details}`,
      items: [{ name: order.details, quantity: 1, price: Number(order.total_amount || 0) }],
      externalId: requestId,
    });

    await db.from('requests').update({
      uber_delivery_id: delivery.id,
      uber_tracking_url: delivery.tracking_url,
      uber_status: delivery.status,
      uber_fee_cents: Math.round(delivery.fee?.total || 0),
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
    if (isTransport) {
      const { data: trip } = await db.from('shuttle_requests').select('uber_delivery_id, uber_status, uber_tracking_url').eq('id', requestId).maybeSingle();
      if (!trip?.uber_delivery_id) return NextResponse.json({ ok: false, error: 'No delivery found' }, { status: 404 });
      const delivery = await getUberDelivery(trip.uber_delivery_id);
      await db.from('shuttle_requests').update({ uber_status: delivery.status }).eq('id', requestId);
      return NextResponse.json({ ok: true, status: delivery.status, trackingUrl: trip.uber_tracking_url, courier: delivery.courier });
    }

    const { data: order } = await db.from('requests').select('uber_delivery_id, uber_status, uber_tracking_url').eq('id', requestId).maybeSingle();
    if (!order?.uber_delivery_id) return NextResponse.json({ ok: false, error: 'No delivery found' }, { status: 404 });
    const delivery = await getUberDelivery(order.uber_delivery_id);
    await db.from('requests').update({ uber_status: delivery.status }).eq('id', requestId);
    return NextResponse.json({ ok: true, status: delivery.status, trackingUrl: order.uber_tracking_url, courier: delivery.courier });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
