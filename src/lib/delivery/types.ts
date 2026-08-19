/**
 * Provider-neutral delivery contract.
 *
 * Uber Direct was hard-wired into the routes, so when Uber disabled the account
 * the whole feature died with it. Everything below is vendor-agnostic on purpose:
 * adding or losing a courier should be an adapter change, never a route change.
 */

/** A physical endpoint of a delivery — a partner kitchen, or the hotel. */
export interface DeliveryStop {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  phone?: string;
  /** Gate codes, "ask for the front desk", room number, etc. */
  notes?: string;
}

export interface DeliveryItem {
  name: string;
  quantity: number;
  /** Integer cents. Never floats — this figure ends up on a folio. */
  price_cents: number;
}

export interface DeliveryQuoteRequest {
  pickup: DeliveryStop;
  dropoff: DeliveryStop;
  items?: DeliveryItem[];
  /** Partner row id, so an adapter can read per-partner config. */
  partner_id?: string;
}

export interface DeliveryQuote {
  /** Opaque to callers; only the issuing provider needs to parse it. */
  id: string;
  provider: DeliveryProviderName;
  /** What the courier charges, in cents. Zero for partner-fulfilled. */
  courier_fee_cents: number;
  eta_minutes: number;
  /** ISO timestamp. Past this, re-quote rather than dispatch. */
  expires_at: string;
}

export interface DeliveryDispatchRequest extends DeliveryQuoteRequest {
  quote: DeliveryQuote;
  guest_name?: string;
  guest_phone?: string;
  /** Attenda's own order id, for reconciling webhooks back to a row. */
  reference: string;
}

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'canceled'
  | 'failed';

export interface Delivery {
  id: string;
  provider: DeliveryProviderName;
  status: DeliveryStatus;
  tracking_url?: string;
  courier_name?: string;
  courier_phone?: string;
  eta_minutes?: number;
}

export type DeliveryProviderName = 'partner_fulfilled' | 'nash' | 'uber_direct';

export interface DeliveryProvider {
  readonly name: DeliveryProviderName;
  /** False when credentials are absent, so the resolver can skip it cleanly. */
  isConfigured(): boolean;
  quote(req: DeliveryQuoteRequest): Promise<DeliveryQuote>;
  dispatch(req: DeliveryDispatchRequest): Promise<Delivery>;
  cancel(deliveryId: string): Promise<void>;
  get(deliveryId: string): Promise<Delivery>;
}

/** Thrown when a provider is reachable but declines this particular job. */
export class DeliveryUnavailableError extends Error {
  constructor(
    public readonly provider: DeliveryProviderName,
    message: string,
  ) {
    super(message);
    this.name = 'DeliveryUnavailableError';
  }
}
