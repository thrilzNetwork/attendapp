/* Attenda Serve — funnel event tracking.
   Events defined by the growth directive; batched to /api/serve/track (beacon,
   fire-and-forget) and mirrored to console in dev. No PII in event payloads. */

export type ServeEvent =
  | 'serve_page_view' | 'hero_demo_click' | 'how_it_works_click'
  | 'business_type_selected' | 'live_demo_click'
  | 'pricing_starter_click' | 'pricing_growth_click'
  | 'demo_started' | 'demo_completed'
  | 'activation_started' | 'activation_completed'
  | 'partner_cta_click' | 'partner_application_started'
  | 'partner_application_completed' | 'partner_referral_created'
  | 'partner_business_activated';

export function track(event: ServeEvent, props: Record<string, string | number> = {}) {
  if (typeof window === 'undefined') return;
  const payload = {
    event,
    props,
    ts: Date.now(),
    path: window.location.pathname,
    ref: new URLSearchParams(window.location.search).get('ref') || undefined,
    session: (window as unknown as { __svSid?: string }).__svSid,
  };
  if (process.env.NODE_ENV !== 'production') console.debug('[serve]', event, props);
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/serve/track', new Blob([body], { type: 'application/json' }));
    } else {
      void fetch('/api/serve/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
    }
  } catch { /* tracking must never break the page */ }
}

export function sessionRef(): string {
  if (typeof window === 'undefined') return '';
  const w = window as unknown as { __svSid?: string };
  if (!w.__svSid) w.__svSid = Math.random().toString(36).slice(2, 10);
  return w.__svSid;
}
