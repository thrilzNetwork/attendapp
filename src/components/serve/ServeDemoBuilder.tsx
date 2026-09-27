'use client';

/* Attenda Serve — demo/tenant wizard.
   Creates a REAL tenant via POST /api/serve/tenant (server-backed, same
   system for demo and official). Routes to their own 3-surface site. */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { track } from '@/lib/serve/analytics';
import {
  ArrowRight, ArrowLeft, Plus, ShoppingBag, Store, Truck,
  Megaphone, Cake, Package, Sparkles, Upload, X,
} from 'lucide-react';

const INK = '#15202B';
const CREAM = '#F3F0E6';
const PAPER = '#FFFFFF';
const TEAL = '#2BB8B2';
const TEAL_INK = '#0E5F5B';
const SHADOW = '4px 4px 0 var(--sv-ink, #15202B)';

type WizardProduct = { name: string; price: number };

const TYPES = [
  { icon: Store, label: 'Restaurante', tmpl: [{ name: 'Plato fuerte', price: 25.9 }, { name: 'Entrada', price: 12.5 }, { name: 'Bebida', price: 6.9 }] },
  { icon: Truck, label: 'Comida desde casa', tmpl: [{ name: 'Almuerzo del día', price: 15 }, { name: 'Sopa casera', price: 8 }, { name: 'Jugo natural', price: 6 }] },
  { icon: Cake, label: 'Pastelería', tmpl: [{ name: 'Torta de chocolate', price: 45 }, { name: 'Cupcakes x6', price: 18 }, { name: 'Cheesecake slice', price: 12 }] },
  { icon: ShoppingBag, label: 'Tienda / productos', tmpl: [{ name: 'Producto estrella', price: 39.9 }, { name: 'Combo pack', price: 24.9 }, { name: 'Detalle', price: 9.9 }] },
  { icon: Megaphone, label: 'Vendedor independiente', tmpl: [{ name: 'Servicio básico', price: 30 }, { name: 'Servicio completo', price: 60 }, { name: 'Adicional', price: 15 }] },
  { icon: Package, label: 'Otro', tmpl: [{ name: 'Producto 1', price: 20 }, { name: 'Producto 2', price: 15 }, { name: 'Producto 3', price: 10 }] },
];

const DONE_KEY = 'attd_serve_wizard_last';

