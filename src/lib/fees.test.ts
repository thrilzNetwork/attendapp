import { describe, it, expect } from 'vitest';
import { calculateOrderFees, calculateRideFees } from './fees';

describe('calculateOrderFees', () => {
  it('splits a partner order at the configured percentages', () => {
    const r = calculateOrderFees({
      goods_cents: 4000,
      courier_fee_cents: 799,
      attenda_fee_percent: 15,
      hotel_revenue_share_percent: 5,
    });
    expect(r.attenda_revenue_cents).toBe(600);
    expect(r.hotel_payout_cents).toBe(200);
    expect(r.partner_payout_cents).toBe(3200);
    expect(r.guest_total_cents).toBe(4799);
  });

  it('reconciles: partner + hotel + commission equals goods', () => {
    const r = calculateOrderFees({
      goods_cents: 3333,
      courier_fee_cents: 500,
      attenda_fee_percent: 15,
      hotel_revenue_share_percent: 5,
    });
    const commission = r.attenda_revenue_cents; // no service fee here
    expect(r.partner_payout_cents + r.hotel_payout_cents + commission).toBe(3333);
  });

  it('passes the courier fee through without margin', () => {
    const r = calculateOrderFees({
      goods_cents: 2000,
      courier_fee_cents: 1250,
      attenda_fee_percent: 10,
      hotel_revenue_share_percent: 5,
    });
    expect(r.courier_cost_cents).toBe(1250);
    // Courier cost reaches the guest unchanged, and is absent from margin.
    expect(r.guest_total_cents - 2000).toBe(1250);
    expect(r.attenda_revenue_cents).toBe(200);
  });

  it('omits the delivery line when the partner delivers', () => {
    const r = calculateOrderFees({
      goods_cents: 2500,
      courier_fee_cents: 0,
      attenda_fee_percent: 15,
      hotel_revenue_share_percent: 5,
    });
    expect(r.guest_lines.map(l => l.label)).toEqual(['Order']);
    expect(r.guest_total_cents).toBe(2500);
  });

  it('counts the service fee as margin, not pass-through', () => {
    const r = calculateOrderFees({
      goods_cents: 1000,
      courier_fee_cents: 0,
      attenda_fee_percent: 10,
      hotel_revenue_share_percent: 0,
      service_fee_cents: 300,
    });
    expect(r.attenda_revenue_cents).toBe(400); // 100 commission + 300 fee
    expect(r.guest_total_cents).toBe(1300);
  });

  it('rejects negative and over-100% inputs', () => {
    expect(() =>
      calculateOrderFees({
        goods_cents: -1,
        courier_fee_cents: 0,
        attenda_fee_percent: 10,
        hotel_revenue_share_percent: 5,
      }),
    ).toThrow(/non-negative/);
    expect(() =>
      calculateOrderFees({
        goods_cents: 1000,
        courier_fee_cents: 0,
        attenda_fee_percent: 80,
        hotel_revenue_share_percent: 30,
      }),
    ).toThrow(/exceed order value/);
  });
});

describe('calculateRideFees', () => {
  it('passes the fare through and charges the fee separately', () => {
    const r = calculateRideFees({ fare_cents: 2350, service_fee_cents: 500 });
    expect(r.fare_passthrough_cents).toBe(2350);
    expect(r.guest_total_cents).toBe(2850);
    expect(r.hotel_payout_cents).toBe(500);
    expect(r.attenda_revenue_cents).toBe(0);
    // The guest sees the fare and the fee as distinct lines — never one blended
    // number, which is what makes it a pass-through rather than a markup.
    expect(r.guest_lines.map(l => l.label)).toEqual(['Fare', 'Service fee']);
  });

  it('splits the service fee when Attenda takes a share', () => {
    const r = calculateRideFees({
      fare_cents: 2000,
      service_fee_cents: 600,
      attenda_share_percent: 25,
    });
    expect(r.attenda_revenue_cents).toBe(150);
    expect(r.hotel_payout_cents).toBe(450);
    expect(r.fare_passthrough_cents).toBe(2000);
  });

  it('never takes a share of the fare itself', () => {
    const r = calculateRideFees({
      fare_cents: 10000,
      service_fee_cents: 0,
      attenda_share_percent: 100,
    });
    expect(r.attenda_revenue_cents).toBe(0);
    expect(r.guest_total_cents).toBe(10000);
  });
});
