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
    // invalid_grant = refresh token expired/revoked — needs re-authorization
    if (text.includes('invalid_grant') || res.status === 403 || res.status === 401) {
      throw new Error('BOUNCIE_REAUTH_REQUIRED');
    }
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

// Raw vehicle shape from Bouncie's GET /v1/vehicles. Field names vary by API
// version/firmware, so every field is optional and we normalize below.
export interface BouncieVehicle {
  imei?: string;
  vin?: string;
  deviceId?: string; // not present in the classic API, kept for forward-compat
  nickName?: string;
  name?: string;
  model?: { year?: number; make?: string; name?: string; model?: string };
  stats?: {
    lastUpdated?: string;
    speed?: number;
    location?: { lat?: number; lon?: number; lng?: number; heading?: number; address?: string };
    // older/alternate shape some firmware reports
    gps?: { lat?: number; lng?: number; lon?: number; speed?: number; heading?: number; accuracy?: number; dt?: string };
  };
}

export interface NormalizedVehicle {
  deviceId: string;
  name: string;
  gps: { lat: number; lng: number; speed: number; heading: number; accuracy: number; recordedAt: string } | null;
}

// Bouncie's /vehicles payload uses `imei` as the identifier, `nickName` for the
// name, and `stats.location.{lat,lon}` for GPS — NOT `deviceId`/`stats.gps`.
// Normalize across the known variants so the rest of the app sees one shape.
export function normalizeBouncieVehicle(v: BouncieVehicle): NormalizedVehicle | null {
  const deviceId = v.imei || v.vin || v.deviceId;
  if (!deviceId) return null;

  const name =
    v.nickName ||
    v.name ||
    [v.model?.year, v.model?.make, v.model?.name || v.model?.model].filter(Boolean).join(' ') ||
    deviceId;

  const loc = v.stats?.location;
  const alt = v.stats?.gps;
  const lat = loc?.lat ?? alt?.lat;
  const lng = loc?.lon ?? loc?.lng ?? alt?.lon ?? alt?.lng;

  let gps: NormalizedVehicle['gps'] = null;
  if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
    gps = {
      lat,
      lng,
      speed: v.stats?.speed ?? alt?.speed ?? 0,
      heading: loc?.heading ?? alt?.heading ?? 0,
      accuracy: alt?.accuracy ?? 0,
      recordedAt: v.stats?.lastUpdated ?? alt?.dt ?? new Date().toISOString(),
    };
  }

  return { deviceId, name, gps };
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

const EARTH_RADIUS_MILES = 3958.8;

export function haversineDistanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.asin(Math.sqrt(a));
}

export function calculateETA(
  vehicleLat: number, vehicleLng: number,
  hotelLat: number, hotelLng: number,
  speedMph = 0
): { distanceMiles: number; etaMinutes: number } {
  const distanceMiles = haversineDistanceMiles(vehicleLat, vehicleLng, hotelLat, hotelLng);
  const effectiveSpeed = speedMph > 2 ? speedMph : 25;
  const etaMinutes = Math.round((distanceMiles / effectiveSpeed) * 60);
  return { distanceMiles, etaMinutes };
}

export const HOTEL_ARRIVAL_RADIUS_MILES = 0.5;

// Returns compass bearing (0–360°) from point A to point B
export function bearingBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const la1 = toRad(lat1);
  const la2 = toRad(lat2);
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Detect whether the shuttle is heading toward the destination or back to hotel.
// Uses proximity as the primary signal (which endpoint is it closer to?).
export function detectShuttleDirection(
  shuttleLat: number, shuttleLng: number,
  hotelLat: number, hotelLng: number,
  destLat: number, destLng: number,
): 'to_dest' | 'to_hotel' | 'at_hotel' | 'at_dest' {
  const dHotel = haversineDistanceMiles(shuttleLat, shuttleLng, hotelLat, hotelLng);
  const dDest  = haversineDistanceMiles(shuttleLat, shuttleLng, destLat, destLng);
  if (dHotel <= HOTEL_ARRIVAL_RADIUS_MILES) return 'at_hotel';
  if (dDest  <= HOTEL_ARRIVAL_RADIUS_MILES) return 'at_dest';
  return dDest < dHotel ? 'to_dest' : 'to_hotel';
}
