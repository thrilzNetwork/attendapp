'use client';

/* Attenda Serve — tenant data hook. One GET /api/serve/<id>, deduped
   across components on the same page; refresh() bypasses the cache. */

import { useCallback, useEffect, useState } from 'react';
import { ServeProduct } from '@/lib/serve/types';

export type TenantInfo = {
  id: string; name: string; type: string; city: string; phone: string;
  email: string; logo: string | null; tagline: string; status: 'demo' | 'official';
};

export type PublicSettings = {
  hoursEnabled: boolean; hoursOpen: string; hoursClose: string;
  allowAfterHours: boolean; ordersPaused: boolean;
  etaMin: number; etaMax: number; orderMin: number;
  zones: { id: string; name: string; fee: number }[];
  promoCode: string; promoDiscount: number;
  yapeNumber: string; yapeHolder: string;
};

export type TenantBundle = {
  ok: true; tenant: TenantInfo; menu: ServeProduct[];
  settings: PublicSettings; open: boolean; serverTime: number;
};

const cache = new Map<string, Promise<TenantBundle | null>>();

export function fetchBundle(id: string): Promise<TenantBundle | null> {
  let p = cache.get(id);
  if (!p) {
    p = fetch(`/api/serve/${id}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    cache.set(id, p);
  }
  return p;
}

export function invalidateBundle(id: string) {
  cache.delete(id);
}

export function useTenant(id: string) {
  const [data, setData] = useState<TenantBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    invalidateBundle(id);
    setLoading(true);
    fetchBundle(id).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    let alive = true;
    fetchBundle(id).then((d) => {
      if (!alive) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  return { data, loading, refresh };
}