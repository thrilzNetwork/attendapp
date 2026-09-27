'use client';

/* Demo tenant — ADMIN (/serve/demo/<id>/admin).
   KPIs, order pipeline, menu editor, Digital Pass preview, open/closed.
   Reads the same localStorage the app writes. */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Wallet, Power, RefreshCw, Sparkles } from 'lucide-react';
import {
  loadDraft, loadOrders, updateOrderStatus, saveDraft,
  nextStatus, ORDER_FLOW, type DemoDraft, type DemoOrder,
} from '@/components/serve/serve-demo-store';
import { DemoSwitcher, TrialBar, demoTokens as T, demoShadow, demoShadowSm } from '@/components/serve/serve-demo-chrome';

export default function DemoAdminPage() {
  const [draft, setDraft] = useState<DemoDraft | null>(null);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<'pedidos' | 'menu' | 'pass'>('pedidos');
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const id = window.location.pathname.split('/')[3] || '';
    setDraft(loadDraft(id));
    setOrders(loadOrders(id));
    setLoaded(true);
  }, []);

  const kpis = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todays = orders.filter((o) => o.ts >= todayStart.getTime() && o.status !== 'Entregado');
    return {
      orders: todays.length,
      revenue: todays.reduce((a, o) => a + o.total, 0),
    };
  }, [orders]);

  if (!loaded) return <div className="min-h-screen" style={{ backgroundColor: T.CREAM }} />;

  if (!draft) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center" style={{ backgroundColor: T.CREAM, color: T.INK }}>
        <h1 className="text-[24px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Demo no encontrada</h1>
        <Link href="/serve/demo" className="mt-6 rounded-xl border-2 px-6 py-3.5 text-[15px] font-black"
          style={{ backgroundColor: T.TEAL, borderColor: T.INK, boxShadow: demoShadow }}>Crear una nueva demo</Link>
      </div>
    );
  }

  const patchProducts = (i: number, patch: Partial<DemoDraft['products'][number]>) => {
    const d = { ...draft, products: draft.products.map((p, j) => (j === i ? { ...p, ...patch } : p)) };
    setDraft(d); saveDraft(d);
  };

  const advance = (o: DemoOrder) => {
    const ns = nextStatus(o.status);
    updateOrderStatus(draft.id, o.id, ns);
    setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, status: ns } : x)));
  };

  const initials = draft.name.slice(0, 2).toUpperCase();
  const active = orders.filter((o) => o.status !== 'Entregado');
  const done = orders.filter((o) => o.status === 'Entregado');

  return (
    <div className="min-h-screen font-sans antialiased" style={{ backgroundColor: T.CREAM, color: T.INK, ['--sv-ink' as string]: T.INK }}>
      <TrialBar createdAt={draft.createdAt} />

      <header className="sticky top-0 z-40 border-b-2" style={{ borderColor: T.INK, backgroundColor: T.CREAM }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2" style={{ borderColor: T.INK, backgroundColor: T.NAVY }}>
            <LayoutDashboard size={15} color="#F3F0E6" />
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-black leading-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>{draft.name} · Panel</div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Mono, monospace', color: T.TEAL_INK }}>Vista de tu negocio</div>
          </div>
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-[11px] font-black uppercase"
            style={{ borderColor: T.INK, backgroundColor: open ? T.TEAL : T.PAPER, color: T.INK }}>
            <Power size={13} /> {open ? 'Abierto' : 'Cerrado'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-32">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 p-4" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadow }}>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>Pedidos activos hoy</div>
            <div className="mt-1 text-[32px] font-black leading-none" style={{ fontFamily: 'Archivo, sans-serif' }}>{kpis.orders}</div>
          </div>
          <div className="rounded-2xl border-2 p-4" style={{ backgroundColor: T.TEAL, borderColor: T.INK, boxShadow: demoShadow }}>
            <div className="text-[10px] font-bold uppercase tracking-wider">Ventas hoy</div>
            <div className="mt-1 text-[32px] font-black leading-none" style={{ fontFamily: 'Archivo, sans-serif' }}>S/ {kpis.revenue.toFixed(2)}</div>
          </div>
        </div>

        {/* tabs */}
        <div className="mt-5 flex gap-2">
          {(['pedidos', 'menu', 'pass'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 rounded-xl border-2 py-2.5 text-[13px] font-black capitalize"
              style={{ backgroundColor: tab === t ? T.INK : T.PAPER, color: tab === t ? '#F3F0E6' : T.INK, borderColor: T.INK, fontFamily: 'Archivo, sans-serif' }}>
              {t === 'pedidos' ? 'Pedidos' : t === 'menu' ? 'Menú' : 'Digital Pass'}
            </button>
          ))}
        </div>

        {tab === 'pedidos' && (
          <div className="mt-5 space-y-3">
            {active.length === 0 && done.length === 0 && (
              <div className="rounded-2xl border-2 p-6 text-center" style={{ backgroundColor: T.PAPER, borderColor: T.INK }}>
                <p className="text-[14px] font-extrabold" style={{ fontFamily: 'Archivo, sans-serif' }}>Sin pedidos todavía</p>
                <p className="mt-1 text-[12.5px] font-medium" style={{ color: '#5a6168' }}>
                  Haz un pedido de prueba en la <Link href={`/serve/demo/${draft.id}/app`} className="font-black underline">tienda</Link> y míralo llegar aquí en vivo.
                </p>
              </div>
            )}
            {[...active, ...done].map((o) => (
              <div key={o.id} className="rounded-2xl border-2 p-4" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadowSm, opacity: o.status === 'Entregado' ? 0.55 : 1 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
                      style={{ backgroundColor: o.status === 'Entregado' ? T.CREAM : T.TEAL, border: `2px solid ${T.INK}`, fontFamily: 'IBM Plex Mono, monospace' }}>
                      {o.status}
                    </span>
                    <span className="text-[10px] font-bold" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>
                      #{o.id.slice(-4).toUpperCase()} · {new Date(o.ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-[15px] font-black">S/ {o.total.toFixed(2)}</span>
                </div>
                <div className="mt-2 text-[13px] font-medium" style={{ color: '#5a6168' }}>
                  {o.items.map((it) => `${it.qty}x ${it.name}`).join(' · ')}
                </div>
                {o.status !== 'Entregado' && (
                  <button onClick={() => advance(o)}
                    className="mt-3 w-full rounded-xl border-2 py-2.5 text-[13px] font-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: '2px 2px 0 var(--sv-ink, #15202B)', fontFamily: 'Archivo, sans-serif' }}>
                    Marcar como {nextStatus(o.status)} →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'menu' && (
          <div className="mt-5 space-y-3">
            <p className="text-[12.5px] font-medium" style={{ color: '#5a6168' }}>
              Cambia precios o desactiva productos — se refleja al instante en tu tienda.
            </p>
            {draft.products.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border-2 p-3" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadowSm }}>
                <div className="flex-1">
                  <div className="text-[14px] font-extrabold" style={{ fontFamily: 'Archivo, sans-serif' }}>{p.name}</div>
                  <div className="mt-1 flex items-center gap-1 text-[13px] font-black">
                    S/
                    <input value={p.price} inputMode="decimal"
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                        patchProducts(i, { price: v });
                      }}
                      className="w-16 rounded-lg border-2 px-2 py-1 outline-none" style={{ borderColor: T.INK, backgroundColor: T.CREAM }} />
                  </div>
                </div>
                <button onClick={() => patchProducts(i, { available: p.available === false })}
                  className="rounded-xl border-2 px-3 py-2 text-[11px] font-black uppercase"
                  style={{ borderColor: T.INK, backgroundColor: p.available === false ? T.CREAM : T.TEAL, color: T.INK }}>
                  {p.available === false ? 'Inactivo' : 'Activo'}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'pass' && (
          <div className="mt-5">
            <div className="rounded-2xl border-2 p-5" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadow }}>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Mono, monospace', color: T.TEAL_INK }}>
                <Sparkles size={13} /> Exclusivo plan Growth
              </div>
              <h3 className="mt-2 text-[18px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Convierte una venta en una relación</h3>
              <p className="mt-2 text-[13px] font-medium" style={{ color: '#5a6168' }}>
                Tus clientes ganan puntos, vuelven y les hablas directo — sin algoritmos ni marketplaces.
              </p>
              <div className="mt-5 rounded-2xl border-2 p-5 text-white" style={{ backgroundColor: '#111827', borderColor: T.INK }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ fontFamily: 'IBM Plex Mono, monospace', color: T.TEAL }}>
                    {initials} · MIEMBRO
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-black" style={{ backgroundColor: T.TEAL, color: T.INK }}>{initials}</span>
                </div>
                <div className="mt-6 text-[12px] font-bold text-white/70">Puntos del cliente</div>
                <div className="text-[44px] font-black leading-none text-white" style={{ fontFamily: 'Archivo, sans-serif' }}>
                  {orders.reduce((a, o) => a + o.items.reduce((x, it) => x + it.qty, 0), 0) * 10}
                </div>
                <div className="mt-5 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
                  ◌◌◌◌◌◌◌◌ · Apple / Google Wallet
                </div>
              </div>
              <Link href="/serve#precios" className="mt-5 flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-[14px] font-black"
                style={{ backgroundColor: T.TEAL, borderColor: T.INK, color: T.INK, boxShadow: `4px 4px 0 ${T.TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
                <Wallet size={16} /> Activar Growth para tenerlo de verdad
              </Link>
            </div>
          </div>
        )}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium" style={{ color: '#5a6168' }}>
          <RefreshCw size={11} /> Datos de demo guardados en este navegador.
        </p>
      </main>

      <DemoSwitcher demoId={draft.id} mode="admin" />
    </div>
  );
}