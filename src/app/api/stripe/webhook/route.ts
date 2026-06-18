import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const config = { api: { bodyParser: false } };

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
    const intent = event.data.object as any;
    const requestId = intent.metadata?.request_id;
    const partnerPlatformFee = parseInt(intent.metadata?.platform_fee_cents || '0');
    const vendorPayout = parseInt(intent.metadata?.vendor_payout_cents || '0');
    const partnerId = intent.metadata?.partner_id;

    if (requestId) {
      await db.from('requests').update({
        stripe_payment_status: 'paid',
        paid_at: new Date().toISOString(),
        status: 'in-progress',
      }).eq('stripe_payment_intent_id', intent.id);

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
    const intent = event.data.object as any;
    const requestId = intent.metadata?.request_id;
    if (requestId) {
      await db.from('requests').update({ stripe_payment_status: 'failed' }).eq('stripe_payment_intent_id', intent.id);
    }
  }

  return NextResponse.json({ received: true });
}
