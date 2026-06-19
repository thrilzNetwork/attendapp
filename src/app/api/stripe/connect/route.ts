import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';
import { getCaller, resolveHotelScope, getSupabaseAdmin } from '@/lib/supabase-admin';
import { getStripe } from '@/lib/stripe';

// POST /api/stripe/connect — create Stripe Connect onboarding link for a vendor
export async function POST(req: NextRequest) {
  try {
    if (!validateApiKey(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) return originBlocked();
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ ok: false, reason: 'not_configured' });

    const caller = await getCaller(req);
    if (!caller) return NextResponse.json({ ok: false, error: 'Auth required' }, { status: 401 });

    const { partnerId, hotelId, returnUrl } = await req.json();
    const scopedHotelId = resolveHotelScope(caller, hotelId);
    if (!scopedHotelId) return NextResponse.json({ ok: false, error: 'No hotel in scope' }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data: partner } = await db.from('partners').select('id,name,stripe_account_id,email,payout_email').eq('id', partnerId).eq('hotel_id', scopedHotelId).maybeSingle();
    if (!partner) return NextResponse.json({ ok: false, error: 'Partner not found' }, { status: 404 });

    const stripe = getStripe();
    let accountId = partner.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: partner.payout_email || partner.email || undefined,
        capabilities: { transfers: { requested: true } },
        business_profile: { name: partner.name },
        metadata: { partner_id: partnerId, hotel_id: scopedHotelId },
      });
      accountId = account.id;
      await db.from('partners').update({ stripe_account_id: accountId }).eq('id', partnerId);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/staff`,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/staff`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ ok: true, url: link.url });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

// GET /api/stripe/connect?partnerId=xxx — check if onboarding complete
export async function GET(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ ok: false, reason: 'not_configured' });
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get('partnerId');
    if (!partnerId) return NextResponse.json({ ok: false, error: 'Missing partnerId' }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data: partner } = await db.from('partners').select('stripe_account_id,stripe_onboarding_complete').eq('id', partnerId).maybeSingle();
    if (!partner?.stripe_account_id) return NextResponse.json({ ok: true, connected: false });

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(partner.stripe_account_id);
    const complete = account.details_submitted && account.charges_enabled;

    if (complete && !partner.stripe_onboarding_complete) {
      await db.from('partners').update({ stripe_onboarding_complete: true }).eq('id', partnerId);
    }

    return NextResponse.json({ ok: true, connected: complete, accountId: partner.stripe_account_id });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
