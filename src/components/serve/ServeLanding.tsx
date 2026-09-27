'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Check, ChevronDown, Megaphone, ShoppingBag, Store, Truck, Users, Wallet, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

/* ──────────────────────────────────────────────────────────── */
/*  Attenda Serve — brand tokens (neobrutalist product identity) */
/*  Approved look: cream page, ink borders, offset shadows,     */
/*  Archivo 900 headlines, Plex Mono labels, turquoise accent.  */
/* ──────────────────────────────────────────────────────────── */

const INK = '#15202B';
const NAVY = '#1B1F3B';
const CREAM = '#F3F0E6';
const PAPER = '#FFFFFF';
const TEAL = '#2BB8B2';
const TEAL_INK = '#0E5F5B';

const SHADOW = '4px 4px 0 var(--sv-ink, #15202B)';
const SHADOW_SM = '2px 2px 0 var(--sv-ink, #15202B)';

/* ──────────────────────────────────────────────────────────── */
/*  Section 2 — seller-type cards                               */
/* ──────────────────────────────────────────────────────────── */

const SELLER_TYPES: { icon?: typeof Store; label: string }[] = [
  { icon: Store, label: 'Restaurante' },
  { icon: Truck, label: 'Comida desde casa' },
  { icon: ShoppingBag, label: 'Pastelería' },
  { icon: Megaphone, label: 'Tienda / productos' },
  { icon: Users, label: 'Vendedor independiente' },
  { label: 'Otro' },
];

/* ──────────────────────────────────────────────────────────── */
/*  Section 4 — what every merchant receives                    */
/* ──────────────────────────────────────────────────────────── */

const MODULES = [
  { icon: Store, name: 'Tu propia página para vender', desc: 'Storefront con tu marca, tu catálogo y tu URL. Lista el mismo día.' },
  { icon: ShoppingBag, name: 'Pedidos online organizados', desc: 'Carrito, checkout y estados claros. Se acabó perder pedidos entre mensajes.' },
  { icon: Wallet, name: 'Pagos adaptados a tu mercado', desc: 'Yape, Plin, QR, transferencia o efectivo — cobras como ya cobra tu mercado.' },
  { icon: Truck, name: 'Tu WhatsApp conectado al pedido', desc: 'Cada pedido llega a tu WhatsApp con los detalles listos para cumplirlo.' },
  { icon: Megaphone, name: 'Controla tu negocio desde un panel', desc: 'Pedidos, catálogo, disponibilidad y ajustes — todo tu negocio en un panel.' },
  { icon: Users, name: 'Dale a tu equipo solo lo que necesita', desc: 'Vistas para cocina, reparto y staff. Cada quien ve solo su parte.' },
];

/* ──────────────────────────────────────────────────────────── */
/*  Mono label chip                                             */
/* ──────────────────────────────────────────────────────────── */

function MonoTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.08em] uppercase"
      style={{ backgroundColor: NAVY, color: CREAM, fontFamily: 'IBM Plex Mono, monospace' }}>
      {children}
    </span>
  );
}

