import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAllowedOrigin, validateApiKey } from './api-auth';

function reqWithKey(key: string | null): Request {
  const headers = new Headers();
  if (key !== null) headers.set('x-superadmin-key', key);
  return new Request('https://example.com', { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('validateApiKey', () => {
  it('accepts a matching key', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPERADMIN_API_KEY', 'secret');
    expect(validateApiKey(reqWithKey('secret'))).toBe(true);
  });

  it('rejects a wrong key', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPERADMIN_API_KEY', 'secret');
    expect(validateApiKey(reqWithKey('nope'))).toBe(false);
  });

  it('rejects a missing key when one is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPERADMIN_API_KEY', 'secret');
    expect(validateApiKey(reqWithKey(null))).toBe(false);
  });

  it('fails CLOSED in production when no key is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPERADMIN_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(validateApiKey(reqWithKey(null))).toBe(false);
    expect(validateApiKey(reqWithKey('anything'))).toBe(false);
  });

  it('fails OPEN outside production when no key is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPERADMIN_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(validateApiKey(reqWithKey(null))).toBe(true);
  });
});

describe('isAllowedOrigin', () => {
  it('allows requests with no origin and no referer (API clients)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedOrigin(null, null)).toBe(true);
  });

  it('allows the production domain', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedOrigin('https://attendaapp.com', null)).toBe(true);
  });

  it('allows dynamic vercel preview URLs for the project', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedOrigin('https://attenda-abc123-thrilzs-projects.vercel.app', null)).toBe(true);
  });

  it('blocks an unrelated origin', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedOrigin('https://evil.example.com', null)).toBe(false);
  });

  it('blocks a lookalike vercel domain', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isAllowedOrigin('https://attenda-evil-projects.vercel.app', null)).toBe(false);
  });
});
