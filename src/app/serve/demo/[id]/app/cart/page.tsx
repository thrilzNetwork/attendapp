'use client';

/* Attenda Serve — cart page (/app/cart, white-label). Line items with
   steppers, remove, subtotal, "Continuar al pago" → checkout.
   Colors + money from the tenant bundle. */

import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/components/serve/cart-context';
import { useTenant } from '@/components/serve/use-tenant';
import { ServeHeader } from '@/components/serve/fv-site-chrome';
import { productImage } from '@/lib/serve/fv-tokens';
import { resolveTheme } from '@/lib/serve/theme';
import { CurrencyCode, formatMoney } from '@/lib/serve/types';

export default function CartPage() {
  const router = useRouter();
  const pathname = usePathname();
  const id = (pathname.match(/\/serve\/demo\/([^/]+)\/app/) || [])[1] || '';
  const { data } = useTenant(id);
  const { lines, setQty, remove, subtotal, count } = useCart();

  const tenantTheme = data?.tenant.theme ?? null;
  const T = resolveTheme(tenantTheme);
  const fmt = (cents: number) => formatMoney(cents, ((data?.tenant.currency || 'S/') as CurrencyCode));

  const rowFor = (slug: string) => (data?.menu ?? []).find((m) => m.slug === slug);

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: T.black, fontFamily: 'Fredoka, sans-serif' }}>
      <ServeHeader tenantName={data?.tenant.name ?? ''} logo={data?.tenant.logo ?? null} tagline={data?.tenant.tagline ?? ''} theme={tenantTheme} currency={data?.tenant.currency} />
      <div className="mx-auto max-w-xl px-4 pt-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold" style={{ color: T.cream }}>Tu pedido</h1>
          {count > 0 && (
            <button onClick={() => lines.forEach((_, i) => remove(i))} className="text-xs font-bold" style={{ color: T.cream50 }}>
              Vaciar
            </button>
          )}
        </div>

        {count === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <div className="text-4xl">🛒</div>
            <div className="text-sm" style={{ color: T.cream60 }}>Tu carrito está vacío.</div>
            <button onClick={() => router.push(`/serve/demo/${id}/app`)} className="rounded-full px-6 py-3 text-sm font-black" style={{ backgroundColor: T.orange, color: T.black }}>
              VER EL MENÚ
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {lines.map((l, i) => {
              const p = rowFor(l.slug);
              const name = p?.name ?? l.slug;
              const img = p?.image || productImage(l.slug, name);
              return (
                <div key={`${l.slug}-${i}`} className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: T.line, backgroundColor: T.panel }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={name} className="h-14 w-14 rounded-xl object-cover" style={{ backgroundColor: T.imgBg }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold" style={{ color: T.cream }}>{name}</div>
                    <div className="text-xs" style={{ color: T.cream60 }}>{fmt(l.price)} c/u</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(i, l.qty - 1)} className="flex h-8 w-8 items-center justify-center rounded-full border text-base font-black" style={{ borderColor: T.line, color: T.cream }} aria-label="Menos">−</button>
                    <span className="w-5 text-center text-sm font-bold" style={{ color: T.cream }}>{l.qty}</span>
                    <button onClick={() => setQty(i, l.qty + 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-base font-black" style={{ backgroundColor: T.orange, color: T.black }} aria-label="Más">+</button>
                  </div>
                  <div className="w-16 text-right text-sm font-bold" style={{ color: T.cream }}>{fmt(l.price * l.qty)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(12px+env(safe-area-inset-bottom))]" style={{ backgroundColor: T.black }}>
          <div className="mx-auto max-w-xl">
            <div className="mb-2 flex items-center justify-between px-1 text-sm" style={{ color: T.cream60 }}>
              <span>Subtotal</span>
              <span className="font-bold" style={{ color: T.cream }}>{fmt(subtotal)}</span>
            </div>
            <button
              onClick={() => router.push(`/serve/demo/${id}/app/checkout`)}
              className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm font-black"
              style={{ backgroundColor: T.orange, color: T.black }}
            >
              <span>CONTINUAR AL PAGO</span>
              <span>{fmt(subtotal)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}