import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: 'Missing webhook secret' }, { status: 400 });
  }

  let event;
  try {
    const body = await req.text();
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e: unknown) {
    console.error('Stripe webhook signature error:', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const requestId = intent.metadata?.request_id;
    const vendorPayout = parseInt(intent.metadata?.vendor_payout_cents || '0');
    const partnerId = intent.metadata?.partner_id;
    const quoteId = intent.metadata?.quote_id;

    if (requestId) {
      await db.from('requests').update({
        stripe_payment_status: 'paid',
        paid_at: new Date().toISOString(),
        status: 'in-progress',
      }).eq('stripe_payment_intent_id', intent.id);

      // If this was a TaxiCaller transport payment, create the dispatch booking
      if (quoteId && partnerId === 'taxicaller') {
        try {
          const { data: sr } = await db.from('shuttle_requests')
            .select('guest_name, room_number, pickup_location, destination, date, time, pax, notes')
            .eq('id', requestId).maybeSingle();
          if (sr) {
            const pickupTime = new Date(`${sr.date}T${sr.time || '12:00'}`).toISOString();
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/taxicaller/book`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requestId,
                quoteId,
                guestName: sr.guest_name,
                pickup: sr.pickup_location,
                destination: sr.destination,
                pickupTime,
                pax: sr.pax ?? 1,
                notes: sr.notes,
              }),
            });
          }
        } catch (e) {
          console.error('TaxiCaller booking after payment failed:', e);
        }
      }

      // Dispatch Uber delivery for food orders (failsafe — client also tries after payment)
      if (partnerId && partnerId !== 'taxicaller') {
        try {
          const { data: reqRow } = await db.from('requests')
            .select('uber_delivery_id, hotel_id, partner_id')
            .eq('id', requestId).maybeSingle();
          if (reqRow && !reqRow.uber_delivery_id) {
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/uber-direct`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'dispatch', requestId }),
            });
          }
        } catch (e) {
          console.error('Uber food dispatch after payment failed:', e);
        }
      }

      // Add to payout ledger if vendor doesn't have Connect (will be paid manually daily)
      if (partnerId && vendorPayout > 0) {
        const { data: partner } = await db.from('partners').select('stripe_account_id, stripe_onboarding_complete, hotel_id').eq('id', partnerId).maybeSingle();
        if (!partner?.stripe_account_id || !partner?.stripe_onboarding_complete) {
          await db.from('payout_ledger').insert({
            hotel_id: partner?.hotel_id,
            partner_id: partnerId,
            request_id: requestId,
            amount_cents: vendorPayout,
            status: 'pending',
          });
        }
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const requestId = intent.metadata?.request_id;
    if (requestId) {
      await db.from('requests').update({ stripe_payment_status: 'failed' }).eq('stripe_payment_intent_id', intent.id);
    }
  }

  return NextResponse.json({ received: true });
}
