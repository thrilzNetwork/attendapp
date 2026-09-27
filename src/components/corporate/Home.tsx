'use client';

/* Attenda Technologies — corporate homepage.
   Root identity: ONE TECHNOLOGY COMPANY. MULTIPLE OPERATING ENVIRONMENTS.
   Guest QR sessions still hit / and keep working (handled in page.tsx gate).

   Design language: dark editorial hero with three REAL product interfaces
   (no fake skeleton bars), scroll-reveal on every section, oversized
   statements, real screens as the visuals. */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, BedDouble, CheckCircle2, Clock,
  MessageSquare, Navigation, Radio, ShoppingBag, Store, Truck, Users,
} from 'lucide-react';
import { CorporateNav, CorporateFooter, CORP_TEAL, CORP_TEAL_BRIGHT, CORP_INK, CORP_MIST, CORP_BORDER } from '@/components/corporate/Chrome';

/* ── Scroll reveal ── */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}
      style={{ opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(26px)', transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms` }}>
      {children}
    </div>
  );
}

/* ═══════════════ REAL PRODUCT INTERFACES (hero) ═══════════════ */

function HospitalityInterface({ active }: { active: boolean }) {
  return (
    <div className="rounded-xl bg-gray-950/95 border border-white/10 overflow-hidden shadow-2xl" style={{ borderColor: active ? `${CORP_TEAL_BRIGHT}66` : undefined }}>
      {/* window bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <BedDouble size={12} style={{ color: CORP_TEAL_BRIGHT }} />
          <span className="text-[9px] font-black tracking-[0.2em] text-white">HOSPITALITY · OPS</span>
        </div>
        <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${CORP_TEAL}22`, color: CORP_TEAL_BRIGHT }}>LIVE</span>
      </div>
      <div className="p-3.5 space-y-2.5">
        {/* rooms strip */}
        <div className="grid grid-cols-6 gap-1.5">
          {['OCC', 'CLN', 'RDY', 'OCC', 'INS', 'OOC'].map((s, i) => (
            <div key={i} className="rounded-md py-1.5 text-center text-[7.5px] font-black tracking-wide"
              style={{
                backgroundColor: s === 'OCC' ? 'rgba(21,183,158,0.14)' : s === 'CLN' ? 'rgba(255,255,255,0.07)' : s === 'RDY' ? 'rgba(59,130,246,0.16)' : 'rgba(255,255,255,0.05)',
                color: s === 'RDY' ? '#7dd3fc' : s === 'OCC' ? CORP_TEAL_BRIGHT : 'rgba(255,255,255,0.45)',
              }}>{s}</div>
          ))}
        </div>
        {/* task queue */}
        <div className="space-y-1.5">
          {[
            ['Room 412 · Guest requested extra towels', 'Housekeeping', '2m'],
            ['AC leaking · Room 208', 'Maintenance', '9m'],
            ['Airport shuttle · 4 guests', 'Transportation', '15m'],
          ].map(([txt, who, ago], i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {i === 2 ? <Navigation size={10} className="shrink-0 text-blue-300" /> : <CheckCircle2 size={10} className="shrink-0" style={{ color: CORP_TEAL_BRIGHT }} />}
                <span className="text-[9.5px] text-gray-200 truncate">{txt}</span>
              </div>
              <span className="text-[8px] font-bold text-gray-500 shrink-0 ml-2">{who} · {ago}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[8.5px] font-bold tracking-widest text-gray-500">STAFF ON SHIFT · 9</span>
          <span className="text-[8.5px] font-bold" style={{ color: CORP_TEAL_BRIGHT }}>ALL REQUESTS ROUTED ✓</span>
        </div>
      </div>
    </div>
  );
}

function ServeInterface({ active }: { active: boolean }) {
  return (
    <div className="rounded-xl bg-gray-950/95 border border-white/10 overflow-hidden shadow-2xl" style={{ borderColor: active ? `${CORP_TEAL_BRIGHT}66` : undefined }}>
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Store size={12} style={{ color: CORP_TEAL_BRIGHT }} />
          <span className="text-[9px] font-black tracking-[0.2em] text-white">SERVE · MERCHANT</span>
        </div>
        <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${CORP_TEAL}22`, color: CORP_TEAL_BRIGHT }}>+3 TODAY</span>
      </div>
      <div className="p-3.5 space-y-2.5">
        {/* live orders */}
        {[
          ['#1042 · Lomo saltaro ×2', 'S/ 42.00', 'WhatsApp · Paid'],
          ['#1041 · Menu ejecutivo ×3', 'S/ 36.00', 'Delivery · Paid'],
          ['#1040 · Combo familiar', 'S/ 58.90', 'Pickup 19:30'],
        ].map(([item, amt, meta], i) => (
          <div key={i} className="rounded-lg bg-white/5 px-2.5 py-2 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[9.5px] font-bold text-gray-100 truncate">{item}</div>
              <div className="text-[8px] text-gray-500 mt-0.5">{meta}</div>
            </div>
            <span className="text-[10px] font-black shrink-0 ml-2" style={{ color: CORP_TEAL_BRIGHT }}>{amt}</span>
          </div>
        ))}
        {/* day stats */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {[['Orders', '27'], ['Ticket', 'S/ 38'], ['Repeat', '41%']].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white/5 px-2 py-1.5 text-center">
              <div className="text-[8px] text-gray-500 font-bold">{k}</div>
              <div className="text-[10.5px] font-black text-white">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransportInterface({ active }: { active: boolean }) {
  return (
    <div className="rounded-xl bg-gray-950/95 border border-white/10 overflow-hidden shadow-2xl" style={{ borderColor: active ? `${CORP_TEAL_BRIGHT}66` : undefined }}>
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Truck size={12} style={{ color: CORP_TEAL_BRIGHT }} />
          <span className="text-[9px] font-black tracking-[0.2em] text-white">TRANSPORT · DISPATCH</span>
        </div>
        <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: `${CORP_TEAL}22`, color: CORP_TEAL_BRIGHT }}>
          <Radio size={8} /> GPS LIVE
        </span>
      </div>
      <div className="p-3.5 space-y-2.5">
        {[
          ['Van 3 · MIA T2 → Flagler St', 'ETA 12m', 'En route'],
          ['Van 1 · Port → Homewood', 'ETA 26m', 'Scheduled'],
          ['Sedan 2 · Brickell → MIA T1', 'ETA 8m', 'Arriving'],
        ].map(([route, eta, st], i) => (
          <div key={i} className="rounded-lg bg-white/5 px-2.5 py-1.5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[9.5px] font-bold text-gray-100 truncate">{route}</div>
              <div className="text-[8px] font-bold mt-0.5" style={{ color: CORP_TEAL_BRIGHT }}>{eta}</div>
            </div>
            <span className="text-[8px] font-bold text-gray-400 shrink-0 ml-2 px-2 py-0.5 rounded-full bg-white/8">{st}</span>
          </div>
        ))}
        {/* live route strip */}
        <div className="rounded-lg border border-white/10 h-14 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B1524 0%, #0E1E33 100%)' }}>
          <svg className="absolute inset-0 w-full h-full" aria-hidden>
            <path d="M8,38 C60,28 90,14 150,12 S250,20 285,10" stroke={CORP_TEAL_BRIGHT} strokeWidth="1.5" fill="none" strokeDasharray="4 6" opacity="0.75" />
            <circle cx="150" cy="12" r="3.5" fill={CORP_TEAL_BRIGHT} />
            <circle cx="285" cy="10" r="2.5" fill="#fff" opacity="0.8" />
          </svg>
          <div className="absolute bottom-1.5 left-2.5 text-[7.5px] font-black tracking-[0.2em] text-gray-500">VEHICLE LOCATION · UPDATING</div>
        </div>
      </div>
    </div>
  );
}

/* ── Hero composition: three interfaces + traveling data events ── */
function EcosystemHeroVisual() {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => (p + 1) % 3), 3200);
    return () => clearInterval(t);
  }, []);
  const events = [
    'Guest request → Transportation',
    'Customer order → Serve',
    'Hotel operation → Hospitality',
  ];
  return (
    <div className="relative select-none">
      {/* event pulses */}
      <div className="absolute -top-5 left-0 right-0 flex justify-center pointer-events-none">
        {events.map((ev, i) => (
          <div key={ev}
            className={`absolute text-[10.5px] font-bold tracking-wide px-3 py-1.5 rounded-full border transition-all duration-700 ${pulse === i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ color: CORP_TEAL_BRIGHT, borderColor: `${CORP_TEAL_BRIGHT}44`, backgroundColor: 'rgba(10,16,28,0.92)' }}>
            {ev}
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:gap-4">
        <div style={{ transform: pulse === 2 ? 'translateY(-3px)' : undefined, transition: 'transform 0.6s ease' }}><HospitalityInterface active={pulse === 2} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div style={{ transform: pulse === 1 ? 'translateY(-3px)' : undefined, transition: 'transform 0.6s ease' }}><ServeInterface active={pulse === 1} /></div>
          <div style={{ transform: pulse === 0 ? 'translateY(-3px)' : undefined, transition: 'transform 0.6s ease' }}><TransportInterface active={pulse === 0} /></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ DIAGRAM ═══════════════ */
function EcosystemDiagram() {
  const nodes = [
    { label: 'HOSPITALITY', icon: BedDouble, href: '/hospitality', tint: 'linear-gradient(160deg,#0F2E33,#0A1A1F)', sub: 'Hotel operations' },
    { label: 'TRANSPORTATION', icon: Truck, href: '/transportation', tint: 'linear-gradient(160deg,#101B2E,#0A111E)', sub: 'Live vehicle operations' },
    { label: 'SERVE', icon: Store, href: '/serve', tint: 'linear-gradient(160deg,#172A26,#0E1A17)', sub: 'Commerce & orders' },
  ] as const;
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-center mb-8">
        <div className="rounded-2xl border-2 px-8 py-4 text-center" style={{ borderColor: CORP_TEAL, backgroundColor: 'rgba(21,138,124,0.08)' }}>
          <div className="text-[16px] font-black tracking-tight" style={{ color: CORP_TEAL }}>ATTENDA TECHNOLOGIES</div>
          <div className="text-[10px] font-bold tracking-[0.24em] mt-1 text-gray-500">THE COMPANY ABOVE THE PRODUCTS</div>
        </div>
      </div>
      <div className="hidden md:flex justify-center mb-8">
        <div className="w-px h-10" style={{ background: `linear-gradient(180deg, ${CORP_TEAL}88, transparent)` }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4">
        <EcoNode {...nodes[0]} />
        <EcoLink label="Guest demand ⇄ Commerce" />
        <EcoNode {...nodes[2]} />
        <EcoLink label="Fulfillment ⇄ Movement" />
        <EcoNode {...nodes[1]} />
      </div>
    </div>
  );
}

function EcoNode({ label, sub, icon: Icon, href, tint }: { label: string; sub: string; icon: typeof BedDouble; href: string; tint: string }) {
  return (
    <Link href={href} className="block rounded-2xl border p-5 text-center transition-transform hover:-translate-y-0.5"
      style={{ borderColor: `${CORP_TEAL}44`, background: tint }}>
      <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}22` }}>
        <Icon size={19} style={{ color: CORP_TEAL_BRIGHT }} />
      </div>
      <div className="text-[13px] font-black tracking-[0.14em] text-white">{label}</div>
      <div className="text-[10.5px] text-gray-400 mt-1">{sub}</div>
    </Link>
  );
}

function EcoLink({ label }: { label: string }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center px-1">
      <div className="text-teal-300 text-[17px] font-black tracking-tighter">⇄</div>
      <div className="text-[9.5px] text-gray-500 font-bold text-center leading-tight mt-1 max-w-[120px]">{label}</div>
    </div>
  );
}

const CONNECTIONS = [
  { pair: 'HOSPITALITY + TRANSPORTATION', copy: 'A hotel coordinates shuttle demand while a transportation provider manages vehicles, drivers, pickups and ETAs. Same movement. Different operational views.', chain: 'Guest → Hotel → Transportation → Driver' },
  { pair: 'HOSPITALITY + SERVE', copy: 'Hospitality guests access curated food and commerce options while businesses manage orders in their own operating environment.', chain: 'Guest → Hospitality experience → Merchant → Serve' },
  { pair: 'SERVE + TRANSPORTATION', copy: 'Commerce eventually creates fulfillment. Where transportation is needed, transportation workflows connect sellers, customers and drivers.', chain: 'Order → Fulfillment → Driver → Customer' },
];

const REAL_WORK = [
  { title: 'A HOTEL', steps: ['Front desk.', 'Housekeeping.', 'Maintenance.', 'Guest request.', 'Manager.'], line: 'Attenda Hospitality connects the operation.' },
  { title: 'A BUSINESS', steps: ['Customer.', 'Order.', 'Payment.', 'WhatsApp.', 'Staff.'], line: 'Attenda Serve organizes the sale.' },
  { title: 'A TRANSPORTATION OPERATION', steps: ['Passenger.', 'Dispatcher.', 'Vehicle.', 'Driver.', 'Destination.'], line: 'Attenda Transportation organizes the movement.' },
];

export default function CorporateHomePage() {
  return (
    <div className="min-h-screen bg-white">
      <CorporateNav />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: CORP_INK }}>
        {/* subtle grid backdrop */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${CORP_TEAL}18 0%, transparent 65%)` }} />
        <div className="relative max-w-7xl mx-auto px-5 pt-32 pb-14 md:pt-40 md:pb-20 grid lg:grid-cols-[1fr_1.05fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 border border-white/15 bg-white/5">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: CORP_TEAL_BRIGHT }} />
              <span className="text-[11px] font-bold text-white/80 tracking-[0.2em] uppercase">Attenda Technologies · Miami</span>
            </div>
            <h1 className="text-[40px] md:text-[58px] lg:text-[66px] leading-[1.01] font-black tracking-[-0.02em] text-white">
              Technology for the people<br />
              <span style={{ color: CORP_TEAL_BRIGHT }}>who keep business moving.</span>
            </h1>
            <p className="text-[17px] md:text-[19px] text-gray-300 leading-relaxed mt-6 max-w-xl">
              We build practical operating technology for hospitality, commerce, and transportation — designed around how work actually happens.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-9">
              <a href="#products"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-[15px] transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: CORP_TEAL_BRIGHT, color: CORP_INK }}>
                Explore our products <ArrowRight size={17} />
              </a>
              <Link href="/company" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[15px] border border-white/20 text-white/90 hover:text-white hover:border-white/40 transition-all">
                Discover Attenda <ArrowRight size={16} />
              </Link>
            </div>
            <div className="mt-9 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CORP_TEAL_BRIGHT }} />
              <p className="text-[13px] text-white/60 font-medium">Built in Miami · Operating across the U.S. and Latin America</p>
            </div>
          </div>
          <EcosystemHeroVisual />
        </div>
      </section>

      {/* ── SECTION 2 — WHAT WE BUILD ── */}
      <section className="py-20 md:py-32 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Reveal>
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>What we build</div>
            <h2 className="text-[34px] md:text-[50px] font-black tracking-[-0.02em] leading-[1.06] text-gray-900">
              Different industries.<br />The same operational problem.
            </h2>
            <p className="text-[17px] md:text-[18px] text-gray-600 leading-relaxed mt-6">
              Businesses rarely suffer from a lack of information. The problem is that the information, people and work are spread across messages, paper, disconnected systems and individual knowledge.
            </p>
            <p className="text-[17px] md:text-[18px] text-gray-800 font-semibold mt-4">
              Attenda builds technology that organizes that work into systems people can actually use.
            </p>
          </Reveal>
        </div>
        {/* three large product cards — real mini interfaces */}
        <div id="products" className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5 scroll-mt-24">
          <Reveal delay={0}><ProductCard
            href="/hospitality" label="HOSPITALITY OPERATIONS" icon={BedDouble}
            headline="Run the operation around the reservation."
            copy="One operational layer for the work happening outside the PMS — staff workflows, guest requests, housekeeping, maintenance, inspections, procedures, knowledge and visibility."
            cta="Explore Attenda Hospitality"
            visual={<HospitalityInterface active={false} />} /></Reveal>
          <Reveal delay={90}><ProductCard
            href="/serve" label="COMMERCE" icon={Store}
            headline={<>TU NEGOCIO.<br />TU CANAL.<br />TUS CLIENTES.</>}
            copy="Attenda Serve gives restaurants, independent sellers and everyday businesses their own digital sales channel — storefront, online ordering, local payment workflows, WhatsApp, staff operations and customer retention."
            cta="Explore Attenda Serve" subline="No otro marketplace. Tu propio canal."
            visual={<ServeInterface active={false} />} /></Reveal>
          <Reveal delay={180}><ProductCard
            href="/transportation" label="TRANSPORTATION" icon={Truck}
            headline="Know who's moving, where and when."
            copy="Attenda Transportation connects customers, properties, dispatchers and drivers through live scheduling, pickup coordination, vehicle visibility and operational communication."
            cta="Explore Transportation"
            visual={<TransportInterface active={false} />} /></Reveal>
        </div>
      </section>

      {/* ── SECTION 3 — THE ATTENDA IDEA ── */}
      <section className="py-20 md:py-32 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>Why Attenda</div>
            <h2 className="text-[32px] md:text-[48px] font-black tracking-[-0.02em] leading-[1.08] text-gray-900">
              Technology should fit the operation.<br />
              <span className="text-gray-500">The operation shouldn&apos;t have to fit the technology.</span>
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-7">
              Attenda started from real operating environments where work rarely happens inside one perfect system. Someone sends a WhatsApp. Someone calls the front desk. A driver gets dispatched. A customer places an order. A manager assigns a task. An employee completes a checklist.
            </p>
            <p className="text-[19px] md:text-[22px] text-gray-900 font-black mt-6">
              The problem isn&apos;t the people. The problem is that the work becomes fragmented.
            </p>
            <p className="text-[17px] text-gray-600 mt-4">
              Attenda turns those everyday actions into organized workflows.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 4 — THE ECOSYSTEM ── */}
      <section className="py-20 md:py-32 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <Reveal>
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>One ecosystem</div>
            <h2 className="text-[34px] md:text-[50px] font-black tracking-[-0.02em] leading-[1.06] text-gray-900">
              Built separately.<br />Designed to work together.
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
              Each Attenda product can operate independently. Where workflows overlap, the ecosystem is designed to connect them.
            </p>
          </Reveal>
        </div>
        <Reveal><EcosystemDiagram /></Reveal>
        <div className="max-w-4xl mx-auto mt-16 grid md:grid-cols-3 gap-4">
          {CONNECTIONS.map((c, i) => (
            <Reveal key={c.pair} delay={i * 80}>
              <div className="rounded-2xl border p-6 h-full" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
                <div className="text-[10.5px] font-black tracking-[0.16em] mb-3" style={{ color: CORP_TEAL }}>{c.pair}</div>
                <p className="text-[14px] text-gray-600 leading-relaxed">{c.copy}</p>
                <div className="text-[12px] font-bold text-gray-800 mt-4 font-mono">{c.chain}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-center text-[13px] text-gray-500 mt-8 max-w-2xl mx-auto">
          Designed to connect. Can connect where workflows overlap. Part of the Attenda ecosystem — showing what exists today honestly, and where the platform is going.
        </p>
      </section>

      {/* ── SECTION 5 — ONE PRINCIPLE (dark, oversized) ── */}
      <section className="py-28 md:py-40 px-5 relative overflow-hidden" style={{ backgroundColor: CORP_INK }}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <Reveal>
            <h2 className="text-[32px] md:text-[52px] font-black tracking-[-0.02em] leading-[1.06] text-white">
              We don&apos;t build technology<br />to replace the people doing the work.
            </h2>
            <h3 className="text-[26px] md:text-[40px] font-black tracking-[-0.02em] leading-[1.1] mt-10" style={{ color: CORP_TEAL_BRIGHT }}>
              We build technology<br />to make their work work better.
            </h3>
            <p className="text-[16px] md:text-[17px] text-gray-400 leading-relaxed mt-10 max-w-2xl mx-auto">
              Attenda organizes information, workflows and communication so the people responsible for the operation have better visibility and better tools.
            </p>
            <p className="text-[18px] md:text-[21px] font-black text-white mt-10">
              AI can assist. Software can organize. People still decide.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 6 — BUILT AROUND REAL WORK ── */}
      <section className="py-20 md:py-32 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>Built around real work</div>
            <h2 className="text-[34px] md:text-[48px] font-black tracking-[-0.02em] text-gray-900 mb-14 leading-[1.06]">Three operations. One philosophy.</h2>
          </Reveal>
          <div className="space-y-6">
            {REAL_WORK.map((r, i) => (
              <Reveal key={r.title} delay={i * 80}>
                <div className="rounded-2xl border p-7 md:p-9" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
                  <div className="text-[12px] font-black tracking-[0.2em] mb-5" style={{ color: CORP_TEAL }}>{r.title}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    {r.steps.map((s, j) => (
                      <span key={s} className="flex items-center gap-2.5">
                        <span className="text-[15px] font-bold text-gray-800">{s}</span>
                        {j < r.steps.length - 1 && <ArrowRight size={14} className="text-gray-400" />}
                      </span>
                    ))}
                  </div>
                  <div className="text-[15px] font-black text-gray-900 mt-5">{r.line}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="text-center text-[26px] md:text-[36px] font-black tracking-[-0.02em] text-gray-900 mt-16">
              Different work. <span style={{ color: CORP_TEAL }}>Same philosophy.</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 7 — COMPANY + MIAMI ── */}
      <section className="py-20 md:py-32 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>Attenda Technologies</div>
            <h2 className="text-[34px] md:text-[48px] font-black tracking-[-0.02em] leading-[1.08] text-gray-900">
              Built by operators.<br />Built for operators.
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
              Attenda began inside hospitality, where we saw firsthand how much of an operation still depends on disconnected tools, paper, messages and knowledge living inside people&apos;s heads. That experience led to a bigger idea: <strong className="text-gray-900">technology should be built around how people actually operate.</strong>
            </p>
            <p className="text-[16px] text-gray-600 leading-relaxed mt-4">
              Today, Attenda Technologies applies that philosophy across hospitality, commerce and transportation. We build systems for people doing real work — not software designed in isolation from it.
            </p>
            <Link href="/company" className="inline-flex items-center gap-2 mt-7 text-[15px] font-bold" style={{ color: CORP_TEAL }}>
              Our story <ArrowRight size={16} />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative rounded-3xl overflow-hidden border shadow-xl" style={{ borderColor: CORP_BORDER, minHeight: 380 }}>
              <Image src="https://images.unsplash.com/photo-1534482421-64566f976cfa?w=1400&q=80" alt="Miami — Attenda Technologies' home" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,15,20,0.08) 30%, rgba(8,15,20,0.88) 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="text-[11px] font-black tracking-[0.3em] text-white/80">MIAMI, FLORIDA</div>
                <div className="text-[28px] font-black text-white mt-1">Our home.</div>
                <p className="text-[13.5px] text-gray-200 leading-relaxed mt-2 max-w-md">
                  A city connecting the United States, Latin America, hospitality, commerce, transportation and entrepreneurship. The natural home for what we&apos;re building.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 8 — GLOBAL / LATAM ── */}
      <section className="py-20 md:py-32 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="text-[34px] md:text-[50px] font-black tracking-[-0.02em] leading-[1.06] text-gray-900">
              Built in Miami.<br /><span style={{ color: CORP_TEAL }}>Designed beyond borders.</span>
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
              Attenda Technologies builds products for markets where operational technology needs to be practical, accessible and adaptable to how people already work.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-4 mt-10 text-left">
            {[
              ['Hospitality', 'Begins with U.S. operators.', BedDouble, '/hospitality'],
              ['Serve', 'Built with Latin American businesses in mind.', Store, '/serve'],
              ['Transportation', 'Connects physical operations wherever people and vehicles need better coordination.', Truck, '/transportation'],
            ].map(([t, c, Icon, href], i) => (
              <Reveal key={t as string} delay={i * 80}>
                <Link href={href as string} className="block rounded-2xl border p-6 hover:-translate-y-0.5 transition-transform" style={{ borderColor: CORP_BORDER }}>
                  <div className="text-[12px] font-black tracking-[0.18em] uppercase" style={{ color: CORP_TEAL }}>{t as string}</div>
                  <p className="text-[14.5px] text-gray-600 mt-2.5 leading-relaxed">{c as string}</p>
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="text-[22px] md:text-[30px] font-black tracking-[-0.02em] text-gray-900 mt-14">
              The technology changes by market.<br /><span style={{ color: CORP_TEAL }}>The principle does not.</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 9 — TECHNOLOGY / HOW WE BUILD ── */}
      <section className="py-20 md:py-32 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-5xl mx-auto">
          <div className="max-w-3xl mb-14">
            <Reveal>
              <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>How we build</div>
              <h2 className="text-[34px] md:text-[50px] font-black tracking-[-0.02em] leading-[1.06] text-gray-900">
                Powerful underneath.<br />Simple where it matters.
              </h2>
              <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
                The best operational technology disappears into the work. People should not need to become software experts to use Attenda.
              </p>
            </Reveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ['Mobile-first', 'Built around the devices people already carry.', Radio],
              ['Role-based', 'People see the tools relevant to their work.', Users],
              ['Real-time', 'Operational information changes as the work happens.', Clock],
              ['Human-centered AI', 'AI assists people instead of pretending to replace judgment.', MessageSquare],
              ['Connected', 'Products can exchange information where workflows overlap.', ShoppingBag],
              ['Market-aware', 'Payments, communication and workflows adapt to the environments where Attenda operates.', Navigation],
            ].map(([t, c, Icon], i) => (
              <Reveal key={t as string} delay={(i % 3) * 70}>
                <div className="rounded-2xl bg-white border p-6 h-full" style={{ borderColor: CORP_BORDER }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${CORP_TEAL}14` }}>
                    <Icon size={17} style={{ color: CORP_TEAL }} />
                  </div>
                  <div className="text-[15px] font-black text-gray-900">{t as string}</div>
                  <p className="text-[14px] text-gray-600 mt-1.5 leading-relaxed">{c as string}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 10 — PRODUCTS AGAIN (primary conversion tiles) ── */}
      <section className="py-20 md:py-32 px-5 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
          {[
            { t: 'HOSPITALITY', l: 'Run the operation.', h: '/hospitality', tint: 'linear-gradient(160deg, #0F2E33 0%, #0A1A1F 100%)', icon: BedDouble },
            { t: 'SERVE', l: 'Own your channel.', h: '/serve', tint: 'linear-gradient(160deg, #172A26 0%, #0E1A17 100%)', icon: Store },
            { t: 'TRANSPORTATION', l: 'Coordinate the movement.', h: '/transportation', tint: 'linear-gradient(160deg, #101B2E 0%, #0A111E 100%)', icon: Truck },
          ].map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.t} delay={i * 90}>
                <Link href={p.h} className="group rounded-3xl border p-8 md:p-10 transition-transform hover:-translate-y-1 h-full flex flex-col"
                  style={{ borderColor: `${CORP_TEAL}33`, background: p.tint }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: `${CORP_TEAL}22` }}>
                    <Icon size={21} style={{ color: CORP_TEAL_BRIGHT }} />
                  </div>
                  <div className="text-[13px] font-black tracking-[0.22em] text-white">{p.t}</div>
                  <div className="text-[21px] font-black text-gray-100 mt-2">{p.l}</div>
                  <div className="mt-auto inline-flex items-center gap-2 pt-8 text-[14px] font-bold transition-transform group-hover:translate-x-1" style={{ color: CORP_TEAL_BRIGHT }}>
                    Explore {p.t.charAt(0) + p.t.slice(1).toLowerCase()} <ArrowRight size={15} />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 11 — COMPANY CTA ── */}
      <section className="py-28 md:py-36 px-5 relative overflow-hidden" style={{ backgroundColor: CORP_INK }}>
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[700px] h-[420px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${CORP_TEAL}20 0%, transparent 65%)` }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <Reveal>
            <h2 className="text-[36px] md:text-[56px] font-black tracking-[-0.02em] leading-[1.04] text-white">
              What are you trying to operate?
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 mt-12 text-left">
              {[
                ['A hospitality property', 'Attenda Hospitality', '/hospitality'],
                ['A business that sells', 'Attenda Serve', '/serve'],
                ['A transportation operation', 'Attenda Transportation', '/transportation'],
              ].map(([q, a, h], i) => (
                <Reveal key={h} delay={i * 80}>
                  <Link href={h} className="block rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10 transition-colors h-full">
                    <div className="text-[13px] text-gray-400 font-semibold">{q}</div>
                    <div className="text-[17px] font-black text-white mt-1.5">{a}</div>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: CORP_TEAL_BRIGHT }}>
                      Explore <ArrowRight size={14} />
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
            <Link href="/contact" className="inline-flex items-center gap-2 mt-12 px-8 py-4 rounded-xl font-semibold text-[15px] border border-white/25 text-white hover:border-white/50 transition-all">
              Talk to Attenda Technologies <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      <CorporateFooter />
    </div>
  );
}

/* ── Product card with real interface visual ── */
function ProductCard({ href, label, icon: Icon, headline, copy, cta, subline, visual }: {
  href: string; label: string; icon: typeof BedDouble; headline: React.ReactNode; copy: string;
  cta: string; subline?: string; visual: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border p-7 md:p-8 flex flex-col" style={{ borderColor: CORP_BORDER, backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}14` }}>
          <Icon size={17} style={{ color: CORP_TEAL }} />
        </div>
        <span className="text-[10.5px] font-black tracking-[0.22em] text-gray-500 uppercase">{label}</span>
      </div>
      <h3 className="text-[23px] md:text-[26px] font-black tracking-[-0.01em] leading-[1.1] text-gray-900">{headline}</h3>
      <p className="text-[14.5px] text-gray-600 leading-relaxed mt-4">{copy}</p>
      {subline && <p className="text-[13px] font-bold mt-3" style={{ color: CORP_TEAL }}>{subline}</p>}
      <div className="mt-6">{visual}</div>
      <Link href={href} className="mt-auto pt-7 inline-flex items-center gap-2 text-[15px] font-bold group w-fit" style={{ color: CORP_TEAL }}>
        {cta} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}