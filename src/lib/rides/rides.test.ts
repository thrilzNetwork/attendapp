import { describe, it, expect, beforeEach } from 'vitest';
import { resolveRideChain, getBestRideQuote } from './index';
import { calculateRideFees } from '../fees';

const req = {
  pickup: { address: '1221 W State Rd 84, Fort Lauderdale, FL' },
  dropoff: { address: 'FLL Terminal 1' },
  passengers: 2,
};

beforeEach(() => {
  delete process.env.LYFT_CLIENT_ID;
  delete process.env.LYFT_CLIENT_SECRET;
  delete process.env.TAXICALLER_API_KEY;
});

describe('resolveRideChain', () => {
  it('falls back to manual dispatch when nothing is configured', () => {
    expect(resolveRideChain(null).map(p => p.name)).toEqual(['manual_dispatch']);
  });

  it('skips providers missing credentials', () => {
    expect(resolveRideChain(['lyft_concierge', 'manual_dispatch']).map(p => p.name)).toEqual([
      'manual_dispatch',
    ]);
  });

  it('never returns an empty chain', () => {
    expect(resolveRideChain(['lyft_concierge']).length).toBeGreaterThan(0);
  });
});

describe('getBestRideQuote', () => {
  it('always yields a bookable quote via manual dispatch', async () => {
    const { quote } = await getBestRideQuote(req);
    expect(quote.provider).toBe('manual_dispatch');
    // Fare is unknown until staff enter it; the fee is known up front.
    expect(quote.fare_cents).toBe(0);
    expect(quote.service_fee_cents).toBeGreaterThan(0);
  });

  it('produces a guest total that separates fare from fee', async () => {
    const { quote } = await getBestRideQuote(req);
    const fees = calculateRideFees({
      fare_cents: 2400, // entered by staff after the ride
      service_fee_cents: quote.service_fee_cents,
    });
    expect(fees.guest_total_cents).toBe(2400 + quote.service_fee_cents);
    expect(fees.fare_passthrough_cents).toBe(2400);
    expect(fees.guest_lines).toHaveLength(2);
  });
});
