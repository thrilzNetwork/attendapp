/* Attenda Serve — growth network store.
   Affiliate → Market Partner → Country → Customer tracking.
   LATAM-native: every entity carries a country (ISO-2). No hardcoded market.
   Money = USD cents everywhere. Commissions:
     - personal sale: $50 activation + 10% recurring
     - market override: 5% recurring on affiliate-generated accounts
     - market partner personal sales also earn the override chain on
       affiliates they recruit (recruitedBy). */

import { getStore } from '@netlify/blobs';

export type Country = string; // ISO-2: PE, BO, CO, EC, MX, ...

export type Partner = {
  id: string;
  kind: 'affiliate' | 'market_partner';
  name: string;
  email: string;
  phone: string;
  country: Country;
  city?: string;
  code: string; // referral code — unique, e.g. "MRK-BO-7F3K"
  marketPartnerId?: string; // set for affiliates recruited by an MP
  status: 'pending' | 'approved' | 'suspended';
  createdAt: number;
};

export type CommissionEntry = {
  id: string;
  partnerId: string;
  tenantId: string;
  country: Country;
  type: 'activation' | 'recurring' | 'market_override' | 'bonus';
  plan: 'starter' | 'growth';
  amountCents: number; // USD
  status: 'pending' | 'approved' | 'paid';
  createdAt: number;
  paidAt?: number;
  note?: string;
};

export const PLAN_FEES: Record<'starter' | 'growth', number> = {
  starter: 2900, // $29/mo
  growth: 4900, // $49/mo
};

export const COMMISSION = {
  activationCents: 5000, // $50 per qualified activation
  recurringPct: 0.1, // 10% of the customer's actual subscription
  marketOverridePct: 0.05, // 5% recurring on network-generated accounts
};

