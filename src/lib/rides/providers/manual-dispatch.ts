import type {
  Ride,
  RideBookRequest,
  RideProvider,
  RideQuote,
  RideQuoteRequest,
} from '../types';

/**
 * The front desk calls a cab; Attenda records and bills it.
 *
 * This is what the property does today, except the ride becomes a tracked row
 * with a fee attached instead of an untracked favour. It needs no vendor, no
 * contract and no approval, so the revenue line can open before Lyft or any
 * taxi fleet says yes — and it stays as the floor if a provider drops out.
 */

/** Flat coordination fee in cents; configurable per property. */
const DEFAULT_SERVICE_FEE_CENTS = Number(process.env.RIDE_SERVICE_FEE_CENTS ?? 500);

export const manualDispatch: RideProvider = {
  name: 'manual_dispatch',

  isConfigured() {
    return true;
  },

  async quote(req: RideQuoteRequest): Promise<RideQuote> {
    return {
      id: `manual:${Date.now()}`,
      provider: 'manual_dispatch',
      // Staff enter the real fare after the ride; nothing is invented here.
      fare_cents: 0,
      service_fee_cents: DEFAULT_SERVICE_FEE_CENTS,
      eta_minutes: 15,
      vehicle_type: 'Taxi',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  },

  async book(req: RideBookRequest): Promise<Ride> {
    // No API call — staff phone the fleet and fill in driver details as they get them.
    return {
      id: req.reference,
      provider: 'manual_dispatch',
      status: 'pending',
      eta_minutes: req.quote.eta_minutes,
    };
  },

  async cancel(): Promise<void> {
    // Cancelling is a phone call; the row is closed from the dashboard.
  },

  async get(rideId: string): Promise<Ride> {
    return { id: rideId, provider: 'manual_dispatch', status: 'pending' };
  },
};
