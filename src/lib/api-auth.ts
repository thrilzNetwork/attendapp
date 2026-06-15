/**
 * Shared API auth utilities for Attenda.
 * Every public API route should use these guards.
 */

const ALLOWED_ORIGINS = [
  'https://attendaapp.com',
  'https://attenda-iy8602ip4-thrilzs-projects.vercel.app',
  'https://attenda-74jdba86g-thrilzs-projects.vercel.app',
  'https://attenda-8k8tx6gnb-thrilzs-projects.vercel.app',
  'http://localhost:3000',
];

// Any *.vercel.app domain is allowed (dynamic preview URLs)
const VERCEL_APP_RE = /^https:\/\/[a-z0-9-]+-thrilzs-projects\.vercel\.app$/;

/**
 * Origin/referer check — soft gate against non-browser clients.
 * Not a substitute for proper auth tokens on sensitive endpoints.
 * Returns true if the request comes from an allowed origin or has no origin (API clients).
 */
export function isAllowedOrigin(origin: string | null, referer: string | null): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  // No origin = API client (curl, scripts) — allow through, let API key check handle it
  if (!origin && !referer) return true;
  const check = origin || referer || '';
  return ALLOWED_ORIGINS.some(a => check.startsWith(a)) || VERCEL_APP_RE.test(check);
}

/**
 * Returns a 403 response for blocked origins.
 */
export function originBlocked() {
  return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Validates the x-superadmin-key header against the expected value.
 * Always requires the key — no browser-origin bypass.
 */
export function validateApiKey(req: Request): boolean {
  const apiKey = req.headers.get('x-superadmin-key');
  const expectedKey = process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY;
  // No key configured in env. Fail OPEN only in development so local/test work
  // without setup; in production a missing key is a misconfiguration and we must
  // NOT leave the endpoint unauthenticated.
  if (!expectedKey) return process.env.NODE_ENV !== 'production';
  // API clients must provide the key
  if (!apiKey) return false;
  return apiKey === expectedKey;
}
