import {
  DeliveryUnavailableError,
  type Delivery,
  type DeliveryDispatchRequest,
  type DeliveryProvider,
  type DeliveryQuote,
  type DeliveryQuoteRequest,
  type DeliveryStatus,
} from '../types';

/**
 * Nash — delivery orchestration across 80+ couriers behind one API.
 *
 * Chosen over integrating DoorDash Drive or Uber Direct directly because it
 * removes the single point of failure that took this feature down: if one
 * courier declines, bans us, or has no coverage, Nash routes to another.
 *
 * Flow (per Nash docs): POST /order with the `quotes_only` tag returns provider
 * quotes; PATCH the order without that tag to dispatch the chosen one.
 *
 * NOTE: written against Nash's published API reference, not yet exercised
 * against a live key. Run it against the sandbox base URL before trusting it in
 * production — see NASH_API_BASE below.
 */

const NASH_API_BASE = process.env.NASH_API_BASE ?? 'https://api.usenash.com/v1';
const NASH_API_KEY = process.env.NASH_API_KEY ?? '';
const NASH_ORG_ID = process.env.NASH_ORG_ID ?? '';

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${NASH_API_KEY}`,
    'Nash-Org-Id': NASH_ORG_ID,
    'Content-Type': 'application/json',
  };
}

/** Split "Ada Lovelace" into the first/last fields Nash expects. */
function splitName(full: string | undefined, fallback: string) {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: fallback, last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function orderPayload(req: DeliveryQuoteRequest, extra: Record<string, unknown> = {}) {
  const pickupName = splitName(req.pickup.name, 'Partner');
  const dropoffName = splitName(req.dropoff.name, 'Guest');
  return {
    pickupAddress: req.pickup.address,
    pickupPhoneNumber: req.pickup.phone ?? '',
    pickupFirstName: pickupName.first,
    pickupLastName: pickupName.last,
    pickupInstructions: req.pickup.notes ?? '',
    dropoffAddress: req.dropoff.address,
    dropoffPhoneNumber: req.dropoff.phone ?? '',
    dropoffFirstName: dropoffName.first,
    dropoffLastName: dropoffName.last,
    dropoffInstructions: req.dropoff.notes ?? '',
    deliveryMode: 'now',
    description: (req.items ?? [])
      .map(i => `${i.quantity}x ${i.name}`)
      .join(', ')
      .slice(0, 500),
    ...extra,
  };
}

async function nashFetch(path: string, init: RequestInit) {
  const res = await fetch(`${NASH_API_BASE}${path}`, { ...init, headers: headers() });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new DeliveryUnavailableError('nash', `Nash returned non-JSON (${res.status})`);
  }
  if (!res.ok) {
    const detail =
      (data.validationErrors as unknown[])?.length
        ? JSON.stringify(data.validationErrors)
        : (data.message as string) ?? `HTTP ${res.status}`;
    throw new DeliveryUnavailableError('nash', detail);
  }
  return data;
}

/** Nash exposes many courier-specific states; collapse them to ours. */
function mapStatus(raw: unknown): DeliveryStatus {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('cancel')) return 'canceled';
  if (s.includes('fail') || s.includes('return')) return 'failed';
  if (s.includes('dropoff_complete') || s.includes('delivered')) return 'delivered';
  if (s.includes('pickup_complete') || s.includes('picked')) return 'picked_up';
  if (s.includes('assign') || s.includes('accept')) return 'assigned';
  return 'pending';
}

interface NashQuote {
  id?: string;
  priceCents?: number;
  totalPriceCents?: number;
  dropoffEta?: string;
  providerName?: string;
}

export const nash: DeliveryProvider = {
  name: 'nash',

  isConfigured() {
    return Boolean(NASH_API_KEY && NASH_ORG_ID);
  },

  async quote(req: DeliveryQuoteRequest): Promise<DeliveryQuote> {
    const data = await nashFetch('/order', {
      method: 'POST',
      body: JSON.stringify(orderPayload(req, { tags: ['quotes_only'] })),
    });

    const quotes = (data.quotes ?? []) as NashQuote[];
    if (quotes.length === 0) {
      throw new DeliveryUnavailableError('nash', 'No courier offered a quote for this route');
    }

    // Cheapest wins; the guest is paying this at cost either way.
    const best = quotes.reduce((a, b) =>
      (a.totalPriceCents ?? a.priceCents ?? Infinity) <=
      (b.totalPriceCents ?? b.priceCents ?? Infinity)
        ? a
        : b,
    );

    const fee = best.totalPriceCents ?? best.priceCents ?? 0;
    const etaMs = best.dropoffEta ? Date.parse(best.dropoffEta) - Date.now() : NaN;

    return {
      // Carries the Nash order id — dispatch() PATCHes this same order.
      id: String(data.id),
      provider: 'nash',
      courier_fee_cents: fee,
      eta_minutes: Number.isFinite(etaMs) ? Math.max(1, Math.round(etaMs / 60000)) : 45,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  },

  async dispatch(req: DeliveryDispatchRequest): Promise<Delivery> {
    // Dropping the quotes_only tag is what turns the quote into a real job.
    const data = await nashFetch(`/order/${encodeURIComponent(req.quote.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(orderPayload(req, { tags: [], externalId: req.reference })),
    });

    return {
      id: String(data.id ?? req.quote.id),
      provider: 'nash',
      status: mapStatus(data.status),
      tracking_url: (data.publicTrackingUrl as string) ?? (data.portalUrl as string) ?? undefined,
      eta_minutes: req.quote.eta_minutes,
    };
  },

  async cancel(deliveryId: string): Promise<void> {
    await nashFetch(`/order/${encodeURIComponent(deliveryId)}/cancel`, { method: 'POST' });
  },

  async get(deliveryId: string): Promise<Delivery> {
    const data = await nashFetch(`/order/${encodeURIComponent(deliveryId)}`, { method: 'GET' });
    return {
      id: String(data.id ?? deliveryId),
      provider: 'nash',
      status: mapStatus(data.status),
      tracking_url: (data.publicTrackingUrl as string) ?? undefined,
    };
  },
};
