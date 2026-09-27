/* Attenda Serve — funnel event collection endpoint.
   POST { event, props, ts, path, ref?, session? }
   Append-only: one JSONL blob per day, capped, no PII. */

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';

const VALID = new Set([
  'serve_page_view', 'hero_demo_click', 'how_it_works_click',
  'business_type_selected', 'live_demo_click',
  'pricing_starter_click', 'pricing_growth_click',
  'demo_started', 'demo_completed',
  'activation_started', 'activation_completed',
  'partner_cta_click', 'partner_application_started',
  'partner_application_completed', 'partner_referral_created',
  'partner_business_activated',
]);

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b || typeof b.event !== 'string' || !VALID.has(b.event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const day = new Date().toISOString().slice(0, 10);
    const store = getStore('attenda_serve');
    const key = `events/${day}.jsonl`;
    const line = JSON.stringify({
      e: b.event,
      p: b.props ?? {},
      ts: b.ts ?? Date.now(),
      path: b.path,
      ref: b.ref ?? null,
      s: b.session ?? null,
    }) + '\n';

    let existing = '';
    try { existing = await store.get(key, { type: 'text' }) ?? ''; } catch { /* first event of the day */ }
    // cap daily file at ~2000 events to bound blob size
    const appended = existing.split('\n').length > 2000 ? existing : existing + line;
    await store.set(key, appended);
    return NextResponse.json({ ok: true });
  } catch {
    // never fail the page for analytics
    return NextResponse.json({ ok: true });
  }
}