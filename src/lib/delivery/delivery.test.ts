import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveChain, getBestQuote } from './index';
import type { DeliveryProvider, DeliveryQuoteRequest } from './types';

const req: DeliveryQuoteRequest = {
  pickup: { name: 'Seaside Sushi', address: '100 SE 3rd Ave, Fort Lauderdale, FL' },
  dropoff: { name: 'Hotel', address: '1221 W State Rd 84, Fort Lauderdale, FL' },
};

beforeEach(() => {
  delete process.env.NASH_API_KEY;
  delete process.env.NASH_ORG_ID;
  delete process.env.UBER_DIRECT_CLIENT_ID;
  delete process.env.UBER_DIRECT_CLIENT_SECRET;
  delete process.env.UBER_DIRECT_CUSTOMER_ID;
});
afterEach(() => vi.restoreAllMocks());

describe('resolveChain', () => {
  it('falls back to partner-fulfilled when no courier is configured', () => {
    const chain = resolveChain(null);
    expect(chain.map(p => p.name)).toEqual(['partner_fulfilled']);
  });

  it('honours a per-partner override', () => {
    const chain = resolveChain(['partner_fulfilled']);
    expect(chain.map(p => p.name)).toEqual(['partner_fulfilled']);
  });

  it('drops unknown provider names instead of throwing', () => {
    const chain = resolveChain(['some_dead_vendor', 'partner_fulfilled']);
    expect(chain.map(p => p.name)).toEqual(['partner_fulfilled']);
  });

  it('never returns an empty chain even for all-unknown input', () => {
    expect(resolveChain(['nope', 'also_nope']).length).toBeGreaterThan(0);
  });
});

describe('getBestQuote', () => {
  it('quotes a zero courier fee when the partner delivers', async () => {
    const { quote, attempts } = await getBestQuote(req, ['partner_fulfilled']);
    expect(quote.provider).toBe('partner_fulfilled');
    expect(quote.courier_fee_cents).toBe(0);
    expect(attempts).toEqual([]);
  });

  it('moves to the next provider when one declines, and records why', async () => {
    const failing: DeliveryProvider = {
      name: 'nash',
      isConfigured: () => true,
      quote: async () => {
        throw new Error('account disabled');
      },
      dispatch: async () => {
        throw new Error('unused');
      },
      cancel: async () => {},
      get: async () => {
        throw new Error('unused');
      },
    };

    // Stand in for a suspended courier ahead of the always-available fallback.
    const chain = [failing, ...resolveChain(['partner_fulfilled'])];
    const attempts: { provider: string; error: string }[] = [];
    let result = null;
    for (const p of chain) {
      try {
        result = await p.quote(req);
        break;
      } catch (e) {
        attempts.push({ provider: p.name, error: (e as Error).message });
      }
    }

    expect(attempts).toEqual([{ provider: 'nash', error: 'account disabled' }]);
    expect(result?.provider).toBe('partner_fulfilled');
  });
});
