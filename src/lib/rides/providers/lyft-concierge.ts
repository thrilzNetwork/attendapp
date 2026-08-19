import {
  RideUnavailableError,
  type Ride,
  type RideBookRequest,
  type RideProvider,
  type RideQuote,
  type RideQuoteRequest,
  type RideStatus,
} from '../types';

/**
 * Lyft Concierge — book a ride for a guest who has no Lyft account, billed to
 * the property's business account. That is exactly the front-desk shuttle call.
 *
 * ⚠️  UNVERIFIED CONTRACT. Lyft publishes the Concierge reference only to
 * business partners, so the shapes below follow Lyft's public ride API and are
 * an informed guess, not a tested integration. Do not enable this in production
 * until it has been exercised against real Concierge credentials — that is the
 * exact mistake that left src/lib/taxicaller.ts a scaffold nobody could trust.
 *
 * Every external call is confined to this file, so correcting the shapes means
 * editing here and nowhere else.
 */

const LYFT_API_BASE = process.env.LYFT_API_BASE ?? 'https://api.lyft.com';
const LYFT_CLIENT_ID = process.env.LYFT_CLIENT_ID ?? '';
const LYFT_CLIENT_SECRET = process.env.LYFT_CLIENT_SECRET ?? '';
const SERVICE_FEE_CENTS = Number(process.env.RIDE_SERVICE_FEE_CENTS ?? 500);

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const basic = Buffer.from(`${LYFT_CLIENT_ID}:${LYFT_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${LYFT_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', scope: 'rides.request' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new RideUnavailableError('lyft_concierge', `Lyft auth failed: ${JSON.stringify(data)}`);
  }
  cachedToken = {
    token: data.access_token as string,
    expiresAt: Date.now() + ((data.expires_in as number) ?? 3600) * 1000,
  };
  return cachedToken.token;
}

async function lyftFetch(path: string, init: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${LYFT_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new RideUnavailableError(
      'lyft_concierge',
      (data.error_description as string) ?? (data.error as string) ?? `HTTP ${res.status}`,
    );
  }
  return data as Record<string, unknown>;
}

function mapStatus(raw: unknown): RideStatus {
  switch (String(raw ?? '').toLowerCase()) {
    case 'pending':
      return 'pending';
    case 'accepted':
      return 'accepted';
    case 'arrived':
      return 'arriving';
    case 'picked_up':
      return 'in_progress';
    case 'droppedoff':
      return 'completed';
    case 'canceled':
      return 'canceled';
    default:
      return 'pending';
  }
}

export const lyftConcierge: RideProvider = {
  name: 'lyft_concierge',

  isConfigured() {
    return Boolean(LYFT_CLIENT_ID && LYFT_CLIENT_SECRET);
  },

  async quote(req: RideQuoteRequest): Promise<RideQuote> {
    const q = new URLSearchParams({
      start_lat: String(req.pickup.lat ?? ''),
      start_lng: String(req.pickup.lng ?? ''),
      end_lat: String(req.dropoff.lat ?? ''),
      end_lng: String(req.dropoff.lng ?? ''),
    });
    const data = await lyftFetch(`/v1/cost?${q.toString()}`);
    const estimates = (data.cost_estimates ?? []) as Record<string, unknown>[];
    if (estimates.length === 0) {
      throw new RideUnavailableError('lyft_concierge', 'No Lyft coverage for this route');
    }
    const best = estimates[0];
    // Lyft returns a min/max range; quote the high end so the guest is never
    // surprised by a total larger than what they agreed to.
    const fare = Number(best.estimated_cost_cents_max ?? best.estimated_cost_cents_min ?? 0);

    return {
      id: `lyft:${Date.now()}`,
      provider: 'lyft_concierge',
      fare_cents: fare,
      service_fee_cents: SERVICE_FEE_CENTS,
      eta_minutes: Math.max(1, Math.round(Number(best.estimated_duration_seconds ?? 900) / 60)),
      vehicle_type: String(best.ride_type ?? 'lyft'),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  },

  async book(req: RideBookRequest): Promise<Ride> {
    const data = await lyftFetch('/v1/rides', {
      method: 'POST',
      body: JSON.stringify({
        ride_type: req.quote.vehicle_type ?? 'lyft',
        origin: { lat: req.pickup.lat, lng: req.pickup.lng, address: req.pickup.address },
        destination: { lat: req.dropoff.lat, lng: req.dropoff.lng, address: req.dropoff.address },
        // The guest needs no Lyft account — this is what Concierge exists for.
        passenger: { phone_number: req.guest_phone, first_name: req.guest_name },
        external_id: req.reference,
      }),
    });

    return {
      id: String(data.ride_id ?? req.reference),
      provider: 'lyft_concierge',
      status: mapStatus(data.status),
      tracking_url: (data.tracking_url as string) ?? undefined,
      eta_minutes: req.quote.eta_minutes,
    };
  },

  async cancel(rideId: string): Promise<void> {
    await lyftFetch(`/v1/rides/${encodeURIComponent(rideId)}/cancel`, { method: 'POST' });
  },

  async get(rideId: string): Promise<Ride> {
    const data = await lyftFetch(`/v1/rides/${encodeURIComponent(rideId)}`);
    const driver = (data.driver ?? {}) as Record<string, unknown>;
    const vehicle = (data.vehicle ?? {}) as Record<string, unknown>;
    return {
      id: rideId,
      provider: 'lyft_concierge',
      status: mapStatus(data.status),
      driver_name: (driver.first_name as string) ?? undefined,
      driver_phone: (driver.phone_number as string) ?? undefined,
      vehicle_plate: (vehicle.license_plate as string) ?? undefined,
    };
  },
};
