'use client';

/* Attenda Technologies — corporate homepage (Adiyo-style pastel rebuild v2).
   Root identity: ONE TECHNOLOGY COMPANY. MULTIPLE OPERATING ENVIRONMENTS.
   Guest QR sessions still hit / and keep working (handled in page.tsx gate).

   Design language: white + soft pastel cyan, minimal white nav, floating
   operational dashboard cards over oversized rounded cyan organic shapes,
   green pill CTAs (#54C84F), deep navy editorial type, turquoise accents,
   scroll-reveal on every section. Full EN/ES. */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, BedDouble, Bell, CheckCircle2, MessageSquare, Radio,
  Store, Truck, Wifi,
} from 'lucide-react';
import { CorporateNav } from '@/components/corporate/Chrome';
import { LangProvider, useLang } from '@/lib/corp-lang';

/* ── Palette (exact spec) ── */
const HERO = 'linear-gradient(180deg, #F9FEFF 0%, #F0FBFE 55%, #D6F4FA 100%)';
const BTN = '#54C84F';
const BTN_DEEP = '#2E9E34';
const INK = '#111827';
const SUB = '#737B85';
const BORDER = '#E8F0F2';
const AQUA = '#61C7D4';
const AQUA_DEEP = '#2C93A3';
const CYAN_CARD = '#D4F2F8';
const SECTION_TINT = '#F4FCFE';
const SHADOW = '0 30px 60px -30px rgba(57, 119, 137, 0.18), 0 2px 8px rgba(57, 119, 137, 0.06)';
const SHADOW_SM = '0 18px 40px -24px rgba(57, 119, 137, 0.22), 0 1px 4px rgba(57, 119, 137, 0.05)';

const FONT = 'var(--font-jakarta), Inter, -apple-system, sans-serif';

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

