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
import { LangProvider, useLang } from '@/lib/corp-lang';

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
  const { t } = useLang();
  const nodes = [
    { label: 'HOSPITALITY', icon: BedDouble, href: '/hospitality', tint: 'linear-gradient(160deg,#0F2E33,#0A1A1F)', subKey: 'home.eco.node.h.sub' },
    { label: 'TRANSPORTATION', icon: Truck, href: '/transportation', tint: 'linear-gradient(160deg,#101B2E,#0A111E)', subKey: 'home.eco.node.t.sub' },
    { label: 'SERVE', icon: Store, href: '/serve', tint: 'linear-gradient(160deg,#172A26,#0E1A17)', subKey: 'home.eco.node.s.sub' },
  ] as const;
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-center mb-8">
        <div className="rounded-2xl border-2 px-8 py-4 text-center" style={{ borderColor: CORP_TEAL, backgroundColor: 'rgba(21,138,124,0.08)' }}>
          <div className="text-[16px] font-black tracking-tight" style={{ color: CORP_TEAL }}>ATTENDA TECHNOLOGIES</div>
          <div className="text-[10px] font-bold tracking-[0.24em] mt-1 text-gray-500">{t('home.eco.above')}</div>
        </div>
      </div>
      <div className="hidden md:flex justify-center mb-8">
        <div className="w-px h-10" style={{ background: `linear-gradient(180deg, ${CORP_TEAL}88, transparent)` }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4">
        <EcoNode {...nodes[0]} />
        <EcoLink label={t('home.eco.link1')} />
        <EcoNode {...nodes[2]} />
        <EcoLink label={t('home.eco.link2')} />
        <EcoNode {...nodes[1]} />
      </div>
    </div>
  );
}

