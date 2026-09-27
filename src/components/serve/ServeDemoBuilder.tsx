'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, Check, ChevronDown, Plus, Minus, ShoppingBag,
  Store, Truck, Megaphone, Cake, Package, Sparkles, Upload, X,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   Attenda Serve — Demo Builder (/serve/demo)
   Prospect answers 4 quick steps → sees their OWN storefront
   live, places a test order, sees the WhatsApp workflow, the
   admin panel and what Digital Pass (Growth) adds.
   Demo state lives in localStorage with a 24h trial timer.
   ──────────────────────────────────────────────────────────── */

const INK = '#15202B';
const NAVY = '#1B1F3B';
const CREAM = '#F3F0E6';
const PAPER = '#FFFFFF';
const TEAL = '#2BB8B2';
const TEAL_INK = '#0E5F5B';
const WA_GREEN = '#25D366';

const SHADOW = '4px 4px 0 var(--sv-ink, #15202B)';
const SHADOW_SM = '2px 2px 0 var(--sv-ink, #15202B)';

type Product = { name: string; price: number };
type Order = { items: { name: string; qty: number; price: number }[]; total: number; ts: number; status: string };
type Draft = {
  name: string;
  type: string;
  city: string;
  phone: string;
  email: string;
  logo: string | null;
  products: Product[];
};

const STORAGE_KEY = 'attenda-serve-demo-v1';
const TRIAL_MS = 24 * 60 * 60 * 1000;

const TYPES = [
  { icon: Store, label: 'Restaurante', tmpl: [{ name: 'Plato fuerte', price: 25.9 }, { name: 'Entrada', price: 12.5 }, { name: 'Bebida', price: 6.9 }] },
  { icon: Truck, label: 'Comida desde casa', tmpl: [{ name: 'Almuerzo del día', price: 15.0 }, { name: 'Sopa casera', price: 8.0 }, { name: 'Jugo natural', price: 6.0 }] },
  { icon: Cake, label: 'Pastelería', tmpl: [{ name: 'Torta de chocolate', price: 45.0 }, { name: 'Cupcakes x6', price: 18.0 }, { name: 'Cheesecake slice', price: 12.0 }] },
  { icon: ShoppingBag, label: 'Tienda / productos', tmpl: [{ name: 'Producto estrella', price: 39.9 }, { name: 'Combo pack', price: 24.9 }, { name: 'Detalle', price: 9.9 }] },
  { icon: Megaphone, label: 'Vendedor independiente', tmpl: [{ name: 'Servicio básico', price: 30.0 }, { name: 'Servicio completo', price: 60.0 }, { name: 'Adicional', price: 15.0 }] },
  { icon: Package, label: 'Otro', tmpl: [{ name: 'Producto 1', price: 20.0 }, { name: 'Producto 2', price: 15.0 }, { name: 'Producto 3', price: 10.0 }] },
];

const money = (n: number) => `S/ ${n.toFixed(2)}`;

function loadDemo(): { draft: Draft; ts: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { draft: Draft; ts: number };
    if (!p?.draft?.name || !p?.ts) return null;
    if (Date.now() - p.ts > TRIAL_MS) return null;
    return p;
  } catch { return null; }
}

