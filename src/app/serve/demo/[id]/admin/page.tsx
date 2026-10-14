'use client';

/* Attenda Serve — admin (/serve/demo/<id>/admin, white-label).
   PIN gate (saved per device), KPIs, order pipeline (advance/cancel/
   payment), menu editor, settings (local clock, hours/ETA/pauses/
   pay-number). Tenant-branded dark UI — colors + money from bundle. */

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/components/serve/use-tenant';
import { ServeHeader } from '@/components/serve/fv-site-chrome';
import { FV, fmtHours } from '@/lib/serve/fv-tokens';
import { resolveTheme, ResolvedTheme } from '@/lib/serve/theme';
import { CurrencyCode, formatMoney, ServeOrder } from '@/lib/serve/types';

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Pago por confirmar',
  RECEIVED: 'Recibido',
  ACCEPTED: 'Aceptado',
  PREPARING: 'En cocina',
  READY: 'Listo',
  DISPATCHED: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export default function AdminPage() {
  const pathname = usePathname();
  const id = (pathname.match(/\/serve\/demo\/([^/]+)\/admin/) || [])[1] || '';
  const { data, refresh } = useTenant(id);

  const tenantTheme = data?.tenant.theme ?? null;
  const T = resolveTheme(tenantTheme);
  const currency = ((data?.tenant.currency || 'S/') as CurrencyCode);
  const fmt = (cents: number) => formatMoney(cents, currency);
  const payName = currency === 'S/' ? 'Yape' : 'QR/Transf.';

  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [pinError, setPinError] = useState('');
  const [orders, setOrders] = useState<ServeOrder[]>([]);
  const [tab, setTab] = useState<'pedidos' | 'menu' | 'ajustes'>('pedidos');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`attd_serve_admin_pin_${id}`);
      if (saved) {
        setPin(saved);
        setAuthed(true);
      }
    } catch {}
  }, [id]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/serve/${id}/orders`, { headers: { 'x-tenant-pin': pin }, cache: 'no-store' });
      if (res.status === 401) {
        setAuthed(false);
        localStorage.removeItem(`attd_serve_admin_pin_${id}`);
        return;
      }
      const body = await res.json();
      if (body.ok) setOrders(body.orders as ServeOrder[]);
    } catch {}
  }, [id, pin]);

  useEffect(() => {
    if (authed && pin) loadOrders();
    const iv = setInterval(() => {
      if (authed && pin) loadOrders();
    }, 10000);
    return () => clearInterval(iv);
  }, [authed, pin, loadOrders]);

  const kpis = useMemo(() => {
    const today = orders.filter((o) => new Date(o.ts).toDateString() === new Date().toDateString());
    const valid = today.filter((o) => o.status !== 'CANCELLED');
    const sales = valid.reduce((a, o) => a + o.total, 0);
    const pending = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;
    const awaitingPayment = orders.filter((o) => o.paymentStatus === 'PENDING_PAYMENT' && o.status !== 'CANCELLED').length;
    return { orders: valid.length, sales, pending, awaitingPayment };
  }, [orders]);

  async function tryLogin() {
    setBusy(true);
    setPinError('');
    try {
      const res = await fetch(`/api/serve/${id}/orders`, { headers: { 'x-tenant-pin': pin }, cache: 'no-store' });
      if (res.status === 401) {
        setPinError('PIN incorrecto');
      } else {
        localStorage.setItem(`attd_serve_admin_pin_${id}`, pin);
        setAuthed(true);
        const body = await res.json();
        if (body.ok) setOrders(body.orders as ServeOrder[]);
      }
    } catch {
      setPinError('Error de conexión');
    }
    setBusy(false);
  }

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/serve/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-tenant-pin': pin }, body: JSON.stringify(body) });
      await loadOrders();
      refresh();
    } catch {}
    setBusy(false);
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: FV.black }}>
        <div className="text-sm" style={{ color: FV.cream50 }}>Cargando…</div>
      </div>
    );
  }

  /* PIN gate */
  if (!authed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ backgroundColor: T.black, fontFamily: 'Fredoka, sans-serif' }}>
        <div className="w-full max-w-sm rounded-3xl border p-6 text-center" style={{ borderColor: T.line, backgroundColor: T.panel }}>
          <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: T.cream50 }}>Panel de {data.tenant.name}</div>
          <h1 className="mt-2 text-2xl font-semibold" style={{ color: T.cream }}>Ingresa tu PIN</h1>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="••••"
            className="mt-4 w-full rounded-2xl border px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none"
            style={{ borderColor: T.line, backgroundColor: T.black, color: T.cream }}
          />
          {pinError && <div className="mt-2 text-xs" style={{ color: FV.red }}>{pinError}</div>}
          <button onClick={tryLogin} disabled={busy || pin.length < 4} className="mt-4 w-full rounded-2xl px-5 py-3.5 text-sm font-black disabled:opacity-50" style={{ backgroundColor: T.orange, color: T.black }}>
            {busy ? 'VERIFICANDO…' : 'ENTRAR'}
          </button>
          <a href={`/serve/demo/${id}/app`} className="mt-3 block text-xs" style={{ color: T.cream50 }}>← Ir a la tienda</a>
        </div>
      </div>
    );
  }

  const t = data.tenant;
  const s = data.settings;

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: T.black, fontFamily: 'Fredoka, sans-serif' }}>
      <ServeHeader tenantName={t.name} logo={t.logo} tagline={t.tagline} theme={tenantTheme} currency={currency} />
      <div className="mx-auto max-w-xl px-4 pt-4">
        {/* tabs */}
        <div className="flex gap-2">
          {(['pedidos', 'menu', 'ajustes'] as const).map((x) => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className="flex-1 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em]"
              style={{ borderColor: tab === x ? T.orange : T.line, color: tab === x ? T.orange : T.cream50, backgroundColor: tab === x ? T.orange10 : 'transparent' }}
            >
              {x}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Kpi T={T} label="Pedidos hoy" value={String(kpis.orders)} />
          <Kpi T={T} label="Ventas hoy" value={fmt(kpis.sales)} />
          <Kpi T={T} label="En curso" value={String(kpis.pending)} />
          <Kpi T={T} label="Por confirmar pago" value={String(kpis.awaitingPayment)} accent={kpis.awaitingPayment > 0} />
        </div>

        {tab === 'pedidos' && (
          <div className="mt-4 space-y-3">
            {orders.length === 0 && <Empty T={T} text="Sin pedidos todavía." />}
            {orders.slice().reverse().map((o) => (
              <OrderCard key={o.number} T={T} fmt={fmt} payName={payName} o={o} busy={busy} onPatch={patch} />
            ))}
          </div>
        )}

        {tab === 'menu' && <MenuTab id={id} T={T} busy={busy} onSaved={() => { loadOrders(); refresh(); }} />}
        {tab === 'ajustes' && <SettingsTab settings={s} open={data.open} busy={busy} onPatch={patch} T={T} tenantId={id} />}

        <div className="mt-6 flex justify-center gap-4 text-xs">
          <a href={`/serve/demo/${id}/app`} style={{ color: T.cream50 }}>Ver tienda →</a>
          <button onClick={() => { localStorage.removeItem(`attd_serve_admin_pin_${id}`); setAuthed(false); setPin(''); }} style={{ color: T.cream50 }}>Salir</button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ T, label, value, accent }: { T: ResolvedTheme; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: accent ? T.orange40 : T.line, backgroundColor: accent ? T.orange10 : T.panel }}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: T.cream50 }}>{label}</div>
      <div className="mt-1 text-xl font-bold" style={{ color: accent ? T.orange : T.cream }}>{value}</div>
    </div>
  );
}

function Empty({ T, text }: { T: ResolvedTheme; text: string }) {
  return <div className="rounded-2xl border p-8 text-center text-sm" style={{ borderColor: T.line, backgroundColor: T.panel, color: T.cream50 }}>{text}</div>;
}

function OrderCard({ T, fmt, payName, o, busy, onPatch }: { T: ResolvedTheme; fmt: (c: number) => string; payName: string; o: ServeOrder; busy: boolean; onPatch: (b: Record<string, unknown>) => void }) {
  const cancelled = o.status === 'CANCELLED';
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: o.paymentStatus === 'PENDING_PAYMENT' && !cancelled ? T.orange40 : T.line, backgroundColor: T.panel }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: T.cream }}>{o.number}</span>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]" style={{ backgroundColor: cancelled ? 'rgba(217,45,32,0.15)' : T.orange10, color: cancelled ? FV.red : T.orange }}>
          {STATUS_LABEL[o.status] || o.status}
        </span>
      </div>
      <div className="mt-1 text-xs" style={{ color: T.cream50 }}>
        {o.customer.firstName} · {o.payment === 'CASH' ? 'Efectivo' : `${payName}${o.paymentStatus === 'PENDING_PAYMENT' ? ' (por confirmar)' : o.paymentStatus === 'CLAIMED' ? ' (realizado)' : ' (pagado)'}`} · {o.zoneId === 'pickup' ? 'Retiro' : 'Delivery'}
        {o.scheduledFor ? ` · ${o.scheduledFor}` : ''}
      </div>
      <div className="mt-2 space-y-0.5">
        {o.items.map((it) => (
          <div key={it.slug} className="flex justify-between text-sm">
            <span style={{ color: T.cream }}>{it.qty}× {it.name}</span>
            <span style={{ color: T.cream60 }}>{fmt(it.price * it.qty)}</span>
          </div>
        ))}
      </div>
      {o.address?.street && <div className="mt-2 text-xs" style={{ color: T.cream50 }}>📍 {o.address.street} {o.address.apartment || ''}{o.address.reference ? ` — ${o.address.reference}` : ''}</div>}
      {o.notes && <div className="mt-1 text-xs" style={{ color: T.cream50 }}>Notas: {o.notes}</div>}
      <div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: T.line }}>
        <span className="text-sm font-bold" style={{ color: T.cream }}>{fmt(o.total)}</span>
        {!cancelled && o.status !== 'DELIVERED' && (
          <div className="flex gap-2">
            {o.payment === 'YAPE_PLIN' && o.paymentStatus !== 'PAID' && (
              <button onClick={() => onPatch({ number: o.number, action: 'payment', paymentStatus: o.paymentStatus === 'CLAIMED' ? 'PAID' : 'CLAIMED' })} disabled={busy} className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ backgroundColor: T.orange10, color: T.orange, border: `1px solid ${T.orange40}` }}>
                {o.paymentStatus === 'PENDING_PAYMENT' ? 'CONFIRMAR PAGO' : 'MARCAR PAGADO'}
              </button>
            )}
            <button onClick={() => onPatch({ number: o.number, action: 'advance' })} disabled={busy} className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ backgroundColor: T.orange, color: T.black }}>
              AVANZAR →
            </button>
            <button onClick={() => onPatch({ number: o.number, action: 'cancel' })} disabled={busy} className="rounded-full px-2 py-1.5 text-[11px]" style={{ color: FV.red }}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuTab({ id, T, busy, onSaved }: { id: string; T: ResolvedTheme; busy: boolean; onSaved: () => void }) {
  const { data } = useTenant(id);
  const [draft, setDraft] = useState<Record<string, { name: string; price: string; active: boolean }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const d: Record<string, { name: string; price: string; active: boolean }> = {};
    for (const p of data.menu) d[p.slug] = { name: p.name, price: (p.price / 100).toFixed(2), active: p.active };
    setDraft(d);
  }, [data]);

  function storedPin(): string {
    try {
      return localStorage.getItem(`attd_serve_admin_pin_${id}`) || '';
    } catch {
      return '';
    }
  }

  if (!data) return <Empty T={T} text="Cargando menú…" />;

  async function save() {
    setSaving(true);
    try {
      const products = Object.entries(draft).map(([slug, d]) => ({
        slug, name: d.name.trim(), price: Math.round(parseFloat(d.price) * 100) || 0, active: d.active,
      }));
      await fetch(`/api/serve/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-tenant-pin': storedPin() }, body: JSON.stringify({ products }) });
      onSaved();
    } catch {}
    setSaving(false);
  }

  return (
    <div className="mt-4 space-y-3">
      {data.menu.map((p) => {
        const d = draft[p.slug] || { name: p.name, price: (p.price / 100).toFixed(2), active: p.active };
        return (
          <div key={p.slug} className="rounded-2xl border p-3" style={{ borderColor: T.line, backgroundColor: T.panel }}>
            <div className="flex items-center gap-2">
              <input value={d.name} onChange={(e) => setDraft((x) => ({ ...x, [p.slug]: { ...d, name: e.target.value } }))} className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: T.line, backgroundColor: T.black, color: T.cream }} />
              <input value={d.price} onChange={(e) => setDraft((x) => ({ ...x, [p.slug]: { ...d, price: e.target.value } }))} inputMode="decimal" className="w-20 rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: T.line, backgroundColor: T.black, color: T.cream }} />
              <button onClick={() => setDraft((x) => ({ ...x, [p.slug]: { ...d, active: !d.active } }))} className="rounded-xl px-2.5 py-2 text-xs font-black" style={{ backgroundColor: d.active ? T.green10 : 'transparent', color: d.active ? T.green : T.cream50, border: `1px solid ${d.active ? T.green40 : T.line}` }}>
                {d.active ? 'ACTIVO' : 'OFF'}
              </button>
            </div>
          </div>
        );
      })}
      <button onClick={save} disabled={busy || saving} className="w-full rounded-2xl px-5 py-3.5 text-sm font-black disabled:opacity-50" style={{ backgroundColor: T.orange, color: T.black }}>
        {saving ? 'GUARDANDO…' : 'GUARDAR MENÚ'}
      </button>
      <p className="text-center text-[11px]" style={{ color: T.cream50 }}>Los cambios se reflejan al instante en la tienda.</p>
    </div>
  );
}

