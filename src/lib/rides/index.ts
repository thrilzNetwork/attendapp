import {
  RideUnavailableError,
  type RideProvider,
  type RideProviderName,
  type RideQuote,
  type RideQuoteRequest,
} from './types';
import { manualDispatch } from './providers/manual-dispatch';
import { lyftConcierge } from './providers/lyft-concierge';
import { taxicaller } from './providers/taxicaller';

export * from './types';
export { manualDispatch, lyftConcierge, taxicaller };

const REGISTRY: Record<RideProviderName, RideProvider> = {
  manual_dispatch: manualDispatch,
  lyft_concierge: lyftConcierge,
  taxicaller,
};

/**
 * Lyft first (real coverage, real ETAs), then a contracted local fleet, then the
 * front desk. manual_dispatch is last and always available, so a guest asking
 * for a ride never hits a dead end — worst case it becomes a phone call that
 * Attenda still records and bills.
 */
const DEFAULT_CHAIN: RideProviderName[] = ['lyft_concierge', 'taxicaller', 'manual_dispatch'];

export function getRideProvider(name: RideProviderName): RideProvider {
  return REGISTRY[name];
}

export function resolveRideChain(preferred?: string[] | null): RideProvider[] {
  const requested = (preferred ?? []).filter((n): n is RideProviderName => n in REGISTRY);
  const chain = requested.length > 0 ? requested : DEFAULT_CHAIN;
  const usable = chain.map(n => REGISTRY[n]).filter(p => p.isConfigured());
  return usable.length > 0 ? usable : [manualDispatch];
}

export interface RideQuoteResult {
  quote: RideQuote;
  attempts: { provider: RideProviderName; error: string }[];
}

export async function getBestRideQuote(
  req: RideQuoteRequest,
  preferred?: string[] | null,
): Promise<RideQuoteResult> {
  const chain = resolveRideChain(preferred);
  const attempts: { provider: RideProviderName; error: string }[] = [];

  for (const provider of chain) {
    try {
      return { quote: await provider.quote(req), attempts };
    } catch (e) {
      attempts.push({ provider: provider.name, error: (e as Error).message });
    }
  }

  throw new RideUnavailableError(
    'manual_dispatch',
    `Every ride provider declined: ${attempts.map(a => `${a.provider} (${a.error})`).join('; ')}`,
  );
}
