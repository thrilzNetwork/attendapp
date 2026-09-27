'use client';

/* Attenda Serve — tenant ADMIN (/serve/demo/<id>/admin).
   FV admin port: PIN login, KPIs, order pipeline (server PATCHes),
   menu editor (server-persisted), settings (hours/pauses/after-hours),
   Digital Pass card. Data lives server-side like fukinvegan.com/admin. */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Wallet, Power, RefreshCw, Sparkles, Lock } from 'lucide-react';
import { DemoSwitcher, demoTokens as T, demoShadow, demoShadowSm } from '@/components/serve/serve-demo-chrome';

type TenantData = {
  tenant: { id: string; name: string; type: string; city: string; phone: string; logo: string | null; tagline: string };
  menu: { slug: string; name: string; price: number; available?: boolean }[];
  open: boolean;
};
type Order = {
  number: string; items: { name: string; qty: number; price: number }[]; total: number;
  status: string; payment: string; paymentStatus: string; ts: number;
};

const PIN_KEY = 'attd_serve_admin_pin';

export default function DemoAdminPage() {
  const [data, setData] = useState<TenantData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<'pedidos' | 'menu' | 'ajustes' | 'pass'>('pedidos');

  const tenantId = typeof window !== 'undefined' ? window.location.pathname.split('/')[3] : '';

  const refreshOrders = async (id: string, adminPin: string) => {
    const r = await fetch(`/api/serve/${id}/orders`, { headers: { 'x-tenant-pin': adminPin } });
    if (!r.ok) return false;
    const j = await r.json();
    if (j?.ok) setOrders(j.orders);
    return true;
  };

  useEffect(() => {
    const id = window.location.pathname.split('/')[3] || '';
    fetch(`/api/serve/${id}`)
      .then(async (r) => {
        if (r.status === 404) { setMissing(true); return; }
        const j = await r.json();
        if (j?.ok) {
          setData(j);
          try {
            const saved = window.localStorage.getItem(PIN_KEY + '_' + id);
            if (saved) {
              const ok = await refreshOrders(id, saved);
              if (ok) { setPin(saved); setAuthed(true); }
            }
          } catch {}
        } else setMissing(true);
      })
      .catch(() => setMissing(true))
      .finally(() => setLoaded(true));
  }, []);

  const kpis = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todays = orders.filter((o) => o.ts >= todayStart.getTime() && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO');
    return { orders: todays.length, revenue: todays.reduce((a, o) => a + o.total, 0) };
  }, [orders]);

  if (!loaded) return <div className="min-h-screen" style={{ backgroundColor: T.CREAM }} />;

  if (missing || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center" style={{ backgroundColor: T.CREAM, color: T.INK }}>
        <h1 className="text-[24px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Demo no encontrada</h1>
        <Link href="/serve/demo" className="mt-6 rounded-xl border-2 px-6 py-3.5 text-[15px] font-black"
          style={{ backgroundColor: T.TEAL, borderColor: T.INK, boxShadow: demoShadow }}>Crear una nueva demo</Link>
      </div>
    );
  }

  const { tenant, menu } = data;

  /* ── login gate ─────────────────────────────── */
  if (!authed) {
    const tryPin = async () => {
      const ok = await refreshOrders(tenantId, pin);
      if (ok) {
        setAuthed(true);
        try { window.localStorage.setItem(PIN_KEY + '_' + tenantId, pin); } catch {}
      } else {
        alert('PIN incorrecto');
      }
    };
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ backgroundColor: T.CREAM, color: T.INK }}>
        <div className="w-full max-w-xs rounded-2xl border-2 p-6" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadow }}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border-2" style={{ borderColor: T.INK, backgroundColor: T.NAVY }}>
            <Lock size={20} color="#F3F0E6" />
          </span>
          <h1 className="mt-4 text-center text-[18px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Panel de {tenant.name}</h1>
          <p className="mt-1 text-center text-[12px] font-medium" style={{ color: '#5a6168' }}>Ingresa el PIN de 4 dígitos que se te entregó al crear la demo.</p>
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
            inputMode="numeric" placeholder="••••" autoFocus
            className="mt-5 w-full rounded-xl border-2 px-4 py-3 text-center text-[22px] font-black tracking-[0.4em] outline-none"
            style={{ borderColor: T.INK, backgroundColor: T.CREAM, fontFamily: 'IBM Plex Mono, monospace' }}
            onKeyDown={(e) => { if (e.key === 'Enter' && pin) tryPin(); }} />
          <button onClick={tryPin} disabled={pin.length < 4}
            className="mt-4 w-full rounded-xl border-2 py-3.5 text-[15px] font-black disabled:opacity-40"
            style={{ backgroundColor: T.TEAL, color: T.INK, borderColor: T.INK, boxShadow: `4px 4px 0 ${T.TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
            Entrar al panel
          </button>
        </div>
      </div>
    );
  }

  /* ── admin actions (server PATCH) ───────────── */
  const act = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/serve/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-tenant-pin': pin },
      body: JSON.stringify(body),
    });
    return res;
  };

  const advance = async (number: string) => {
    await act({ number, action: 'advance' });
    await refreshOrders(tenantId, pin);
  };
  const cancel = async (number: string) => {
    await act({ number, action: 'cancel' });
    await refreshOrders(tenantId, pin);
  };
  const confirmPayment = async (number: string) => {
    await act({ number, action: 'payment', paymentStatus: 'PAGADO' });
    await refreshOrders(tenantId, pin);
  };
  const editProduct = async (slug: string, patch: { name?: string; price?: number; available?: boolean }) => {
    const res = await act({ products: [{ slug, ...patch }] });
    if (res.ok) {
      const j = await res.json();
      if (j?.ok) setData({ ...data, menu: j.menu });
    }
  };
  const saveSettings = async (patch: Record<string, unknown>) => {
    const res = await act({ settings: patch });
    if (res.ok) {
      const j = await res.json();
      if (j?.ok) setData({ ...data, open: j.open });
    }
  };

  const initials = tenant.name.slice(0, 2).toUpperCase();
  const active = orders.filter((o) => o.status !== 'ENTREGADO' && o.status !== 'CANCELADO');
  const done = orders.filter((o) => o.status === 'ENTREGADO' || o.status === 'CANCELADO');

  return (
    <div className="min-h-screen font-sans antialiased" style={{ backgroundColor: T.CREAM, color: T.INK, ['--sv-ink' as string]: T.INK }}>
      <header className="sticky top-0 z-40 border-b-2" style={{ borderColor: T.INK, backgroundColor: T.CREAM }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2" style={{ borderColor: T.INK, backgroundColor: T.NAVY }}>
            <LayoutDashboard size={15} color="#F3F0E6" />
          </span>
          <div className="flex-1">
            <div className="text-[15px] font-black leading-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>{tenant.name} · Panel</div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Mono, monospace', color: T.TEAL_INK }}>Vista de tu negocio</div>
          </div>
          <button onClick={() => saveSettings({ ordersPaused: data.open })}
            className="flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-[11px] font-black uppercase"
            style={{ borderColor: T.INK, backgroundColor: data.open ? T.TEAL : T.CREAM, color: T.INK }}>
            <Power size={13} /> {data.open ? 'Abierto' : 'Cerrado'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-32">
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

        <div className="mt-5 flex gap-2">
          {(['pedidos', 'menu', 'ajustes', 'pass'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 rounded-xl border-2 py-2.5 text-[13px] font-black capitalize"
              style={{ backgroundColor: tab === t ? T.INK : T.PAPER, color: tab === t ? '#F3F0E6' : T.INK, borderColor: T.INK, fontFamily: 'Archivo, sans-serif' }}>
              {t === 'pedidos' ? 'Pedidos' : t === 'menu' ? 'Menú' : t === 'ajustes' ? 'Ajustes' : 'Digital Pass'}
            </button>
          ))}
        </div>

        {tab === 'pedidos' && (
          <div className="mt-5 space-y-3">
            {active.length === 0 && done.length === 0 && (
              <div className="rounded-2xl border-2 p-6 text-center" style={{ backgroundColor: T.PAPER, borderColor: T.INK }}>
                <p className="text-[14px] font-extrabold" style={{ fontFamily: 'Archivo, sans-serif' }}>Sin pedidos todavía</p>
                <p className="mt-1 text-[12.5px] font-medium" style={{ color: '#5a6168' }}>
                  Haz un pedido de prueba en la <Link href={`/serve/demo/${tenant.id}/app`} className="font-black underline">tienda</Link> y míralo llegar aquí en vivo.
                </p>
              </div>
            )}
            {[...active, ...done].map((o) => (
              <div key={o.number} className="rounded-2xl border-2 p-4" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadowSm, opacity: o.status === 'ENTREGADO' || o.status === 'CANCELADO' ? 0.55 : 1 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
                      style={{ backgroundColor: o.status === 'ENTREGADO' || o.status === 'CANCELADO' ? T.CREAM : T.TEAL, border: `2px solid ${T.INK}`, fontFamily: 'IBM Plex Mono, monospace' }}>
                      {o.status}
                    </span>
                    <span className="text-[10px] font-bold" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>
                      {o.number} · {new Date(o.ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-[15px] font-black">S/ {o.total.toFixed(2)}</span>
                </div>
                <div className="mt-2 text-[13px] font-medium" style={{ color: '#5a6168' }}>
                  {o.items.map((it) => `${it.qty}x ${it.name}`).join(' · ')}
                </div>
                {o.payment === 'YAPE' && o.paymentStatus !== 'PAGADO' && (
                  <button onClick={() => confirmPayment(o.number)}
                    className="mt-3 w-full rounded-xl border-2 py-2.5 text-[13px] font-black"
                    style={{ backgroundColor: '#FFD54A', borderColor: T.INK, color: T.INK }}>
                    Confirmar pago Yape
                  </button>
                )}
                {o.status !== 'ENTREGADO' && o.status !== 'CANCELADO' && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => advance(o.number)}
                      className="flex-1 rounded-xl border-2 py-2.5 text-[13px] font-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                      style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: '2px 2px 0 var(--sv-ink, #15202B)', fontFamily: 'Archivo, sans-serif' }}>
                      {o.status === 'LISTO' ? 'Marcar ENTREGADO →' : `Marcar ${(() => { const f = ['RECIBIDO', 'PREPARANDO', 'LISTO', 'ENTREGADO']; return f[f.indexOf(o.status) + 1] || 'ENTREGADO'; })()} →`}
                    </button>
                    <button onClick={() => cancel(o.number)} className="rounded-xl border-2 px-4 py-2.5 text-[12px] font-black uppercase" style={{ borderColor: '#B4231F', color: '#B4231F', backgroundColor: T.PAPER }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'menu' && (
          <div className="mt-5 space-y-3">
            <p className="text-[12.5px] font-medium" style={{ color: '#5a6168' }}>
              Cambia precios o desactiva productos — se guarda en el servidor y se refleja al instante en tu tienda.
            </p>
            {menu.map((p) => (
              <div key={p.slug} className="flex items-center gap-3 rounded-2xl border-2 p-3" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadowSm }}>
                <div className="flex-1">
                  <div className="text-[14px] font-extrabold" style={{ fontFamily: 'Archivo, sans-serif' }}>{p.name}</div>
                  <div className="mt-1 flex items-center gap-1 text-[13px] font-black">
                    S/
                    <input defaultValue={p.price} inputMode="decimal" key={p.slug + p.price}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                        if (v !== p.price) editProduct(p.slug, { price: v });
                      }}
                      className="w-16 rounded-lg border-2 px-2 py-1 outline-none" style={{ borderColor: T.INK, backgroundColor: T.CREAM }} />
                  </div>
                </div>
                <button onClick={() => editProduct(p.slug, { available: p.available === false })}
                  className="rounded-xl border-2 px-3 py-2 text-[11px] font-black uppercase"
                  style={{ borderColor: T.INK, backgroundColor: p.available === false ? T.CREAM : T.TEAL, color: T.INK }}>
                  {p.available === false ? 'Inactivo' : 'Activo'}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'ajustes' && (
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border-2 p-5" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadow }}>
              <h3 className="text-[15px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Horario de atención</h3>
              <div className="mt-3 flex items-center gap-2 text-[13px] font-bold">
                <span>Abre</span>
                <input type="time" defaultValue="18:00" key={'ho' + String(data.open)}
                  onBlur={(e) => saveSettings({ hoursOpen: e.target.value, hoursEnabled: true })}
                  className="rounded-lg border-2 px-2 py-1.5" style={{ borderColor: T.INK, backgroundColor: T.CREAM }} />
                <span>Cierra</span>
                <input type="time" defaultValue="23:00" key={'hc' + String(data.open)}
                  onBlur={(e) => saveSettings({ hoursClose: e.target.value, hoursEnabled: true })}
                  className="rounded-lg border-2 px-2 py-1.5" style={{ borderColor: T.INK, backgroundColor: T.CREAM }} />
              </div>
              <p className="mt-2 text-[12px] font-medium" style={{ color: '#5a6168' }}>Fuera de este horario la tienda muestra &quot;Cerrado&quot; y no acepta pedidos.</p>
            </div>
            <div className="rounded-2xl border-2 p-5" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadow }}>
              <h3 className="text-[15px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Pedidos fuera de horario</h3>
              <p className="mt-1 text-[12.5px] font-medium" style={{ color: '#5a6168' }}>Permite que ordenen incluso cerrado (pedidos por adelantado), manteniendo el aviso de &quot;Cerrado&quot; visible.</p>
              <button onClick={() => saveSettings({ allowAfterHours: true })}
                className="mt-3 w-full rounded-xl border-2 py-3 text-[13px] font-black" style={{ backgroundColor: T.TEAL, borderColor: T.INK, color: T.INK }}>
                Activar pedidos después del cierre
              </button>
            </div>
          </div>
        )}

        {tab === 'pass' && (
          <div className="mt-5">
            <div className="rounded-2xl border-2 p-5" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadow }}>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Mono, monospace', color: T.TEAL_INK }}>
                <Sparkles size={13} /> Exclusivo plan Growth
              </div>
              <h3 className="mt-2 text-[18px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Convierte una venta en una relación</h3>
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
          <RefreshCw size={11} /> Panel real — los cambios se guardan en el servidor.
        </p>
      </main>

      <DemoSwitcher demoId={tenant.id} mode="admin" />
    </div>
  );
}