function SettingsTab({ settings, open, busy, onPatch, T, tenantId }: { settings: NonNullable<NonNullable<ReturnType<typeof useTenant>['data']>>['settings']; open: boolean; busy: boolean; onPatch: (b: Record<string, unknown>) => void; T: ResolvedTheme; tenantId: string }) {
  const s = settings;
  const [hoursOpen, setHoursOpen] = useState(s.hoursOpen);
  const [hoursClose, setHoursClose] = useState(s.hoursClose);
  const [utcOffset, setUtcOffset] = useState(String(typeof s.utcOffset === 'number' ? s.utcOffset : -5));
  const [etaMin, setEtaMin] = useState(String(s.etaMin));
  const [etaMax, setEtaMax] = useState(String(s.etaMax));
  const [payNumber, setPayNumber] = useState(s.yapeNumber);
  const [payHolder, setPayHolder] = useState(s.yapeHolder);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHoursOpen(s.hoursOpen);
    setHoursClose(s.hoursClose);
    setUtcOffset(String(typeof s.utcOffset === 'number' ? (s as { utcOffset?: number }).utcOffset : -5));
    setEtaMin(String(s.etaMin));
    setEtaMax(String(s.etaMax));
    setPayNumber(s.yapeNumber);
    setPayHolder(s.yapeHolder);
  }, [s]);

  const localNow = useMemo(() => {
    const off = parseFloat(utcOffset);
    const safe = typeof off === 'number' && !isNaN(off) ? off : 0;
    return new Date(Date.now() + safe * 3600 * 1000).toISOString().slice(11, 16);
  }, [utcOffset]);

  async function save() {
    await onPatch({
      settings: {
        hoursOpen,
        hoursClose,
        utcOffset: parseFloat(utcOffset) || 0,
        etaMin: parseInt(etaMin, 10) || s.etaMin,
        etaMax: parseInt(etaMax, 10) || s.etaMax,
        yapeNumber: payNumber.replace(/[^0-9]/g, ''),
        yapeHolder: payHolder,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between rounded-2xl border p-4" style={{ borderColor: open ? T.green40 : T.orange40, backgroundColor: T.panel }}>
        <div>
          <div className="text-sm font-bold" style={{ color: T.cream }}>{open ? 'Abierto ahora' : 'Cerrado ahora'}</div>
          <div className="text-xs" style={{ color: T.cream50 }}>Su hora local: {localNow} · Horario: {fmtHours(s.hoursOpen)}–{fmtHours(s.hoursClose)}</div>
        </div>
        <button onClick={() => onPatch({ settings: { hoursEnabled: !s.hoursEnabled } })} disabled={busy} className="rounded-full px-4 py-2 text-xs font-black" style={{ backgroundColor: s.hoursEnabled ? T.orange : T.panel, color: s.hoursEnabled ? T.black : T.cream50, border: `1px solid ${s.hoursEnabled ? T.orange : T.line}` }}>
          {s.hoursEnabled ? 'CERRAR AHORA' : 'ABRIR AHORA'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field T={T} label="Abre (HH:MM)" value={hoursOpen} onChange={setHoursOpen} />
        <Field T={T} label="Cierra (HH:MM)" value={hoursClose} onChange={setHoursClose} />
        <Field T={T} label="Zona horaria (UTC±)" value={utcOffset} onChange={setUtcOffset} hint="Bolivia −4, Perú −5" />
        <Field T={T} label="ETA máx (min)" value={etaMax} onChange={setEtaMax} />
        <Field T={T} label="Nº de pago (Yape/QR)" value={payNumber} onChange={setPayNumber} />
        <Field T={T} label="Titular" value={payHolder} onChange={setPayHolder} />
      </div>

      <Toggle T={T} label="Pausar pedidos" hint="La tienda sigue visible, nadie puede ordenar." on={s.ordersPaused} onToggle={() => onPatch({ settings: { ordersPaused: !s.ordersPaused } })} busy={busy} />
      <Toggle T={T} label="Aceptar pedidos fuera de horario" hint="Programados para la apertura." on={s.allowAfterHours} onToggle={() => onPatch({ settings: { allowAfterHours: !s.allowAfterHours } })} busy={busy} />

      <button onClick={save} disabled={busy} className="w-full rounded-2xl px-5 py-3.5 text-sm font-black disabled:opacity-50" style={{ backgroundColor: T.orange, color: T.black }}>
        {saved ? '✓ GUARDADO' : 'GUARDAR AJUSTES'}
      </button>
      <p className="text-center text-[11px]" style={{ color: T.cream50 }}>Demo {tenantId.slice(-4).toUpperCase()} · mismo panel que recibe un tenant oficial.</p>
    </div>
  );
}

function Field({ T, label, value, onChange, hint }: { T: ResolvedTheme; label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: T.cream50 }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm outline-none" style={{ borderColor: T.line, backgroundColor: T.black, color: T.cream }} />
      {hint && <span className="mt-0.5 block text-[9px]" style={{ color: T.cream50 }}>{hint}</span>}
    </label>
  );
}

function Toggle({ T, label, hint, on, onToggle, busy }: { T: ResolvedTheme; label: string; hint: string; on: boolean; onToggle: () => void; busy: boolean }) {
  return (
    <button onClick={onToggle} disabled={busy} className="flex w-full items-center justify-between rounded-2xl border p-4 text-left" style={{ borderColor: T.line, backgroundColor: T.panel }}>
      <div>
        <div className="text-sm font-bold" style={{ color: T.cream }}>{label}</div>
        <div className="text-xs" style={{ color: T.cream50 }}>{hint}</div>
      </div>
      <span className="flex h-6 w-11 items-center rounded-full px-0.5" style={{ backgroundColor: on ? T.green : T.line, justifyContent: on ? 'flex-end' : 'flex-start' }}>
        <span className="h-5 w-5 rounded-full" style={{ backgroundColor: on ? T.black : T.cream50 }} />
      </span>
    </button>
  );
}