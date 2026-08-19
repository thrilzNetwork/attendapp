import { DeliveryUnavailableError, type DeliveryProvider, type DeliveryProviderName, type DeliveryQuote, type DeliveryQuoteRequest } from './types';
import { partnerFulfilled } from './providers/partner-fulfilled';
import { nash } from './providers/nash';
import { uberDirect } from './providers/uber-direct';

export * from './types';
export { partnerFulfilled, nash, uberDirect };

const REGISTRY: Record<DeliveryProviderName, DeliveryProvider> = {
  partner_fulfilled: partnerFulfilled,
  nash,
  uber_direct: uberDirect,
};

/**
 * Order in which couriers are tried when a partner expresses no preference.
 * Nash first because it fans out across many couriers; partner_fulfilled last
 * because it always succeeds and would otherwise mask real courier options.
 */
const DEFAULT_CHAIN: DeliveryProviderName[] = ['nash', 'uber_direct', 'partner_fulfilled'];

export function getProvider(name: DeliveryProviderName): DeliveryProvider {
  return REGISTRY[name];
}

/**
 * Resolve the chain for a partner.
 *
 * `partners.delivery_providers` is a per-partner override — a kitchen with its
 * own drivers can pin itself to partner_fulfilled, while one without can lean on
 * couriers. Unknown or unconfigured names are dropped rather than throwing, so a
 * stale row can never take ordering down.
 */
export function resolveChain(partnerProviders?: string[] | null): DeliveryProvider[] {
  const requested = (partnerProviders ?? []).filter(
    (n): n is DeliveryProviderName => n in REGISTRY,
  );
  const chain = requested.length > 0 ? requested : DEFAULT_CHAIN;
  const usable = chain.map(n => REGISTRY[n]).filter(p => p.isConfigured());

  // Never hand back an empty chain: the partner's own driver is always an option.
  return usable.length > 0 ? usable : [partnerFulfilled];
}

export interface QuoteAttempt {
  provider: DeliveryProviderName;
  error: string;
}

export interface BestQuoteResult {
  quote: DeliveryQuote;
  /** Providers that declined before this one succeeded — worth logging. */
  attempts: QuoteAttempt[];
}

/**
 * Walk the chain and return the first quote we can get.
 *
 * A courier declining a job is ordinary — no coverage, closed, suspended — so a
 * failure moves to the next provider instead of surfacing to the guest. Only an
 * empty chain is a real error, and partner_fulfilled makes that near-impossible.
 */
export async function getBestQuote(
  req: DeliveryQuoteRequest,
  partnerProviders?: string[] | null,
): Promise<BestQuoteResult> {
  const chain = resolveChain(partnerProviders);
  const attempts: QuoteAttempt[] = [];

  for (const provider of chain) {
    try {
      const quote = await provider.quote(req);
      return { quote, attempts };
    } catch (e) {
      attempts.push({ provider: provider.name, error: (e as Error).message });
    }
  }

  throw new DeliveryUnavailableError(
    'partner_fulfilled',
    `Every provider declined: ${attempts.map(a => `${a.provider} (${a.error})`).join('; ')}`,
  );
}
