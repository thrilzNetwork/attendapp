import { getSupabaseAdmin } from '@/lib/supabase-admin';

const BOUNCIE_AUTH_BASE = 'https://auth.bouncie.com';
const BOUNCIE_API_BASE = 'https://api.bouncie.dev/v1';

export function getBouncieConfig() {
  const clientId = process.env.NEXT_PUBLIC_BOUNCIE_CLIENT_ID || process.env.BOUNCIE_CLIENT_ID;
  const clientSecret = process.env.BOUNCIE_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_BOUNCIE_REDIRECT_URI || process.env.BOUNCIE_REDIRECT_URI;
  const webhookSecret = process.env.BOUNCIE_WEBHOOK_SECRET;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Bouncie OAuth config missing: BOUNCIE_CLIENT_ID, BOUNCIE_CLIENT_SECRET, or BOUNCIE_REDIRECT_URI');
  }

  return { clientId, clientSecret, redirectUri, webhookSecret };
}

export function getBouncieAuthUrl(hotelId: string, state?: string) {
  const { clientId, redirectUri } = getBouncieConfig();
  const payload = state || JSON.stringify({ hotelId });
  return `${BOUNCIE_AUTH_BASE}/dialog/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(payload)}`;
}

export async function exchangeBouncieCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getBouncieConfig();

  const res = await fetch(`${BOUNCIE_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bouncie token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

export async function refreshBouncieToken(refreshToken: string) {
  const { clientId, clientSecret } = getBouncieConfig();

  const res = await fetch(`${BOUNCIE_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bouncie token refresh failed: ${res.status} ${text}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

export async function getActiveBouncieToken(hotelId: string) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('bouncie_connections')
    .select('*')
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (error || !data) throw new Error('No Bouncie connection found for this hotel');

  // Refresh if expires within 5 minutes
  const expiresAt = new Date(data.expires_at).getTime();
  const now = Date.now();
  if (expiresAt - now < 5 * 60 * 1000) {
    const refreshed = await refreshBouncieToken(data.refresh_token);
    const newExpiresAt = new Date(now + refreshed.expires_in * 1000).toISOString();
    await db
      .from('bouncie_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);
    return refreshed.access_token;
  }

  return data.access_token;
}

export async function bouncieApiRequest<T>(path: string, accessToken: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BOUNCIE_API_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: accessToken, // Bouncie requires raw token, no Bearer prefix
      'Content-Type': 'application/json',
      ...(opts?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bouncie API ${path} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

export interface BouncieVehicle {
  deviceId: string;
  name?: string;
  vin?: string;
  imei?: string;
  model?: { year?: number; make?: string; model?: string };
  stats?: { gps?: { lat?: number; lng?: number; speed?: number; heading?: number; accuracy?: number; dt?: string } };
}

export async function listBouncieVehicles(accessToken: string): Promise<BouncieVehicle[]> {
  return bouncieApiRequest('/vehicles', accessToken);
}

export async function listBouncieTrips(accessToken: string, deviceId: string, opts?: { startsAfter?: string; endsBefore?: string; limit?: number }): Promise<unknown[]> {
  const params = new URLSearchParams();
  if (opts?.startsAfter) params.set('startsAfter', opts.startsAfter);
  if (opts?.endsBefore) params.set('endsBefore', opts.endsBefore);
  if (opts?.limit) params.set('limit', opts.limit.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return bouncieApiRequest(`/trips/${deviceId}${query}`, accessToken);
}
