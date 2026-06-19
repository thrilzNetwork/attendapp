import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin, originBlocked } from '@/lib/api-auth';
import { getStripe, computeFees } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) {
      return originBlocked();
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ ok: false, reason: 'not_configured' });
    }

    const body = await req.json();
    const { requestId, amountCents, partnerId, description } = body as {
      requestId: string;
      amountCents: number;
      partnerId: string;
      description: string;
    };

    if (!requestId || !amountCents || amountCents < 50) {
      return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { platformFeeCents, vendorPayoutCents } = computeFees(amountCents);

    // Fetch partner's Stripe Connect account (if any) for automatic transfer
    const { data: partner } = await db
      .from('partners')
      .select('stripe_account_id, stripe_onboarding_complete, name')
      .eq('id', partnerId)
      .maybeSingle();

    const stripe = getStripe();

    const intentParams: any = {
      amount: amountCents,
      currency: 'usd',
      description,
      metadata: {
        request_id: requestId,
        partner_id: partnerId,
        platform_fee_cents: String(platformFeeCents),
        vendor_payout_cents: String(vendorPayoutCents),
      },
      automatic_payment_methods: { enabled: true },
    };

    // If vendor has Connect account, set up automatic transfer on capture
    if (partner?.stripe_account_id && partner?.stripe_onboarding_complete) {
      intentParams.application_fee_amount = platformFeeCents;
      intentParams.transfer_data = { destination: partner.stripe_account_id };
    }

    const intent = await stripe.paymentIntents.create(intentParams);

    // Update request with payment intent
    await db.from('requests').update({
      stripe_payment_intent_id: intent.id,
      stripe_payment_status: 'pending',
      amount_cents: amountCents,
      platform_fee_cents: platformFeeCents,
      vendor_payout_cents: vendorPayoutCents,
    }).eq('id', requestId);

    return NextResponse.json({ ok: true, clientSecret: intent.client_secret, intentId: intent.id });
  } catch (e: unknown) {
    console.error('payment-intent error:', e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
