import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Superadmin integration health check.
 * GET /api/integration-status  (header: x-superadmin-key)
 * Reports which money-path integrations are truly connected — reading env
 * server-side and doing a lightweight live probe where safe.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get('x-superadmin-key') !== process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, { status: string; detail: string }> = {};

  // ── Stripe ──────────────────────────────────────────────
  const sk = process.env.STRIPE_SECRET_KEY || '';
  if (!sk) {
    results.stripe = { status: 'not_configured', detail: 'STRIPE_SECRET_KEY missing' };
  } else {
    const mode = sk.startsWith('sk_live') ? 'LIVE' : sk.startsWith('sk_test') ? 'TEST' : 'unknown';
    try {
      const r = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${sk}` },
      });
      results.stripe = r.ok
        ? { status: mode === 'LIVE' ? 'connected' : 'test_mode', detail: `Key valid · ${mode} mode` }
        : { status: 'error', detail: `Stripe rejected key (${r.status})` };
    } catch {
      results.stripe = { status: 'error', detail: 'Could not reach Stripe' };
    }
  }

  // ── Uber Direct ─────────────────────────────────────────
  const uid = process.env.UBER_DIRECT_CLIENT_ID;
  const usec = process.env.UBER_DIRECT_CLIENT_SECRET;
  const ucust = process.env.UBER_DIRECT_CUSTOMER_ID;
  if (!uid || !usec || !ucust) {
    results.uber_direct = { status: 'not_configured', detail: 'Missing UBER_DIRECT_CLIENT_ID / CLIENT_SECRET / CUSTOMER_ID' };
  } else {
    try {
      const tok = await fetch('https://auth.uber.com/oauth/v2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: uid, client_secret: usec, grant_type: 'client_credentials', scope: 'eats.deliveries direct.organizations' }),
      });
      if (!tok.ok) {
        results.uber_direct = { status: 'error', detail: `Auth failed (${tok.status}) — check credentials` };
      } else {
        // Auth works; do a dummy quote to surface account-level issues (e.g. disabled)
        const t = await tok.json();
        const q = await fetch(`https://api.uber.com/v1/customers/${ucust}/delivery_quotes`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ pickup_address: '1221 W State Rd 84, Fort Lauderdale, FL 33315', dropoff_address: '100 SE 3rd Ave, Fort Lauderdale, FL 33301' }),
        });
        if (q.ok) {
          results.uber_direct = { status: 'connected', detail: 'Authenticated + quoting' };
        } else {
          const err = await q.json().catch(() => ({}));
          const msg = err?.metadata?.param_details || err?.message || `HTTP ${q.status}`;
          results.uber_direct = { status: 'account_issue', detail: `Auth OK, account not ready: ${msg}` };
        }
      }
    } catch {
      results.uber_direct = { status: 'error', detail: 'Could not reach Uber' };
    }
  }

  // ── TaxiCaller ──────────────────────────────────────────
  const tck = process.env.TAXICALLER_API_KEY;
  results.taxicaller = tck
    ? { status: 'configured', detail: 'API key present (verify with a live booking)' }
    : { status: 'not_configured', detail: 'TAXICALLER_API_KEY missing' };

  // ── Supporting integrations (present-check) ─────────────
  const present = (v?: string) => (v ? 'connected' : 'not_configured');
  results.bouncie = { status: present(process.env.BOUNCIE_CLIENT_SECRET), detail: 'GPS shuttle tracking' };
  results.elevenlabs = { status: present(process.env.ELEVENLABS_API_KEY), detail: 'AI voice answering' };
  results.resend = { status: present(process.env.RESEND_API_KEY), detail: 'Email' };
  results.supabase = { status: present(process.env.SUPABASE_SERVICE_KEY), detail: 'Database / auth' };

  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), results });
}