export default function ServeLanding() {
  const [scrolled, setScrolled] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen font-sans antialiased overflow-x-hidden"
      style={{ backgroundColor: CREAM, color: INK, ['--sv-ink' as string]: INK }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b-2 transition-colors"
        style={{ borderColor: INK, backgroundColor: scrolled ? 'rgba(243,240,230,0.95)' : CREAM, backdropFilter: scrolled ? 'blur(8px)' : undefined }}>
        <div className="max-w-7xl mx-auto px-4 md:px-5 h-14 md:h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/brand/logo-primary.svg" alt="Attenda" className="h-6 sm:h-7 md:h-8 w-auto" />
            <span className="hidden sm:block w-px h-5" style={{ backgroundColor: INK }} aria-hidden />
            <span className="hidden sm:block text-[16px] font-black tracking-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>
              Serve
            </span>
          </a>
          <div className="flex items-center gap-5">
            <a href="#como-funciona" className="hidden md:block text-[13px] font-bold uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace', color: INK }}>Cómo funciona</a>
            <a href="#fukin-vegan" className="hidden md:block text-[13px] font-bold uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace', color: INK }}>Fukin Vegan</a>
            <a href="/staff" className="hidden md:block text-[13px] font-bold uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace', color: INK }}>Entrar</a>
            <button onClick={() => scrollTo(formRef)}
              className="px-4 py-2 rounded-xl text-[13px] font-black border-2 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: SHADOW_SM, fontFamily: 'Archivo, sans-serif' }}>
              Crear mi demo gratis
            </button>
          </div>
        </div>
      </nav>

      {/* ── SECTION 1 — HERO ────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-2" style={{ borderColor: INK, backgroundColor: NAVY }}>
        {/* graph-paper grid */}
        <div aria-hidden className="absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: 'linear-gradient(rgba(243,240,230,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(243,240,230,.5) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        {/* teal glow */}
        <div aria-hidden className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, ${TEAL} 0%, transparent 65%)` }} />

        <div className="relative max-w-7xl mx-auto px-4 md:px-5 pt-14 pb-16 md:pt-24 md:pb-28">
          <div className="max-w-3xl">
            <div className="mb-6">
              <MonoTag>Attenda Technologies presenta</MonoTag>
            </div>

            <h1 className="font-black tracking-tight text-[36px] leading-[1.02] md:text-[64px] md:leading-[0.98] text-white"
              style={{ fontFamily: 'Archivo, sans-serif' }}>
              TU NEGOCIO. <span style={{ color: TEAL }}>TU CANAL.</span> TUS CLIENTES.
            </h1>

            <p className="mt-6 text-[16px] md:text-[19px] leading-relaxed max-w-2xl font-medium" style={{ color: 'rgba(243,240,230,0.85)' }}>
              Crea tu propio canal de ventas online en minutos. Página web, pedidos online y WhatsApp integrados — <strong style={{ color: '#fff' }}>sin comisiones por venta.</strong>
            </p>

            {/* key badges */}
            <div className="mt-6 flex flex-wrap gap-2.5">
              {['0% comisión', 'Listo en minutos', 'Sin sistemas complicados', 'Diseñado para LATAM'].map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-[12px] font-black uppercase tracking-wide"
                  style={{ borderColor: 'rgba(243,240,230,0.4)', color: '#F3F0E6', fontFamily: 'IBM Plex Mono, monospace' }}>
                  <Check size={13} strokeWidth={3} style={{ color: TEAL }} /> {b}
                </span>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/serve/demo"
                className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-[16px] font-black border-2 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: `6px 6px 0 ${TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
                Crear mi demo gratis <ArrowRight size={20} strokeWidth={2.5} />
              </Link>
              <button onClick={() => scrollTo(demoRef)}
                className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-[16px] font-bold border-2 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{ backgroundColor: 'transparent', color: '#fff', borderColor: 'rgba(243,240,230,0.5)', fontFamily: 'Archivo, sans-serif' }}>
                Ver cómo funciona
              </button>
            </div>

            <p className="mt-7 text-[13px] font-bold uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'rgba(243,240,230,0.55)' }}>
              Tu propio canal de ventas — no otro marketplace.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 2 — ¿QUÉ VENDES? ────────────────────────── */}
      <section id="que-vendes" className="py-16 md:py-24" style={{ backgroundColor: CREAM }}>
        <div className="max-w-6xl mx-auto px-4 md:px-5">
          <div className="text-center">
            <MonoTag>¿Qué vendes?</MonoTag>
            <h2 className="mt-5 text-[26px] md:text-[40px] font-black tracking-tight max-w-2xl mx-auto leading-tight"
              style={{ fontFamily: 'Archivo, sans-serif' }}>
              Empieza con una pregunta
            </h2>
            <p className="mt-4 text-[15px] md:text-[16px] font-medium max-w-xl mx-auto" style={{ color: '#5a6168' }}>
              No necesitas saber de tecnología. Cuéntanos cómo funciona tu negocio y Attenda Serve se adapta.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5 max-w-3xl mx-auto">
            {SELLER_TYPES.map((t, i) => (
              <button key={t.label} onClick={() => scrollTo(formRef)}
                className="group flex flex-col items-center gap-3 rounded-2xl p-5 md:p-6 border-2 text-center transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--sv-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--sv-ink)]"
                style={{
                  backgroundColor: PAPER, borderColor: INK, boxShadow: SHADOW,
                  transform: i % 2 === 0 ? 'rotate(-0.6deg)' : 'rotate(0.6deg)',
                  fontFamily: 'Archivo, sans-serif',
                }}>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2"
                  style={{ backgroundColor: CREAM, borderColor: INK, color: TEAL_INK }}>
                  {t.icon ? <t.icon size={22} strokeWidth={2.25} /> : <span className="text-[20px] font-black">+</span>}
                </span>
                <span className="text-[14px] md:text-[15px] font-extrabold leading-tight" style={{ color: INK }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — EL PROBLEMA ─────────────────────────── */}
      <section className="py-16 md:py-24 border-y-2" style={{ borderColor: INK, backgroundColor: PAPER }}>
        <div className="max-w-6xl mx-auto px-4 md:px-5">
          <h2 className="text-[24px] md:text-[38px] font-black tracking-tight max-w-3xl mx-auto text-center leading-tight"
            style={{ fontFamily: 'Archivo, sans-serif' }}>
            Vender no debería significar vivir entre mensajes, capturas, hojas y aplicaciones desconectadas.
          </h2>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { q: '“¿Me manda el pedido por WhatsApp?”', s: 'El pedido vive en un chat personal que se pierde entre mensajes.' },
              { q: '“Le mando el Yape…”', s: 'El pago es una captura que alguien tiene que revisar a mano.' },
              { q: '“Apúntalo en la libreta.”', s: 'El cumplimiento vive en papel — nadie ve el estado real del negocio.' },
              { q: '“¿Otra vez qué fue lo que pidió?”', s: 'El cliente que compró una vez no vuelve — nadie lo vuelve a contactar.' },
            ].map((c, i) => (
              <div key={c.q} className="rounded-2xl border-2 p-6 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--sv-ink)]"
                style={{ backgroundColor: CREAM, borderColor: INK, boxShadow: SHADOW, transform: `rotate(${i % 2 === 0 ? -0.5 : 0.5}deg)` }}>
                <div className="text-[15px] font-extrabold mb-2 leading-snug" style={{ fontFamily: 'Archivo, sans-serif' }}>{c.q}</div>
                <div className="text-[13px] font-medium leading-relaxed" style={{ color: '#5a6168' }}>{c.s}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border-2 p-6 md:p-10 text-center" style={{ backgroundColor: NAVY, borderColor: INK, boxShadow: SHADOW }}>
            <div className="text-[13px] font-bold tracking-[0.12em] uppercase mb-5" style={{ fontFamily: 'IBM Plex Mono, monospace', color: TEAL }}>
              Attenda Serve lo organiza todo
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-[14px] md:text-[16px] font-extrabold">
              {['Pedidos en un solo lugar', 'Cobro como tu mercado', 'WhatsApp conectado', 'Clientes que vuelven'].map((step, i, arr) => (
                <span key={step} className="inline-flex items-center gap-3">
                  <span className="rounded-lg border-2 px-4 py-2"
                    style={i === arr.length - 1
                      ? { backgroundColor: TEAL, color: INK, borderColor: INK, fontFamily: 'Archivo, sans-serif' }
                      : { backgroundColor: PAPER, color: INK, borderColor: INK, fontFamily: 'Archivo, sans-serif' }}>
                    {step}
                  </span>
                  {i < arr.length - 1 && <ArrowRight size={18} strokeWidth={2.5} style={{ color: CREAM }} className="hidden sm:block" />}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — QUÉ RECIBES ─────────────────────────── */}
      <section id="como-funciona" className="py-16 md:py-24" style={{ backgroundColor: CREAM }}>
        <div className="max-w-6xl mx-auto px-4 md:px-5">
          <h2 className="text-[26px] md:text-[40px] font-black tracking-tight text-center leading-tight"
            style={{ fontFamily: 'Archivo, sans-serif' }}>
            Lo que recibes con Attenda Serve
          </h2>
          <p className="mt-4 text-center text-[15px] md:text-[16px] font-medium max-w-xl mx-auto" style={{ color: '#5a6168' }}>
            Una sola plataforma con todo lo que tu negocio necesita para vender y operar.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((m) => (
              <div key={m.name} className="rounded-2xl border-2 p-6 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--sv-ink)]"
                style={{ backgroundColor: PAPER, borderColor: INK, boxShadow: SHADOW }}>
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border-2"
                  style={{ backgroundColor: TEAL, borderColor: INK, color: INK }}>
                  <m.icon size={21} strokeWidth={2.25} />
                </span>
                <h3 className="text-[16px] font-extrabold mb-2" style={{ fontFamily: 'Archivo, sans-serif' }}>{m.name}</h3>
                <p className="text-[13px] font-medium leading-relaxed" style={{ color: '#5a6168' }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — TU CANAL, NO OTRO MARKETPLACE ───────── */}
      <section className="py-16 md:py-24 border-y-2" style={{ borderColor: INK, backgroundColor: NAVY }}>
        <div className="max-w-5xl mx-auto px-4 md:px-5 text-center">
          <h2 className="font-black tracking-tight text-[24px] md:text-[40px] leading-tight max-w-3xl mx-auto text-white"
            style={{ fontFamily: 'Archivo, sans-serif' }}>
            LAS APPS DE DELIVERY PUEDEN SEGUIR SIENDO UN CANAL.<br />
            <span style={{ color: TEAL }}>ATTENDA SERVE TE AYUDA A CONSTRUIR EL TUYO.</span>
          </h2>
          <p className="mt-6 text-white/75 text-[15px] md:text-[16px] leading-relaxed max-w-2xl mx-auto font-medium">
            No tienes que abandonar los marketplaces. Attenda Serve es tu canal directo: tú controlas tu marca,
            la experiencia de tus clientes, tus precios y el camino para que vuelvan a comprar.
            <strong style={{ color: '#fff' }}> Ahí está tu margen.</strong>
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5 text-left max-w-3xl mx-auto">
            {[
              { t: 'Tu marca', d: 'Tu storefront, tus colores, tu nombre. El cliente compra en TU negocio.' },
              { t: 'Tus clientes', d: 'La relación es tuya — sus datos, su historial, su pedido de vuelta.' },
              { t: 'Tu margen', d: 'Vende con tus precios y promociones, sin comisiones de intermediarios.' },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border-2 p-6" style={{ backgroundColor: '#232748', borderColor: INK, boxShadow: SHADOW }}>
                <div className="text-[16px] font-extrabold mb-2" style={{ fontFamily: 'Archivo, sans-serif', color: TEAL }}>{c.t}</div>
                <div className="text-[13px] leading-relaxed" style={{ color: 'rgba(243,240,230,0.7)' }}>{c.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      {/* ── WHATSAPP ES EL FLUJO, NO EL ENEMIGO ─────────────── */}
      <section className="py-16 md:py-24 border-y-2" style={{ borderColor: INK, backgroundColor: PAPER }}>
        <div className="max-w-5xl mx-auto px-4 md:px-5 text-center">
          <MonoTag>WhatsApp conectado</MonoTag>
          <h2 className="mt-5 text-[26px] md:text-[40px] font-black tracking-tight max-w-2xl mx-auto leading-tight"
            style={{ fontFamily: 'Archivo, sans-serif' }}>
            No cambies cómo trabajas. <span style={{ color: TEAL_INK }}>Organízalo.</span>
          </h2>
          <p className="mt-4 text-[15px] md:text-[16px] font-medium max-w-xl mx-auto" style={{ color: '#5a6168' }}>
            Pedido online → negocio recibe la información → flujo conectado con WhatsApp → equipo procesa el pedido.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[13px] md:text-[15px] font-extrabold">
            {['Pedido online', 'Recibes todo el detalle', 'WhatsApp conectado', 'Tu equipo lo cumple'].map((s, i, arr) => (
              <span key={s} className="inline-flex items-center gap-3">
                <span className="rounded-lg border-2 px-4 py-2"
                  style={i === arr.length - 1
                    ? { backgroundColor: TEAL, color: INK, borderColor: INK, fontFamily: 'Archivo, sans-serif' }
                    : { backgroundColor: CREAM, color: INK, borderColor: INK, fontFamily: 'Archivo, sans-serif' }}>
                  {s}
                </span>
                {i < arr.length - 1 && <ArrowRight size={17} strokeWidth={2.5} style={{ color: INK }} className="hidden sm:block" />}
              </span>
            ))}
          </div>
        </div>
      </section>

{/* ── SECTION 6 — FUKIN VEGAN ─────────────────────────── */}
      <section id="fukin-vegan" ref={demoRef} className="py-16 md:py-24" style={{ backgroundColor: CREAM }}>
        <div className="max-w-6xl mx-auto px-4 md:px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <MonoTag>Ya está funcionando</MonoTag>
              <h2 className="mt-5 text-[26px] md:text-[40px] font-black tracking-tight leading-tight"
                style={{ fontFamily: 'Archivo, sans-serif' }}>
                Mira cómo Fukin Vegan vende con su propio canal.
              </h2>
              <p className="mt-5 text-[15px] md:text-[16px] font-medium leading-relaxed" style={{ color: '#5a6168' }}>
                Fukin Vegan, una cocina de smash burgers 100% vegana en Lima, recibe sus pedidos por su propia
                página — del menú al carrito, al pago, a la cocina. Sin comisiones de intermediarios.
                Es la primera tienda real sobre la plataforma.
              </p>
              <div className="mt-7 flex flex-wrap gap-4">
                <a href="https://keen-crepe-35e8c8.netlify.app" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-black border-2 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: `5px 5px 0 ${TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
                  Ver demo en vivo <ArrowRight size={17} strokeWidth={2.5} />
                </a>
              </div>
            </div>

            {/* phone mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-[280px] md:w-[320px] rounded-[36px] p-2.5 border-2"
                style={{ backgroundColor: INK, borderColor: INK, boxShadow: `8px 8px 0 ${NAVY}` }}>
                <div className="rounded-[28px] overflow-hidden" style={{ backgroundColor: '#080808' }}>
                  <div className="h-7 flex items-center justify-center" style={{ backgroundColor: '#080808' }}>
                    <div className="w-20 h-1.5 rounded-full" style={{ backgroundColor: '#2a2a2a' }} />
                  </div>
                  <div className="px-4 pt-2 pb-3 flex items-center justify-between border-b" style={{ borderColor: '#1e1e1e' }}>
                    <div className="text-[13px] font-extrabold text-white" style={{ fontFamily: 'Archivo, sans-serif' }}>FUKIN&apos; VEGAN</div>
                    <div className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#F36A12' }}>
                      SURCO · 25-35 MIN
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3">
                    {['Smash S/35.90', 'Doble S/41.90', 'Fake Chicken S/34.90', 'Papas S/7.90'].map((item, i) => (
                      <div key={item} className="rounded-xl overflow-hidden border" style={{ borderColor: '#1e1e1e' }}>
                        <div className="h-16" style={{ backgroundColor: i % 2 === 0 ? '#f2ede2' : '#e9e4d8' }} />
                        <div className="p-2">
                          <div className="text-[10px] font-bold text-white leading-tight">{item}</div>
                          <div className="mt-1.5 flex justify-end">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold" style={{ backgroundColor: '#F36A12', color: '#fff' }}>+</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mx-3 mb-3 rounded-xl text-white text-[12px] font-bold text-center py-3" style={{ backgroundColor: '#F36A12' }}>
                    Ver carrito · S/ 83.70
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      
      {/* ── PRECIOS ─────────────────────────────────────────── */}
      <section id="precios" className="py-16 md:py-24 border-y-2" style={{ borderColor: INK, backgroundColor: NAVY }}>
        <div className="max-w-5xl mx-auto px-4 md:px-5">
          <div className="text-center">
            <MonoTag>Precios simples</MonoTag>
            <h2 className="mt-5 text-[26px] md:text-[40px] font-black tracking-tight max-w-2xl mx-auto leading-tight text-white"
              style={{ fontFamily: 'Archivo, sans-serif' }}>
              Una mensualidad. <span style={{ color: TEAL }}>0% comisión.</span>
            </h2>
            <p className="mt-4 text-[15px] md:text-[16px] font-medium max-w-xl mx-auto" style={{ color: 'rgba(243,240,230,0.75)' }}>
              Vendas S/100 o vendas S/10,000, tu mensualidad sigue siendo la misma.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-start">
            {/* STARTER */}
            <div className="rounded-2xl border-2 p-7" style={{ backgroundColor: PAPER, borderColor: INK, boxShadow: SHADOW }}>
              <div className="text-[12px] font-black uppercase tracking-[0.15em]" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>Starter</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[44px] font-black leading-none" style={{ fontFamily: 'Archivo, sans-serif' }}>$29</span>
                <span className="text-[13px] font-bold" style={{ color: '#5a6168' }}>/mes</span>
              </div>
              <div className="mt-5 h-px" style={{ backgroundColor: INK }} />
              <ul className="mt-5 space-y-3 text-[13.5px] font-medium">
                {[
                  'Página web con tu marca',
                  'Pedidos online',
                  'Flujo de pedidos por WhatsApp',
                  'Panel para actualizar menú, precios y fotos',
                  'Flujo de pedidos para tu staff',
                  '0% comisión por venta',
                ].map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check size={16} strokeWidth={3} className="mt-0.5 shrink-0" style={{ color: TEAL_INK }} /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/serve/demo"
                className="mt-7 block rounded-xl border-2 py-3.5 text-center text-[15px] font-black transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{ backgroundColor: PAPER, color: INK, borderColor: INK, boxShadow: SHADOW_SM, fontFamily: 'Archivo, sans-serif' }}>
                Empezar por $29
              </Link>
            </div>

            {/* GROWTH — featured */}
            <div className="relative rounded-2xl border-2 p-7" style={{ backgroundColor: TEAL, borderColor: INK, boxShadow: `8px 8px 0 ${TEAL_INK}` }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border-2 px-4 py-1 text-[11px] font-black uppercase tracking-wider"
                style={{ backgroundColor: INK, color: '#F3F0E6', borderColor: INK, fontFamily: 'IBM Plex Mono, monospace' }}>
                El más completo
              </div>
              <div className="text-[12px] font-black uppercase tracking-[0.15em]" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Growth</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[44px] font-black leading-none" style={{ fontFamily: 'Archivo, sans-serif' }}>$49</span>
                <span className="text-[13px] font-bold">/mes</span>
              </div>
              <div className="mt-5 h-px" style={{ backgroundColor: INK, opacity: 0.35 }} />
              <p className="mt-4 text-[12px] font-black uppercase tracking-wider">Todo lo de Starter, más:</p>
              <ul className="mt-3 space-y-3 text-[13.5px] font-medium">
                {[
                  'Digital Pass — membresía del cliente',
                  'Puntos, recompensas y lealtad',
                  'Herramientas de retención',
                  'Notificaciones directas y re-engagement',
                  'Marketing a tu propia base de clientes',
                  'Nuevas funciones de crecimiento al salir',
                  '0% comisión por venta',
                ].map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check size={16} strokeWidth={3} className="mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/serve/demo"
                className="mt-7 block rounded-xl border-2 py-3.5 text-center text-[15px] font-black transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{ backgroundColor: INK, color: '#F3F0E6', borderColor: INK, boxShadow: `4px 4px 0 ${TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
                Activar Growth
              </Link>
            </div>
          </div>

          <p className="mt-8 text-center text-[12.5px] font-medium" style={{ color: 'rgba(243,240,230,0.55)' }}>
            Sin contratos raros · Sin comisión por venta · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── DIGITAL PASS ────────────────────────────────────── */}
      <section className="py-16 md:py-24" style={{ backgroundColor: CREAM }}>
        <div className="max-w-5xl mx-auto px-4 md:px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <MonoTag>Exclusivo Growth</MonoTag>
              <h2 className="mt-5 text-[26px] md:text-[40px] font-black tracking-tight leading-tight max-w-lg"
                style={{ fontFamily: 'Archivo, sans-serif' }}>
                Convierte una venta <span style={{ color: TEAL_INK }}>en una relación.</span>
              </h2>
              <p className="mt-5 text-[15px] md:text-[16px] font-medium leading-relaxed" style={{ color: '#5a6168' }}>
                Alguien que pidió no debería desaparecer después de la transacción. Con el Digital Pass, tu cliente
                se vuelve <strong>miembro de tu negocio</strong>: gana puntos, gana recompensas y queda conectado
                directo a ti.
              </p>
              <p className="mt-4 text-[15px] md:text-[16px] font-medium leading-relaxed" style={{ color: '#5a6168' }}>
                Así impulsas la recompra y les hablas sin depender del algoritmo de Instagram ni de un marketplace.
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-[300px] overflow-hidden rounded-2xl border-2 text-white"
                style={{ borderColor: INK, backgroundColor: '#111827', boxShadow: `8px 8px 0 ${TEAL_INK}` }}>
                <div className="flex items-center justify-between px-5 pt-5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] font-bold" style={{ fontFamily: 'IBM Plex Mono, monospace', color: TEAL }}>
                    FUKIN VEGAN · MIEMBRO
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-black" style={{ backgroundColor: TEAL, color: INK }}>FV</span>
                </div>
                <div className="px-5 pb-6 pt-7">
                  <div className="text-[13px] font-bold text-white/70">Puntos</div>
                  <div className="text-[48px] font-black leading-none text-white" style={{ fontFamily: 'Archivo, sans-serif' }}>128</div>
                  <div className="mt-3 text-[12px] font-medium text-white/60">Miembro desde marzo · Nivel Oro</div>
                  <div className="mt-6 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
                    ◌◌◌◌◌◌◌◌ · Apple / Google Wallet
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA — 4 PASOS + DEMO 24H ──────────────── */}
      <section id="como-se-activa" className="py-16 md:py-24 border-y-2" style={{ borderColor: INK, backgroundColor: PAPER }}>
        <div className="max-w-5xl mx-auto px-4 md:px-5">
          <div className="text-center">
            <MonoTag>Así de simple</MonoTag>
            <h2 className="mt-5 text-[26px] md:text-[40px] font-black tracking-tight max-w-2xl mx-auto leading-tight"
              style={{ fontFamily: 'Archivo, sans-serif' }}>
              Tu canal, listo en minutos
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { n: '1', t: 'Cuéntanos de tu negocio', d: 'Nombre, giro, logo y fotos, tus productos y precios, tu WhatsApp.' },
              { n: '2', t: 'Attenda crea tu canal', d: 'Página + pedidos online + flujo de WhatsApp, con tu marca.' },
              { n: '3', t: 'Pruébalo en vivo', d: 'Crea tu demo gratis y pruébalo en ~2 minutos: tienda, pedido y panel.' },
              { n: '4', t: 'Actívalo cuando estés listo', d: 'Demo gratis por 24 horas. Después, activamos tu negocio contigo.' },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border-2 p-6" style={{ backgroundColor: CREAM, borderColor: INK, boxShadow: SHADOW }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 text-[18px] font-black"
                  style={{ backgroundColor: TEAL, borderColor: INK, color: INK, fontFamily: 'Archivo, sans-serif' }}>
                  {s.n}
                </span>
                <h3 className="mt-4 text-[15px] font-extrabold mb-2" style={{ fontFamily: 'Archivo, sans-serif' }}>{s.t}</h3>
                <p className="text-[13px] font-medium leading-relaxed" style={{ color: '#5a6168' }}>{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/serve/demo"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-[16px] font-black border-2 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: `6px 6px 0 ${TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
              Crear mi demo gratis <ArrowRight size={19} strokeWidth={2.5} />
            </Link>
            <p className="mt-4 text-[13px] font-bold uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>
              Sin tarjeta · Sin instalar nada · Listo en ~2 minutos
            </p>
          </div>
        </div>
      </section>

{/* ── SECTION 8 — CTA FINAL + FORM ────────────────────── */}
      <section id="crear" ref={formRef} className="py-16 md:py-24" style={{ backgroundColor: NAVY }}>
        <div className="max-w-3xl mx-auto px-4 md:px-5 text-center">
          <h2 className="text-[24px] md:text-[38px] font-black tracking-tight leading-tight text-white"
            style={{ fontFamily: 'Archivo, sans-serif' }}>
            CREA TU DEMO GRATIS.<br />TU CANAL ESTARÁ LISTO EN MINUTOS.
          </h2>
          <p className="mt-4 text-[15px] md:text-[16px] font-medium" style={{ color: 'rgba(243,240,230,0.7)' }}>
            Prueba tu negocio online por 24 horas. Cuando estés listo, te contactamos para activarlo de verdad.
          </p>

          <div className="mt-8">
            <Link href="/serve/demo"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-[17px] font-black border-2 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: `6px 6px 0 ${TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
              Crear mi demo gratis <ArrowRight size={20} strokeWidth={2.5} />
            </Link>
          </div>

          <p className="mt-8 text-[13px] font-bold uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'rgba(243,240,230,0.5)' }}>
            ¿Prefieres que lo hagamos por ti? Déjanos tus datos:
          </p>
          <ServeForm />
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t-2 py-10" style={{ borderColor: INK, backgroundColor: CREAM }}>
        <div className="max-w-7xl mx-auto px-4 md:px-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/brand/logo-primary.svg" alt="Attenda" className="h-6 w-auto" />
            <span className="w-px h-4" style={{ backgroundColor: INK }} aria-hidden />
            <span className="text-[14px] font-black tracking-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>Serve</span>
          </a>
          <div className="flex items-center gap-6 text-[13px] font-bold uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
            <a href="/" className="hover:opacity-70">Attenda Hospitality</a>
            <a href="#fukin-vegan" className="hover:opacity-70">Demo</a>
            <a href="/staff" className="hover:opacity-70">Entrar</a>
          </div>
          <div className="text-[12px] font-medium" style={{ color: '#5a6168' }}>
            Attenda Serve — un producto de Attenda Technologies
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Lead form — POSTs /api/email as serve_seller_inquiry        */
/* ──────────────────────────────────────────────────────────── */

function ServeForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [form, setForm] = useState({
    businessName: '',
    sellerType: '',
    name: '',
    email: '',
    phone: '',
    city: '',
    message: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async () => {
    if (!form.businessName || !form.name || !form.email) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '',
        },
        body: JSON.stringify({
          type: 'serve_seller_inquiry',
          data: {
            businessName: form.businessName,
            sellerType: form.sellerType,
            contactName: form.name,
            contactEmail: form.email,
            contactPhone: form.phone,
            city: form.city,
            message: form.message,
          },
        }),
      });
      if (!res.ok) throw new Error('send failed');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="mt-10 rounded-2xl border-2 p-10 text-center" style={{ backgroundColor: CREAM, borderColor: INK, boxShadow: SHADOW }}>
        <div className="w-16 h-16 rounded-full border-2 mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: TEAL, borderColor: INK, color: INK }}>
          <Check size={32} strokeWidth={3} />
        </div>
        <h3 className="text-[22px] font-black mb-2" style={{ fontFamily: 'Archivo, sans-serif' }}>
          ¡Listo, {form.name.split(' ')[0]}!
        </h3>
        <p className="text-[14px] font-medium" style={{ color: '#5a6168' }}>
          Recibimos los datos de <strong>{form.businessName}</strong>. Te contactamos en menos de un día hábil
          para activar tu tienda con Attenda Serve.
        </p>
      </div>
    );
  }

  const inputCls = 'w-full rounded-xl px-4 py-3 text-[14px] font-medium outline-none placeholder:opacity-50 transition-shadow focus:shadow-[2px_2px_0_var(--sv-ink)] border-2';

  return (
    <div className="mt-10 rounded-2xl border-2 p-6 md:p-8 text-left space-y-4 text-left"
      style={{ backgroundColor: PAPER, borderColor: INK, boxShadow: SHADOW }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>
            Nombre del negocio *
          </label>
          <input value={form.businessName} onChange={set('businessName')} placeholder="Fukin Vegan"
            className={inputCls} style={{ backgroundColor: CREAM, borderColor: INK }} />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>
            ¿Qué vendes?
          </label>
          <div className="relative">
            <select value={form.sellerType} onChange={set('sellerType')}
              className={`${inputCls} appearance-none pr-10`} style={{ backgroundColor: CREAM, borderColor: INK }}>
              <option value="">Elegir…</option>
              <option>Restaurante</option>
              <option>Comida desde casa</option>
              <option>Pastelería</option>
              <option>Tienda / productos</option>
              <option>Vendedor independiente</option>
              <option>Otro</option>
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#5a6168' }} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>
            Tu nombre *
          </label>
          <input value={form.name} onChange={set('name')} placeholder="Nombre y apellido"
            className={inputCls} style={{ backgroundColor: CREAM, borderColor: INK }} />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>
            Email *
          </label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="tu@negocio.com"
            className={inputCls} style={{ backgroundColor: CREAM, borderColor: INK }} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>
            WhatsApp / teléfono
          </label>
          <input value={form.phone} onChange={set('phone')} placeholder="+51 999 999 999"
            className={inputCls} style={{ backgroundColor: CREAM, borderColor: INK }} />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#5a6168' }}>
            Ciudad
          </label>
          <input value={form.city} onChange={set('city')} placeholder="Lima"
            className={inputCls} style={{ backgroundColor: CREAM, borderColor: INK }} />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ fontFamily: 'IBM Plex Mono, attenda' }}>
          Cuéntanos de tu negocio
        </label>
        <textarea value={form.message} onChange={set('message')} rows={3}
          placeholder="Ej. Vendo almuerzos caseros de lunes a viernes, entrego en Surco…"
          className={inputCls} style={{ backgroundColor: CREAM, borderColor: INK }} />
      </div>

      {status === 'error' && (
        <div className="rounded-xl border-2 px-4 py-3 text-[13px] font-bold" style={{ backgroundColor: '#FBE9E7', borderColor: INK, color: '#D64550' }}>
          No se pudo enviar. Intenta de nuevo o escríbenos directo por WhatsApp.
        </div>
      )}

      <button onClick={handleSubmit} disabled={status === 'sending' || !form.businessName || !form.name || !form.email}
        className="w-full py-4 rounded-xl text-[16px] font-black border-2 disabled:opacity-40 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: `5px 5px 0 ${TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
        {status === 'sending' ? 'Enviando…' : 'Crear mi demo gratis →'}
      </button>
      <p className="text-center text-[12px] font-medium" style={{ color: '#5a6168' }}>
        Te contactamos en menos de un día hábil. Sin compromiso.
      </p>
    </div>
  );
}