export default function ServeDemoBuilder() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('PE');
  const [logo, setLogo] = useState<string | null>(null);
  const [products, setProducts] = useState<WizardProduct[]>([]);
  const [logoRef, setLogoRef] = useState<HTMLInputElement | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [lastTenant, setLastTenant] = useState<{ id: string; adminPin: string } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DONE_KEY);
      if (raw) setLastTenant(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const inputCls = 'w-full rounded-xl px-4 py-3 text-[15px] font-medium outline-none border-2 bg-transparent placeholder:opacity-50';
  const labelCls = 'text-[11px] font-bold uppercase tracking-wider block mb-1.5';

  const createDemo = async () => {
    if (!name.trim() || creating) return;
    track('demo_started');
    setCreating(true);
    setErr('');
    try {
      const res = await fetch('/api/serve/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type: type || 'Negocio local',
          city: city.trim(),
          phone: phone.trim(),
          email: email.trim(),
          logo,
          products: products.filter((p) => p.name.trim()),
          status: 'demo',
          country,
          referralCode: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') || undefined : undefined,
          plan: 'starter',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Error');
      track('demo_completed', { tenantId: data.tenant.id });
      const t = { id: data.tenant.id as string, adminPin: data.tenant.adminPin as string };
      try { window.localStorage.setItem(DONE_KEY, JSON.stringify(t)); } catch {}
      // lead email (non-blocking) — team contacts them at the 24h activation moment
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({
          type: 'serve_seller_inquiry',
          data: {
            businessName: name.trim(),
            sellerType: type,
            contactName: `Lead demo — ${name.trim()}`,
            contactEmail: email.trim() || 'no-email@demo',
            contactPhone: phone.trim(),
            city: city.trim(),
            message: `DEMO CREADA (server tenant ${t.id}, PIN ${t.adminPin}). Logo: ${logo ? 'sí' : 'no'}. Productos: ${products.filter((p) => p.name.trim()).map((p) => p.name).join(', ')}`,
          },
        }),
      }).catch(() => {});
      router.push(`/serve/demo/${t.id}?pin=${t.adminPin}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error creando la demo');
      setCreating(false);
    }
  };

  if (!ready) return <div className="min-h-screen" style={{ backgroundColor: CREAM }} />;

  return (
    <div className="min-h-screen font-sans antialiased" style={{ backgroundColor: CREAM, color: INK, ['--sv-ink' as string]: INK }}>
      <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
        <Link href="/serve" className="inline-flex items-center gap-2 text-[13px] font-bold" style={{ color: '#5a6168' }}>
          <ArrowLeft size={15} /> Volver
        </Link>

        {lastTenant && (
          <Link href={`/serve/demo/${lastTenant.id}`}
            className="mt-4 flex items-center justify-between rounded-xl border-2 px-4 py-3 text-[13px] font-extrabold"
            style={{ borderColor: INK, backgroundColor: PAPER }}>
            <span>Ver tu última demo <span className="font-mono text-[11px] opacity-60">PIN {lastTenant.adminPin}</span></span>
            <ArrowRight size={15} />
          </Link>
        )}

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
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre de tu negocio" className={inputCls} style={{ borderColor: INK, backgroundColor: CREAM }} />
              </div>
              <div className="mt-5">
                <label className={labelCls} style={{ color: '#5a6168' }}>¿Qué vendes?</label>
                <div className="grid grid-cols-2 gap-3">
                  {TYPES.map((t) => (
                    <button key={t.label} onClick={() => { setType(t.label); if (products.length === 0) setProducts(t.tmpl.map((x) => ({ ...x }))); }}
                      className="flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left text-[13px] font-extrabold transition-all"
                      style={{
                        borderColor: INK, fontFamily: 'Archivo, sans-serif',
                        backgroundColor: type === t.label ? TEAL : PAPER,
                        boxShadow: type === t.label ? '2px 2px 0 var(--sv-ink, #15202B)' : 'none',
                      }}>
                      <t.icon size={18} strokeWidth={2.25} /> {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <button disabled={!name || !type} onClick={() => setStep(1)}
                className="mt-7 w-full rounded-xl border-2 py-4 text-[16px] font-black transition-all disabled:opacity-40 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: '5px 5px 0 var(--sv-ink, #0E5F5B)', fontFamily: 'Archivo, sans-serif' }}>
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
                  <input value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+51 999 999 999" className={inputCls} style={{ borderColor: INK, backgroundColor: CREAM }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} style={{ color: '#5a6168' }}>Ciudad</label>
                    <input value={city} onChange={(e) => setCity(e.target.value)}
                      placeholder="Lima" className={inputCls} style={{ borderColor: INK, backgroundColor: CREAM }} />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: '#5a6168' }}>País</label>
                    <select value={country} onChange={(e) => setCountry(e.target.value)}
                      className={inputCls} style={{ borderColor: INK, backgroundColor: CREAM }}>
                      <option value="PE">Perú</option>
                      <option value="BO">Bolivia</option>
                      <option value="CO">Colombia</option>
                      <option value="EC">Ecuador</option>
                      <option value="MX">México</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: '#5a6168' }}>Email (opcional)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
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
                  style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: '5px 5px 0 var(--sv-ink, #0E5F5B)', fontFamily: 'Archivo, sans-serif' }}>
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
                Aparece en tu tienda, tu landing y tu pase digital. Puedes saltarlo y subirlo después.
              </p>
              <div className="mt-6 flex flex-col items-center">
                {logo ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt="Logo" className="h-24 w-24 rounded-2xl border-2 object-contain p-2" style={{ borderColor: INK, backgroundColor: CREAM }} />
                    <button onClick={() => setLogo(null)}
                      className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2" style={{ backgroundColor: PAPER, borderColor: INK }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => logoRef?.click()}
                    className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed transition-all hover:-translate-y-0.5"
                    style={{ borderColor: INK, backgroundColor: CREAM }}>
                    <Upload size={22} style={{ color: TEAL_INK }} />
                    <span className="text-[10px] font-bold uppercase" style={{ color: '#5a6168' }}>Subir logo</span>
                  </button>
                )}
                <input ref={setLogoRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setLogo(String(r.result));
                    r.readAsDataURL(f);
                  }} />
              </div>
              <div className="mt-7 flex gap-3">
                <button onClick={() => setStep(1)} className="rounded-xl border-2 px-5 py-4 text-[14px] font-black" style={{ borderColor: INK, backgroundColor: PAPER }}>
                  <ArrowLeft size={16} />
                </button>
                <button onClick={() => setStep(3)}
                  className="flex-1 rounded-xl border-2 py-4 text-[16px] font-black transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: '5px 5px 0 var(--sv-ink, #0E5F5B)', fontFamily: 'Archivo, sans-serif' }}>
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
                {products.map((p, i) => (
                  <div key={i} className="flex gap-3">
                    <input value={p.name} onChange={(e) => {
                      const v = e.target.value;
                      setProducts((ps) => ps.map((pp, j) => (j === i ? { ...pp, name: v } : pp)));
                    }} placeholder={`Producto ${i + 1}`} className={`${inputCls} flex-1`} style={{ borderColor: INK, backgroundColor: CREAM }} />
                    <div className="flex items-center rounded-xl border-2 px-2" style={{ borderColor: INK, backgroundColor: CREAM }}>
                      <span className="text-[12px] font-bold">S/</span>
                      <input value={p.price} inputMode="decimal"
                        onChange={(e) => {
                          const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                          setProducts((ps) => ps.map((pp, j) => (j === i ? { ...pp, price: v } : pp)));
                        }}
                        className="w-16 bg-transparent px-2 py-3 text-[14px] font-bold outline-none" />
                    </div>
                    {products.length > 1 && (
                      <button onClick={() => setProducts((ps) => ps.filter((_, j) => j !== i))}
                        className="px-2" style={{ color: '#5a6168' }}><X size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
              {products.length < 6 && (
                <button onClick={() => setProducts((ps) => [...ps, { name: '', price: 10 }])}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-[13px] font-extrabold"
                  style={{ borderColor: INK, backgroundColor: PAPER }}>
                  <Plus size={15} /> Agregar producto
                </button>
              )}
              <div className="mt-7 flex gap-3">
                <button onClick={() => setStep(2)} className="rounded-xl border-2 px-5 py-4 text-[14px] font-black" style={{ borderColor: INK, backgroundColor: PAPER }}>
                  <ArrowLeft size={16} />
                </button>
                <button disabled={!products.some((p) => p.name.trim())} onClick={createDemo}
                  className="flex-1 rounded-xl border-2 py-4 text-[16px] font-black transition-all disabled:opacity-40 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: '5px 5px 0 var(--sv-ink, #0E5F5B)', fontFamily: 'Archivo, sans-serif' }}>
                  {creating ? 'Creando…' : <>Crear mi demo gratis <Sparkles size={17} className="inline" /></>}
                </button>
              </div>
              {err && <p className="mt-3 text-center text-[13px] font-bold" style={{ color: '#B4231F' }}>{err}</p>}
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