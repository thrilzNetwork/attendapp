'use client';

/* Attenda Technologies — corporate homepage (pastel rebuild).
   Root identity: ONE TECHNOLOGY COMPANY. MULTIPLE OPERATING ENVIRONMENTS.
   Guest QR sessions still hit / and keep working (handled in page.tsx gate).

   Design language: soft pastel cyan + white, floating white product cards,
   vibrant green CTAs, deep navy editorial type, organic cyan backdrops,
   scroll-reveal on every section. Spec: Miami SaaS premium aesthetic. */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, BedDouble, CheckCircle2, Clock,
  Eye, HeartHandshake, MessageSquare, Navigation, Radio,
  ShoppingBag, Store, Truck, Users, Workflow,
} from 'lucide-react';
import { CorporateNav, CorporateFooter, CORP_INK, CORP_MIST, CORP_BORDER, CORP_TEAL } from '@/components/corporate/Chrome';
import { LangProvider, useLang } from '@/lib/corp-lang';

/* ── Pastel palette (spec) ── */
const ICE = '#EAF9FD';          // very light cyan wash
const ICE_CARD = '#F4FCFE';
const GREEN = '#50C84F';        // CTA green
const GREEN_DEEP = '#2E9E34';
const INK = '#101827';          // near-black navy
const AQUA = '#0EA5C4';         // turquoise accent
const WHITE = '#FFFFFF';
const SOFT_BORDER = '#D8ECF3';
const CARD_SHADOW = '0 22px 55px -28px rgba(3,105,140,0.28), 0 2px 6px rgba(15,23,42,0.05)';

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

/* ── shared bits ── */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: AQUA }}>{children}</div>
  );
}

function GreenCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-bold text-[15px] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
      style={{ backgroundColor: GREEN, color: '#06301C', boxShadow: '0 14px 30px -14px rgba(80,200,79,0.55)' }}>
      {children} <ArrowRight size={16} />
    </Link>
  );
}

/* ═══════════════ LIGHT PRODUCT CARDS (hero + product sections) ═══════════════ */

