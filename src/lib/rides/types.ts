/**
 * Provider-neutral ride contract — the transport twin of src/lib/delivery.
 *
 * Replaces "call the shuttle" with "dispatch a ride and bill for it", without
 * committing the routes to any one dispatcher.
 */

export interface RideStop {
  address: string;
  lat?: number;
  lng?: number;
  /** "Under the porte-cochère", "Terminal 2 arrivals", etc. */
  notes?: string;
}

export interface RideQuoteRequest {
  pickup: RideStop;
  dropoff: RideStop;
  passengers: number;
  /** ISO datetime; omit for ASAP. */
  pickup_at?: string;
}

export interface RideQuote {
  id: string;
  provider: RideProviderName;
  /** Provider's fare in cents. Passed through at cost — never marked up. */
  fare_cents: number;
  /** Cents the property adds as a disclosed coordination fee. */
  service_fee_cents: number;
  eta_minutes: number;
  vehicle_type?: string;
  expires_at: string;
}

export interface RideBookRequest extends RideQuoteRequest {
  quote: RideQuote;
  guest_name: string;
  guest_phone?: string;
  /** Attenda's own request id, for reconciling webhooks. */
  reference: string;
  notes?: string;
}

export type RideStatus =
  | 'pending'
  | 'accepted'
  | 'arriving'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'failed';

export interface Ride {
  id: string;
  provider: RideProviderName;
  status: RideStatus;
  driver_name?: string;
  driver_phone?: string;
  vehicle_plate?: string;
  tracking_url?: string;
  eta_minutes?: number;
}

export type RideProviderName = 'manual_dispatch' | 'lyft_concierge' | 'taxicaller';

export interface RideProvider {
  readonly name: RideProviderName;
  isConfigured(): boolean;
  quote(req: RideQuoteRequest): Promise<RideQuote>;
  book(req: RideBookRequest): Promise<Ride>;
  cancel(rideId: string): Promise<void>;
  get(rideId: string): Promise<Ride>;
}

export class RideUnavailableError extends Error {
  constructor(
    public readonly provider: RideProviderName,
    message: string,
  ) {
    super(message);
    this.name = 'RideUnavailableError';
  }
}
