'use client';

/* Attenda Serve — FV product card (tenant menu grid).
   Photo, name, short, tenant-currency price, brand + button.
   White-label: theme/currency optional props — absent = classic fukin skin. */

import Link from 'next/link';
import { ServeProduct } from '@/lib/serve/types';
import { productImage } from '@/lib/serve/fv-tokens';
import { resolveTheme } from '@/lib/serve/theme';
import { ServeTheme, CurrencyCode, formatMoney } from '@/lib/serve/types';

export function ProductCard({ product, tenantId, categoryLabel, theme, currency }: { product: ServeProduct; tenantId: string; categoryLabel: string; theme?: ServeTheme | null; currency?: string }) {
  const T = resolveTheme(theme);
  const fmt = (cents: number) => formatMoney(cents, (currency || 'S/') as CurrencyCode);
  return (
    <Link
      href={`/serve/demo/${tenantId}/app/product/${product.slug}`}
      className="group block overflow-hidden rounded-3xl border transition-transform active:scale-[0.98]"
      style={{ borderColor: T.line, backgroundColor: T.panel }}
    >
      <div className="relative aspect-square w-full overflow-hidden" style={{ backgroundColor: T.imgBg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image || productImage(product.slug, product.name)}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em]"
          style={{ fontFamily: 'Fredoka, sans-serif', backgroundColor: 'rgba(10,10,10,0.72)', color: T.cream60, border: `1px solid ${T.line}` }}
        >
          {categoryLabel}
        </span>
      </div>
      <div className="space-y-1.5 p-4">
        <div className="text-[15px] font-semibold leading-snug" style={{ fontFamily: 'Fredoka, sans-serif', color: T.cream }}>
          {product.name}
        </div>
        <div className="text-xs leading-relaxed" style={{ color: T.cream60 }}>{product.short}</div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[15px] font-bold" style={{ fontFamily: 'Fredoka, sans-serif', color: T.orange }}>
            {fmt(product.price)}
          </span>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-black transition-transform group-active:scale-90"
            style={{ backgroundColor: T.orange, color: T.black }}
            aria-hidden
          >
            +
          </span>
        </div>
      </div>
    </Link>
  );
}

export function MenuGrid({ products, tenantId, categoryNames, theme, currency }: {
  products: ServeProduct[]; tenantId: string; categoryNames: Record<string, string>;
} & { theme?: ServeTheme | null; currency?: string }) {
  const T = resolveTheme(theme);
  if (!products.length) {
    return (
      <div className="rounded-3xl border p-10 text-center text-sm" style={{ borderColor: T.line, backgroundColor: T.panel, color: T.cream60 }}>
        No hay productos publicados todavía.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} tenantId={tenantId} categoryLabel={categoryNames[p.category] || 'Menú'} theme={theme} currency={currency} />
      ))}
    </div>
  );
}