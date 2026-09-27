'use client';

/* Attenda Serve — FV product card (demo tenant menu grid).
   Photo, name, short, S/ price, orange + button. FV exact layout. */

import Link from 'next/link';
import { ServeProduct } from '@/lib/serve/types';
import { FV, formatPEN, productImage } from '@/lib/serve/fv-tokens';

export function ProductCard({ product, tenantId, categoryLabel }: { product: ServeProduct; tenantId: string; categoryLabel: string }) {
  return (
    <Link
      href={`/serve/demo/${tenantId}/app/product/${product.slug}`}
      className="group block overflow-hidden rounded-3xl border border-[#232323] bg-[#131313] transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-square w-full overflow-hidden" style={{ backgroundColor: FV.imgBg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image || productImage(product.slug, product.name)}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em]"
          style={{ fontFamily: 'Fredoka, sans-serif', backgroundColor: 'rgba(10,10,10,0.72)', color: FV.cream60, border: `1px solid ${FV.line}` }}
        >
          {categoryLabel}
        </span>
      </div>
      <div className="space-y-1.5 p-4">
        <div className="text-[15px] font-semibold leading-snug" style={{ fontFamily: 'Fredoka, sans-serif', color: FV.cream }}>
          {product.name}
        </div>
        <div className="text-xs leading-relaxed" style={{ color: FV.cream60 }}>{product.short}</div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[15px] font-bold" style={{ fontFamily: 'Fredoka, sans-serif', color: FV.cream }}>
            {formatPEN(product.price)}
          </span>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-black transition-transform group-active:scale-90"
            style={{ backgroundColor: FV.orange, color: FV.black }}
            aria-hidden
          >
            +
          </span>
        </div>
      </div>
    </Link>
  );
}

export function MenuGrid({ products, tenantId, categoryNames }: {
  products: ServeProduct[]; tenantId: string; categoryNames: Record<string, string>;
}) {
  if (!products.length) {
    return (
      <div className="rounded-3xl border border-[#232323] bg-[#131313] p-10 text-center text-sm" style={{ color: FV.cream60 }}>
        No hay productos publicados todavía.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} tenantId={tenantId} categoryLabel={categoryNames[p.category] || 'Menú'} />
      ))}
    </div>
  );
}