export default function ServeDemoBuilder() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [createdTs, setCreatedTs] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<'tienda' | 'whatsapp' | 'admin' | 'pass'>('tienda');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(Date.now());
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const d = loadDemo();
    if (d) { setDraft(d.draft); setCreatedTs(d.ts); }
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const persist = (d: Draft) => {
    const ts = createdTs ?? Date.now();
    setCreatedTs(ts);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ draft: d, ts })); } catch {}
  };

  const update = (patch: Partial<Draft>) => {
    if (!draft) return;
    const d = { ...draft, ...patch };
    setDraft(d); persist(d);
  };

  const patchDraft = (patch: Partial<Draft>) => {
    setDraft((d) => ({ name: '', type: '', city: '', phone: '', email: '', logo: null, products: [], ...(d || {}), ...patch }));
  };

  const hoursLeft = createdTs ? Math.max(0, (createdTs + TRIAL_MS - now) / 3600000) : 24;
  const trialLabel = `${Math.floor(hoursLeft)}h ${Math.round((hoursLeft % 1) * 60)}m`;

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = useMemo(() =>
    (draft?.products || []).reduce((acc, p, i) => acc + (cart[i] || 0) * p.price, 0), [cart, draft]);

  const placeOrder = () => {
    if (!draft || totalItems === 0) return;
    const items = draft.products
      .map((p, i) => ({ name: p.name, qty: cart[i] || 0, price: p.price }))
      .filter((it) => it.qty > 0);
    const order: Order = { items, total: cartTotal, ts: Date.now(), status: 'Recibido' };
    setOrders((o) => [order, ...o]);
    setCart({});
    setTab('whatsapp');
  };

  const advanceOrder = (idx: number) => {
    setOrders((os) => os.map((o, i) => i === idx
      ? { ...o, status: o.status === 'Recibido' ? 'Preparando' : o.status === 'Preparando' ? 'Listo' : 'Entregado' }
      : o));
  };

  const startDemo = () => {
    if (!draft) return;
    setCreatedTs(Date.now());
    persist(draft);
    // Non-blocking lead email so the team can activate them after the trial
    if (draft.email) {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({
          type: 'serve_seller_inquiry',
          data: {
            businessName: draft.name,
            sellerType: draft.type,
            contactName: `Lead demo — ${draft.name}`,
            contactEmail: draft.email,
            contactPhone: draft.phone,
            city: draft.city,
            message: `DEMO AUTOMÁTICA creada en /serve/demo — expira en 24h. Logo subido: ${draft.logo ? 'sí' : 'no'}. Productos: ${draft.products.map(p => p.name).join(', ')}`,
          },
        }),
      }).catch(() => {});
    }
    setStep(4);
  };

  const activate = async () => {
    if (!draft) return;
    setActivating(true);
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({
          type: 'serve_seller_inquiry',
          data: {
            businessName: draft.name,
            sellerType: draft.type,
            contactName: `ACTIVACIÓN — ${draft.name}`,
            contactEmail: draft.email || 'no-email@demo',
            contactPhone: draft.phone,
            city: draft.city,
            message: `El negocio probó su demo y pidió ACTIVAR. Creada: ${createdTs ? new Date(createdTs).toISOString() : '?'} — pedidos de prueba: ${orders.length}`,
          },
        }),
      });
      setActivated(true);
    } catch { /* keep the form visible for retry */ }
    setActivating(false);
  };

  /* ── WIZARD ─────────────────────────────────────────────── */
  if (!draft || step < 4) {
    const inputCls = 'w-full rounded-xl px-4 py-3 text-[15px] font-medium outline-none border-2 bg-transparent placeholder:opacity-50';
    const labelCls = 'text-[11px] font-bold uppercase tracking-wider block mb-1.5';
    return (
      <div className="min-h-screen font-sans antialiased" style={{ backgroundColor: CREAM, color: INK, ['--sv-ink' as string]: INK }}>
        <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
          <Link href="/serve" className="inline-flex items-center gap-2 text-[13px] font-bold" style={{ color: '#5a6168' }}>
            <ArrowLeft size={15} /> Volver
          </Link>

          {/* progress */}
          <div className="mt-5 flex items-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full border-2"
                style={{ borderColor: INK, backgroundColor: i <= step ? TEAL : PAPER }} />
            ))}
          </div>

          <div className="mt-8 rounded-2xl border-2 p-6 md:p-8" style={{ backgroundColor: PAPER, borderColor: INK, boxShadow: SHADOW }}>
            {step === 0 && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ fontFamily: 'IBM Plex Mono, monospace', color: TEAL_INK }}>
                  Paso 1 de 3 — Cuéntanos de tu negocio
                </div>
                <h1 className="mt-2 text-[26px] font-black leading-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>
                  ¿Cómo se llama tu negocio?
                </h1>
                <div className="mt-6">
                  <label className={labelCls} style={{ color: '#5a6168' }}>Nombre</label>
                  <input autoFocus value={draft?.name || ''} onChange={(e) => patchDraft({ name: e.target.value })}
                    placeholder="Fukin Vegan" className={inputCls} style={{ borderColor: INK, backgroundColor: CREAM }} />
                </div>
                <div className="mt-5">
                  <label className={labelCls} style={{ color: '#5a6168' }}>¿Qué vendes?</label>
                  <div className="grid grid-cols-2 gap-3">
                    {TYPES.map((t) => (
                      <button key={t.label} onClick={() => patchDraft({ type: t.label, products: draft?.type === t.label ? draft.products : t.tmpl })}
                        className="flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left text-[13px] font-extrabold transition-all"
                        style={{
                          borderColor: INK, fontFamily: 'Archivo, sans-serif',
                          backgroundColor: draft?.type === t.label ? TEAL : PAPER,
                          boxShadow: draft?.type === t.label ? SHADOW_SM : 'none',
                        }}>
                        <t.icon size={18} strokeWidth={2.25} /> {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button disabled={!draft?.name || !draft?.type} onClick={() => setStep(1)}
                  className="mt-7 w-full rounded-xl border-2 py-4 text-[16px] font-black transition-all disabled:opacity-40 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: `5px 5px 0 ${TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
                  Siguiente <ArrowRight size={17} className="inline" />
                </button>
              </>
            )}

            {step === 1 && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ fontFamily: 'IBM Plex Mono, monospace', color: TEAL_INK }}>
                  Paso 2 de 3 — Contacto
                </div>
                <h1 className="mt-2 text-[26px] font-black leading-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>
                  ¿Dónde recibimos los pedidos?
                </h1>
                <p className="mt-2 text-[13px] font-medium" style={{ color: '#5a6168' }}>
                  Tu WhatsApp queda conectado al flujo. Si dejas tu email, te avisamos cuando la demo esté por expirar.
                </p>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className={labelCls} style={{ color: '#5a6168' }}>WhatsApp</label>
                    <input value={draft?.phone || ''} onChange={(e) => patchDraft({ phone: e.target.value })}
                      placeholder="+51 999 999 999" className={inputCls} style={{ borderColor: INK, backgroundColor: CREAM }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} style={{ color: '#5a6168' }}>Ciudad</label>
                      <input value={draft?.city || ''} onChange={(e) => patchDraft({ city: e.target.value })}
                        placeholder="Lima" className={inputCls} style={{ borderColor: INK, backgroundColor: CREAM }} />
                    </div>
                    <div>
                      <label className={labelCls} style={{ color: '#5a6168' }}>Email (opcional)</label>
                      <input type="email" value={draft?.email || ''} onChange={(e) => patchDraft({ email: e.target.value })}
                        placeholder="tu@negocio.com" className={inputCls} style={{ borderColor: INK, backgroundColor: CREAM }} />
                    </div>
                  </div>
                </div>
                <div className="mt-7 flex gap-3">
                  <button onClick={() => setStep(0)} className="rounded-xl border-2 px-5 py-4 text-[14px] font-black" style={{ borderColor: INK, backgroundColor: PAPER }}>
                    <ArrowLeft size={16} />
                  </button>
                  <button onClick={() => setStep(2)}
                    className="flex-1 rounded-xl border-2 py-4 text-[16px] font-black transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: `5px 5px 0 ${TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
                    Siguiente <ArrowRight size={17} className="inline" />
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ fontFamily: 'IBM Plex Mono, monospace', color: TEAL_INK }}>
                  Paso 3 de 3 — Tu marca
                </div>
                <h1 className="mt-2 text-[26px] font-black leading-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>
                  Sube tu logo
                </h1>
                <p className="mt-2 text-[13px] font-medium" style={{ color: '#5a6168' }}>
                  Aparece en tu tienda y en tu pase digital. Puedes saltarlo y subirlo después.
                </p>
                <div className="mt-6 flex flex-col items-center">
                  {draft?.logo ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.logo} alt="Logo" className="h-24 w-24 rounded-2xl border-2 object-contain p-2" style={{ borderColor: INK, backgroundColor: CREAM }} />
                      <button onClick={() => patchDraft({ logo: null })}
                        className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2" style={{ backgroundColor: PAPER, borderColor: INK }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => logoInput.current?.click()}
                      className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed transition-all hover:-translate-y-0.5"
                      style={{ borderColor: INK, backgroundColor: CREAM }}>
                      <Upload size={22} style={{ color: TEAL_INK }} />
                      <span className="text-[10px] font-bold uppercase" style={{ color: '#5a6168' }}>Subir logo</span>
                    </button>
                  )}
                  <input ref={logoInput} type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const r = new FileReader();
                      r.onload = () => patchDraft({ logo: String(r.result) });
                      r.readAsDataURL(f);
                    }} />
                </div>
                <div className="mt-7 flex gap-3">
                  <button onClick={() => setStep(1)} className="rounded-xl border-2 px-5 py-4 text-[14px] font-black" style={{ borderColor: INK, backgroundColor: PAPER }}>
                    <ArrowLeft size={16} />
                  </button>
                  <button onClick={() => setStep(3)}
                    className="flex-1 rounded-xl border-2 py-4 text-[16px] font-black transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: `5px 5px 0 ${TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
                    Siguiente <ArrowRight size={17} className="inline" />
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ fontFamily: 'IBM Plex Mono, monospace', color: TEAL_INK }}>
                  Último paso — Tu menú
                </div>
                <h1 className="mt-2 text-[26px] font-black leading-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>
                  ¿Qué vas a vender?
                </h1>
                <p className="mt-2 text-[13px] font-medium" style={{ color: '#5a6168' }}>
                  Te dejamos una base según tu giro. Edítala aquí o después desde tu panel.
                </p>
                <div className="mt-5 space-y-3">
                  {(draft?.products || []).map((p, i) => (
                    <div key={i} className="flex gap-3">
                      <input value={p.name} onChange={(e) => {
                        const name = e.target.value;
                        setDraft(d => d ? { ...d, products: d.products.map((pp, j) => j === i ? { ...pp, name } : pp) } : d);
                      }} placeholder={`Producto ${i + 1}`} className={`${inputCls} flex-1`} style={{ borderColor: INK, backgroundColor: CREAM }} />
                      <div className="flex items-center rounded-xl border-2 px-2" style={{ borderColor: INK, backgroundColor: CREAM }}>
                        <span className="text-[12px] font-bold">S/</span>
                        <input value={p.price} inputMode="decimal"
                          onChange={(e) => {
                            const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                            setDraft(d => d ? { ...d, products: d.products.map((pp, j) => j === i ? { ...pp, price: v } : pp) } : d);
                          }}
                          className="w-16 bg-transparent px-2 py-3 text-[14px] font-bold outline-none" />
                      </div>
                      {(draft?.products.length || 0) > 1 && (
                        <button onClick={() => patchDraft({ products: (draft?.products || []).filter((_, j) => j !== i) })}
                          className="px-2" style={{ color: '#5a6168' }}><X size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>
                {(draft?.products.length || 0) < 6 && (
                  <button onClick={() => patchDraft({ products: [...(draft?.products || []), { name: '', price: 10 }] })}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-[13px] font-extrabold"
                    style={{ borderColor: INK, backgroundColor: PAPER }}>
                    <Plus size={15} /> Agregar producto
                  </button>
                )}
                <div className="mt-7 flex gap-3">
                  <button onClick={() => setStep(2)} className="rounded-xl border-2 px-5 py-4 text-[14px] font-black" style={{ borderColor: INK, backgroundColor: PAPER }}>
                    <ArrowLeft size={16} />
                  </button>
                  <button disabled={!draft?.products.some(p => p.name)} onClick={startDemo}
                    className="flex-1 rounded-xl border-2 py-4 text-[16px] font-black transition-all disabled:opacity-40 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: `5px 5px 0 ${TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
                    Crear mi demo gratis <Sparkles size={17} className="inline" />
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="mt-5 text-center text-[12px] font-medium" style={{ color: '#5a6168' }}>
            Demo gratis por 24 horas · Sin tarjeta · 0% comisión
          </p>
        </div>
      </div>
    );
  }

  /* ── LIVE PREVIEW ───────────────────────────────────────── */
  const waText = useMemo(() => {
    const lines = orders[0]?.items.map((it) => `• ${it.qty}x ${it.name} — S/ ${(it.qty * it.price).toFixed(2)}`).join('\n') || '';
    return `*${draft.name.toUpperCase()}* — NUEVO PEDIDO\n━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━\n*TOTAL: S/ ${(orders[0]?.total || 0).toFixed(2)}*\nPago: Yape`;
  }, [orders, draft]);

  const totalRevenue = orders.reduce((a, o) => a + o.total, 0);
  const points = orders.reduce((a, o) => a + o.items.reduce((x, it) => x + it.qty, 0), 0);

  return (
    <div className="min-h-screen font-sans antialiased pb-24" style={{ backgroundColor: NAVY, color: INK, ['--sv-ink' as string]: INK }}>
      {/* top bar */}
      <div className="sticky top-0 z-40 border-b-2" style={{ borderColor: INK, backgroundColor: NAVY }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/serve" className="flex items-center gap-2 text-[13px] font-bold text-white/80">
            <ArrowLeft size={15} /> Attenda Serve
          </Link>
          <div className="flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-[11px] font-bold text-white"
            style={{ borderColor: 'rgba(243,240,230,0.35)' }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEAL }} />
            Demo activa · expira en {trialLabel}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-8">
        {/* ready banner */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-black uppercase tracking-wider"
            style={{ backgroundColor: TEAL, color: INK, fontFamily: 'IBM Plex Mono, monospace' }}>
            <Check size={14} strokeWidth={3} /> Tu canal está listo
          </div>
          <h1 className="mt-4 text-[30px] font-black leading-tight text-white md:text-[38px]" style={{ fontFamily: 'Archivo, sans-serif' }}>
            {draft.name}, así se ve <span style={{ color: TEAL }}>tu negocio online.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] font-medium text-white/70">
            Haz un pedido de prueba, mira cómo llega a tu WhatsApp y cómo lo cumples desde el panel. Todo es tuyo.
          </p>
        </div>

        {/* tabs */}
        <div className="mt-8 flex justify-center gap-2">
          {([['tienda', 'Mi tienda'], ['whatsapp', 'WhatsApp'], ['admin', 'Panel'], ['pass', 'Digital Pass']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className="rounded-full border-2 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wide transition-all"
              style={{
                borderColor: INK, fontFamily: 'IBM Plex Mono, monospace',
                backgroundColor: tab === k ? TEAL : 'rgba(243,240,230,0.12)',
                color: tab === k ? INK : 'rgba(243,240,230,0.8)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* TAB — STOREFRONT */}
        {tab === 'tienda' && (
          <div className="mt-8 flex justify-center">
            <div className="w-[300px] rounded-[36px] border-2 p-2.5" style={{ backgroundColor: INK, borderColor: INK, boxShadow: `8px 8px 0 #0E1230` }}>
              <div className="overflow-hidden rounded-[28px]" style={{ backgroundColor: '#0b0b0b' }}>
                <div className="flex h-7 items-center justify-center">
                  <div className="h-1.5 w-20 rounded-full" style={{ backgroundColor: '#2a2a2a' }} />
                </div>
                <div className="flex items-center justify-between border-b px-4 pb-3 pt-2" style={{ borderColor: '#1e1e1e' }}>
                  <div className="flex items-center gap-2">
                    {draft.logo
                      ? // eslint-disable-next-line @next/next/no-img-element
                        <img src={draft.logo} alt="" className="h-6 w-6 rounded-md object-contain" />
                      : <span className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black text-white" style={{ backgroundColor: '#F36A12' }}>{draft.name[0]}</span>}
                    <span className="text-[13px] font-extrabold text-white" style={{ fontFamily: 'Archivo, sans-serif' }}>{draft.name.toUpperCase()}</span>
                  </div>
                  <div className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: TEAL }}>
                    {draft.city?.toUpperCase() || 'ONLINE'} · 20-35 MIN
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3">
                  {draft.products.map((p, i) => (
                    <div key={i} className="overflow-hidden rounded-xl border" style={{ borderColor: '#1e1e1e' }}>
                      <div className="h-14" style={{ backgroundColor: i % 2 === 0 ? '#f2ede2' : '#e9e4d8' }} />
                      <div className="p-2">
                        <div className="text-[10px] font-bold leading-tight text-white">{p.name}</div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[10px] font-black" style={{ color: TEAL }}>S/ {p.price.toFixed(2)}</span>
                          {cart[i] ? (
                            <span className="flex items-center gap-1.5">
                              <button onClick={() => setCart(c => ({ ...c, [i]: Math.max(0, (c[i] || 0) - 1) }))}
                                className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: '#333' }}>
                                <Minus size={10} />
                              </button>
                              <span className="text-[11px] font-bold text-white">{cart[i]}</span>
                            </span>
                          ) : null}
                          <button onClick={() => setCart(c => ({ ...c, [i]: (c[i] || 0) + 1 }))}
                            className="flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold" style={{ backgroundColor: '#F36A12', color: '#fff' }}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-3">
                  <button onClick={placeOrder} disabled={totalItems === 0}
                    className="w-full rounded-xl py-3 text-[12px] font-bold text-white transition-all disabled:opacity-40"
                    style={{ backgroundColor: '#F36A12' }}>
                    {totalItems > 0 ? `Hacer pedido · S/ ${cartTotal.toFixed(2)}` : 'Toca + para agregar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB — WHATSAPP */}
        {tab === 'whatsapp' && (
          <div className="mt-8 flex justify-center">
            <div className="w-[300px] rounded-[36px] border-2 p-2.5" style={{ backgroundColor: INK, borderColor: INK, boxShadow: `8px 8px 0 #0E1230` }}>
              <div className="overflow-hidden rounded-[28px]">
                <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: '#075E54' }}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white" style={{ backgroundColor: WA_GREEN }}>
                    {draft.name[0]}
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-white">{draft.name}</div>
                    <div className="text-[9px] text-white/70">tu equipo de pedidos</div>
                  </div>
                </div>
                <div className="space-y-2 p-3" style={{ backgroundColor: '#ECE5DD', minHeight: 260 }}>
                  {orders.length === 0 && (
                    <div className="rounded-xl p-3 text-[11px] font-medium" style={{ backgroundColor: '#fff' }}>
                      Aquí llega cada pedido con todo el detalle, listo para cumplir. Haz uno en la pestaña <strong>Mi tienda</strong>.
                    </div>
                  )}
                  {orders.map((o, i) => (
                    <div key={o.ts + '-' + i} className="ml-auto max-w-[85%] rounded-xl p-3 text-[10px] font-medium leading-relaxed whitespace-pre-line"
                      style={{ backgroundColor: '#DCF8C6', color: '#111' }}>
                      {`*${draft.name.toUpperCase()}* — NUEVO PEDIDO\n━━━━━━━━━━━━━\n${o.items.map((it) => `• ${it.qty}x ${it.name} — S/ ${(it.qty * it.price).toFixed(2)}`).join('\n')}\n━━━━━━━━━━━━━\n*TOTAL: S/ ${o.total.toFixed(2)}*\nPago: Yape`}
                    </div>
                  ))}
                  {orders[0] && (
                    <div className="text-right text-[9px] font-bold" style={{ color: '#4a7c59' }}>Enviado a tu WhatsApp ✓✓</div>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-[12px] font-medium text-white/60 max-w-[280px]">
              Tu equipo no aprende nada nuevo: el pedido llega formateado a WhatsApp y lo cumplen como siempre.
            </p>
          </div>
        )}

        {/* TAB — ADMIN */}
        {tab === 'admin' && (
          <div className="mx-auto mt-8 max-w-md">
            <div className="rounded-2xl border-2 p-5" style={{ backgroundColor: PAPER, borderColor: INK, boxShadow: SHADOW }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>Pedidos de prueba</div>
                  <div className="text-[22px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>{orders.length}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold uppercase" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>Ventas</div>
                  <div className="text-[22px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>S/ {totalRevenue.toFixed(2)}</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {orders.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed p-4 text-center text-[12px] font-medium" style={{ borderColor: INK, color: '#5a6168' }}>
                    Tu primer pedido de prueba aparecerá aquí.
                  </div>
                )}
                {orders.map((o, i) => (
                  <div key={o.ts + '-' + i} className="flex items-center justify-between rounded-xl border-2 px-3 py-2.5" style={{ borderColor: INK, backgroundColor: CREAM }}>
                    <div>
                      <div className="text-[12px] font-extrabold">{o.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}</div>
                      <div className="text-[11px] font-bold" style={{ color: TEAL_INK }}>S/ {o.total.toFixed(2)}</div>
                    </div>
                    <button onClick={() => advanceOrder(i)}
                      className="rounded-lg border-2 px-3 py-1.5 text-[11px] font-black transition-all active:translate-x-[1px] active:translate-y-[1px]"
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace', borderColor: INK,
                        backgroundColor: o.status === 'Listo' ? TEAL : PAPER,
                      }}>
                      {o.status === 'Recibido' ? 'Recibido →' : o.status === 'Preparando' ? 'Preparando →' : 'Listo ✓'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-center text-[12px] font-medium text-white/70">
              Cada pedido cambia de estado con un toque — cocina, reparto y staff ven solo su parte.
            </p>
          </div>
        )}

        {/* TAB — DIGITAL PASS */}
        {tab === 'pass' && (
          <div className="mt-8 flex flex-col items-center">
            <div className="relative w-[300px] overflow-hidden rounded-2xl border-2 text-white" style={{ borderColor: INK, backgroundColor: '#111827', boxShadow: `8px 8px 0 #0E1230` }}>
              <div className="flex items-center justify-between px-4 pt-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ fontFamily: 'IBM Plex Mono, monospace', color: TEAL }}>
                  {draft.name.toUpperCase()} · MIEMBRO
                </span>
                {draft.logo
                  ? // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.logo} alt="" className="h-6 w-6 rounded-md object-contain" />
                  : <span className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black" style={{ backgroundColor: TEAL, color: INK }}>{draft.name[0]}</span>}
              </div>
              <div className="px-4 pb-5 pt-6">
                <div className="text-[13px] font-bold text-white/70">Puntos</div>
                <div className="text-[44px] font-black leading-none text-white" style={{ fontFamily: 'Archivo, sans-serif' }}>{points}</div>
                <div className="mt-3 text-[11px] font-medium text-white/60">
                  Miembro de {draft.name} · gana 1 punto por producto
                </div>
                <div className="mt-4 rounded-lg border border-white/20 bg-white/5 p-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                  ◌◌◌◌◌◌◌◌ · pase digital
                </div>
              </div>
            </div>
            <div className="mx-auto mt-5 max-w-md rounded-2xl border-2 p-5" style={{ backgroundColor: PAPER, borderColor: INK, boxShadow: SHADOW }}>
              <div className="text-[14px] font-extrabold" style={{ fontFamily: 'Archivo, sans-serif' }}>Esto es Growth.</div>
              <p className="mt-2 text-[13px] font-medium leading-relaxed" style={{ color: '#5a6168' }}>
                Con Digital Pass tus clientes se vuelven miembros de <strong>{draft.name}</strong>: puntos, recompensas y mensajes
                directos — sin depender del algoritmo de nadie.
              </p>
              <Link href="/serve#precios"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 px-5 py-3 text-[14px] font-black transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: SHADOW_SM, fontFamily: 'Archivo, sans-serif' }}>
                Activar Growth <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* sticky activation bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 px-4 pb-4 pt-3" style={{ borderColor: INK, backgroundColor: CREAM }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          {activated ? (
            <div className="flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3" style={{ borderColor: INK, backgroundColor: '#E8F5E9' }}>
              <Check size={18} style={{ color: '#2E7D32' }} />
              <span className="text-[13px] font-extrabold">¡Listo! Te contactamos para activar {draft.name}.</span>
            </div>
          ) : (
            <>
              <div className="hidden text-[12px] font-bold sm:block" style={{ color: '#5a6168' }}>
                ¿Te gusta lo que ves? Actívalo de verdad.
              </div>
              <button onClick={activate} disabled={activating}
                className="flex-1 rounded-xl border-2 py-3.5 text-[15px] font-black transition-all disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none sm:flex-none sm:px-8"
                style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: `4px 4px 0 ${TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
                {activating ? 'Enviando…' : 'Activar mi negocio →'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
