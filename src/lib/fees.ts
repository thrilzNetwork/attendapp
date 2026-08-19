/**
 * Money math for partner orders and guest rides.
 *
 * Two rules hold everywhere in this file:
 *
 *  1. Integer cents only. These numbers land on a folio and in Stripe; floats
 *     drift and the drift shows up as a cent that nobody can account for.
 *
 *  2. Third-party cost is passed through at cost, and Attenda's margin is a
 *     separate, named line. Marking up a courier fee or a taxi fare turns the
 *     hotel into a reseller of transportation, which its Uber/Lyft business
 *     terms generally forbid and which carries local regulatory exposure. A
 *     disclosed coordination fee is an ordinary hotel amenity charge and earns
 *     the same money. Keep the two lines distinct.
 */

/** Round half away from zero — matches how a human splits a bill. */
function pct(amountCents: number, percent: number): number {
  return Math.round((amountCents * percent) / 100);
}

export interface OrderFeeInput {
  /** Partner order subtotal in cents, before any fee. */
  goods_cents: number;
  /** What the courier charges us, in cents. Zero when the partner delivers. */
  courier_fee_cents: number;
  /** partners.attenda_fee_percent — commission on goods. */
  attenda_fee_percent: number;
  /** partners.hotel_revenue_share_percent — the property's cut of goods. */
  hotel_revenue_share_percent: number;
  /** Flat, disclosed coordination fee added to the guest's total. */
  service_fee_cents?: number;
}

export interface FeeBreakdown {
  /** What the guest is charged, in cents. */
  guest_total_cents: number;
  /** Guest-facing lines, in display order. */
  guest_lines: { label: string; amount_cents: number }[];
  /** Internal split — must reconcile against guest_total_cents. */
  partner_payout_cents: number;
  hotel_payout_cents: number;
  attenda_revenue_cents: number;
  courier_cost_cents: number;
}

export function calculateOrderFees(input: OrderFeeInput): FeeBreakdown {
  const {
    goods_cents,
    courier_fee_cents,
    attenda_fee_percent,
    hotel_revenue_share_percent,
    service_fee_cents = 0,
  } = input;

  if (goods_cents < 0 || courier_fee_cents < 0 || service_fee_cents < 0) {
    throw new Error('Fee inputs must be non-negative');
  }
  if (attenda_fee_percent + hotel_revenue_share_percent > 100) {
    throw new Error('Commission percentages exceed order value');
  }

  const attendaCommission = pct(goods_cents, attenda_fee_percent);
  const hotelShare = pct(goods_cents, hotel_revenue_share_percent);

  // Commission comes out of the partner's side; the guest never sees it.
  const partnerPayout = goods_cents - attendaCommission - hotelShare;

  // The guest pays for goods, the courier at cost, and the coordination fee.
  const guestTotal = goods_cents + courier_fee_cents + service_fee_cents;

  const guestLines = [{ label: 'Order', amount_cents: goods_cents }];
  if (courier_fee_cents > 0) {
    guestLines.push({ label: 'Delivery', amount_cents: courier_fee_cents });
  }
  if (service_fee_cents > 0) {
    guestLines.push({ label: 'Service fee', amount_cents: service_fee_cents });
  }

  return {
    guest_total_cents: guestTotal,
    guest_lines: guestLines,
    partner_payout_cents: partnerPayout,
    hotel_payout_cents: hotelShare,
    // Courier cost is passed through, so it is not margin — the service fee is.
    attenda_revenue_cents: attendaCommission + service_fee_cents,
    courier_cost_cents: courier_fee_cents,
  };
}

export interface RideFeeInput {
  /** Fare quoted by the ride provider, in cents. Passed through at cost. */
  fare_cents: number;
  /** Flat coordination fee the property charges, in cents. */
  service_fee_cents: number;
  /** Optional share of the service fee retained by Attenda. */
  attenda_share_percent?: number;
}

export interface RideFeeBreakdown {
  guest_total_cents: number;
  guest_lines: { label: string; amount_cents: number }[];
  fare_passthrough_cents: number;
  hotel_payout_cents: number;
  attenda_revenue_cents: number;
}

export function calculateRideFees(input: RideFeeInput): RideFeeBreakdown {
  const { fare_cents, service_fee_cents, attenda_share_percent = 0 } = input;

  if (fare_cents < 0 || service_fee_cents < 0) {
    throw new Error('Fee inputs must be non-negative');
  }

  const attendaCut = pct(service_fee_cents, attenda_share_percent);

  return {
    guest_total_cents: fare_cents + service_fee_cents,
    guest_lines: [
      { label: 'Fare', amount_cents: fare_cents },
      ...(service_fee_cents > 0
        ? [{ label: 'Service fee', amount_cents: service_fee_cents }]
        : []),
    ],
    fare_passthrough_cents: fare_cents,
    hotel_payout_cents: service_fee_cents - attendaCut,
    attenda_revenue_cents: attendaCut,
  };
}
