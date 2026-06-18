import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    // Omit apiVersion so the SDK uses its own pinned default — avoids type
    // breakage every time the stripe package bumps its expected version.
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export const PLATFORM_FEE_PCT = 0.10; // Attenda takes 10%

export function computeFees(subtotalCents: number) {
  const platformFeeCents = Math.round(subtotalCents * PLATFORM_FEE_PCT);
  const vendorPayoutCents = subtotalCents - platformFeeCents;
  return { platformFeeCents, vendorPayoutCents };
}