function HospCard() {
  return (
    <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1px solid ${SOFT_BORDER}`, boxShadow: CARD_SHADOW }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: ICE }}>
        <div className="flex items-center gap-2">
          <BedDouble size={12} style={{ color: AQUA }} />
          <span className="text-[9px] font-black tracking-[0.2em]" style={{ color: INK }}>HOSPITALITY · OPS</span>
        </div>
        <span className="text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: 'rgba(80,200,79,0.14)', color: GREEN_DEEP }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: GREEN }} />LIVE
        </span>
      </div>
      <div className="p-4 space-y-2">
        {[
          ['Room 412', 'OCC', 'rgba(80,200,79,0.15)', GREEN_DEEP],
          ['Room 208', 'Maintenance', 'rgba(240,173,78,0.18)', '#B45309'],
          ['Room 316', 'RDY', 'rgba(14,165,196,0.14)', AQUA],
        ].map(([room, st, bg, fg], i) => (
          <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: ICE_CARD }}>
            <span className="text-[11px] font-bold" style={{ color: INK }}>{room}</span>
            <span className="text-[8.5px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: bg as string, color: fg as string }}>{st}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(14,165,196,0.07)' }}>
          <MessageSquare size={10} style={{ color: AQUA }} />
          <span className="text-[9.5px] font-semibold" style={{ color: '#0C7A96' }}>Housekeeping · towels → Room 412</span>
        </div>
      </div>
    </div>
  );
}

function ServeCard() {
  return (
    <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1px solid ${SOFT_BORDER}`, boxShadow: CARD_SHADOW }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: ICE }}>
        <div className="flex items-center gap-2">
          <Store size={12} style={{ color: AQUA }} />
          <span className="text-[9px] font-black tracking-[0.2em]" style={{ color: INK }}>SERVE · MERCHANT</span>
        </div>
        <span className="text-[8px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(80,200,79,0.14)', color: GREEN_DEEP }}>+3 TODAY</span>
      </div>
      <div className="p-4 space-y-2">
        {[
          ['#1042', 'Paid', 'rgba(80,200,79,0.15)', GREEN_DEEP],
          ['#1041', 'Delivery', 'rgba(240,173,78,0.18)', '#B45309'],
          ['#1040', 'Pickup', 'rgba(14,165,196,0.14)', AQUA],
        ].map(([id, st, bg, fg], i) => (
          <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: ICE_CARD }}>
            <span className="text-[11px] font-bold font-mono" style={{ color: INK }}>{id}</span>
            <span className="text-[8.5px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: bg as string, color: fg as string }}>{st}</span>
          </div>
        ))}
        <div className="rounded-lg px-3 pt-2 pb-1" style={{ backgroundColor: ICE_CARD }}>
          <svg viewBox="0 0 120 26" className="w-full h-6" aria-hidden>
            {[10, 14, 12, 18, 16, 22, 26].map((h, i) => (
              <rect key={i} x={i * 17 + 2} y={26 - h} width={12} height={h} rx={2.5} fill={i >= 4 ? GREEN : '#BDE9F2'} />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

function TransportCard() {
  return (
    <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1px solid ${SOFT_BORDER}`, boxShadow: CARD_SHADOW }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: ICE }}>
        <div className="flex items-center gap-2">
          <Truck size={12} style={{ color: AQUA }} />
          <span className="text-[9px] font-black tracking-[0.2em]" style={{ color: INK }}>TRANSPORT · DISPATCH</span>
        </div>
        <span className="text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: 'rgba(14,165,196,0.12)', color: AQUA }}>
          <Radio size={8} /> GPS LIVE
        </span>
      </div>
      <div className="p-4 space-y-2">
        {[
          ['Van 3 · ETA 12m', 'En route', GREEN_DEEP],
          ['Van 1 · ETA 26m', 'Scheduled', '#64748B'],
          ['Sedan 2 · Arriving', 'Arriving', GREEN_DEEP],
        ].map(([route, st, fg], i) => (
          <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: ICE_CARD }}>
            <span className="text-[10.5px] font-bold" style={{ color: INK }}>{route}</span>
            <span className="text-[8px] font-black" style={{ color: fg as string }}>{st}</span>
          </div>
        ))}
        <div className="rounded-lg relative overflow-hidden h-12" style={{ backgroundColor: ICE_CARD }}>
          <svg className="absolute inset-0 w-full h-full" aria-hidden>
            <path d="M10,32 C40,26 55,12 90,10 S112,18 132,14" stroke={AQUA} strokeWidth="1.5" fill="none" strokeDasharray="4 6" opacity="0.7" />
            <circle cx="90" cy="10" r="3" fill={GREEN} />
            <circle cx="132" cy="14" r="2.5" fill={INK} opacity="0.6" />
          </svg>
          <div className="absolute bottom-1 left-2.5 text-[7px] font-black tracking-[0.2em]" style={{ color: '#7BA7B8' }}>VEHICLE LOCATION · UPDATING</div>
        </div>
      </div>
    </div>
  );
}

/* ── Hero composition: 3 floating cards + curved connectors over organic cyan ── */
function HeroVisual() {
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
      {/* connectors behind the cards */}
      <svg className="hidden md:block absolute -top-3 left-0 right-0 w-full h-10 z-0 pointer-events-none" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden>
        <path d="M330,34 C380,6 560,4 640,12" stroke="#8FD8E8" strokeWidth="2" fill="none" strokeDasharray="5 7" />
        <path d="M620,12 C700,20 840,8 900,30" stroke="#8FD8E8" strokeWidth="2" fill="none" strokeDasharray="5 7" opacity="0.7" />
      </svg>
      {/* event pulses */}
      <div className="absolute -top-6 left-0 right-0 flex justify-center pointer-events-none z-10">
        {events.map((ev, i) => (
          <div key={ev}
            className={`absolute text-[10.5px] font-bold tracking-wide px-3 py-1.5 rounded-full border bg-white transition-all duration-700 ${pulse === i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ color: AQUA, borderColor: `${AQUA}44`, boxShadow: '0 10px 24px -14px rgba(3,105,140,0.35)' }}>
            {ev}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-start relative z-[1]">
        <div style={{ transform: pulse === 2 ? 'translateY(-4px)' : undefined, transition: 'transform 0.6s ease' }}><HospCard /></div>
        <div className="md:-translate-y-3" style={{ transform: pulse === 1 ? 'translateY(-7px)' : undefined, transition: 'transform 0.6s ease' }}><ServeCard /></div>
        <div style={{ transform: pulse === 0 ? 'translateY(-4px)' : undefined, transition: 'transform 0.6s ease' }}><TransportCard /></div>
      </div>
    </div>
  );
}

/* ═══════════════ ECOSYSTEM DIAGRAM (light) ═══════════════ */
function EcoNodeLight({ label, subKey, icon: Icon, href }: { label: string; subKey: string; icon: typeof BedDouble; href: string }) {
  const { t } = useLang();
  return (
    <Link href={href} className="block rounded-2xl bg-white p-5 text-center transition-transform hover:-translate-y-0.5"
      style={{ border: `1px solid ${SOFT_BORDER}`, boxShadow: CARD_SHADOW }}>
      <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(14,165,196,0.1)' }}>
        <Icon size={19} style={{ color: AQUA }} />
      </div>
      <div className="text-[13px] font-black tracking-[0.14em]" style={{ color: INK }}>{label}</div>
      <div className="text-[10.5px] text-gray-500 mt-1">{t(subKey)}</div>
    </Link>
  );
}

function EcosystemDiagram() {
  const { t } = useLang();
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-center mb-8">
        <div className="rounded-2xl bg-white px-8 py-4 text-center" style={{ border: `1.5px solid ${AQUA}55`, boxShadow: CARD_SHADOW }}>
          <div className="text-[16px] font-black tracking-tight" style={{ color: INK }}>ATTENDA TECHNOLOGIES</div>
          <div className="text-[10px] font-bold tracking-[0.24em] mt-1 text-gray-500">{t('home.eco.above')}</div>
        </div>
      </div>
      <div className="hidden md:flex justify-center mb-8">
        <div className="w-px h-10" style={{ background: `linear-gradient(180deg, ${AQUA}88, transparent)` }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4">
        <EcoNodeLight label="HOSPITALITY" icon={BedDouble} href="/hospitality" subKey="home.eco.node.h.sub" />
        <EcoLink label={t('home.eco.link1')} />
        <EcoNodeLight label="SERVE" icon={Store} href="/serve" subKey="home.eco.node.s.sub" />
        <EcoLink label={t('home.eco.link2')} />
        <EcoNodeLight label="TRANSPORTATION" icon={Truck} href="/transportation" subKey="home.eco.node.t.sub" />
      </div>
      {/* ecosystem flows */}
      <div className="grid md:grid-cols-3 gap-3 mt-10">
        {(['home.eco.f1', 'home.eco.f2', 'home.eco.f3'] as const).map((k) => (
          <div key={k} className="rounded-xl px-4 py-3 text-center text-[12px] font-bold" style={{ backgroundColor: WHITE, border: `1px dashed ${SOFT_BORDER}`, color: '#375B6B' }}>
            {t(k)}
          </div>
        ))}
      </div>
    </div>
  );
}

function EcoLink({ label }: { label: string }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center px-1">
      <div className="text-[17px] font-black tracking-tighter" style={{ color: AQUA }}>⇄</div>
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

/* Miami photo — generated locally, dropped into /public (Unsplash until render lands) */
const MIAMI_IMG = 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=1400&q=80';

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
    <div className="min-h-screen" style={{ backgroundColor: ICE_CARD }}>
      <style>{`
        @keyframes floaty { 0%,100% { transform: translateY(0px);} 50% { transform: translateY(-6px);} }
        @keyframes dashmove { to { stroke-dashoffset: -24; } }
        .hero-float { animation: floaty 7s ease-in-out infinite; }
        .hero-float-2 { animation: floaty 8.5s ease-in-out infinite; animation-delay: 0.6s; }
        .hero-float-3 { animation: floaty 9.5s ease-in-out infinite; animation-delay: 1.1s; }
        .connector-anim { animation: dashmove 2.4s linear infinite; }
      `}</style>
      <CorporateNav heroTone="light" accent={GREEN} />

      {/* ── HERO — pastel cyan organic backdrop, centered editorial headline ── */}
      <section className="relative overflow-hidden pt-28 md:pt-36 pb-16 md:pb-24 px-5" style={{ background: 'linear-gradient(180deg,#D8F5FA 0%,#EAF9FD 55%,#F6FCFE 100%)' }}>
        {/* organic soft shapes */}
        <div className="absolute -top-24 left-1/4 w-[520px] h-[520px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(14,165,196,0.14) 0%, transparent 65%)' }} />
        <div className="absolute top-10 -right-32 w-[460px] h-[460px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(80,200,79,0.10) 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 -left-40 w-[420px] h-[420px] rounded-[45%] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(14,165,196,0.10) 0%, transparent 62%)' }} />

        <div className="relative max-w-6xl mx-auto text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 bg-white/70 backdrop-blur" style={{ border: `1px solid ${SOFT_BORDER}` }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: GREEN }} />
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: '#3E7186' }}>ATTENDA TECHNOLOGIES · MIAMI</span>
            </div>
            <h1 className="text-[42px] md:text-[64px] lg:text-[76px] leading-[1.02] font-black tracking-[-0.025em]" style={{ color: INK }}>
              {t('home.nh.l1')}<br />{t('home.nh.l2')}<br />
              <span style={{ color: AQUA }}>{t('home.nh.l3')}</span>
            </h1>
            <p className="text-[17px] md:text-[19px] text-gray-600 leading-relaxed mt-7 max-w-2xl mx-auto">
              {t('home.nh.sub')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
              <GreenCta href="#products">{t('home.nh.cta1')}</GreenCta>
              <Link href="/company" className="text-[15px] font-bold px-2 py-3 transition-colors hover:opacity-70" style={{ color: '#3E7186' }}>
                {t('nav.discover')} →
              </Link>
            </div>
          </Reveal>

          {/* floating product cards over organic backdrop */}
          <div className="mt-16 md:mt-20 md:px-8">
            <Reveal delay={150}>
              <HeroVisual />
            </Reveal>
            {/* connected underline glow */}
            <div className="mx-auto mt-10 h-px max-w-3xl" style={{ background: 'linear-gradient(90deg, transparent, rgba(14,165,196,0.35), transparent)' }} />
          </div>
        </div>
      </section>

      {/* ── VALUE PROPOSITION — white surface, three floating value cards ── */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <Reveal>
            <SectionEyebrow>{t('home.val.eyebrow')}</SectionEyebrow>
            <h2 className="text-[32px] md:text-[46px] font-black tracking-[-0.02em] leading-[1.07]" style={{ color: INK }}>
              {t('home.val.b')}
            </h2>
          </Reveal>
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
          {[
            [Workflow, 'home.val.1t', 'home.val.1d'],
            [Eye, 'home.val.2t', 'home.val.2d'],
            [HeartHandshake, 'home.val.3t', 'home.val.3d'],
          ].map(([Icon, tk, ck], i) => {
            const I = Icon as typeof Workflow;
            return (
              <Reveal key={tk as string} delay={i * 90}>
                <div className="rounded-3xl p-8 h-full text-center" style={{ backgroundColor: ICE_CARD, border: `1px solid ${SOFT_BORDER}`, boxShadow: CARD_SHADOW }}>
                  <div className="w-11 h-11 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: 'rgba(14,165,196,0.1)' }}>
                    <I size={20} style={{ color: AQUA }} />
                  </div>
                  <div className="text-[17px] font-black" style={{ color: INK }}>{t(tk as string)}</div>
                  <p className="text-[14.5px] text-gray-600 leading-relaxed mt-2.5">{t(ck as string)}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── THREE OPERATIONS, ONE PHILOSOPHY — product cards with real mock visuals ── */}
      <section id="products" className="py-20 md:py-28 px-5 scroll-mt-24" style={{ backgroundColor: WHITE }}>
        <div className="max-w-3xl mx-auto text-center mb-14">
          <Reveal>
            <SectionEyebrow>{t('home.ops.eyebrow')}</SectionEyebrow>
            <h2 className="text-[34px] md:text-[52px] font-black tracking-[-0.02em] leading-[1.06]" style={{ color: INK }}>
              {t('home.ops.h1')}<br /><span style={{ color: AQUA }}>{t('home.ops.h2')}</span>
            </h2>
          </Reveal>
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
          <Reveal delay={0}>
            <ProductCard label="ATTENDA HOSPITALITY" headline={t('home.p1.h')} copy={t('home.p1.b')} cta={t('home.p1.cta')} href="/hospitality" visual={<HospCard />} />
          </Reveal>
          <Reveal delay={90}>
            <ProductCard label="ATTENDA SERVE" headline={t('home.p2.h')} copy={t('home.p2.b')} cta={t('home.p2.cta')} href="/serve" visual={<ServeCard />} />
          </Reveal>
          <Reveal delay={180}>
            <ProductCard label="ATTENDA TRANSPORTATION" headline={t('home.p3.h')} copy={t('home.p3.b')} cta={t('home.p3.cta')} href="/transportation" visual={<TransportCard />} />
          </Reveal>
        </div>
      </section>

      {/* ── THE ECOSYSTEM ── */}
      <section className="py-20 md:py-28 px-5" style={{ backgroundColor: ICE }}>
        <div className="max-w-3xl mx-auto text-center mb-14">
          <Reveal>
            <SectionEyebrow>{t('home.eco.eyebrow')}</SectionEyebrow>
            <h2 className="text-[34px] md:text-[50px] font-black tracking-[-0.02em] leading-[1.06]" style={{ color: INK }}>
              {t('home.eco.h1')}<br />{t('home.eco.h2')}
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-6">{t('home.eco.p1')}</p>
          </Reveal>
        </div>
        <Reveal><EcosystemDiagram /></Reveal>
        <div className="max-w-4xl mx-auto mt-14 grid md:grid-cols-3 gap-4">
          {CONNECTIONS.map((c, i) => (
            <Reveal key={c.pairKey} delay={i * 80}>
              <div className="rounded-2xl p-6 h-full" style={{ backgroundColor: WHITE, border: `1px solid ${SOFT_BORDER}`, boxShadow: CARD_SHADOW }}>
                <div className="text-[10.5px] font-black tracking-[0.16em] mb-3" style={{ color: AQUA }}>{t(c.pairKey)}</div>
                <p className="text-[14px] text-gray-600 leading-relaxed">{t(c.copyKey)}</p>
                <div className="text-[12px] font-bold text-gray-800 mt-4 font-mono">{t(c.chainKey)}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-center text-[13px] text-gray-500 mt-8 max-w-2xl mx-auto">{t('home.eco.note')}</p>
      </section>

      {/* ── PHILOSOPHY — oversized editorial statement on ice gradient ── */}
      <section className="py-24 md:py-36 px-5 relative overflow-hidden" style={{ background: 'linear-gradient(180deg,#D8F5FA 0%,#EFFBFE 100%)' }}>
        <div className="absolute -top-20 right-1/4 w-[380px] h-[380px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(14,165,196,0.12) 0%, transparent 62%)' }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <Reveal>
            <h2 className="text-[30px] md:text-[46px] font-black tracking-[-0.02em] leading-[1.1]" style={{ color: INK }}>
              {t('home.phi.1a')}
            </h2>
            <h2 className="text-[30px] md:text-[46px] font-black tracking-[-0.02em] leading-[1.1] mt-4" style={{ color: AQUA }}>
              {t('home.phi.1b')}
            </h2>
            <p className="text-[18px] md:text-[20px] font-semibold mt-10" style={{ color: '#3E7186' }}>
              {t('home.phi.b')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── REAL WORK AROUND THE OPERATION ── */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <SectionEyebrow>{t('home.rw.eyebrow')}</SectionEyebrow>
            <h2 className="text-[34px] md:text-[48px] font-black tracking-[-0.02em] mb-14 leading-[1.06]" style={{ color: INK }}>{t('home.rw.h')}</h2>
          </Reveal>
          <div className="space-y-6">
            {REAL_WORK.map((r, i) => (
              <Reveal key={r.titleKey} delay={i * 80}>
                <div className="rounded-2xl p-7 md:p-9" style={{ backgroundColor: ICE_CARD, border: `1px solid ${SOFT_BORDER}` }}>
                  <div className="text-[12px] font-black tracking-[0.2em] mb-5" style={{ color: AQUA }}>{t(r.titleKey)}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    {r.steps.map((s, j) => (
                      <span key={s} className="flex items-center gap-2.5">
                        <span className="text-[15px] font-bold" style={{ color: '#24404E' }}>{s}</span>
                        {j < r.steps.length - 1 && <ArrowRight size={14} style={{ color: `${AQUA}88` }} />}
                      </span>
                    ))}
                  </div>
                  <div className="text-[15px] font-black mt-5" style={{ color: INK }}>{t(r.lineKey)}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="text-center text-[26px] md:text-[36px] font-black tracking-[-0.02em] mt-16" style={{ color: INK }}>
              {t('home.rw.final')} <span style={{ color: AQUA }}>{t('home.rw.final2')}</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── BUILT IN MIAMI — photo + copy ── */}
      <section className="py-20 md:py-28 px-5" style={{ backgroundColor: ICE_CARD }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <Reveal>
            <SectionEyebrow>{t('home.mia.eyebrow')}</SectionEyebrow>
            <h2 className="text-[34px] md:text-[50px] font-black tracking-[-0.02em] leading-[1.05]" style={{ color: INK }}>
              {t('home.mia.h1')}<br /><span style={{ color: AQUA }}>{t('home.mia.h2')}</span>
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-6 max-w-lg">
              {t('home.mia.b')}
            </p>
            <Link href="/company" className="inline-flex items-center gap-2 mt-7 text-[15px] font-bold group" style={{ color: AQUA }}>
              {t('home.company.story')} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative rounded-3xl overflow-hidden shadow-xl" style={{ minHeight: 380, boxShadow: CARD_SHADOW }}>
              <Image src={MIAMI_IMG} alt="Miami — Attenda Technologies' home" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,15,20,0.02) 40%, rgba(8,15,20,0.72) 100%)' }} />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="text-[11px] font-black tracking-[0.3em] text-white/85">MIAMI · FLORIDA</div>
                <div className="text-[26px] font-black text-white mt-1" style={{ textShadow: '0 2px 14px rgba(8,15,20,0.5)' }}>
                  {t('home.mia.badge')}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── GLOBAL / LATAM ── */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="text-[34px] md:text-[50px] font-black tracking-[-0.02em] leading-[1.06]" style={{ color: INK }}>
              {t('home.latam.h1')}<br /><span style={{ color: AQUA }}>{t('home.latam.h2')}</span>
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-6">{t('home.latam.p')}</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-4 mt-10 text-left">
            {[
              ['home.latam.t1', 'home.latam.t1c', BedDouble, '/hospitality'],
              ['home.latam.t2', 'home.latam.t2c', Store, '/serve'],
              ['home.latam.t3', 'home.latam.t3c', Truck, '/transportation'],
            ].map(([tk, ck, Icon, href], i) => (
              <Reveal key={tk as string} delay={i * 80}>
                <Link href={href as string} className="block rounded-2xl p-6 hover:-translate-y-0.5 transition-transform" style={{ border: `1px solid ${SOFT_BORDER}`, backgroundColor: ICE_CARD }}>
                  <div className="text-[12px] font-black tracking-[0.18em] uppercase" style={{ color: AQUA }}>{t(tk as string)}</div>
                  <p className="text-[14.5px] text-gray-600 mt-2.5 leading-relaxed">{t(ck as string)}</p>
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="text-[22px] md:text-[30px] font-black tracking-[-0.02em] mt-14" style={{ color: INK }}>
              {t('home.latam.final')}<br /><span style={{ color: AQUA }}>{t('home.latam.final2')}</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── HOW WE BUILD ── */}
      <section className="py-20 md:py-28 px-5" style={{ backgroundColor: ICE_CARD }}>
        <div className="max-w-5xl mx-auto">
          <div className="max-w-3xl mb-14">
            <Reveal>
              <SectionEyebrow>{t('home.how.eyebrow')}</SectionEyebrow>
              <h2 className="text-[34px] md:text-[50px] font-black tracking-[-0.02em] leading-[1.06]" style={{ color: INK }}>
                {t('home.how.h1')}<br />{t('home.how.h2')}
              </h2>
              <p className="text-[17px] text-gray-600 leading-relaxed mt-6">{t('home.how.p')}</p>
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
                <div className="rounded-2xl p-6 h-full" style={{ backgroundColor: WHITE, border: `1px solid ${SOFT_BORDER}`, boxShadow: CARD_SHADOW }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(14,165,196,0.1)' }}>
                    <Icon size={17} style={{ color: AQUA }} />
                  </div>
                  <div className="text-[15px] font-black" style={{ color: INK }}>{t(tk as string)}</div>
                  <p className="text-[14px] text-gray-600 mt-1.5 leading-relaxed">{t(ck as string)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA — deep navy close, green pill ── */}
      <section className="py-28 md:py-36 px-5 relative overflow-hidden" style={{ backgroundColor: INK }}>
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[700px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(14,165,196,0.22) 0%, transparent 65%)' }} />
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
                  <Link href={h} className="block rounded-2xl border border-white/12 bg-white/5 p-6 hover:bg-white/10 transition-colors h-full">
                    <div className="text-[13px] text-gray-400 font-semibold">{t(qk)}</div>
                    <div className="text-[17px] font-black text-white mt-1.5">{a}</div>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#7EE180' }}>
                      {t('home.tiles.explore')} <ArrowRight size={14} />
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
            <Link href="/contact"
              className="inline-flex items-center gap-2 mt-12 px-9 py-4 rounded-full font-bold text-[15px] transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: GREEN, color: '#06301C', boxShadow: '0 16px 40px -16px rgba(80,200,79,0.5)' }}>
              {t('home.cta.talk')} <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      <CorporateFooter />
    </div>
  );
}

/* ── Product card (light surface with mini interface) ── */
function ProductCard({ href, label, headline, copy, cta, visual }: {
  href: string; label: string; headline: string; copy: string; cta: string; visual: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl p-7 md:p-8 flex flex-col h-full" style={{ backgroundColor: ICE_CARD, border: `1px solid ${SOFT_BORDER}`, boxShadow: CARD_SHADOW }}>
      <span className="text-[10.5px] font-black tracking-[0.22em] uppercase" style={{ color: AQUA }}>{label}</span>
      <h3 className="text-[23px] md:text-[26px] font-black tracking-[-0.01em] leading-[1.12] mt-3" style={{ color: INK }}>{headline}</h3>
      <p className="text-[14.5px] text-gray-600 leading-relaxed mt-4">{copy}</p>
      <div className="mt-7">{visual}</div>
      <Link href={href} className="mt-auto pt-7 inline-flex self-start items-center gap-2 px-5 py-2.5 rounded-full text-[13.5px] font-bold transition-all hover:-translate-y-0.5 group"
        style={{ backgroundColor: GREEN, color: '#06301C' }}>
        {cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}