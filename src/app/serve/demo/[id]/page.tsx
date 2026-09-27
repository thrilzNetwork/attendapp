'use client';

/* Attenda Serve — tenant LANDING (/serve/demo/<id>) — FV-skinned.
   Brand hero (logo, tagline, CTAs into the app), delivery bar, menu
   preview, cómo funciona, footer with Attenda Serve demo bar. */

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/components/serve/use-tenant';
import { ServeHeader, CategoryChips } from '@/components/serve/fv-site-chrome';
import { ProductCard } from '@/components/serve/fv-product-card';
import { FV, fmtHours, formatPEN } from '@/lib/serve/fv-tokens';

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
    <div className="min-h-screen" style={{ backgroundColor: FV.black, fontFamily: 'Fredoka, sans-serif' }}>
      {pin && (
        <div className="mx-auto max-w-xl px-4 pt-4">
          <div className="flex items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: FV.orange, backgroundColor: 'rgba(243,106,18,0.12)' }}>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: FV.orange }}>PIN de tu panel</div>
              <div className="text-sm" style={{ color: FV.cream }}>Guárdalo — con esto entras a tu panel de pedidos.</div>
            </div>
            <div className="rounded-xl px-4 py-2 text-xl font-black tracking-[0.3em]" style={{ backgroundColor: FV.orange, color: FV.black }}>{pin}</div>
          </div>
        </div>
      )}
      <ServeHeader tenantName={t.name} logo={t.logo} tagline={t.tagline} />

      {/* hero */}
      <div className="mx-auto max-w-xl px-4 pt-8">
        <div className="overflow-hidden rounded-3xl border border-[#232323]" style={{ backgroundColor: FV.panel }}>
          <div className="relative px-6 py-10 text-center" style={{ backgroundColor: 'linear-gradient(180deg, rgba(243,106,18,0.14), rgba(19,19,19,0))' }}>
            {t.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logo} alt={t.name} className="mx-auto h-20 w-auto max-w-[220px] object-contain" />
            ) : (
              <div className="text-4xl font-bold tracking-tight" style={{ color: FV.cream }}>
                {t.name.split(' ')[0]} <span style={{ color: FV.orange }}>{t.name.split(' ').slice(1).join(' ')}</span>
              </div>
            )}
            <div className="mx-auto mt-3 max-w-sm text-sm leading-relaxed" style={{ color: FV.cream60 }}>
              {t.type}{t.city ? ` en ${t.city}` : ''} — pedidos online con delivery a domicilio y retiro en tienda.
            </div>
            <div className="mt-5 flex flex-col items-center gap-2">
              <a href={`/serve/demo/${id}/app`} className="w-full max-w-xs rounded-2xl px-5 py-3.5 text-sm font-black" style={{ backgroundColor: FV.orange, color: FV.black }}>
                VER MENÚ Y PEDIR
              </a>
              <a href={`/serve/demo/${id}/admin`} className="text-xs font-bold" style={{ color: FV.cream50 }}>
                Soy el dueño — entrar al panel
              </a>
            </div>
          </div>

          {/* delivery bar */}
          <div className="flex items-center justify-between border-t border-[#232323] px-5 py-3 text-xs" style={{ color: FV.cream60 }}>
            <span className="font-bold" style={{ color: data.open ? FV.green : FV.orange }}>
              {data.open ? 'Abierto ahora' : 'Cerrado'}
            </span>
            <span>
              {data.open ? `Entrega ${s.etaMin}-${s.etaMax} min · ${formatPEN(s.zones[0]?.fee ?? 0)}` : `${fmtHours(s.hoursOpen)}–${fmtHours(s.hoursClose)}`}
            </span>
          </div>
        </div>
      </div>

      {/* menu preview */}
      <div className="mx-auto max-w-xl px-4 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{ color: FV.cream }}>Nuestro menú</h2>
          <a href={`/serve/demo/${id}/app`} className="text-xs font-bold" style={{ color: FV.orange }}>Ver todo →</a>
        </div>
        <div className="mt-3">
          <CategoryChips categories={cats} active={cat} onSelect={setCat} />
        </div>
        <div className="mt-4">
          <ProductCardGrid id={id} products={preview} />
        </div>
      </div>

      {/* cómo funciona */}
      <div className="mx-auto max-w-xl px-4 pt-10">
        <h2 className="text-xl font-semibold" style={{ color: FV.cream }}>Cómo funciona</h2>
        <div className="mt-3 space-y-2">
          {[
            ['1', 'Elige tus productos', 'Toca cualquier producto, ajusta la cantidad y agrégalo a tu pedido.'],
            ['2', 'Elige entrega o retiro', 'Delivery a domicilio con tarifa por zona, o retiro en tienda.'],
            ['3', 'Paga con Yape o efectivo', 'Yapea el total y confirma — tu pedido llega directo a nuestro WhatsApp.'],
            ['4', 'Sigue tu pedido', 'Recibido → aceptado → en cocina → en camino → entregado.'],
          ].map(([n, title, body]) => (
            <div key={n} className="flex gap-3 rounded-2xl border border-[#232323] bg-[#131313] p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black" style={{ backgroundColor: FV.orange, color: FV.black }}>{n}</div>
              <div>
                <div className="text-sm font-bold" style={{ color: FV.cream }}>{title}</div>
                <div className="text-xs leading-relaxed" style={{ color: FV.cream60 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* footer + Attenda demo bar */}
      <div className="mx-auto max-w-xl px-4 pb-24 pt-10 text-center">
        <div className="text-xs" style={{ color: FV.cream50 }}>
          © {new Date().getFullYear()} {t.name} · Pedidos online
        </div>
        <div className="mt-6 rounded-2xl border px-4 py-3" style={{ borderColor: FV.orange40, backgroundColor: FV.orange10 }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: FV.orange }}>Demo Attenda Serve · 24 horas</div>
          <div className="mt-1 text-xs" style={{ color: FV.cream60 }}>
            Esta tienda funciona igual que la versión oficial: panel de pedidos, menú editable, pagos Yape y WhatsApp.
          </div>
          <a href="/serve" className="mt-2 inline-block text-xs font-bold" style={{ color: FV.orange }}>Crear mi demo gratis →</a>
        </div>
      </div>
    </div>
  );
}

function ProductCardGrid({ id, products }: { id: string; products: { slug: string; name: string; short: string; category: string; price: number; image?: string; active: boolean; sortOrder: number }[] }) {
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
        <ProductCard key={p.slug} product={p as never} tenantId={id} categoryLabel={CAT_NAMES[p.category] || 'Menú'} />
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
