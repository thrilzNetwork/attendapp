import type {
  Delivery,
  DeliveryDispatchRequest,
  DeliveryProvider,
  DeliveryQuote,
  DeliveryQuoteRequest,
} from '../types';

/**
 * The partner's own driver delivers.
 *
 * No courier, no API, no account anyone can disable — which is the point. This
 * is the tier that works on day one and keeps working when a vendor says no.
 * Attenda's job here is bookkeeping: record the order, charge the guest, track
 * the state that staff update by hand.
 */
export const partnerFulfilled: DeliveryProvider = {
  name: 'partner_fulfilled',

  isConfigured() {
    return true; // Nothing to configure — that is the whole advantage.
  },

  async quote(req: DeliveryQuoteRequest): Promise<DeliveryQuote> {
    return {
      id: `partner:${req.partner_id ?? 'unknown'}:${Date.now()}`,
      provider: 'partner_fulfilled',
      courier_fee_cents: 0,
      // The partner sets its own pace; this is a hint for the guest, not a promise.
      eta_minutes: 45,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  },

  async dispatch(req: DeliveryDispatchRequest): Promise<Delivery> {
    // Nothing to call. The order reaches the partner through the channel it
    // already uses, and staff move the status forward from the dashboard.
    return {
      id: req.reference,
      provider: 'partner_fulfilled',
      status: 'pending',
      eta_minutes: req.quote.eta_minutes,
    };
  },

  async cancel(): Promise<void> {
    // Cancellation is a phone call to the partner; there is no remote state.
  },

  async get(deliveryId: string): Promise<Delivery> {
    // Status lives in Attenda's own table, so callers read it from there.
    return { id: deliveryId, provider: 'partner_fulfilled', status: 'pending' };
  },
};
