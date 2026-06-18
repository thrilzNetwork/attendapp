// Daily payout Edge Function — runs every 24h via pg_cron or Supabase cron
// Pays out pending vendor balances via Stripe transfers

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2025-05-28.basil',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Fetch all pending ledger entries with a connected Stripe account
  const { data: pending, error } = await supabase
    .from('payout_ledger')
    .select(`
      id, partner_id, amount_cents, request_id,
      partners!inner(stripe_account_id, stripe_onboarding_complete, name)
    `)
    .eq('status', 'pending')
    .order('created_at');

  if (error) {
    console.error('Ledger fetch error:', error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  const results: { id: string; status: string; transfer?: string; error?: string }[] = [];

  for (const entry of (pending || [])) {
    const partner = (entry as any).partners;
    if (!partner?.stripe_account_id || !partner?.stripe_onboarding_complete) {
      results.push({ id: entry.id, status: 'skipped_no_connect' });
      continue;
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: entry.amount_cents,
        currency: 'usd',
        destination: partner.stripe_account_id,
        description: `Attenda payout for request ${entry.request_id}`,
        metadata: { ledger_id: entry.id, partner_id: entry.partner_id },
      });

      await supabase.from('payout_ledger').update({
        status: 'paid',
        stripe_transfer_id: transfer.id,
        paid_at: new Date().toISOString(),
      }).eq('id', entry.id);

      results.push({ id: entry.id, status: 'paid', transfer: transfer.id });
    } catch (e: any) {
      console.error(`Transfer failed for ledger ${entry.id}:`, e.message);
      results.push({ id: entry.id, status: 'failed', error: e.message });
    }
  }

  const paid = results.filter(r => r.status === 'paid').length;
  const failed = results.filter(r => r.status === 'failed').length;
  console.log(`Daily payout complete: ${paid} paid, ${failed} failed, ${results.length - paid - failed} skipped`);

  return new Response(JSON.stringify({ ok: true, paid, failed, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
