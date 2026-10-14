'use client';

/* Attenda Serve — tenant LANDING (/serve/demo/<id>) — FV-skinned, white-label.
   Brand hero (logo, tagline, CTAs into the app), delivery bar, menu
   preview, cómo funciona, footer with Attenda Serve demo bar.
   Colors + money come from the tenant bundle (theme + currency). */

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/components/serve/use-tenant';
import { ServeHeader, CategoryChips } from '@/components/serve/fv-site-chrome';
import { ProductCard } from '@/components/serve/fv-product-card';
import { FV, fmtHours } from '@/lib/serve/fv-tokens';
import { resolveTheme } from '@/lib/serve/theme';
import { CurrencyCode, formatMoney } from '@/lib/serve/types';

function TenantLandingInner() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const id = (pathname.match(/\/serve\/demo\/([^/]+)/) || [])[1] || '';
  const { data, loading } = useTenant(id);
  const [cat, setCat] = useState<string>('todos');

  // PIN handoff: wizard lands here with ?pin= — banner once, then clean URL
  const [pin, setPin] = useState<string | null>(null);
  useEffect(() => {
    const p = params.get('pin');
    if (p) {
      setPin(p);
      router.replace(`/serve/demo/${id}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tenantTheme = data?.tenant.theme ?? null;
  const T = resolveTheme(tenantTheme);
  const fmt = (cents: number) => formatMoney(cents, ((data?.tenant.currency || 'S/') as CurrencyCode));
  const menu = data?.menu.filter((p) => p.active) ?? [];
  const preview = useMemo(() => (cat === 'todos' ? menu.slice(0, 4) : menu.filter((p) => p.category === cat).slice(0, 4)), [menu, cat]);
  const cats = useMemo(() => {
    const ids = Array.from(new Set(menu.map((p) => p.category)));
    return [{ id: 'todos', name: 'Todo' }, ...ids.map((c) => ({ id: c, name: CAT_NAMES[c] || c }))];
  }, [menu]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: FV.black }}>
        <div className="text-sm" style={{ fontFamily: 'Fredoka, sans-serif', color: FV.cream50 }}>Cargando…</div>
      </div>
    );
  }

  const t = data.tenant;
  const s = data.settings;

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.black, fontFamily: 'Fredoka, sans-serif' }}>
      {pin && (
        <div className="mx-auto max-w-xl px-4 pt-4">
          <div className="rounded-2xl border px-4 py-4" style={{ borderColor: T.orange, backgroundColor: T.orange10 }}>
            <div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: T.orange }}>Tu cuenta está lista</div>
            <div className="mt-1 text-sm" style={{ color: T.cream }}>Estos son tus 3 enlaces — guárdalos en tu teléfono.</div>
            <div className="mt-3 space-y-2">
              {[
                ['Sitio web', 'La página de tu negocio', `/serve/demo/${id}`],
                ['App de pedidos', 'Donde tus clientes ordenan', `/serve/demo/${id}/app`],
                ['Panel de admin', 'Pedidos, menú y precios (pide tu PIN)', `/serve/demo/${id}/admin`],
              ].map(([title, sub, href]) => (
                <a key={href} href={href} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: T.panel, border: `1px solid ${T.line}` }}>
                  <span>
                    <span className="block text-sm font-bold" style={{ color: T.cream }}>{title}</span>
                    <span className="block text-[11px]" style={{ color: T.cream60 }}>{sub}</span>
                  </span>
                  <span className="text-xs font-black" style={{ color: T.orange }}>ABRIR →</span>
                </a>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: T.panel, border: `1px solid ${T.line}` }}>
              <span>
                <span className="block text-sm font-bold" style={{ color: T.cream }}>Contraseña del panel</span>
                <span className="block text-[11px]" style={{ color: T.cream60 }}>La usas para entrar al admin. Guárdala.</span>
              </span>
              <span className="rounded-lg px-3 py-1.5 text-lg font-black tracking-[0.25em]" style={{ backgroundColor: T.orange, color: T.black }}>{pin}</span>
            </div>
          </div>
        </div>
      )}
      <ServeHeader tenantName={t.name} logo={t.logo} tagline={t.tagline} theme={tenantTheme} currency={t.currency} />

      {/* hero */}
      <div className="mx-auto max-w-xl px-4 pt-8">
        <div className="overflow-hidden rounded-3xl border" style={{ borderColor: T.line, backgroundColor: T.panel }}>
          <div className="relative px-6 py-10 text-center" style={{ backgroundImage: `linear-gradient(180deg, ${T.orange10}, rgba(19,19,19,0))` }}>
            {t.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logo} alt={t.name} className="mx-auto h-20 w-auto max-w-[220px] object-contain" />
            ) : (
              <div className="text-4xl font-bold tracking-tight" style={{ color: T.cream }}>
                {t.name.split(' ')[0]} <span style={{ color: T.orange }}>{t.name.split(' ').slice(1).join(' ')}</span>
              </div>
            )}
            <div className="mx-auto mt-3 max-w-sm text-sm leading-relaxed" style={{ color: T.cream60 }}>
              {t.type}{t.city ? ` en ${t.city}` : ''} — pedidos online con delivery a domicilio y retiro en tienda.
            </div>
            <div className="mt-5 flex flex-col items-center gap-2">
              <a href={`/serve/demo/${id}/app`} className="w-full max-w-xs rounded-2xl px-5 py-3.5 text-sm font-black" style={{ backgroundColor: T.orange, color: T.black }}>
                VER MENÚ Y PEDIR
              </a>
              <a href={`/serve/demo/${id}/admin`} className="text-xs font-bold" style={{ color: T.cream50 }}>
                Soy el dueño — entrar al panel
              </a>
            </div>
          </div>

          {/* delivery bar */}
          <div className="flex items-center justify-between border-t px-5 py-3 text-xs" style={{ borderColor: T.line, color: T.cream60 }}>
            <span className="font-bold" style={{ color: data.open ? T.green : T.orange }}>
              {data.open ? 'Abierto ahora' : 'Cerrado'}
            </span>
            <span>
              {data.open ? `Entrega ${s.etaMin}-${s.etaMax} min · ${fmt(s.zones[0]?.fee ?? 0)}` : `${fmtHours(s.hoursOpen)}–${fmtHours(s.hoursClose)}`}
            </span>
          </div>
        </div>
      </div>

      {/* menu preview */}
      <div className="mx-auto max-w-xl px-4 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{ color: T.cream }}>Nuestro menú</h2>
          <a href={`/serve/demo/${id}/app`} className="text-xs font-bold" style={{ color: T.orange }}>Ver todo →</a>
        </div>
        <div className="mt-3">
          <CategoryChips categories={cats} active={cat} onSelect={setCat} theme={tenantTheme} currency={t.currency} />
        </div>
        <div className="mt-4">
          <ProductCardGrid id={id} products={preview} theme={tenantTheme} currency={t.currency} />
        </div>
      </div>

      {/* cómo funciona */}
      <div className="mx-auto max-w-xl px-4 pt-10">
        <h2 className="text-xl font-semibold" style={{ color: T.cream }}>Cómo funciona</h2>
        <div className="mt-3 space-y-2">
          {[
            ['1', 'Elige tus productos', 'Toca cualquier producto, ajusta la cantidad y agrégalo a tu pedido.'],
            ['2', 'Elige entrega o retiro', 'Delivery a domicilio con tarifa por zona, o retiro en tienda.'],
            ['3', t.currency === 'S/' ? 'Paga con Yape o efectivo' : 'Paga con QR/transferencia o efectivo', 'Confirma el pago y tu pedido llega directo a nuestro WhatsApp.'],
            ['4', 'Sigue tu pedido', 'Recibido → aceptado → en cocina → en camino → entregado.'],
          ].map(([n, title, body]) => (
            <div key={n} className="flex gap-3 rounded-2xl border p-4" style={{ borderColor: T.line, backgroundColor: T.panel }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black" style={{ backgroundColor: T.orange, color: T.black }}>{n}</div>
              <div>
                <div className="text-sm font-bold" style={{ color: T.cream }}>{title}</div>
                <div className="text-xs leading-relaxed" style={{ color: T.cream60 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* footer + Attenda demo bar */}
      <div className="mx-auto max-w-xl px-4 pb-24 pt-10 text-center">
        <div className="text-xs" style={{ color: T.cream50 }}>
          © {new Date().getFullYear()} {t.name} · Pedidos online
        </div>
        <div className="mt-6 rounded-2xl border px-4 py-3" style={{ borderColor: T.orange40, backgroundColor: T.orange10 }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: T.orange }}>Demo Attenda Serve · 24 horas</div>
          <div className="mt-1 text-xs" style={{ color: T.cream60 }}>
            Esta tienda funciona igual que la versión oficial: panel de pedidos, menú editable, pagos por WhatsApp y transferencia.
          </div>
          <a href="/serve" className="mt-2 inline-block text-xs font-bold" style={{ color: T.orange }}>Crear mi demo gratis →</a>
        </div>
      </div>
    </div>
  );
}

function ProductCardGrid({ id, products, theme, currency }: { id: string; products: { slug: string; name: string; short: string; category: string; price: number; image?: string; active: boolean; sortOrder: number }[]; theme: { primary: string; background: string; surface: string; text: string; accent: string } | null; currency: string }) {
  if (!products.length) {
    return (
      <div className="rounded-3xl border border-[#232323] bg-[#131313] p-8 text-center text-sm" style={{ color: FV.cream50 }}>
        Sin productos en esta categoría.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p as never} tenantId={id} categoryLabel={CAT_NAMES[p.category] || 'Menú'} theme={theme} currency={currency} />
      ))}
    </div>
  );
}

const CAT_NAMES: Record<string, string> = {
  principales: 'Principales',
  combos: 'Combos',
  extras: 'Extras',
  bebidas: 'Bebidas',
};
export default function TenantLanding() {
  return (
    <Suspense fallback={null}>
      <TenantLandingInner />
    </Suspense>
  );
}