function GreenPill({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-full font-bold text-[15px] text-white transition-all hover:-translate-y-0.5 active:scale-[0.98] ${className}`}
      style={{ backgroundColor: BTN, padding: '12px 26px', boxShadow: '0 14px 30px -14px rgba(84,200,79,0.55)' }}>
      {children}
    </Link>
  );
}

function SectionHead({ eyebrow, children, sub }: { eyebrow?: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="max-w-3xl mx-auto text-center mb-14 md:mb-20 px-5">
      <Reveal>
        {eyebrow && <div className="text-[12px] font-extrabold tracking-[0.3em] uppercase mb-5" style={{ color: AQUA }}>{eyebrow}</div>}
        <h2 className="text-[34px] md:text-[52px] font-extrabold tracking-[-0.035em] leading-[1.05]" style={{ color: INK }}>{children}</h2>
        {sub && <p className="text-[17px] leading-relaxed mt-6" style={{ color: SUB }}>{sub}</p>}
      </Reveal>
    </div>
  );
}

/* ═══════════════ HERO FLOATING CARDS ═══════════════ */

function Chip({ icon: Icon, tint }: { icon: typeof BedDouble; tint: string }) {
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: tint }}>
      <Icon size={12} style={{ color: INK }} />
    </div>
  );
}

function HospFloatCard() {
  const rows = [
    { icon: BedDouble, label: 'Room 412 · OCC', tint: 'rgba(84,200,79,0.16)' },
    { icon: Wifi, label: 'Housekeeping', tint: 'rgba(97,199,212,0.20)' },
    { icon: MessageSquare, label: 'Guest requests', tint: 'rgba(97,199,212,0.14)' },
    { icon: CheckCircle2, label: 'Maintenance', tint: 'rgba(17,24,39,0.07)' },
  ];
  return (
    <div className="rounded-2xl bg-white p-4" style={{ boxShadow: SHADOW_SM, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-3">
        <BedDouble size={13} style={{ color: AQUA }} />
        <span className="text-[9px] font-extrabold tracking-[0.18em]" style={{ color: SUB }}>HOSPITALITY</span>
        <span className="ml-auto flex items-center gap-1 text-[8px] font-extrabold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(84,200,79,0.14)', color: BTN_DEEP }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: BTN }} />LIVE
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ backgroundColor: '#FAFDFE', border: `1px solid ${BORDER}` }}>
            <Chip icon={r.icon} tint={r.tint} />
            <span className="text-[11.5px] font-semibold" style={{ color: INK }}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EcoCenterCard() {
  return (
    <div className="rounded-3xl relative overflow-hidden" style={{ backgroundColor: CYAN_CARD, boxShadow: SHADOW, border: `1px solid ${BORDER}` }}>
      {/* glowing particles */}
      <div className="absolute top-5 left-8 w-1.5 h-1.5 rounded-full bg-white" style={{ boxShadow: '0 0 10px 2px rgba(255,255,255,0.9)' }} />
      <div className="absolute top-12 right-10 w-1 h-1 rounded-full bg-white/90" style={{ boxShadow: '0 0 8px 2px rgba(255,255,255,0.8)' }} />
      <div className="absolute bottom-8 left-12 w-1 h-1 rounded-full bg-white/80" style={{ boxShadow: '0 0 8px 2px rgba(255,255,255,0.7)' }} />
      <div className="relative flex items-center justify-center" style={{ minHeight: 300 }}>
        <svg viewBox="0 0 220 200" className="absolute inset-0 w-full h-full" aria-hidden>
          <path d="M62,58 C85,80 95,90 108,98" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.85" />
          <path d="M160,55 C140,80 125,90 112,98" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.85" />
          <path d="M110,165 C110,145 110,135 110,122" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.85" />
        </svg>
        {/* central glowing node */}
        <div className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle at 35% 30%, #FFFFFF, #DFF6FB 60%, #C2ECF4)', boxShadow: '0 0 34px 10px rgba(255,255,255,0.65), 0 10px 26px -10px rgba(57,119,137,0.35)' }}>
          <div className="w-6 h-6 rounded-full" style={{ background: 'radial-gradient(circle at 40% 35%, #54C84F, #2E9E34)' }} />
        </div>
        {/* three product chips */}
        <div className="absolute top-8 left-10 z-10 w-11 h-11 rounded-2xl bg-white flex items-center justify-center" style={{ boxShadow: SHADOW_SM }}><BedDouble size={17} style={{ color: INK }} /></div>
        <div className="absolute top-6 right-10 z-10 w-11 h-11 rounded-2xl bg-white flex items-center justify-center" style={{ boxShadow: SHADOW_SM }}><Store size={17} style={{ color: INK }} /></div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-11 h-11 rounded-2xl bg-white flex items-center justify-center" style={{ boxShadow: SHADOW_SM }}><Truck size={17} style={{ color: INK }} /></div>
      </div>
      <div className="relative text-center pb-5 -mt-1">
        <span className="text-[9px] font-extrabold tracking-[0.22em]" style={{ color: '#38778B' }}>ONE ECOSYSTEM</span>
      </div>
    </div>
  );
}

function MetricCard({ big, small }: { big: string; small: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 text-left" style={{ boxShadow: SHADOW_SM, border: `1px solid ${BORDER}` }}>
      <div className="text-[34px] font-extrabold tracking-[-0.02em] leading-none" style={{ color: INK }}>{big}</div>
      <div className="text-[11px] font-semibold mt-1.5 leading-snug" style={{ color: SUB }}>{small}</div>
    </div>
  );
}

function TeamCard() {
  return (
    <div className="rounded-2xl bg-white p-4 flex items-center gap-3" style={{ boxShadow: SHADOW_SM, border: `1px solid ${BORDER}` }}>
      <div className="flex -space-x-2">
        {[
          ['AM', 'rgba(84,200,79,0.25)'],
          ['JR', 'rgba(97,199,212,0.30)'],
          ['LC', 'rgba(17,24,39,0.10)'],
          ['+', 'rgba(244,252,254,1)'],
        ].map(([txt, bg], i) => (
          <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-extrabold"
            style={{ backgroundColor: bg as string, color: INK }}>{txt}</div>
        ))}
      </div>
      <div>
        <div className="text-[11.5px] font-bold" style={{ color: INK }}>Equipos operativos</div>
        <div className="text-[9.5px] font-semibold" style={{ color: SUB }}>Conectados en vivo</div>
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto max-w-[1080px] px-5 md:px-0 select-none">
      {/* oversized rounded cyan organic shapes UNDER the cards */}
      <div className="hidden md:block absolute top-10 left-[2%] w-[46%] h-[62%] rounded-[48px] pointer-events-none" style={{ backgroundColor: '#D6F4FA', transform: 'rotate(-2deg)' }} />
      <div className="hidden md:block absolute bottom-6 right-[4%] w-[40%] h-[48%] rounded-[48px] pointer-events-none" style={{ backgroundColor: '#E2F8FC', transform: 'rotate(2.5deg)' }} />
      <div className="hidden md:block absolute top-[8%] right-[30%] w-[24%] h-[70%] rounded-[48px] pointer-events-none" style={{ backgroundColor: '#DFF7FB' }} />

      {/* connector lines */}
      <svg className="hidden md:block absolute inset-0 w-full h-full z-[1] pointer-events-none" viewBox="0 0 1080 620" fill="none" preserveAspectRatio="none" aria-hidden>
        <path className="connector-anim" d="M300,210 C380,150 470,160 540,205" stroke={AQUA} strokeWidth="1.6" strokeDasharray="5 8" opacity="0.7" />
        <path className="connector-anim" d="M660,190 C740,150 800,170 850,215" stroke={AQUA} strokeWidth="1.6" strokeDasharray="5 8" opacity="0.7" />
        <path className="connector-anim" d="M560,330 C620,380 680,400 750,410" stroke={AQUA} strokeWidth="1.6" strokeDasharray="5 8" opacity="0.55" />
        <path className="connector-anim" d="M180,400 C280,450 420,470 540,455" stroke={AQUA} strokeWidth="1.6" strokeDasharray="5 8" opacity="0.55" />
      </svg>

      {/* card composition */}
      <div className="relative z-[2] grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 items-start">
        <div className="col-span-1 hero-float md:mt-10"><HospFloatCard /></div>
        <div className="col-span-2 md:col-span-1 hero-float-2 order-first md:order-none"><EcoCenterCard /></div>
        <div className="col-span-1 hero-float-3 md:mt-14"><MetricCard big="3" small="Productos operativos conectados" /></div>
      </div>
      <div className="relative z-[2] grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 items-center mt-4 md:-mt-2">
        <div className="hero-float-2"><MetricCard big="24/7" small="Visibilidad operativa" /></div>
        <div className="hidden md:block" />
        <div className="hero-float-3"><TeamCard /></div>
      </div>
    </div>
  );
}

/* ═══════════════ HOSPITALITY PHOTO COMPOSITION ═══════════════ */

const MANAGER_IMG = '/manager-ops.jpg'; // generated render lands here

function ManagerVisual() {
  return (
    <div className="relative select-none">
      {/* background shapes */}
      <div className="absolute -top-8 -right-6 w-[78%] h-[86%] rounded-[44px] pointer-events-none" style={{ backgroundColor: 'rgba(84,200,79,0.16)' }} />
      <div className="absolute -bottom-10 -left-4 w-[46%] h-[52%] rounded-[44px] pointer-events-none" style={{ backgroundColor: 'rgba(97,199,212,0.28)', transform: 'rotate(-3deg)' }} />
      <div className="relative z-[2] rounded-[32px] overflow-hidden" style={{ boxShadow: SHADOW }}>
        <Image src={MANAGER_IMG} alt="Gerente de operaciones hotelera usando Attenda" width={760} height={900} className="w-full h-auto object-cover"
          style={{ minHeight: 480 }} />
        {/* floating overlays */}
        <div className="absolute top-6 -left-4 md:-left-8 rounded-xl bg-white px-4 py-2.5 flex items-center gap-2.5" style={{ boxShadow: SHADOW_SM }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BTN }} />
          <span className="text-[11px] font-bold" style={{ color: INK }}>Room 412 · Guest request</span>
        </div>
        <div className="absolute top-1/2 -right-3 md:-right-7 rounded-xl bg-white px-4 py-2.5 flex items-center gap-2.5" style={{ boxShadow: SHADOW_SM }}>
          <CheckCircle2 size={13} style={{ color: BTN }} />
          <span className="text-[11px] font-bold" style={{ color: INK }}>Housekeeping · Assigned</span>
        </div>
        <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/95 backdrop-blur px-5 py-4" style={{ boxShadow: SHADOW_SM }}>
          <div className="text-[9px] font-extrabold tracking-[0.2em] mb-2" style={{ color: SUB }}>OPERATIONAL OVERVIEW</div>
          <svg viewBox="0 0 260 40" className="w-full h-10" aria-hidden>
            <path d="M4,34 C40,30 58,18 92,22 S150,10 190,14 S240,6 256,8" stroke={BTN} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="190" cy="14" r="4" fill={BTN} />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ SERVE WORKFLOW VISUAL ═══════════════ */

function ServeFlowVisual() {
  const Row = ({ icon: Icon, label, meta, tint, wallet = false }: { icon: typeof Bell; label: string; meta?: string; tint: string; wallet?: boolean }) => (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3" style={{ boxShadow: SHADOW_SM, border: `1px solid ${BORDER}` }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: tint }}>
        {wallet
          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 7h13a3 3 0 013 3v7a3 3 0 01-3 3H6a3 3 0 01-3-3V7z" stroke={INK} strokeWidth="2" /><path d="M3 7a3 3 0 013-3h9" stroke={INK} strokeWidth="2" /><circle cx="16" cy="13.5" r="1.4" fill={INK} /></svg>
          : <Icon size={14} style={{ color: INK }} />}
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-bold leading-tight" style={{ color: INK }}>{label}</div>
        {meta && <div className="text-[10px] font-semibold mt-0.5" style={{ color: SUB }}>{meta}</div>}
      </div>
    </div>
  );
  return (
    <div className="relative max-w-[430px] mx-auto select-none">
      {/* branching connector lines */}
      <svg className="absolute top-0 left-[26px] h-full w-[70px] pointer-events-none" viewBox="0 0 70 460" fill="none" preserveAspectRatio="none" aria-hidden>
        <path d="M10,0 V90 C10,120 40,120 40,150 V240 C40,260 20,260 20,290 V380" stroke="#BFE6EF" strokeWidth="2" strokeDasharray="4 7" />
      </svg>
      <div className="relative z-[2] space-y-3.5">
        <Row icon={Bell} label="Customer order" meta="WhatsApp · Tienda online" tint="rgba(97,199,212,0.20)" />
        <div className="rounded-2xl px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: BTN, boxShadow: '0 14px 30px -16px rgba(84,200,79,0.6)' }}>
          <CheckCircle2 size={15} className="text-white shrink-0" />
          <span className="text-[12.5px] font-bold text-white">New order · #1042</span>
        </div>
        <Row icon={CheckCircle2} label="#1042 · Paid" meta="Payment confirmed" tint="rgba(84,200,79,0.18)" />
        <Row icon={Bell} label="S/ 42.00" meta="Local payment" tint="rgba(97,199,212,0.16)" wallet />
        <Row icon={Store} label="WhatsApp · Online Store · Pickup" meta="Todos tus canales" tint="rgba(17,24,39,0.06)" />
      </div>
    </div>
  );
}

/* ═══════════════ TRANSPORT DISPATCH DASHBOARD ═══════════════ */

function DispatchDashboard() {
  const vehicles = [
    ['Van 3', 'MIA T2 → Flagler St', '12m', 'En route', BTN],
    ['Van 1', 'Port → Homewood', '26m', 'Scheduled', '#94A3B8'],
    ['Sedan 2', 'Brickell → MIA T1', '8m', 'Arriving', BTN],
  ] as const;
  return (
    <div className="rounded-3xl bg-white overflow-hidden" style={{ boxShadow: SHADOW, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <Truck size={13} style={{ color: AQUA }} />
          <span className="text-[9px] font-extrabold tracking-[0.2em]" style={{ color: INK }}>TRANSPORT · DISPATCH</span>
        </div>
        <span className="flex items-center gap-1 text-[8px] font-extrabold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(97,199,212,0.15)', color: AQUA_DEEP }}>
          <Radio size={8} /> GPS LIVE
        </span>
      </div>
      <div className="p-4 space-y-2">
        {vehicles.map(([name, route, eta, st, dot], i) => (
          <div key={i} className="flex items-center justify-between rounded-xl px-3.5 py-2.5" style={{ backgroundColor: '#FAFDFE', border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
              <div className="text-[11.5px] font-bold truncate" style={{ color: INK }}>{name} · {route}</div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="text-[10.5px] font-extrabold" style={{ color: AQUA_DEEP }}>ETA {eta}</div>
              <div className="text-[8.5px] font-bold" style={{ color: SUB }}>{st}</div>
            </div>
          </div>
        ))}
        {/* pale-blue Miami mini map */}
        <div className="rounded-xl overflow-hidden relative h-20" style={{ border: `1px solid ${BORDER}`, backgroundColor: '#EFF9FC' }}>
          <svg className="absolute inset-0 w-full h-full" aria-hidden>
            <g stroke="#D7EDF4" strokeWidth="3">
              <path d="M0,28 H285" /><path d="M0,52 H285" /><path d="M60,0 V78" /><path d="M140,0 V78" /><path d="M225,0 V78" />
            </g>
            <path d="M18,62 C60,40 90,50 130,34 S200,24 262,16" stroke={AQUA} strokeWidth="2" fill="none" strokeDasharray="5 6" />
            <path d="M40,18 C90,30 140,26 196,40 S250,52 274,56" stroke="#9BD9E6" strokeWidth="1.6" fill="none" strokeDasharray="4 6" />
            <circle cx="130" cy="34" r="4.5" fill={BTN} opacity="0.25" />
            <circle cx="130" cy="34" r="3" fill={BTN} />
            <circle cx="196" cy="40" r="3" fill={BTN} />
          </svg>
          <div className="absolute bottom-1.5 left-3 text-[7px] font-extrabold tracking-[0.18em]" style={{ color: '#7FA9B8' }}>MIAMI · LIVE ROUTES</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ ECOSYSTEM DIAGRAM (light, turquoise) ═══════════════ */

function EcoNodeLight({ label, subKey, icon: Icon, href }: { label: string; subKey: string; icon: typeof BedDouble; href: string }) {
  const { t } = useLang();
  return (
    <Link href={href} className="block rounded-2xl bg-white p-5 text-center transition-transform hover:-translate-y-0.5"
      style={{ border: `1px solid ${BORDER}`, boxShadow: SHADOW_SM }}>
      <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(97,199,212,0.14)' }}>
        <Icon size={18} style={{ color: AQUA_DEEP }} />
      </div>
      <div className="text-[12.5px] font-extrabold tracking-[0.14em]" style={{ color: INK }}>{label}</div>
      <div className="text-[10.5px] mt-1" style={{ color: SUB }}>{t(subKey)}</div>
    </Link>
  );
}

function EcoLinkLight({ label }: { label: string }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center px-1">
      <svg width="30" height="20" viewBox="0 0 30 20" aria-hidden>
        <path d="M4,6 C14,4 18,4 26,8" stroke={AQUA} strokeWidth="1.6" fill="none" />
        <path d="M26,14 C18,16 14,16 4,14" stroke={AQUA} strokeWidth="1.6" fill="none" />
      </svg>
      <div className="text-[9px] font-bold text-center leading-tight mt-1 max-w-[120px]" style={{ color: SUB }}>{label}</div>
    </div>
  );
}

function EcosystemDiagram() {
  const { t } = useLang();
  return (
    <div className="max-w-4xl mx-auto px-5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4">
        <EcoNodeLight label="HOSPITALITY" icon={BedDouble} href="/hospitality" subKey="home.eco.node.h.sub" />
        <EcoLinkLight label={t('home.eco.link1')} />
        <EcoNodeLight label="SERVE" icon={Store} href="/serve" subKey="home.eco.node.s.sub" />
        <EcoLinkLight label={t('home.eco.link2')} />
        <EcoNodeLight label="TRANSPORTATION" icon={Truck} href="/transportation" subKey="home.eco.node.t.sub" />
      </div>
    </div>
  );
}

const MIAMI_IMG = '/miami-arch.jpg'; // generated render lands here

/* ═══════════════ PAGE ═══════════════ */

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
    <div className="min-h-screen bg-white" style={{ fontFamily: FONT }}>
      <style>{`
        @keyframes floaty { 0%,100% { transform: translateY(0px);} 50% { transform: translateY(-6px);} }
        @keyframes dashmove { to { stroke-dashoffset: -26; } }
        .hero-float { animation: floaty 7s ease-in-out infinite; }
        .hero-float-2 { animation: floaty 8.5s ease-in-out infinite; animation-delay: 0.6s; }
        .hero-float-3 { animation: floaty 9.5s ease-in-out infinite; animation-delay: 1.1s; }
        .connector-anim { animation: dashmove 2.6s linear infinite; }
      `}</style>
      <CorporateNav heroTone="light" accent={BTN} />

      {/* ── HERO — white fading into pastel cyan ── */}
      <section className="relative overflow-hidden pt-32 md:pt-40 pb-16 md:pb-24" style={{ background: HERO }}>
        <div className="relative max-w-6xl mx-auto text-center px-5">
          <Reveal>
            <div className="inline-flex items-center px-4 py-2 rounded-full mb-8 bg-white/80" style={{ border: `1px solid ${BORDER}` }}>
              <span className="text-[11px] font-extrabold tracking-[0.24em] uppercase" style={{ color: '#3E7186' }}>ATTENDA TECHNOLOGIES · MIAMI</span>
            </div>
            <h1 className="text-[44px] md:text-[68px] lg:text-[76px] font-extrabold leading-[0.99] tracking-[-0.04em]" style={{ color: INK }}>
              {t('home.nh.l1')}<br />{t('home.nh.l2')}<br />{t('home.nh.l3')}
            </h1>
            <p className="text-[17px] md:text-[18px] leading-relaxed mt-8 max-w-2xl mx-auto" style={{ color: SUB }}>
              {t('home.nh.sub')}
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mt-10">
              <GreenPill href="#products">{t('home.nh.cta1')}</GreenPill>
              <Link href="/company" className="text-[15px] font-semibold transition-opacity hover:opacity-70" style={{ color: '#3E7186' }}>
                {t('nav.discover')}
              </Link>
            </div>
          </Reveal>
          <div className="mt-14 md:mt-20">
            <Reveal delay={140}>
              <HeroVisual />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── VALUE PROPOSITION ── */}
      <section className="py-24 md:py-36 bg-white">
        <SectionHead eyebrow={t('home.val.eyebrow')}>
          {t('home.vp.h')}<br />{t('home.vp.h2')}
        </SectionHead>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 px-5">
          {[
            { icon: Wifi, tk: 'home.vp.1t', dk: 'home.vp.1d' },
            { icon: Radio, tk: 'home.vp.2t', dk: 'home.vp.2d' },
            { icon: CheckCircle2, tk: 'home.vp.3t', dk: 'home.vp.3d' },
          ].map((v, i) => {
            const Icon = v.icon;
            return (
              <Reveal key={v.tk} delay={i * 90}>
                <div className="text-center px-8 py-8 md:border-l md:first:border-l-0" style={{ borderColor: BORDER }}>
                  <div className="w-12 h-12 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: 'rgba(97,199,212,0.15)', boxShadow: SHADOW_SM }}>
                    <Icon size={19} style={{ color: AQUA_DEEP }} />
                  </div>
                  <div className="text-[19px] font-extrabold tracking-[-0.01em]" style={{ color: INK }}>{t(v.tk)}</div>
                  <p className="text-[15.5px] leading-relaxed mt-3" style={{ color: SUB }}>{t(v.dk)}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── HOSPITALITY — two columns, photo right ── */}
      <section id="products" className="py-24 md:py-32 bg-white scroll-mt-24 overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center px-5">
          <Reveal>
            <h2 className="text-[32px] md:text-[46px] font-extrabold tracking-[-0.035em] leading-[1.06]" style={{ color: INK }}>
              {t('home.hosp.h')}
            </h2>
            <p className="text-[16.5px] leading-relaxed mt-7 max-w-lg" style={{ color: SUB }}>{t('home.hosp.b')}</p>
            <p className="text-[16.5px] leading-relaxed mt-4 max-w-lg font-semibold" style={{ color: '#3F4A55' }}>{t('home.hosp.support')}</p>
            <GreenPill href="/hospitality" className="mt-9">{t('home.hosp.cta')}</GreenPill>
          </Reveal>
          <Reveal delay={120}>
            <ManagerVisual />
          </Reveal>
        </div>
      </section>

      {/* ── SERVE — two columns, workflow left ── */}
      <section className="py-24 md:py-32 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center px-5">
          <Reveal className="order-2 md:order-1">
            <ServeFlowVisual />
          </Reveal>
          <Reveal className="order-1 md:order-2" delay={100}>
            <h2 className="text-[32px] md:text-[46px] font-extrabold tracking-[-0.035em] leading-[1.06]" style={{ color: INK }}>
              {t('home.p2.h')}
            </h2>
            <p className="text-[16.5px] leading-relaxed mt-7 max-w-lg" style={{ color: SUB }}>{t('home.serve.b')}</p>
            <p className="text-[18px] font-extrabold mt-5" style={{ color: INK }}>{t('home.serve.support')}</p>
            <GreenPill href="/serve" className="mt-9">{t('home.serve.cta')}</GreenPill>
          </Reveal>
        </div>
      </section>

      {/* ── TRANSPORTATION — tinted band ── */}
      <section className="py-24 md:py-32" style={{ backgroundColor: SECTION_TINT }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center px-5">
          <Reveal>
            <h2 className="text-[32px] md:text-[46px] font-extrabold tracking-[-0.035em] leading-[1.06]" style={{ color: INK }}>
              {t('home.p3.h')}
            </h2>
            <p className="text-[16.5px] leading-relaxed mt-7 max-w-lg" style={{ color: SUB }}>{t('home.p3.b')}</p>
            <GreenPill href="/transportation" className="mt-9">{t('home.p3.cta')}</GreenPill>
          </Reveal>
          <Reveal delay={120}>
            <DispatchDashboard />
          </Reveal>
        </div>
      </section>

      {/* ── ECOSYSTEM ── */}
      <section id="ecosystem" className="py-24 md:py-32 bg-white scroll-mt-24">
        <SectionHead sub={t('home.eco.p2')}>
          {t('home.eco.h1')}<br />{t('home.eco.h2')}
        </SectionHead>
        <Reveal><EcosystemDiagram /></Reveal>
      </section>

      {/* ── PHILOSOPHY — centered editorial ── */}
      <section className="py-28 md:py-40 bg-white">
        <div className="max-w-4xl mx-auto text-center px-5">
          <Reveal>
            <h2 className="text-[30px] md:text-[48px] font-extrabold tracking-[-0.035em] leading-[1.08]" style={{ color: INK }}>
              {t('home.phi2.h1')}
            </h2>
            <h2 className="text-[30px] md:text-[48px] font-extrabold tracking-[-0.035em] leading-[1.08] mt-5" style={{ color: AQUA_DEEP }}>
              {t('home.phi.1b')}
            </h2>
            <p className="text-[18px] font-semibold mt-12" style={{ color: SUB }}>{t('home.phi.b')}</p>
          </Reveal>
        </div>
      </section>

      {/* ── MIAMI — tinted band, photo right ── */}
      <section className="py-20 md:py-28" style={{ backgroundColor: SECTION_TINT }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center px-5">
          <Reveal>
            <div className="text-[12px] font-extrabold tracking-[0.3em] uppercase mb-5" style={{ color: AQUA }}>MIAMI, FLORIDA</div>
            <h2 className="text-[32px] md:text-[46px] font-extrabold tracking-[-0.035em] leading-[1.06]" style={{ color: INK }}>
              {t('home.mia.h1')}<br /><span style={{ color: AQUA_DEEP }}>{t('home.mia.h2')}</span>
            </h2>
            <p className="text-[16.5px] leading-relaxed mt-6 max-w-lg" style={{ color: SUB }}>{t('home.mia.b2')}</p>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative rounded-[32px] overflow-hidden" style={{ boxShadow: SHADOW }}>
              <Image src={MIAMI_IMG} alt="Miami — hogar de Attenda Technologies" width={820} height={560} className="w-full h-auto object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA — light cyan band ── */}
      <section className="py-28 md:py-36" style={{ backgroundColor: '#D6F4FA' }}>
        <div className="max-w-5xl mx-auto text-center px-5">
          <Reveal>
            <h2 className="text-[36px] md:text-[56px] font-extrabold tracking-[-0.04em] leading-[1.02]" style={{ color: INK }}>
              {t('home.cta.h')}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 mt-14 text-left">
              {[
                ['home.cta.q1', 'Attenda Hospitality', '/hospitality'],
                ['home.cta.q2', 'Attenda Serve', '/serve'],
                ['home.cta.q3', 'Attenda Transportation', '/transportation'],
              ].map(([qk, a, h], i) => (
                <Reveal key={h} delay={i * 80}>
                  <Link href={h} className="block rounded-2xl bg-white p-6 hover:-translate-y-0.5 transition-transform h-full" style={{ border: `1px solid ${BORDER}`, boxShadow: SHADOW_SM }}>
                    <div className="text-[13px] font-semibold" style={{ color: SUB }}>{t(qk)}</div>
                    <div className="text-[17px] font-extrabold mt-1.5" style={{ color: INK }}>{a}</div>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color: BTN_DEEP }}>
                      {t('home.tiles.explore')} <ArrowRight size={13} />
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
            <GreenPill href="/contact" className="mt-14 !px-9 !py-4">{t('home.cta.talk')}</GreenPill>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER (light, spec) ── */}
      <CorporateFooterLight />
    </div>
  );
}

function CorporateFooterLight() {
  const { t } = useLang();
  const cols: [string, [string, string][]][] = [
    ['footer.products', [['Hospitality', '/hospitality'], ['Serve', '/serve'], ['Transportation', '/transportation']]],
    ['footer.company', [['footer.about', '/company'], ['nav.careers', '/careers'], ['nav.insights', '/insights'], ['footer.contact', '/contact']]],
  ];
  return (
    <footer className="bg-white" style={{ borderTop: `1px solid ${BORDER}` }}>
      <div className="max-w-6xl mx-auto px-5 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="text-[17px] font-extrabold tracking-tight" style={{ color: INK }}>ATTENDA</div>
            <div className="text-[9px] font-extrabold tracking-[0.32em] mt-0.5" style={{ color: AQUA }}>TECHNOLOGIES</div>
            <p className="text-[14px] leading-relaxed mt-5 max-w-xs" style={{ color: SUB }}>
              {t('home.nh.l1')} {t('home.nh.l2')} {t('home.nh.l3')}
            </p>
          </div>
          {cols.map(([title, links]) => (
            <div key={title}>
              <div className="text-[11px] font-extrabold tracking-widest uppercase mb-4" style={{ color: '#A7B2BC' }}>{t(title)}</div>
              <ul className="space-y-2.5 text-[14px]" style={{ color: '#4B5563' }}>
                {links.map(([lk, href]) => (
                  <li key={href}>
                    <Link href={href} className="transition-colors hover:opacity-70">{lk.includes('.') ? t(lk) : lk}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="text-[11px] font-extrabold tracking-widest uppercase mb-4" style={{ color: '#A7B2BC' }}>{t('footer.contact')}</div>
            <div className="text-[13.5px] leading-relaxed" style={{ color: '#4B5563' }}>
              Attenda Technologies LLC<br />66 W Flagler St, Suite 900<br />Miami, FL 33130
            </div>
            <a href="mailto:support@attendaapp.com" className="text-[13.5px] mt-3 inline-block font-semibold" style={{ color: AQUA_DEEP }}>
              support@attendaapp.com
            </a>
          </div>
        </div>
        <div className="border-t mt-12 pt-6 text-[12.5px]" style={{ borderColor: BORDER, color: '#9AA5AF' }}>
          © 2026 Attenda Technologies LLC. {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
}