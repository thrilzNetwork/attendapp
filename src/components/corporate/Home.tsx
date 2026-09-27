'use client';

/* Attenda Technologies — corporate homepage.
   Root identity: ONE TECHNOLOGY COMPANY. MULTIPLE OPERATING ENVIRONMENTS.
   Guest QR sessions still hit / and keep working (handled in page.tsx gate). */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, BedDouble, Building2, CheckCircle2, ClipboardList, Clock, Globe2,
  MapPin, MessageSquare, Receipt, ShoppingBag, Store, Truck, Users, Utensils,
} from 'lucide-react';
import { CorporateNav, CorporateFooter, CORP_TEAL, CORP_TEAL_BRIGHT, CORP_INK, CORP_MIST, CORP_BORDER } from '@/components/corporate/Chrome';

/* ── Ecosystem hero composition: three live product interfaces connected by data events ── */
function EcosystemHeroVisual() {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => (p + 1) % 3), 2800);
    return () => clearInterval(t);
  }, []);
  const nodes = [
    { key: 'hosp', label: 'HOSPITALITY', desc: 'Hotel operations dashboard', icon: BedDouble, top: '6%', left: '6%', w: 220 },
    { key: 'serve', label: 'SERVE', desc: 'Merchant storefront & orders', icon: Store, top: '34%', left: '36%', w: 250 },
    { key: 'trans', label: 'TRANSPORTATION', desc: 'Live dispatch, vehicle & ETA', icon: Truck, top: '10%', left: '64%', w: 230 },
  ] as const;
  return (
    <div className="relative h-[380px] md:h-[440px] select-none">
      {/* connecting lines */}
      <svg className="absolute inset-0 w-full h-full" aria-hidden>
        <line x1="22%" y1="18%" x2="42%" y2="48%" stroke={CORP_TEAL_BRIGHT} strokeWidth="1.5" strokeDasharray="4 6" opacity="0.5" />
        <line x1="62%" y1="30%" x2="72%" y2="26%" stroke={CORP_TEAL_BRIGHT} strokeWidth="1.5" strokeDasharray="4 6" opacity="0.5" />
        <line x1="30%" y1="70%" x2="70%" y2="80%" stroke={CORP_TEAL_BRIGHT} strokeWidth="1.5" strokeDasharray="4 6" opacity="0.35" />
      </svg>
      {/* traveling data events */}
      {['Guest request → Transportation', 'Customer order → Serve', 'Hotel operation → Hospitality'].map((ev, i) => (
        <div key={ev}
          className={`absolute left-1/2 -translate-x-1/2 text-[11px] font-bold tracking-wide px-3 py-1.5 rounded-full border transition-all duration-500 ${pulse === i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
          style={{ top: `${18 + i * 26}%`, color: CORP_TEAL_BRIGHT, borderColor: `${CORP_TEAL_BRIGHT}55`, backgroundColor: 'rgba(15,23,42,0.9)' }}>
          {ev}
        </div>
      ))}
      {/* product interface cards */}
      {nodes.map((n, i) => {
        const Icon = n.icon;
        return (
          <div key={n.key}
            className="absolute rounded-2xl border bg-gray-950/90 backdrop-blur-md p-4 shadow-2xl transition-transform duration-300"
            style={{ top: n.top, left: n.left, width: `min(${n.w}px, 44vw)`, borderColor: pulse === i ? CORP_TEAL_BRIGHT : 'rgba(255,255,255,0.12)', transform: pulse === i ? 'translateY(-3px)' : undefined }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}22` }}>
                <Icon size={15} style={{ color: CORP_TEAL_BRIGHT }} />
              </div>
              <span className="text-[10px] font-black tracking-[0.18em] text-white">{n.label}</span>
            </div>
            {/* mini interface */}
            <div className="space-y-1.5">
              {[92, 74, 83].map((w, r) => (
                <div key={r} className="h-2 rounded-full" style={{ width: `${w}%`, backgroundColor: r === 0 ? `${CORP_TEAL_BRIGHT}66` : 'rgba(255,255,255,0.14)' }} />
              ))}
              <div className="grid grid-cols-3 gap-1.5 pt-1.5">
                {[0, 1, 2].map((c) => (
                  <div key={c} className="h-8 rounded-lg" style={{ backgroundColor: c === (pulse % 3) ? `${CORP_TEAL}33` : 'rgba(255,255,255,0.08)' }} />
                ))}
              </div>
            </div>
            <div className="text-[10px] text-gray-400 mt-2.5 font-medium">{n.desc}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Three-node ecosystem diagram ── */
function EcosystemDiagram() {
  const nodes = [
    { label: 'HOSPITALITY', icon: BedDouble, href: '/hospitality', tint: '#0F2E33' },
    { label: 'TRANSPORTATION', icon: Truck, href: '/transportation', tint: '#101B2E' },
    { label: 'SERVE', icon: Store, href: '/serve', tint: '#172A26' },
  ] as const;
  return (
    <div className="max-w-4xl mx-auto">
      {/* Attenda Technologies above */}
      <div className="flex justify-center mb-10">
        <div className="rounded-2xl border-2 px-7 py-4 text-center" style={{ borderColor: CORP_TEAL, backgroundColor: 'rgba(21,138,124,0.08)' }}>
          <div className="text-[16px] font-black tracking-tight" style={{ color: CORP_TEAL }}>ATTENDA TECHNOLOGIES</div>
          <div className="text-[11px] font-bold tracking-[0.22em] mt-1" style={{ color: CORP_TEAL_BRIGHT }}>ONE COMPANY · ABOVE ALL THREE</div>
        </div>
      </div>
      <div className="flex justify-center mb-10">
        <div className="text-[11px] font-bold tracking-[0.3em] text-gray-400 uppercase">Designed to connect</div>
      </div>
      {/* three nodes */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4">
        <EcoNode {...nodes[0]} tint={nodes[0].tint} />
        <EcoLink label="Guest demand ⇄ Local commerce" />
        <EcoNode {...nodes[2]} tint={nodes[2].tint} />
        <EcoLink label="Fulfillment ⇄ Movement" />
        <EcoNode {...nodes[1]} tint={nodes[1].tint} />
      </div>
    </div>
  );
}

function EcoNode({ label, icon: Icon, href, tint }: { label: string; icon: typeof BedDouble; href: string; tint: string }) {
  return (
    <Link href={href} className="block rounded-2xl border p-5 text-center transition-transform hover:-translate-y-0.5"
      style={{ borderColor: `${CORP_TEAL}44`, backgroundColor: tint }}>
      <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}22` }}>
        <Icon size={19} style={{ color: CORP_TEAL_BRIGHT }} />
      </div>
      <div className="text-[13px] font-black tracking-[0.14em] text-white">{label}</div>
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

/* ── How products connect — three overlap stories ── */
const CONNECTIONS = [
  {
    pair: 'HOSPITALITY + TRANSPORTATION',
    copy: 'A hotel can coordinate shuttle demand while a transportation provider manages vehicles, drivers, pickups and ETAs. Same movement. Different operational views.',
    chain: 'Guest → Hotel → Transportation → Driver',
  },
  {
    pair: 'HOSPITALITY + SERVE',
    copy: 'Hospitality guests can access curated food and commerce options while participating businesses manage orders through their own operating environment.',
    chain: 'Guest → Hospitality experience → Merchant → Serve',
  },
  {
    pair: 'SERVE + TRANSPORTATION',
    copy: 'Commerce eventually creates fulfillment. Where transportation or delivery is needed, transportation workflows can connect sellers, customers and drivers.',
    chain: 'Order → Fulfillment → Driver → Customer',
  },
];

/* ── Real-work stories ── */
const REAL_WORK = [
  { title: 'A HOTEL', steps: ['Front desk.', 'Housekeeping.', 'Maintenance.', 'Guest request.', 'Manager.'], line: 'Attenda Hospitality connects the operation.' },
  { title: 'A BUSINESS', steps: ['Customer.', 'Order.', 'Payment.', 'WhatsApp.', 'Staff.'], line: 'Attenda Serve organizes the sale.' },
  { title: 'A TRANSPORTATION OPERATION', steps: ['Passenger.', 'Dispatcher.', 'Vehicle.', 'Driver.', 'Destination.'], line: 'Attenda Transportation organizes the movement.' },
];

export default function CorporateHomePage() {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-white">
      <CorporateNav />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-7xl mx-auto px-5 pt-16 pb-10 md:pt-24 md:pb-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 border border-white/15 bg-white/5">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: CORP_TEAL_BRIGHT }} />
              <span className="text-[11px] font-bold text-white/80 tracking-[0.2em] uppercase">Attenda Technologies · Miami</span>
            </div>
            <h1 className="text-[38px] md:text-[56px] lg:text-[64px] leading-[1.03] font-black tracking-tight text-white">
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
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>What we build</div>
          <h2 className="text-[32px] md:text-[46px] font-black tracking-tight leading-[1.08] text-gray-900">
            Different industries.<br />The same operational problem.
          </h2>
          <p className="text-[17px] md:text-[18px] text-gray-600 leading-relaxed mt-6">
            Businesses rarely suffer from a lack of information. The problem is that the information, people and work are spread across messages, paper, disconnected systems and individual knowledge.
          </p>
          <p className="text-[17px] md:text-[18px] text-gray-800 font-semibold mt-4">
            Attenda builds technology that organizes that work into systems people can actually use.
          </p>
        </div>
        {/* three large product cards */}
        <div id="products" className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5 scroll-mt-24">
          <ProductCard
            href="/hospitality" label="HOSPITALITY OPERATIONS" icon={BedDouble}
            headline="Run the operation around the reservation."
            copy="One operational layer for the work happening outside the PMS — staff workflows, guest requests, housekeeping, maintenance, inspections, procedures, knowledge and visibility."
            cta="Explore Attenda Hospitality" features={['Operations', 'Guest service', 'Housekeeping', 'Maintenance', 'Inspections', 'SOPs & knowledge', 'Transportation', 'Staff workflows', 'Management visibility']} />
          <ProductCard
            href="/serve" label="COMMERCE" icon={Store}
            headline={<>TU NEGOCIO.<br />TU CANAL.<br />TUS CLIENTES.</>}
            copy="Attenda Serve gives restaurants, independent sellers and everyday businesses their own digital sales channel — storefront, online ordering, local payment workflows, WhatsApp, staff operations and customer retention."
            cta="Explore Attenda Serve" subline="No otro marketplace. Tu propio canal." />
          <ProductCard
            href="/transportation" label="TRANSPORTATION" icon={Truck}
            headline="Know who's moving, where and when."
            copy="Attenda Transportation connects customers, properties, dispatchers and drivers through live scheduling, pickup coordination, vehicle visibility and operational communication."
            cta="Explore Transportation"
            features={['Live map', 'Driver location', 'Upcoming pickups', 'ETA', 'Demand board', 'Dispatch view']} />
        </div>
      </section>

      {/* ── SECTION 3 — THE ATTENDA IDEA ── */}
      <section className="py-20 md:py-28 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>Why Attenda</div>
          <h2 className="text-[30px] md:text-[44px] font-black tracking-tight leading-[1.1] text-gray-900">
            Technology should fit the operation.<br />
            <span className="text-gray-500">The operation shouldn&apos;t have to fit the technology.</span>
          </h2>
          <p className="text-[17px] text-gray-600 leading-relaxed mt-7">
            Attenda started from real operating environments where work rarely happens inside one perfect system. Someone sends a WhatsApp. Someone calls the front desk. A driver gets dispatched. A customer places an order. A manager assigns a task. An employee completes a checklist.
          </p>
          <p className="text-[17px] text-gray-800 font-bold mt-5">
            The problem isn&apos;t the people. The problem is that the work becomes fragmented.
          </p>
          <p className="text-[17px] text-gray-600 mt-3">
            Attenda turns those everyday actions into organized workflows.
          </p>
        </div>
      </section>

      {/* ── SECTION 4 — THE ECOSYSTEM ── */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>One ecosystem</div>
          <h2 className="text-[32px] md:text-[46px] font-black tracking-tight leading-[1.08] text-gray-900">
            Built separately.<br />Designed to work together.
          </h2>
          <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
            Each Attenda product can operate independently. Where workflows overlap, the ecosystem is designed to connect them.
          </p>
        </div>
        <EcosystemDiagram />
        <div className="max-w-4xl mx-auto mt-16 grid md:grid-cols-3 gap-4">
          {CONNECTIONS.map((c) => (
            <div key={c.pair} className="rounded-2xl border p-6" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
              <div className="text-[10.5px] font-black tracking-[0.16em] mb-3" style={{ color: CORP_TEAL }}>{c.pair}</div>
              <p className="text-[14px] text-gray-600 leading-relaxed">{c.copy}</p>
              <div className="text-[12px] font-bold text-gray-800 mt-4 font-mono">{c.chain}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-[13px] text-gray-500 mt-8 max-w-2xl mx-auto">
          Designed to connect. Can connect where workflows overlap. Part of the Attenda ecosystem — showing what exists today honestly, and where the platform is going.
        </p>
      </section>

      {/* ── SECTION 5 — ONE PRINCIPLE (dark) ── */}
      <section className="py-24 md:py-32 px-5" style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[30px] md:text-[46px] font-black tracking-tight leading-[1.1] text-white">
            We don&apos;t build technology<br />to replace the people doing the work.
          </h2>
          <h3 className="text-[24px] md:text-[36px] font-black tracking-tight leading-[1.12] mt-8" style={{ color: CORP_TEAL_BRIGHT }}>
            We build technology<br />to make their work work better.
          </h3>
          <p className="text-[16px] md:text-[17px] text-gray-400 leading-relaxed mt-8 max-w-2xl mx-auto">
            Attenda organizes information, workflows and communication so the people responsible for the operation have better visibility and better tools.
          </p>
          <p className="text-[17px] md:text-[18px] font-bold text-white mt-8">
            AI can assist. Software can organize. People still decide.
          </p>
        </div>
      </section>

      {/* ── SECTION 6 — BUILT AROUND REAL WORK ── */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>Built around real work</div>
          <h2 className="text-[32px] md:text-[44px] font-black tracking-tight text-gray-900 mb-14 leading-[1.08]">Three operations. One philosophy.</h2>
          <div className="space-y-6">
            {REAL_WORK.map((r) => (
              <div key={r.title} className="rounded-2xl border p-7 md:p-9" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
                <div className="text-[12px] font-black tracking-[0.2em] mb-5" style={{ color: CORP_TEAL }}>{r.title}</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {r.steps.map((s, i) => (
                    <span key={s} className="flex items-center gap-2.5">
                      <span className="text-[15px] font-bold text-gray-800">{s}</span>
                      {i < r.steps.length - 1 && <ArrowRight size={14} className="text-gray-400" />}
                    </span>
                  ))}
                </div>
                <div className="text-[15px] font-black text-gray-900 mt-5">{r.line}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-[22px] md:text-[30px] font-black tracking-tight text-gray-900 mt-14">
            Different work. <span style={{ color: CORP_TEAL }}>Same philosophy.</span>
          </p>
        </div>
      </section>

      {/* ── SECTION 7 — COMPANY ── */}
      <section className="py-20 md:py-28 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>Attenda Technologies</div>
            <h2 className="text-[32px] md:text-[44px] font-black tracking-tight leading-[1.08] text-gray-900">
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
          </div>
          {/* MIAMI */}
          <div className="relative rounded-3xl overflow-hidden border" style={{ borderColor: CORP_BORDER, minHeight: 340 }}>
            <Image src="https://images.unsplash.com/photo-1534482421-64566f976cfa?w=1200&q=80" alt="Miami — Attenda Technologies' home" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,15,20,0.1) 30%, rgba(8,15,20,0.85) 100%)' }} />
            <div className="absolute bottom-0 left-0 right-0 p-7">
              <div className="text-[11px] font-black tracking-[0.3em] text-white/80">MIAMI, FLORIDA</div>
              <div className="text-[26px] font-black text-white mt-1">Our home.</div>
              <p className="text-[13.5px] text-gray-200 leading-relaxed mt-2 max-w-md">
                A city connecting the United States, Latin America, hospitality, commerce, transportation and entrepreneurship. The natural home for what we&apos;re building.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 8 — GLOBAL / LATAM ── */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-[32px] md:text-[46px] font-black tracking-tight leading-[1.08] text-gray-900">
            Built in Miami.<br /><span style={{ color: CORP_TEAL }}>Designed beyond borders.</span>
          </h2>
          <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
            Attenda Technologies builds products for markets where operational technology needs to be practical, accessible and adaptable to how people already work.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-10 text-left">
            {[
              ['Hospitality', 'Begins with U.S. operators.'],
              ['Serve', 'Built with Latin American businesses in mind.'],
              ['Transportation', 'Connects physical operations wherever people and vehicles need better coordination.'],
            ].map(([t, c]) => (
              <div key={t} className="rounded-2xl border p-6" style={{ borderColor: CORP_BORDER }}>
                <div className="text-[12px] font-black tracking-[0.18em] uppercase" style={{ color: CORP_TEAL }}>{t}</div>
                <p className="text-[14.5px] text-gray-600 mt-2.5 leading-relaxed">{c}</p>
              </div>
            ))}
          </div>
          <p className="text-[20px] md:text-[26px] font-black text-gray-900 mt-12">
            The technology changes by market.<br /><span style={{ color: CORP_TEAL }}>The principle does not.</span>
          </p>
        </div>
      </section>

      {/* ── SECTION 9 — TECHNOLOGY / HOW WE BUILD ── */}
      <section className="py-20 md:py-28 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-5xl mx-auto">
          <div className="max-w-3xl mb-14">
            <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>How we build</div>
            <h2 className="text-[32px] md:text-[46px] font-black tracking-tight leading-[1.08] text-gray-900">
              Powerful underneath.<br />Simple where it matters.
            </h2>
            <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
              The best operational technology disappears into the work. People should not need to become software experts to use Attenda.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ['Mobile-first', 'Built around the devices people already carry.', Globe2],
              ['Role-based', 'People see the tools relevant to their work.', Users],
              ['Real-time', 'Operational information changes as the work happens.', Clock],
              ['Human-centered AI', 'AI assists people instead of pretending to replace judgment.', MessageSquare],
              ['Connected', 'Products can exchange information where workflows overlap.', Receipt],
              ['Market-aware', 'Payments, communication and workflows adapt to the environments where Attenda operates.', MapPin],
            ].map(([t, c, Icon]) => (
              <div key={t as string} className="rounded-2xl bg-white border p-6" style={{ borderColor: CORP_BORDER }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${CORP_TEAL}14` }}>
                  {/* Icon type */}
                  {(Icon as typeof Globe2) && <Icon size={17} style={{ color: CORP_TEAL }} />}
                </div>
                <div className="text-[15px] font-black text-gray-900">{t as string}</div>
                <p className="text-[14px] text-gray-600 mt-1.5 leading-relaxed">{c as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 10 — PRODUCTS AGAIN (primary conversion tiles) ── */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
          {[
            { t: 'HOSPITALITY', l: 'Run the operation.', h: '/hospitality', tint: 'linear-gradient(160deg, #0F2E33 0%, #0A1A1F 100%)', icon: BedDouble },
            { t: 'SERVE', l: 'Own your channel.', h: '/serve', tint: 'linear-gradient(160deg, #172A26 0%, #0E1A17 100%)', icon: Store },
            { t: 'TRANSPORTATION', l: 'Coordinate the movement.', h: '/transportation', tint: 'linear-gradient(160deg, #101B2E 0%, #0A111E 100%)', icon: Truck },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <Link key={p.t} href={p.h} className="group rounded-3xl border p-8 md:p-10 transition-transform hover:-translate-y-1"
                style={{ borderColor: `${CORP_TEAL}33`, background: p.tint }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: `${CORP_TEAL}22` }}>
                  <Icon size={21} style={{ color: CORP_TEAL_BRIGHT }} />
                </div>
                <div className="text-[13px] font-black tracking-[0.22em] text-white">{p.t}</div>
                <div className="text-[20px] font-black text-gray-100 mt-2">{p.l}</div>
                <div className="inline-flex items-center gap-2 mt-7 text-[14px] font-bold transition-transform group-hover:translate-x-1" style={{ color: CORP_TEAL_BRIGHT }}>
                  Explore {p.t.charAt(0) + p.t.slice(1).toLowerCase()} <ArrowRight size={15} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 11 — COMPANY CTA ── */}
      <section className="py-24 md:py-32 px-5" style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[34px] md:text-[52px] font-black tracking-tight leading-[1.05] text-white">
            What are you trying to operate?
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-12 text-left">
            {[
              ['A hospitality property', 'Attenda Hospitality', '/hospitality'],
              ['A business that sells', 'Attenda Serve', '/serve'],
              ['A transportation operation', 'Attenda Transportation', '/transportation'],
            ].map(([q, a, h]) => (
              <Link key={h} href={h} className="rounded-2xl border border-white/15 bg-white/5 p-6 hover:bg-white/10 transition-colors">
                <div className="text-[13px] text-gray-400 font-semibold">{q}</div>
                <div className="text-[17px] font-black text-white mt-1.5">{a}</div>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: CORP_TEAL_BRIGHT }}>
                  Explore <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
          <Link href="/contact" className="inline-flex items-center gap-2 mt-12 px-8 py-4 rounded-xl font-semibold text-[15px] border border-white/25 text-white hover:border-white/50 transition-all">
            Talk to Attenda Technologies <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <CorporateFooter />
    </div>
  );
}

/* ── Product card ── */
function ProductCard({ href, label, icon: Icon, headline, copy, cta, ctaHref, subline, features }: {
  href: string; label: string; icon: typeof BedDouble; headline: React.ReactNode; copy: string;
  cta: string; ctaHref?: string; subline?: string; features?: string[];
}) {
  return (
    <div className="rounded-3xl border p-7 md:p-8 flex flex-col" style={{ borderColor: CORP_BORDER, backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}14` }}>
          <Icon size={17} style={{ color: CORP_TEAL }} />
        </div>
        <span className="text-[10.5px] font-black tracking-[0.22em] text-gray-500 uppercase">{label}</span>
      </div>
      <h3 className="text-[24px] md:text-[27px] font-black tracking-tight leading-[1.12] text-gray-900">{headline}</h3>
      <p className="text-[15px] text-gray-600 leading-relaxed mt-4">{copy}</p>
      {subline && <p className="text-[13px] font-bold mt-3" style={{ color: CORP_TEAL }}>{subline}</p>}
      {features && (
        <div className="flex flex-wrap gap-1.5 mt-5">
          {features.slice(0, 6).map((f) => (
            <span key={f} className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold text-gray-600 border" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>{f}</span>
          ))}
        </div>
      )}
      <Link href={ctaHref || href} className="mt-auto pt-7 inline-flex items-center gap-2 text-[15px] font-bold group w-fit" style={{ color: CORP_TEAL }}>
        {cta} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}