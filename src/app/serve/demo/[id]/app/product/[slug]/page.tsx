'use client';

/* Attenda Serve — product configurator (/app/product/[slug], white-label).
   Big photo, name, short, price, qty stepper, fixed bottom AGREGAR bar:
   adds to cart → routes back to menu. Colors + money from tenant bundle. */

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTenant } from '@/components/serve/use-tenant';
import { useCart } from '@/components/serve/cart-context';
import { FV, productImage } from '@/lib/serve/fv-tokens';
import { resolveTheme } from '@/lib/serve/theme';
import { CurrencyCode, formatMoney } from '@/lib/serve/types';

export default function ProductPage() {
  const params = useParams<{ id: string; slug: string }>();
  const { id, slug } = params;
  const router = useRouter();
  const { data, loading } = useTenant(id);
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const tenantTheme = data?.tenant.theme ?? null;
  const T = resolveTheme(tenantTheme);
  const fmt = (cents: number) => formatMoney(cents, ((data?.tenant.currency || 'S/') as CurrencyCode));

  const product = useMemo(() => data?.menu.find((p) => p.slug === slug), [data, slug]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: FV.black }}>
        <div className="text-sm" style={{ fontFamily: 'Fredoka, sans-serif', color: FV.cream50 }}>Cargando…</div>
      </div>
    );
  }
  if (!product || !product.active) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ backgroundColor: T.black }}>
        <div className="text-sm" style={{ color: T.cream60 }}>Producto no disponible.</div>
        <a href={`/serve/demo/${id}/app`} className="rounded-full px-5 py-2.5 text-sm font-black" style={{ backgroundColor: T.orange, color: T.black, fontFamily: 'Fredoka, sans-serif' }}>
          Volver al menú
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: T.black, fontFamily: 'Fredoka, sans-serif' }}>
      <div className="mx-auto max-w-xl">
        {/* photo */}
        <div className="relative aspect-square w-full overflow-hidden" style={{ backgroundColor: T.imgBg }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image || productImage(product.slug, product.name)} alt={product.name} className="h-full w-full object-cover" />
          <button
            onClick={() => router.back()}
            className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: 'rgba(10,10,10,0.72)', color: T.cream, border: `1px solid ${T.line}` }}
            aria-label="Volver"
          >
            ←
          </button>
        </div>

        <div className="space-y-2 px-5 pt-5">
          <h1 className="text-2xl font-semibold leading-tight" style={{ color: T.cream }}>{product.name}</h1>
          <p className="text-sm leading-relaxed" style={{ color: T.cream60 }}>{product.short}</p>
          <div className="pt-1 text-xl font-bold" style={{ color: T.orange }}>{fmt(product.price)}</div>
        </div>

        {/* qty stepper */}
        <div className="mt-6 px-5">
          <div className="flex items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: T.line, backgroundColor: T.panel }}>
            <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: T.cream50 }}>Cantidad</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center rounded-full border text-lg font-black" style={{ borderColor: T.line, color: T.cream }} aria-label="Menos">−</button>
              <span className="w-6 text-center text-lg font-bold" style={{ color: T.cream }}>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-black" style={{ backgroundColor: T.orange, color: T.black }} aria-label="Más">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* fixed AGREGAR bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(12px+env(safe-area-inset-bottom))]" style={{ backgroundColor: T.black }}>
        <div className="mx-auto max-w-xl">
          <button
            onClick={() => {
              add({ slug: product.slug, name: product.name, qty, price: product.price });
              router.push(`/serve/demo/${id}/app`);
            }}
            className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm font-black shadow-lg"
            style={{ backgroundColor: T.orange, color: T.black }}
          >
            <span>AGREGAR AL PEDIDO</span>
            <span>{fmt(product.price * qty)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}