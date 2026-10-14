'use client';

/* Attenda Serve — /serve/demo/<id>/app (FV menu page port, white-label).
   Delivery bar (ETA / retiro / abierto-cerrado), promo strip, category
   chips, product grid, brand VER CARRITO bar. Colors + money from bundle. */

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTenant } from '@/components/serve/use-tenant';
import { useCart } from '@/components/serve/cart-context';
import { MenuGrid } from '@/components/serve/fv-product-card';
import { ServeHeader, CartBar, CategoryChips } from '@/components/serve/fv-site-chrome';
import { FV, fmtHours } from '@/lib/serve/fv-tokens';
import { resolveTheme } from '@/lib/serve/theme';
import { CurrencyCode, formatMoney } from '@/lib/serve/types';

const catNames: Record<string, string> = {
  principales: 'Principales',
  combos: 'Combos',
  extras: 'Extras',
  bebidas: 'Bebidas',
};

export default function TenantAppPage() {
  const pathname = usePathname();
  const id = (pathname.match(/\/serve\/demo\/([^/]+)\/app/) || [])[1] || '';
  const { data, loading } = useTenant(id);
  const { count, add, setQty, remove, lines } = useCart();
  const [cat, setCat] = useState<string>('todos');

  const tenantTheme = data?.tenant.theme ?? null;
  const T = resolveTheme(tenantTheme);
  const fmt = (cents: number) => formatMoney(cents, ((data?.tenant.currency || 'S/') as CurrencyCode));

  const menu = data?.menu.filter((p) => p.active) ?? [];
  const cats = useMemo(() => {
    const ids = Array.from(new Set(menu.map((p) => p.category)));
    return [{ id: 'todos', name: 'Todo' }, ...ids.map((cid) => ({ id: cid, name: catNames[cid] || cid }))];
  }, [menu]);
  const shown = cat === 'todos' ? menu : menu.filter((p) => p.category === cat);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: FV.black }}>
        <div className="text-sm" style={{ fontFamily: 'Fredoka, sans-serif', color: FV.cream50 }}>Cargando menú…</div>
      </div>
    );
  }

  const t = data.tenant;
  const s = data.settings;
  const promo = s.promoCode && s.promoDiscount > 0;
  const eta = `${s.etaMin}-${s.etaMax} min`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.black, fontFamily: 'Fredoka, sans-serif' }}>
      <ServeHeader tenantName={t.name} logo={t.logo} tagline={t.tagline} theme={tenantTheme} currency={t.currency} />

      {/* delivery bar */}
      <div className="mx-auto max-w-xl px-4 pt-4">
        <div className="flex items-center justify-between rounded-2xl border px-4 py-3 text-xs" style={{ borderColor: data.open ? T.green40 : T.orange40, backgroundColor: T.panel }}>
          <span className="font-bold" style={{ color: data.open ? T.green : T.orange }}>
            {data.open ? (s.zones.length > 1 ? `Entrega ${eta}` : 'Retiro en tienda') : `Cerrado · ${fmtHours(s.hoursOpen)}–${fmtHours(s.hoursClose)}`}
          </span>
          <span style={{ color: T.cream60 }}>
            {data.open ? `${s.zones[0]?.name ?? 'Zona 1'} · ${fmt(s.zones[0]?.fee ?? 0)}` : 'Pedidos programados'}
          </span>
        </div>

        {/* promo strip */}
        {promo && (
          <div className="mt-3 flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: T.orange10, border: `1px dashed ${T.orange40}` }}>
            <span className="text-xs font-bold" style={{ color: T.orange }}>
              Código {s.promoCode} · -{fmt(s.promoDiscount)} en tu primer pedido
            </span>
            <span className="text-[10px]" style={{ color: T.cream50 }}>aplícalo en el pago</span>
          </div>
        )}

        <div className="mt-4">
          <CategoryChips categories={cats} active={cat} onSelect={setCat} theme={tenantTheme} currency={t.currency} />
        </div>

        <div className="mt-4 pb-28">
          <MenuGrid products={shown} tenantId={t.id} categoryNames={catNames} theme={tenantTheme} currency={t.currency} />
        </div>
      </div>

      <CartBar />
    </div>
  );
}