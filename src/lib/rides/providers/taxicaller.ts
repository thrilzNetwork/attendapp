import { createTaxiCallerBooking, getTaxiCallerQuote, cancelTaxiCallerBooking } from '@/lib/taxicaller';
import {
  RideUnavailableError,
  type Ride,
  type RideBookRequest,
  type RideProvider,
  type RideQuote,
  type RideQuoteRequest,
} from '../types';

/**
 * TaxiCaller — dispatch software used by individual taxi fleets.
 *
 * ⚠️  The underlying src/lib/taxicaller.ts was written before any credentials
 * existed and has never run against the real service, so its endpoints and auth
 * are assumptions. Only worth finishing if the property signs a specific local
 * fleet that runs TaxiCaller; otherwise prefer Lyft Concierge or manual dispatch.
 */

const SERVICE_FEE_CENTS = Number(process.env.RIDE_SERVICE_FEE_CENTS ?? 500);

export const taxicaller: RideProvider = {
  name: 'taxicaller',

  isConfigured() {
    return Boolean(process.env.TAXICALLER_API_KEY);
  },

  async quote(req: RideQuoteRequest): Promise<RideQuote> {
    try {
      const q = await getTaxiCallerQuote({
        pickup: req.pickup.address,
        destination: req.dropoff.address,
        pax: req.passengers,
        pickupTime: req.pickup_at ?? new Date().toISOString(),
      });
      return {
        id: q.quoteId,
        provider: 'taxicaller',
        fare_cents: q.base_fare_cents,
        service_fee_cents: SERVICE_FEE_CENTS,
        eta_minutes: q.estimated_mins,
        vehicle_type: q.vehicle_type,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };
    } catch (e) {
      throw new RideUnavailableError('taxicaller', (e as Error).message);
    }
  },

  async book(req: RideBookRequest): Promise<Ride> {
    try {
      const b = await createTaxiCallerBooking({
        quoteId: req.quote.id,
        guestName: req.guest_name,
        guestPhone: req.guest_phone,
        pickup: req.pickup.address,
        destination: req.dropoff.address,
        pickupTime: req.pickup_at ?? new Date().toISOString(),
        pax: req.passengers,
        notes: req.notes,
      });
      return {
        id: b.booking_id,
        provider: 'taxicaller',
        status: 'accepted',
        driver_name: b.driver_name,
        driver_phone: b.driver_phone,
        vehicle_plate: b.vehicle_plate,
        tracking_url: b.tracking_url,
        eta_minutes: req.quote.eta_minutes,
      };
    } catch (e) {
      throw new RideUnavailableError('taxicaller', (e as Error).message);
    }
  },

  async cancel(rideId: string): Promise<void> {
    await cancelTaxiCallerBooking(rideId);
  },

  async get(rideId: string): Promise<Ride> {
    // The scaffold exposes no status read; webhooks update the row instead.
    return { id: rideId, provider: 'taxicaller', status: 'pending' };
  },
};
