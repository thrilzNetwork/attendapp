'use client';

/* Attenda Serve — FV-skinned admin (/serve/demo/<id>/admin).
   PIN gate (saved per device), KPIs, order pipeline (advance/cancel/
   payment), menu editor, settings (hours/ETA/pauses/Yape). Dark FV UI. */

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/components/serve/use-tenant';
import { ServeHeader } from '@/components/serve/fv-site-chrome';
import { FV, formatPEN, fmtHours } from '@/lib/serve/fv-tokens';
import { ServeOrder } from '@/lib/serve/types';

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
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ backgroundColor: FV.black, fontFamily: 'Fredoka, sans-serif' }}>
        <div className="w-full max-w-sm rounded-3xl border border-[#232323] bg-[#131313] p-6 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: FV.cream50 }}>Panel de {data.tenant.name}</div>
          <h1 className="mt-2 text-2xl font-semibold" style={{ color: FV.cream }}>Ingresa tu PIN</h1>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="••••"
            className="mt-4 w-full rounded-2xl border border-[#232323] bg-[#0a0a0a] px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none"
            style={{ color: FV.cream }}
          />
          {pinError && <div className="mt-2 text-xs" style={{ color: FV.red }}>{pinError}</div>}
          <button onClick={tryLogin} disabled={busy || pin.length < 4} className="mt-4 w-full rounded-2xl px-5 py-3.5 text-sm font-black disabled:opacity-50" style={{ backgroundColor: FV.orange, color: FV.black }}>
            {busy ? 'VERIFICANDO…' : 'ENTRAR'}
          </button>
          <a href={`/serve/demo/${id}/app`} className="mt-3 block text-xs" style={{ color: FV.cream50 }}>← Ir a la tienda</a>
        </div>
      </div>
    );
  }

  const t = data.tenant;
  const s = data.settings;

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: FV.black, fontFamily: 'Fredoka, sans-serif' }}>
      <ServeHeader tenantName={t.name} logo={t.logo} tagline={t.tagline} />
      <div className="mx-auto max-w-xl px-4 pt-4">
        {/* tabs */}
        <div className="flex gap-2">
          {(['pedidos', 'menu', 'ajustes'] as const).map((x) => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className="flex-1 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em]"
              style={{ borderColor: tab === x ? FV.orange : FV.line, color: tab === x ? FV.orange : FV.cream50, backgroundColor: tab === x ? FV.orange10 : 'transparent' }}
            >
              {x}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Kpi label="Pedidos hoy" value={String(kpis.orders)} />
          <Kpi label="Ventas hoy" value={formatPEN(kpis.sales)} />
          <Kpi label="En curso" value={String(kpis.pending)} />
          <Kpi label="Por confirmar pago" value={String(kpis.awaitingPayment)} accent={kpis.awaitingPayment > 0} />
        </div>

        {tab === 'pedidos' && (
          <div className="mt-4 space-y-3">
            {orders.length === 0 && <Empty text="Sin pedidos todavía." />}
            {orders.slice().reverse().map((o) => (
              <OrderCard key={o.number} o={o} busy={busy} onPatch={patch} />
            ))}
          </div>
        )}

        {tab === 'menu' && <MenuTab id={id} pin={pin} busy={busy} onSaved={() => { loadOrders(); refresh(); }} />}
        {tab === 'ajustes' && <SettingsTab settings={s} open={data.open} busy={busy} onPatch={patch} tenantId={id} />}

        <div className="mt-6 flex justify-center gap-4 text-xs" style={{ color: FV.cream50 }}>
          <a href={`/serve/demo/${id}/app`} style={{ color: FV.cream50 }}>Ver tienda →</a>
          <button onClick={() => { localStorage.removeItem(`attd_serve_admin_pin_${id}`); setAuthed(false); setPin(''); }}>Salir</button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: accent ? FV.orange40 : FV.line, backgroundColor: accent ? FV.orange10 : FV.panel }}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: FV.cream50 }}>{label}</div>
      <div className="mt-1 text-xl font-bold" style={{ color: accent ? FV.orange : FV.cream }}>{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-[#232323] bg-[#131313] p-8 text-center text-sm" style={{ color: FV.cream50 }}>{text}</div>;
}

function OrderCard({ o, busy, onPatch }: { o: ServeOrder; busy: boolean; onPatch: (b: Record<string, unknown>) => void }) {
  const cancelled = o.status === 'CANCELLED';
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: o.paymentStatus === 'PENDING_PAYMENT' && !cancelled ? FV.orange40 : FV.line, backgroundColor: FV.panel }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: FV.cream }}>{o.number}</span>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]" style={{ backgroundColor: cancelled ? 'rgba(217,45,32,0.15)' : FV.orange10, color: cancelled ? FV.red : FV.orange }}>
          {STATUS_LABEL[o.status] || o.status}
        </span>
      </div>
      <div className="mt-1 text-xs" style={{ color: FV.cream50 }}>
        {o.customer.firstName} · {o.payment === 'CASH' ? 'Efectivo' : `Yape ${o.paymentStatus === 'PENDING_PAYMENT' ? '(por confirmar)' : o.paymentStatus === 'CLAIMED' ? '(yapeado)' : '(pagado)'}`} · {o.zoneId === 'pickup' ? 'Retiro' : 'Delivery'}
        {o.scheduledFor ? ` · ${o.scheduledFor}` : ''}
      </div>
      <div className="mt-2 space-y-0.5">
        {o.items.map((it) => (
          <div key={it.slug} className="flex justify-between text-sm">
            <span style={{ color: FV.cream }}>{it.qty}× {it.name}</span>
            <span style={{ color: FV.cream60 }}>{formatPEN(it.price * it.qty)}</span>
          </div>
        ))}
      </div>
      {o.address?.street && <div className="mt-2 text-xs" style={{ color: FV.cream50 }}>📍 {o.address.street} {o.address.apartment || ''}{o.address.reference ? ` — ${o.address.reference}` : ''}</div>}
      {o.notes && <div className="mt-1 text-xs" style={{ color: FV.cream50 }}>Notas: {o.notes}</div>}
      <div className="mt-2 flex items-center justify-between border-t border-[#232323] pt-2">
        <span className="text-sm font-bold" style={{ color: FV.cream }}>{formatPEN(o.total)}</span>
        {!cancelled && o.status !== 'DELIVERED' && (
          <div className="flex gap-2">
            {o.payment === 'YAPE_PLIN' && o.paymentStatus !== 'PAID' && (
              <button onClick={() => onPatch({ number: o.number, action: 'payment', paymentStatus: o.paymentStatus === 'CLAIMED' ? 'PAID' : 'CLAIMED' })} disabled={busy} className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ backgroundColor: FV.yapeBg, color: FV.yape, border: `1px solid ${FV.yapeBorder}` }}>
                {o.paymentStatus === 'PENDING_PAYMENT' ? 'CONFIRMAR YAPE' : 'MARCAR PAGADO'}
              </button>
            )}
            <button onClick={() => onPatch({ number: o.number, action: 'advance' })} disabled={busy} className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ backgroundColor: FV.orange, color: FV.black }}>
              AVANZAR →
            </button>
            <button onClick={() => onPatch({ number: o.number, action: 'cancel' })} disabled={busy} className="rounded-full px-2 py-1.5 text-[11px]" style={{ color: FV.red }}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuTab({ id, pin, busy, onSaved }: { id: string; pin: string; busy: boolean; onSaved: () => void }) {
  const { data } = useTenant(id);
  const [draft, setDraft] = useState<Record<string, { name: string; price: string; active: boolean }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const d: Record<string, { name: string; price: string; active: boolean }> = {};
    for (const p of data.menu) d[p.slug] = { name: p.name, price: (p.price / 100).toFixed(2), active: p.active };
    setDraft(d);
  }, [data]);

  if (!data) return <Empty text="Cargando menú…" />;

  async function save() {
    setSaving(true);
    try {
      const products = Object.entries(draft).map(([slug, d]) => ({
        slug, name: d.name.trim(), price: Math.round(parseFloat(d.price) * 100) || 0, active: d.active,
      }));
      await fetch(`/api/serve/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-tenant-pin': pin }, body: JSON.stringify({ products }) });
      onSaved();
    } catch {}
    setSaving(false);
  }

  return (
    <div className="mt-4 space-y-3">
      {data.menu.map((p) => {
        const d = draft[p.slug] || { name: p.name, price: (p.price / 100).toFixed(2), active: p.active };
        return (
          <div key={p.slug} className="rounded-2xl border border-[#232323] bg-[#131313] p-3">
            <div className="flex items-center gap-2">
              <input value={d.name} onChange={(e) => setDraft((x) => ({ ...x, [p.slug]: { ...d, name: e.target.value } }))} className="min-w-0 flex-1 rounded-xl border border-[#232323] bg-[#0a0a0a] px-3 py-2 text-sm outline-none" style={{ color: FV.cream }} />
              <input value={d.price} onChange={(e) => setDraft((x) => ({ ...x, [p.slug]: { ...d, price: e.target.value } }))} inputMode="decimal" className="w-20 rounded-xl border border-[#232323] bg-[#0a0a0a] px-3 py-2 text-sm outline-none" style={{ color: FV.cream }} />
              <button onClick={() => setDraft((x) => ({ ...x, [p.slug]: { ...d, active: !d.active } }))} className="rounded-xl px-2.5 py-2 text-xs font-black" style={{ backgroundColor: d.active ? FV.green10 : 'transparent', color: d.active ? FV.green : FV.cream50, border: `1px solid ${d.active ? FV.green40 : FV.line}` }}>
                {d.active ? 'ACTIVO' : 'OFF'}
              </button>
            </div>
          </div>
        );
      })}
      <button onClick={save} disabled={busy || saving} className="w-full rounded-2xl px-5 py-3.5 text-sm font-black disabled:opacity-50" style={{ backgroundColor: FV.orange, color: FV.black }}>
        {saving ? 'GUARDANDO…' : 'GUARDAR MENÚ'}
      </button>
      <p className="text-center text-[11px]" style={{ color: FV.cream50 }}>Los cambios se reflejan al instante en la tienda.</p>
    </div>
  );
}

function SettingsTab({ settings, open, busy, onPatch, tenantId }: { settings: ReturnType<typeof useTenant>['data'] extends null ? never : NonNullable<ReturnType<typeof useTenant>['data']>['settings']; open: boolean; busy: boolean; onPatch: (b: Record<string, unknown>) => void; tenantId: string }) {
  const s = settings;
  const [hoursOpen, setHoursOpen] = useState(s.hoursOpen);
  const [hoursClose, setHoursClose] = useState(s.hoursClose);
  const [etaMin, setEtaMin] = useState(String(s.etaMin));
  const [etaMax, setEtaMax] = useState(String(s.etaMax));
  const [yapeNumber, setYapeNumber] = useState(s.yapeNumber);
  const [yapeHolder, setYapeHolder] = useState(s.yapeHolder);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHoursOpen(s.hoursOpen);
    setHoursClose(s.hoursClose);
    setEtaMin(String(s.etaMin));
    setEtaMax(String(s.etaMax));
    setYapeNumber(s.yapeNumber);
    setYapeHolder(s.yapeHolder);
  }, [s]);

  async function save() {
    await onPatch({
      settings: {
        hoursOpen, hoursClose,
        etaMin: parseInt(etaMin, 10) || s.etaMin,
        etaMax: parseInt(etaMax, 10) || s.etaMax,
        yapeNumber: yapeNumber.replace(/[^0-9]/g, ''),
        yapeHolder,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between rounded-2xl border p-4" style={{ borderColor: open ? FV.green40 : FV.orange40, backgroundColor: FV.panel }}>
        <div>
          <div className="text-sm font-bold" style={{ color: FV.cream }}>{open ? 'Abierto ahora' : 'Cerrado ahora'}</div>
          <div className="text-xs" style={{ color: FV.cream50 }}>Horario: {fmtHours(s.hoursOpen)}–{fmtHours(s.hoursClose)}</div>
        </div>
        <button onClick={() => onPatch({ settings: { hoursEnabled: !s.hoursEnabled } })} disabled={busy} className="rounded-full px-4 py-2 text-xs font-black" style={{ backgroundColor: s.hoursEnabled ? FV.orange : FV.panel, color: s.hoursEnabled ? FV.black : FV.cream50, border: `1px solid ${s.hoursEnabled ? FV.orange : FV.line}` }}>
          {s.hoursEnabled ? 'CERRAR AHORA' : 'ABRIR AHORA'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Abre (HH:MM)" value={hoursOpen} onChange={setHoursOpen} />
        <Field label="Cierra (HH:MM)" value={hoursClose} onChange={setHoursClose} />
        <Field label="ETA mín (min)" value={etaMin} onChange={setEtaMin} />
        <Field label="ETA máx (min)" value={etaMax} onChange={setEtaMax} />
        <Field label="Yape número" value={yapeNumber} onChange={setYapeNumber} />
        <Field label="Yape titular" value={yapeHolder} onChange={setYapeHolder} />
      </div>

      <Toggle label="Pausar pedidos" hint="La tienda sigue visible, nadie puede ordenar." on={s.ordersPaused} onToggle={() => onPatch({ settings: { ordersPaused: !s.ordersPaused } })} busy={busy} />
      <Toggle label="Aceptar pedidos fuera de horario" hint="Programados para la apertura." on={s.allowAfterHours} onToggle={() => onPatch({ settings: { allowAfterHours: !s.allowAfterHours } })} busy={busy} />

      <button onClick={save} disabled={busy} className="w-full rounded-2xl px-5 py-3.5 text-sm font-black disabled:opacity-50" style={{ backgroundColor: FV.orange, color: FV.black }}>
        {saved ? '✓ GUARDADO' : 'GUARDAR AJUSTES'}
      </button>
      <p className="text-center text-[11px]" style={{ color: FV.cream50 }}>Demo {tenantId.slice(-4).toUpperCase()} · mismo panel que recibe un tenant oficial.</p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: FV.cream50 }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[#232323] bg-[#0a0a0a] px-3 py-2 text-sm outline-none" style={{ color: FV.cream }} />
    </label>
  );
}

function Toggle({ label, hint, on, onToggle, busy }: { label: string; hint: string; on: boolean; onToggle: () => void; busy: boolean }) {
  return (
    <button onClick={onToggle} disabled={busy} className="flex w-full items-center justify-between rounded-2xl border border-[#232323] bg-[#131313] p-4 text-left">
      <div>
        <div className="text-sm font-bold" style={{ color: FV.cream }}>{label}</div>
        <div className="text-xs" style={{ color: FV.cream50 }}>{hint}</div>
      </div>
      <span className="flex h-6 w-11 items-center rounded-full px-0.5" style={{ backgroundColor: on ? FV.green : FV.line, justifyContent: on ? 'flex-end' : 'flex-start' }}>
        <span className="h-5 w-5 rounded-full" style={{ backgroundColor: on ? FV.black : FV.cream50 }} />
      </span>
    </button>
  );
}