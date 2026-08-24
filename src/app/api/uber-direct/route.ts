import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getUberDelivery, toE164 } from '@/lib/uber-direct';
import { getBestQuote, getProvider, type DeliveryProviderName } from '@/lib/delivery';

export async function POST(req: NextRequest) {
  const { action, requestId, mode } = await req.json();
  // mode: 'food' (default) | 'transport'
  const db = getSupabaseAdmin();
  const isTransport = mode === 'transport';

  if (action === 'dispatch') {
    if (isTransport) {
      // shuttle_requests: hotel is pickup, guest destination is dropoff.
      // No live caller currently dispatches this branch (ShuttleView's staff
      // "New Trip" flow calls /api/taxicaller directly instead), but it is
      // reachable and was broken for the same reason as the food path — the
      // hardcoded Uber call — so it gets the same fallback-chain treatment
      // rather than being left as a landmine for whenever it is wired up.
      const { data: trip, error } = await db
        .from('shuttle_requests')
        .select('*, hotels(name, address, front_desk_phone)')
        .eq('id', requestId)
        .maybeSingle();
      if (error || !trip) return NextResponse.json({ ok: false, error: 'Trip not found' }, { status: 404 });
      if (trip.uber_delivery_id) return NextResponse.json({ ok: false, error: 'Already dispatched' }, { status: 400 });

      const hotel = trip.hotels as { name: string; address: string; front_desk_phone: string } | null;
      if (!hotel?.address) return NextResponse.json({ ok: false, error: 'Hotel address not set' }, { status: 400 });
      if (!trip.destination) return NextResponse.json({ ok: false, error: 'No destination on trip' }, { status: 400 });

      const when = [trip.date, trip.time ? `at ${trip.time}` : ''].filter(Boolean).join(' ');
      const dropoffNotes = `Guest: ${trip.guest_name}, Room ${trip.room_number}. ${trip.pax} pax. ${when}. ${trip.notes || ''}`.trim();

      const { quote } = await getBestQuote({
        pickup: { name: hotel.name, address: trip.pickup_location || hotel.address, phone: toE164(hotel.front_desk_phone) },
        dropoff: { name: `${trip.guest_name} (Room ${trip.room_number})`, address: trip.destination, phone: toE164(hotel.front_desk_phone), notes: dropoffNotes },
        items: [{ name: `Transport for ${trip.guest_name}`, quantity: trip.pax || 1, price_cents: 0 }],
      });
      const provider = getProvider(quote.provider);
      const delivery = await provider.dispatch({
        pickup: { name: hotel.name, address: trip.pickup_location || hotel.address, phone: toE164(hotel.front_desk_phone) },
        dropoff: { name: `${trip.guest_name} (Room ${trip.room_number})`, address: trip.destination, phone: toE164(hotel.front_desk_phone), notes: dropoffNotes },
        items: [{ name: `Transport for ${trip.guest_name}`, quantity: trip.pax || 1, price_cents: 0 }],
        quote,
        reference: requestId,
      });

      await db.from('shuttle_requests').update({
        uber_delivery_id: delivery.id,
        uber_tracking_url: delivery.tracking_url ?? null,
        uber_status: delivery.status,
        uber_fee_cents: quote.courier_fee_cents,
        status: 'assigned',
      }).eq('id', requestId);

      return NextResponse.json({
        ok: true,
        deliveryId: delivery.id,
        trackingUrl: delivery.tracking_url,
        status: delivery.status,
        feeCents: quote.courier_fee_cents,
        provider: quote.provider,
      });
    }

    // Food order: partner is pickup, hotel is dropoff.
    // Walks the same courier fallback chain as the quote endpoint (partner-
    // fulfilled last, so this can never fail purely for lack of a working
    // courier — the exact gap that made ordering dead while Uber Direct's
    // account was disabled).
    const { data: order, error: oErr } = await db
      .from('requests')
      .select('*, partners(id, name, address, phone, delivery_providers), hotels(name, address, front_desk_phone)')
      .eq('id', requestId)
      .maybeSingle();
    if (oErr || !order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    if (order.uber_delivery_id) return NextResponse.json({ ok: false, error: 'Already dispatched' }, { status: 400 });

    const partner = order.partners as { id: string; name: string; address: string; phone: string; delivery_providers: string[] | null } | null;
    const hotel = order.hotels as { name: string; address: string; front_desk_phone: string } | null;
    if (!partner?.address || !hotel?.address) {
      return NextResponse.json({ ok: false, error: 'Missing pickup or dropoff address' }, { status: 400 });
    }

    const { quote, attempts } = await getBestQuote(
      {
        partner_id: partner.id,
        pickup: { name: partner.name, address: partner.address, phone: toE164(partner.phone) },
        dropoff: {
          name: `${hotel.name} — Room ${order.room}`,
          address: `${hotel.address}, Fort Lauderdale, FL`,
          phone: toE164(hotel.front_desk_phone),
          notes: `Guest: ${order.guest_name}, Room ${order.room}. ${order.details}`,
        },
        items: [{ name: order.details, quantity: 1, price_cents: Math.round(Number(order.total_amount || 0) * 100) }],
      },
      partner.delivery_providers,
    );
    if (attempts.length > 0) {
      console.warn(`uber-direct dispatch: ${attempts.length} provider(s) declined before ${quote.provider} quoted`, attempts);
    }

    const provider = getProvider(quote.provider);
    const delivery = await provider.dispatch({
      partner_id: partner.id,
      pickup: { name: partner.name, address: partner.address, phone: toE164(partner.phone) },
      dropoff: {
        name: `${hotel.name} — Room ${order.room}`,
        address: `${hotel.address}, Fort Lauderdale, FL`,
        phone: toE164(hotel.front_desk_phone),
        notes: `Guest: ${order.guest_name}, Room ${order.room}. ${order.details}`,
      },
      items: [{ name: order.details, quantity: 1, price_cents: Math.round(Number(order.total_amount || 0) * 100) }],
      quote,
      reference: requestId,
    });

    // Columns are named uber_* from when Uber Direct was the only courier;
    // reused generically now rather than migrating the schema for a rename.
    // delivery_method carries the real provider name.
    await db.from('requests').update({
      uber_delivery_id: delivery.id,
      uber_tracking_url: delivery.tracking_url ?? null,
      uber_status: delivery.status,
      uber_fee_cents: quote.courier_fee_cents,
      delivery_method: quote.provider,
    }).eq('id', requestId);

    return NextResponse.json({
      ok: true,
      deliveryId: delivery.id,
      trackingUrl: delivery.tracking_url,
      status: delivery.status,
      feeCents: quote.courier_fee_cents,
      provider: quote.provider,
    });
  }

  if (action === 'status') {
    if (isTransport) {
      // shuttle_requests carries no delivery_method column, so which provider
      // issued this delivery can't be recovered here without a migration.
      // Unreached today (no caller polls status for the transport branch);
      // flagging rather than guessing the provider and calling the wrong API.
      const { data: trip } = await db.from('shuttle_requests').select('uber_delivery_id, uber_status, uber_tracking_url').eq('id', requestId).maybeSingle();
      if (!trip?.uber_delivery_id) return NextResponse.json({ ok: false, error: 'No delivery found' }, { status: 404 });
      const delivery = await getUberDelivery(trip.uber_delivery_id);
      await db.from('shuttle_requests').update({ uber_status: delivery.status }).eq('id', requestId);
      return NextResponse.json({ ok: true, status: delivery.status, trackingUrl: trip.uber_tracking_url, courier: delivery.courier });
    }

    const { data: order } = await db.from('requests').select('uber_delivery_id, uber_status, uber_tracking_url, delivery_method').eq('id', requestId).maybeSingle();
    if (!order?.uber_delivery_id) return NextResponse.json({ ok: false, error: 'No delivery found' }, { status: 404 });

    const method = order.delivery_method as DeliveryProviderName | null;
    const provider = method && ['partner_fulfilled', 'nash', 'uber_direct'].includes(method)
      ? getProvider(method)
      : null;

    if (provider) {
      const delivery = await provider.get(order.uber_delivery_id);
      await db.from('requests').update({ uber_status: delivery.status }).eq('id', requestId);
      return NextResponse.json({ ok: true, status: delivery.status, trackingUrl: delivery.tracking_url ?? order.uber_tracking_url });
    }

    // No delivery_method recorded (rows dispatched before this column was
    // populated) — fall back to the original direct Uber lookup.
    const delivery = await getUberDelivery(order.uber_delivery_id);
    await db.from('requests').update({ uber_status: delivery.status }).eq('id', requestId);
    return NextResponse.json({ ok: true, status: delivery.status, trackingUrl: order.uber_tracking_url, courier: delivery.courier });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