/* ── blob-backed store (same pattern as serve/store.ts) ── */
const PARTNERS_KEY = 'serve/growth/partners.json';
const COMMISSIONS_KEY = 'serve/growth/commissions.json';
const MEM: { partners: Partner[] | null; commissions: CommissionEntry[] | null } = {
  partners: null,
  commissions: null,
};
let hasBlobs: boolean | null = null;
async function blobStore(): Promise<boolean> {
  if (hasBlobs === null) {
    try {
      getStore({ name: 'attenda_serve', consistency: 'strong' });
      hasBlobs = true;
    } catch {
      hasBlobs = false;
    }
  }
  return hasBlobs;
}
async function readJSON<T>(key: string, fallback: T): Promise<T> {
  if (!(await blobStore())) return fallback;
  const s = await getStore({ name: 'attenda_serve', consistency: 'strong' });
  try {
    const raw = await s.get(key, { type: 'text' });
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
async function writeJSON(key: string, value: unknown): Promise<void> {
  if (!(await blobStore())) return;
  const s = await getStore({ name: 'attenda_serve', consistency: 'strong' });
  await s.setJSON(key, value);
}

/* ── partners ── */
export async function listPartners(): Promise<Partner[]> {
  if (MEM.partners) return MEM.partners;
  const p = await readJSON<Partner[]>(PARTNERS_KEY, []);
  MEM.partners = p;
  return p;
}
function genCode(kind: 'affiliate' | 'market_partner', country: string): string {
  const suf = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${kind === 'affiliate' ? 'AFF' : 'MRK'}-${country}-${suf}`;
}
export async function createPartner(input: {
  kind: 'affiliate' | 'market_partner';
  name: string; email: string; phone: string;
  country: string; city?: string;
  marketPartnerId?: string;
}): Promise<Partner> {
  const ps = await listPartners();
  let code = genCode(input.kind, input.country || 'LAT');
  while (ps.some((p) => p.code === code)) code = genCode(input.kind, input.country || 'LAT');
  const p: Partner = {
    id: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`,
    kind: input.kind,
    name: input.name,
    email: input.email,
    phone: input.phone,
    country: input.country || '',
    city: input.city,
    code,
    marketPartnerId: input.marketPartnerId,
    status: 'pending',
    createdAt: Date.now(),
  };
  ps.push(p);
  MEM.partners = ps;
  await writeJSON(PARTNERS_KEY, ps);
  return p;
}
export async function findPartnerByCode(code: string): Promise<Partner | null> {
  const ps = await listPartners();
  return ps.find((p) => p.code === code.toUpperCase()) ?? null;
}
export async function getPartner(id: string): Promise<Partner | null> {
  const ps = await listPartners();
  return ps.find((p) => p.id === id) ?? null;
}
export async function updatePartnerStatus(id: string, status: Partner['status']): Promise<void> {
  const ps = await listPartners();
  const p = ps.find((x) => x.id === id);
  if (p) {
    p.status = status;
    MEM.partners = ps;
    await writeJSON(PARTNERS_KEY, ps);
  }
}

/* ── commissions ── */
export async function listCommissions(): Promise<CommissionEntry[]> {
  if (MEM.commissions) return MEM.commissions;
  const c = await readJSON<CommissionEntry[]>(COMMISSIONS_KEY, []);
  MEM.commissions = c;
  return c;
}
export async function recordCommission(entry: Omit<CommissionEntry, 'id' | 'createdAt'>): Promise<CommissionEntry> {
  const cs = await listCommissions();
  const e: CommissionEntry = { ...entry, id: `c${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`, createdAt: Date.now() };
  cs.push(e);
  MEM.commissions = cs;
  await writeJSON(COMMISSIONS_KEY, cs);
  return e;
}
export async function markCommissionsPaid(ids: string[]): Promise<void> {
  const cs = await listCommissions();
  for (const c of cs) {
    if (ids.includes(c.id)) {
      c.status = 'paid';
      c.paidAt = Date.now();
    }
  }
  MEM.commissions = cs;
  await writeJSON(COMMISSIONS_KEY, cs);
}

/* ── attribution on tenant creation (called from store.createTenant) ── */
export async function applyAttribution(
  tenant: { id: string; country: string },
  input: { referralCode?: string; plan?: 'starter' | 'growth' },
): Promise<ServeTenantLike['referral']> {
  const code = (input.referralCode || '').trim().toUpperCase();
  if (!code) return null;
  const p = await findPartnerByCode(code);
  if (!p || p.status === 'suspended') return null;

  const mpId = p.kind === 'market_partner' ? p.id : p.marketPartnerId;
  const source: 'affiliate' | 'market_partner' = p.kind;

  // activation commission for the closer
  await recordCommission({
    partnerId: p.id,
    tenantId: tenant.id,
    country: p.country || tenant.country,
    type: 'activation',
    plan: input.plan || 'starter',
    amountCents: COMMISSION.activationCents,
    status: 'pending',
    note: `Activation ${p.code}`,
  });
  return { source, affiliateId: p.kind === 'affiliate' ? p.id : undefined, marketPartnerId: mpId, plan: input.plan, activatedAt: Date.now() };
}

/* ── dashboard rollup for one partner ── */
export type PartnerStats = {
  activeCustomers: number;
  newActivations30d: number;
  mrrCents: number; // MRR the partner generated
  recurringCents: number; // their 10% (or override) monthly share
  pendingCents: number;
  paidCents: number;
  cancellations: number;
};
export async function partnerStats(partnerId: string, tenants: { id: string; status: string; referral: ServeTenantLike['referral'] }[]): Promise<PartnerStats> {
  const cs = await listCommissions();
  const mine = cs.filter((c) => c.partnerId === partnerId);
  const myTenants = tenants.filter((t) => {
    const r = t.referral;
    if (!r) return false;
    return r.affiliateId === partnerId || r.marketPartnerId === partnerId;
  });
  const active = myTenants.filter((t) => t.status === 'official' && t.referral?.activatedAt);
  const recurring = mine.filter((c) => c.type === 'recurring' || c.type === 'market_override');
  return {
    activeCustomers: active.length,
    newActivations30d: active.filter((t) => (t.referral?.activatedAt || 0) > Date.now() - 30 * 864e5).length,
    mrrCents: myTenants.reduce((sum, t) => sum + (PLAN_FEES[t.referral?.plan || 'starter'] || 0), 0),
    recurringCents: recurring.filter((c) => c.status !== 'paid').reduce((s, c) => s + c.amountCents, 0),
    pendingCents: mine.filter((c) => c.status === 'pending').reduce((s, c) => s + c.amountCents, 0),
    paidCents: mine.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amountCents, 0),
    cancellations: myTenants.filter((t) => t.status === 'cancelled').length,
  };
}

/* internal shape mirror to avoid circular import with serve/store.ts */
type ServeTenantLike = {
  id: string;
  status: string;
  referral: {
    source: 'direct' | 'affiliate' | 'market_partner';
    affiliateId?: string;
    marketPartnerId?: string;
    plan?: 'starter' | 'growth';
    activatedAt?: number;
  } | null;
};