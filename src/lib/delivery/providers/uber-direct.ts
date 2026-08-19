import { createDelivery, getDeliveryQuote } from '@/lib/uber-direct';
import {
  DeliveryUnavailableError,
  type Delivery,
  type DeliveryDispatchRequest,
  type DeliveryProvider,
  type DeliveryQuote,
  type DeliveryQuoteRequest,
} from '../types';

/**
 * Uber Direct, wrapped in the neutral contract.
 *
 * Kept rather than deleted: the account is disabled, not gone, and if Uber
 * reinstates it this becomes another lane in the fallback chain instead of a
 * migration. Nash can also route to Uber, so this matters mainly for direct use.
 */
export const uberDirect: DeliveryProvider = {
  name: 'uber_direct',

  isConfigured() {
    return Boolean(
      process.env.UBER_DIRECT_CLIENT_ID &&
        process.env.UBER_DIRECT_CLIENT_SECRET &&
        process.env.UBER_DIRECT_CUSTOMER_ID,
    );
  },

  async quote(req: DeliveryQuoteRequest): Promise<DeliveryQuote> {
    try {
      const q = await getDeliveryQuote({
        pickup_address: req.pickup.address,
        dropoff_address: req.dropoff.address,
        pickup_lat: req.pickup.lat,
        pickup_lng: req.pickup.lng,
        dropoff_lat: req.dropoff.lat,
        dropoff_lng: req.dropoff.lng,
      });
      return {
        id: q.id,
        provider: 'uber_direct',
        courier_fee_cents: q.fee_cents,
        eta_minutes: q.eta_minutes,
        expires_at: q.expires,
      };
    } catch (e) {
      // Account suspension surfaces here; let the resolver fall through.
      throw new DeliveryUnavailableError('uber_direct', (e as Error).message);
    }
  },

  async dispatch(req: DeliveryDispatchRequest): Promise<Delivery> {
    try {
      const d = await createDelivery({
        quote_id: req.quote.id,
        pickup: {
          name: req.pickup.name,
          address: req.pickup.address,
          phone_number: req.pickup.phone,
          notes: req.pickup.notes,
        },
        dropoff: {
          name: req.dropoff.name,
          address: req.dropoff.address,
          phone_number: req.dropoff.phone,
          notes: req.dropoff.notes,
        },
        manifest_items: (req.items ?? []).map(i => ({
          name: i.name,
          quantity: i.quantity,
          // The underlying helper multiplies by 100, so hand it dollars.
          price: i.price_cents / 100,
        })),
        external_store_id: req.partner_id ?? 'attenda',
      });
      return {
        id: d.id,
        provider: 'uber_direct',
        status: 'pending',
        tracking_url: d.tracking_url,
        eta_minutes: req.quote.eta_minutes,
      };
    } catch (e) {
      throw new DeliveryUnavailableError('uber_direct', (e as Error).message);
    }
  },

  async cancel(): Promise<void> {
    throw new DeliveryUnavailableError('uber_direct', 'Cancel not implemented for Uber Direct');
  },

  async get(deliveryId: string): Promise<Delivery> {
    return { id: deliveryId, provider: 'uber_direct', status: 'pending' };
  },
};
