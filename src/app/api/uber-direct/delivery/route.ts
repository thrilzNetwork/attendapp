import { NextRequest, NextResponse } from 'next/server';
import { createDelivery } from '@/lib/uber-direct';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { requestId, quoteId, partnerId, hotelId, items } = await req.json();
  if (!requestId || !quoteId || !partnerId || !hotelId) {
    return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
  }

  const [{ data: partner }, { data: hotel }] = await Promise.all([
    supabaseAdmin.from('partners').select('name,address,lat,lng,phone').eq('id', partnerId).maybeSingle(),
    supabaseAdmin.from('hotels').select('name,address,lat,lng').eq('id', hotelId).maybeSingle(),
  ]);

  if (!partner || !hotel) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const delivery = await createDelivery({
    quote_id: quoteId,
    pickup: { name: partner.name, address: partner.address, phone_number: partner.phone },
    dropoff: { name: hotel.name, address: hotel.address, notes: 'Hotel front desk delivery' },
    manifest_items: items,
    external_store_id: partnerId,
  });

  await supabaseAdmin.from('requests').update({
    delivery_method: 'uber_direct',
    uber_delivery_id: delivery.id,
    uber_tracking_url: delivery.tracking_url,
    uber_status: delivery.status,
    uber_quote_id: quoteId,
  }).eq('id', requestId);

  return NextResponse.json({ ok: true, tracking_url: delivery.tracking_url, uber_delivery_id: delivery.id });
}
