'use client';

/* Attenda Serve — FV site-chrome port: header + cart bar + category chips.
   Dark sticky header, brand colored VER CARRITO bar (bottom, safe-area aware).
   The cart bar hides on product/checkout/cart pages (same rule as FV:
   product pages have their own bottom AGREGAR bar at the same z).
   White-label: theme/currency ride in as optional props — absent = classic
   fukin orange skin, present (from the tenant bundle) = per-tenant brand. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from './cart-context';
import { FV, formatPEN } from '@/lib/serve/fv-tokens';
import { resolveTheme, ResolvedTheme } from '@/lib/serve/theme';
import { ServeTheme, CurrencyCode, formatMoney } from '@/lib/serve/types';
import { fetchBundle } from './use-tenant';

export type ThemeProps = { theme?: ServeTheme | null; currency?: string };

export function usePatchedTheme(themeProps: ThemeProps) {
  return {
    T: resolveTheme(themeProps.theme),
    fmt: (cents: number) => formatMoney(cents, (themeProps.currency || 'S/') as CurrencyCode),
  };
}

export function ServeHeader({ tenantName, logo, tagline, theme, currency }: { tenantName: string; logo: string | null; tagline: string } & ThemeProps) {
  const { T } = usePatchedTheme({ theme, currency });
  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ borderColor: T.line, backgroundColor: 'rgba(10,10,10,0.9)' }}>
      <div className="mx-auto max-w-xl px-4 py-3">
        <div className="flex items-center justify-between">
          <TenantLogo tenantName={tenantName} logo={logo} tagline={tagline} size="sm" theme={theme} currency={currency} />
          <span className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]" style={{ backgroundColor: T.orange10, color: T.orange, fontFamily: 'Fredoka, sans-serif' }}>
            Demo Attenda
          </span>
        </div>
      </div>
    </header>
  );
}

export function TenantLogo({ tenantName, logo, tagline, size = 'sm', theme, currency }: { tenantName: string; logo: string | null; tagline: string; size?: 'sm' | 'md' | 'lg' } & ThemeProps) {
  const { T } = usePatchedTheme({ theme, currency });
  const s = size === 'sm' ? { mark: 'text-[17px]', tag: 'text-[7px]' } : size === 'md' ? { mark: 'text-[22px]', tag: 'text-[8px]' } : { mark: 'text-[34px]', tag: 'text-[10px]' };
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt={tenantName} className="h-9 w-auto max-w-[160px] object-contain" />
    );
  }
  return (
    <span className={`inline-flex items-baseline gap-[0.22em] font-bold leading-none tracking-tight ${s.mark}`} style={{ fontFamily: 'Fredoka, sans-serif', color: T.cream }}>
      <span>{tenantName.split(' ')[0]}</span>
      <span style={{ color: T.orange }}>{tenantName.split(' ').slice(1).join(' ') || ''}</span>
      {tagline && <span className={`ml-2 hidden font-medium uppercase sm:inline ${s.tag}`} style={{ color: T.cream50 }}>{tagline}</span>}
    </span>
  );
}

export function CartBar() {
  const { count, subtotal } = useCart();
  const pathname = usePathname();
  const [bundleCurrency, setBundleCurrency] = useState<string>('S/');
  const [bundleTheme, setBundleTheme] = useState<ServeTheme | null>(null);
  const id = (pathname.match(/\/serve\/demo\/([^/]+)/) || [])[1] || '';

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchBundle(id).then((d) => {
      if (!alive || !d) return;
      setBundleCurrency(d.tenant.currency || 'S/');
      setBundleTheme(d.tenant.theme ?? null);
    });
    return () => { alive = false; };
  }, [id]);

  const { T, fmt } = usePatchedTheme({ theme: bundleTheme, currency: bundleCurrency });
  if (count === 0) return null;
  if (pathname.endsWith('/cart') || pathname.endsWith('/checkout') || pathname.includes('/order/') || pathname.includes('/product/')) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(12px+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-xl">
        <Link
          href="./cart"
          className="flex items-center justify-between rounded-2xl px-5 py-3.5 text-sm font-black shadow-lg"
          style={{ backgroundColor: T.orange, color: T.black, fontFamily: 'Fredoka, sans-serif' }}
        >
          <span>VER CARRITO · {count}</span>
          <span>{fmt(subtotal)}</span>
        </Link>
      </div>
    </div>
  );
}

export function CategoryChips({ categories, active, onSelect, theme, currency }: { active?: string; onSelect: (id: string) => void; categories: { id: string; name: string }[] } & ThemeProps) {
  const { T } = usePatchedTheme({ theme, currency });
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {onSelect && categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className="shrink-0 rounded-full border px-4 py-2 text-xs font-bold"
          style={{
            fontFamily: 'Fredoka, sans-serif',
            borderColor: active === c.id ? T.orange : T.line,
            backgroundColor: active === c.id ? T.orange : T.panel,
            color: active === c.id ? T.black : T.cream60,
          }}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}