function EcoNode({ label, subKey, icon: Icon, href, tint }: { label: string; subKey: string; icon: typeof BedDouble; href: string; tint: string }) {
  const { t } = useLang();
  return (
    <Link href={href} className="block rounded-2xl border p-5 text-center transition-transform hover:-translate-y-0.5"
      style={{ borderColor: `${CORP_TEAL}44`, background: tint }}>
      <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}22` }}>
        <Icon size={19} style={{ color: CORP_TEAL_BRIGHT }} />
      </div>
      <div className="text-[13px] font-black tracking-[0.14em] text-white">{label}</div>
      <div className="text-[10.5px] text-gray-400 mt-1">{t(subKey)}</div>
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
  { pairKey: 'home.eco.conn1.title', copyKey: 'home.eco.conn1.copy', chainKey: 'home.eco.conn1.chain' },
  { pairKey: 'home.eco.conn2.title', copyKey: 'home.eco.conn2.copy', chainKey: 'home.eco.conn2.chain' },
  { pairKey: 'home.eco.conn3.title', copyKey: 'home.eco.conn3.copy', chainKey: 'home.eco.conn3.chain' },
] as const;

const REAL_WORK = [
  { titleKey: 'home.rw.hotel', steps: ['Front desk.', 'Housekeeping.', 'Maintenance.', 'Guest request.', 'Manager.'], lineKey: 'home.rw.hotel.line' },
  { titleKey: 'home.rw.biz', steps: ['Customer.', 'Order.', 'Payment.', 'WhatsApp.', 'Staff.'], lineKey: 'home.rw.biz.line' },
  { titleKey: 'home.rw.trans', steps: ['Passenger.', 'Dispatcher.', 'Vehicle.', 'Driver.', 'Destination.'], lineKey: 'home.rw.trans.line' },
] as const;

export default function CorporateHomePage() {
  return (
    <LangProvider>
      <CorpHomeInner />
    </LangProvider>
  );
}

function CorpHomeInner() {
  const { t } = useLang();
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
              <span className="text-[11px] font-bold text-white/80 tracking-[0.2em] uppercase">{t('home.hero.badge')}</span>
            </div>
            <h1 className="text-[40px] md:text-[58px] lg:text-[66px] leading-[1.01] font-black tracking-[-0.02em] text-white">
              {t('home.hero.l1')}<br />
              <span style={{ color: CORP_TEAL_BRIGHT }}>{t('home.hero.l2')}</span>
            </h1>
            <p className="text-[17px] md:text-[19px] text-gray-300 leading-relaxed mt-6 max-w-xl">
              {t('home.hero.sub')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-9">
              <a href="#products"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-[15px] transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: CORP_TEAL_BRIGHT, color: CORP_INK }}>
                Explore our products <ArrowRight size={17} />
              </a>
              <Link href="/company" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[15px] border border-white/20 text-white/90 hover:text-white hover:border-white/40 transition-all">
                {t('nav.discover')} <ArrowRight size={16} />
              </Link>
            </div>
            <div className="mt-9 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CORP_TEAL_BRIGHT }} />
              <p className="text-[13px] text-white/60 font-medium">{t('home.hero.built')}</p>
            </div>
          </div>
          <EcosystemHeroVisual />
        </div>
      </section>

      {/* ── SECTION 2 — WHAT WE BUILD ── */}
      <section className="py-20 md:py-32 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Reveal>
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>{t('home.wwb.eyebrow')}</div>
            <h2 className="text-[34px] md:text-[50px] font-black tracking-[-0.02em] leading-[1.06] text-gray-900">
              {t('home.wwb.h1')}<br />{t('home.wwb.h2')}
            </h2>
            <p className="text-[17px] md:text-[18px] text-gray-600 leading-relaxed mt-6">
              {t('home.wwb.p1')}
            </p>
            <p className="text-[17px] md:text-[18px] text-gray-800 font-semibold mt-4">
              {t('home.wwb.p2')}
            </p>
          </Reveal>
        </div>
        {/* three large product cards — real mini interfaces */}
        <div id="products" className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5 scroll-mt-24">
          <Reveal delay={0}><ProductCard
            href="/hospitality" label="HOSPITALITY OPERATIONS" icon={BedDouble}
            headline={t('home.card.h.head')}
            copy={t('home.card.h.copy')}
            cta={t('home.card.h.cta')}
            visual={<HospitalityInterface active={false} />} /></Reveal>
          <Reveal delay={90}><ProductCard
            href="/serve" label="COMMERCE" icon={Store}
            headline={<>TU NEGOCIO.<br />TU CANAL.<br />TUS CLIENTES.</>}
            copy={t('home.card.s.copy')}
            cta={t('home.card.s.cta')} subline="No otro marketplace. Tu propio canal."
            visual={<ServeInterface active={false} />} /></Reveal>
          <Reveal delay={180}><ProductCard
            href="/transportation" label="TRANSPORTATION" icon={Truck}
            headline={t('home.card.t.head')}
            copy={t('home.card.t.copy')}
            cta={t('home.card.t.cta')}
            visual={<TransportInterface active={false} />} /></Reveal>
        </div>
      </section>

      {/* ── SECTION 3 — THE ATTENDA IDEA ── */}
      <section className="py-20 md:py-32 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>{t('home.idea.eyebrow')}</div>
            <h2 className="text-[32px] md:text-[48px] font-black tracking-[-0.02em] leading-[1.08] text-gray-900">
              {t('home.idea.h1')}<br />
              <span className="text-gray-500">{t('home.idea.h2')}</span>
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-7">
              {t('home.idea.p1')}
            </p>
            <p className="text-[19px] md:text-[22px] text-gray-900 font-black mt-6">
              {t('home.idea.p2')}
            </p>
            <p className="text-[17px] text-gray-600 mt-4">
              {t('home.idea.p3')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 4 — THE ECOSYSTEM ── */}
      <section className="py-20 md:py-32 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <Reveal>
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>{t('home.eco.eyebrow')}</div>
            <h2 className="text-[34px] md:text-[50px] font-black tracking-[-0.02em] leading-[1.06] text-gray-900">
              {t('home.eco.h1')}<br />{t('home.eco.h2')}
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
              {t('home.eco.p1')}
            </p>
          </Reveal>
        </div>
        <Reveal><EcosystemDiagram /></Reveal>
        <div className="max-w-4xl mx-auto mt-16 grid md:grid-cols-3 gap-4">
          {CONNECTIONS.map((c, i) => (
            <Reveal key={c.pairKey} delay={i * 80}>
              <div className="rounded-2xl border p-6 h-full" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
                <div className="text-[10.5px] font-black tracking-[0.16em] mb-3" style={{ color: CORP_TEAL }}>{t(c.pairKey)}</div>
                <p className="text-[14px] text-gray-600 leading-relaxed">{t(c.copyKey)}</p>
                <div className="text-[12px] font-bold text-gray-800 mt-4 font-mono">{t(c.chainKey)}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-center text-[13px] text-gray-500 mt-8 max-w-2xl mx-auto">
          {t('home.eco.note')}
        </p>
      </section>

      {/* ── SECTION 5 — ONE PRINCIPLE (dark, oversized) ── */}
      <section className="py-28 md:py-40 px-5 relative overflow-hidden" style={{ backgroundColor: CORP_INK }}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <Reveal>
            <h2 className="text-[32px] md:text-[52px] font-black tracking-[-0.02em] leading-[1.06] text-white">
              {t('home.prin.h1')}<br />{t('home.prin.h2')}
            </h2>
            <h3 className="text-[26px] md:text-[40px] font-black tracking-[-0.02em] leading-[1.1] mt-10" style={{ color: CORP_TEAL_BRIGHT }}>
              {t('home.prin.h3')}<br />{t('home.prin.h4')}
            </h3>
            <p className="text-[16px] md:text-[17px] text-gray-400 leading-relaxed mt-10 max-w-2xl mx-auto">
              {t('home.prin.p')}
            </p>
            <p className="text-[18px] md:text-[21px] font-black text-white mt-10">
              {t('home.prin.p2')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 6 — BUILT AROUND REAL WORK ── */}
      <section className="py-20 md:py-32 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>{t('home.rw.eyebrow')}</div>
            <h2 className="text-[34px] md:text-[48px] font-black tracking-[-0.02em] text-gray-900 mb-14 leading-[1.06]">{t('home.rw.h')}</h2>
          </Reveal>
          <div className="space-y-6">
            {REAL_WORK.map((r, i) => (
              <Reveal key={r.titleKey} delay={i * 80}>
                <div className="rounded-2xl border p-7 md:p-9" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
                  <div className="text-[12px] font-black tracking-[0.2em] mb-5" style={{ color: CORP_TEAL }}>{t(r.titleKey)}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    {r.steps.map((s, j) => (
                      <span key={s} className="flex items-center gap-2.5">
                        <span className="text-[15px] font-bold text-gray-800">{s}</span>
                        {j < r.steps.length - 1 && <ArrowRight size={14} className="text-gray-400" />}
                      </span>
                    ))}
                  </div>
                  <div className="text-[15px] font-black text-gray-900 mt-5">{t(r.lineKey)}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="text-center text-[26px] md:text-[36px] font-black tracking-[-0.02em] text-gray-900 mt-16">
              {t('home.rw.final')} <span style={{ color: CORP_TEAL }}>{t('home.rw.final2')}</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 7 — COMPANY + MIAMI ── */}
      <section className="py-20 md:py-32 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>{t('home.company.eyebrow')}</div>
            <h2 className="text-[34px] md:text-[48px] font-black tracking-[-0.02em] leading-[1.08] text-gray-900">
              {t('home.company.h1')}<br />{t('home.company.h2')}
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
              {t('home.company.p1a')}<strong className="text-gray-900">{t('home.company.p1b')}</strong>
            </p>
            <p className="text-[16px] text-gray-600 leading-relaxed mt-4">
              {t('home.company.p2')}
            </p>
            <Link href="/company" className="inline-flex items-center gap-2 mt-7 text-[15px] font-bold" style={{ color: CORP_TEAL }}>
              {t('home.company.story')} <ArrowRight size={16} />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative rounded-3xl overflow-hidden border shadow-xl" style={{ borderColor: CORP_BORDER, minHeight: 380 }}>
              <Image src="https://images.unsplash.com/photo-1534482421-64566f976cfa?w=1400&q=80" alt="Miami — Attenda Technologies' home" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,15,20,0.08) 30%, rgba(8,15,20,0.88) 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="text-[11px] font-black tracking-[0.3em] text-white/80">{t('home.company.miami.badge')}</div>
                <div className="text-[28px] font-black text-white mt-1">{t('home.company.miami.h')}</div>
                <p className="text-[13.5px] text-gray-200 leading-relaxed mt-2 max-w-md">
                  {t('home.company.miami.p')}
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
              {t('home.latam.h1')}<br /><span style={{ color: CORP_TEAL }}>{t('home.latam.h2')}</span>
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
              {t('home.latam.p')}
            </p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-4 mt-10 text-left">
            {[
              ['home.latam.t1', 'home.latam.t1c', BedDouble, '/hospitality'],
              ['home.latam.t2', 'home.latam.t2c', Store, '/serve'],
              ['home.latam.t3', 'home.latam.t3c', Truck, '/transportation'],
                        ].map(([tk, ck, Icon, href], i) => (
              <Reveal key={tk as string} delay={i * 80}>
                <Link href={href as string} className="block rounded-2xl border p-6 hover:-translate-y-0.5 transition-transform" style={{ borderColor: CORP_BORDER }}>
                  <div className="text-[12px] font-black tracking-[0.18em] uppercase" style={{ color: CORP_TEAL }}>{t(tk as string)}</div>
                  <p className="text-[14.5px] text-gray-600 mt-2.5 leading-relaxed">{t(ck as string)}</p>
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="text-[22px] md:text-[30px] font-black tracking-[-0.02em] text-gray-900 mt-14">
              {t('home.latam.final')}<br /><span style={{ color: CORP_TEAL }}>{t('home.latam.final2')}</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 9 — TECHNOLOGY / HOW WE BUILD ── */}
      <section className="py-20 md:py-32 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-5xl mx-auto">
          <div className="max-w-3xl mb-14">
            <Reveal>
              <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>{t('home.how.eyebrow')}</div>
              <h2 className="text-[34px] md:text-[50px] font-black tracking-[-0.02em] leading-[1.06] text-gray-900">
                {t('home.how.h1')}<br />{t('home.how.h2')}
              </h2>
              <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
                {t('home.how.p')}
              </p>
            </Reveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ['home.how.1t', 'home.how.1c', Radio],
              ['home.how.2t', 'home.how.2c', Users],
              ['home.how.3t', 'home.how.3c', Clock],
              ['home.how.4t', 'home.how.4c', MessageSquare],
              ['home.how.5t', 'home.how.5c', ShoppingBag],
              ['home.how.6t', 'home.how.6c', Navigation],
            ].map(([tk, ck, Icon], i) => (
              <Reveal key={tk as string} delay={(i % 3) * 70}>
                <div className="rounded-2xl bg-white border p-6 h-full" style={{ borderColor: CORP_BORDER }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${CORP_TEAL}14` }}>
                    <Icon size={17} style={{ color: CORP_TEAL }} />
                  </div>
                  <div className="text-[15px] font-black text-gray-900">{t(tk as string)}</div>
                  <p className="text-[14px] text-gray-600 mt-1.5 leading-relaxed">{t(ck as string)}</p>
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
            { t: 'HOSPITALITY', lKey: 'home.tiles.h.t', h: '/hospitality', tint: 'linear-gradient(160deg, #0F2E33 0%, #0A1A1F 100%)', icon: BedDouble },
            { t: 'SERVE', lKey: 'home.tiles.s.l', h: '/serve', tint: 'linear-gradient(160deg, #172A26 0%, #0E1A17 100%)', icon: Store },
            { t: 'TRANSPORTATION', lKey: 'home.tiles.t.l', h: '/transportation', tint: 'linear-gradient(160deg, #101B2E 0%, #0A111E 100%)', icon: Truck },
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
                  <div className="text-[21px] font-black text-gray-100 mt-2">{t(p.lKey)}</div>
                  <div className="mt-auto inline-flex items-center gap-2 pt-8 text-[14px] font-bold transition-transform group-hover:translate-x-1" style={{ color: CORP_TEAL_BRIGHT }}>
                    {t('home.tiles.explore')} {p.t.charAt(0) + p.t.slice(1).toLowerCase()} <ArrowRight size={15} />
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
              {t('home.cta.h')}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 mt-12 text-left">
              {[
                ['home.cta.q1', 'Attenda Hospitality', '/hospitality'],
                ['home.cta.q2', 'Attenda Serve', '/serve'],
                ['home.cta.q3', 'Attenda Transportation', '/transportation'],
              ].map(([qk, a, h], i) => (
                <Reveal key={h} delay={i * 80}>
                  <Link href={h} className="block rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10 transition-colors h-full">
                    <div className="text-[13px] text-gray-400 font-semibold">{t(qk)}</div>
                    <div className="text-[17px] font-black text-white mt-1.5">{a}</div>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: CORP_TEAL_BRIGHT }}>
                      {t('home.tiles.explore')} <ArrowRight size={14} />
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
            <Link href="/contact" className="inline-flex items-center gap-2 mt-12 px-8 py-4 rounded-xl font-semibold text-[15px] border border-white/25 text-white hover:border-white/50 transition-all">
              {t('home.cta.talk')} <ArrowRight size={16} />
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