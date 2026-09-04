import { NextResponse } from 'next/server';

/**
 * JSON response that is explicitly uncacheable at the RESPONSE level.
 *
 * Why this exists: Netlify's Durable CDN (Next.js runtime layer) caches
 * route-handler GETs keyed by path (plus its default Netlify-Vary) even when a
 * route sets `dynamic = 'force-dynamic'` and even when next.config.mjs sets
 * Cache-Control via headers(). Config-level headers are NOT enough — the
 * runtime sets its own Cache-Control/Netlify-Vary on the response afterward.
 * The only reliable opt-out is setting the headers on the response itself.
 *
 * Every per-user corporate GET (me, data, tasks, onboarding) must return
 * through this helper, otherwise one user's response can be replayed to
 * another (or a stale pre-update body replayed after a write).
 *
 * NOTE: we deliberately do NOT set `Netlify-Vary` here. Varying on
 * `authorization` opts the CDN into per-token caching of /me — the root
 * cause of the Andrés/Drashti login-loop (one user's /me replayed to
 * another). With no-store on the response the CDN must not cache at all.
 */
export function noStoreJson(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body as Record<string, unknown>, init);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  return res;
}