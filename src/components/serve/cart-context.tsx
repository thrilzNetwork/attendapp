'use client';

/* Attenda Serve — cart context, FV cart-context.tsx port.
   Read-modify-write against localStorage on every add: even if in-memory
   state was lost to a hydration/remount race, the persisted cart is the
   source of truth, so a second item can never clobber the first. */

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type CartLine = { slug: string; name: string; qty: number; price: number }; // price cents snapshot

type CartCtx = {
  lines: CartLine[];
  add: (line: CartLine) => void;
  setQty: (index: number, qty: number) => void;
  remove: (index: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);

const lineKey = (l: CartLine) => l.slug;

function readPersisted(): CartLine[] {
  try {
    const raw = localStorage.getItem('attd_serve_cart');
    if (!raw) return [];
    return JSON.parse(raw) as CartLine[];
  } catch {
    return [];
  }
}

export function ServeCartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(readPersisted());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      try { localStorage.setItem('attd_serve_cart', JSON.stringify(lines)); } catch {}
    }
  }, [lines, hydrated]);

  const value = useMemo<CartCtx>(() => {
    const subtotal = lines.reduce((a, l) => a + (l.price || 0) * l.qty, 0);
    const count = lines.reduce((a, l) => a + l.qty, 0);
    return {
      lines,
      add: (line) => {
        const base = readPersisted();
        const existing = base.findIndex((l) => lineKey(l) === lineKey(line));
        const next =
          existing >= 0
            ? base.map((l, i) => (i === existing ? { ...l, qty: l.qty + line.qty } : l))
            : [...base, line];
        setLines(next);
        if (hydrated) {
          try { localStorage.setItem('attd_serve_cart', JSON.stringify(next)); } catch {}
        }
      },
      setQty: (index, qty) =>
        setLines((prev) =>
          qty <= 0 ? prev.filter((_, i) => i !== index) : prev.map((l, i) => (i === index ? { ...l, qty } : l))
        ),
      remove: (index) => setLines((prev) => prev.filter((_, i) => i !== index)),
      clear: () => setLines([]),
      count,
      subtotal,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, hydrated]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart outside provider');
  return ctx;
}