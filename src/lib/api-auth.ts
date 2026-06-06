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
  return ALLOWED_ORIGINS.some(a => check.startsWith(a));
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
 */
export function validateApiKey(req: Request): boolean {
  const apiKey = req.headers.get('x-superadmin-key');
  const expectedKey = process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY;
  if (!expectedKey || apiKey !== expectedKey) return false;
  return true;
}
