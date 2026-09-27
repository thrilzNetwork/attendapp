'use client';

/* Insights — Attenda Technologies publishing hub.
   Individual products keep category content (Field Notes → Hospitality). */

import Link from 'next/link';
import { ArrowRight, BedDouble, Building2, Cpu, Globe2, Radio, Store, Truck, Users } from 'lucide-react';
import { CorporateNav, CorporateFooter, CORP_TEAL, CORP_TEAL_BRIGHT, CORP_INK, CORP_MIST, CORP_BORDER } from '@/components/corporate/Chrome';

const CATEGORIES = [
  { t: 'Hospitality', d: 'Hotel operations, staff workflows, guest experience. Home of Field Notes.', href: '/blog', icon: BedDouble, live: true },
  { t: 'Commerce', d: 'Selling, payments, WhatsApp workflows, customer retention across LATAM.', href: null, icon: Store, live: false },
  { t: 'Transportation', d: 'Dispatch, scheduling, live visibility and movement operations.', href: null, icon: Truck, live: false },
  { t: 'Technology', d: 'How Attenda products are built — and why.', href: null, icon: Cpu, live: false },
  { t: 'Operations', d: 'The discipline of running real businesses, from the people who do it.', href: null, icon: Users, live: false },
  { t: 'AI', d: 'Human-centered AI: assists the work, never replaces the judgment.', href: null, icon: Radio, live: false },
  { t: 'LATAM', d: 'Markets where operational technology must adapt to how people already work.', href: null, icon: Globe2, live: false },
  { t: 'Company', d: 'Notes from inside Attenda Technologies.', href: '/company', icon: Building2, live: false },
] as const;

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-white">
      <CorporateNav />

      {/* HERO */}
      <section style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-4xl mx-auto px-5 pt-20 pb-16 md:pt-24 md:pb-20">
          <div className="text-[11px] font-black tracking-[0.3em] uppercase mb-6" style={{ color: CORP_TEAL_BRIGHT }}>Attenda Technologies · Insights</div>
          <h1 className="text-[36px] md:text-[54px] leading-[1.04] font-black tracking-tight text-white">
            Field notes from<br /><span style={{ color: CORP_TEAL_BRIGHT }}>real operations.</span>
          </h1>
          <p className="text-[17px] text-gray-300 leading-relaxed mt-6 max-w-2xl">
            Articles, research and operator content from the people building and running Attenda. Written from the operation — not the lab.
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-20 md:py-24 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-[28px] md:text-[38px] font-black tracking-tight text-gray-900 mb-3">Categories</h2>
          <p className="text-[15.5px] text-gray-600 mb-10 max-w-2xl">Attenda Technologies is the publishing brand. Individual products keep their own category content.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const inner = (
                <div className={`rounded-2xl border p-6 h-full transition-all ${c.live ? 'hover:-translate-y-0.5 cursor-pointer' : 'opacity-75'}`}
                  style={{ borderColor: c.live ? `${CORP_TEAL}55` : CORP_BORDER, backgroundColor: c.live ? 'rgba(21,138,124,0.05)' : CORP_MIST }}>
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}14` }}>
                      <Icon size={16} style={{ color: CORP_TEAL }} />
                    </div>
                    {c.live
                      ? <span className="text-[9.5px] font-black tracking-widest px-2 py-1 rounded-full" style={{ backgroundColor: `${CORP_TEAL}22`, color: CORP_TEAL }}>LIVE</span>
                      : <span className="text-[9.5px] font-black tracking-widest px-2 py-1 rounded-full bg-gray-100 text-gray-400">COMING</span>}
                  </div>
                  <div className="text-[15.5px] font-black text-gray-900 mt-4">{c.t}</div>
                  <p className="text-[13px] text-gray-600 mt-1.5 leading-relaxed">{c.d}</p>
                </div>
              );
              return c.href
                ? <Link key={c.t} href={c.href}>{inner}</Link>
                : <div key={c.t}>{inner}</div>;
            })}
          </div>
        </div>
      </section>

      {/* FIELD NOTES FEATURE */}
      <section className="py-20 md:py-24 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-5xl mx-auto rounded-3xl border p-8 md:p-12" style={{ borderColor: CORP_BORDER, backgroundColor: '#fff' }}>
          <div className="text-[11px] font-black tracking-[0.26em] uppercase mb-3" style={{ color: CORP_TEAL }}>Hospitality · Field Notes</div>
          <h2 className="text-[28px] md:text-[40px] font-black tracking-tight leading-[1.1] text-gray-900">
            Hotel operations writing from fifteen years running independent properties.
          </h2>
          <p className="text-[16px] text-gray-600 leading-relaxed mt-5 max-w-2xl">
            Real writing on hotel operations, revenue, guest experience and staffing. No fake authors, real numbers. Field Notes continues under Attenda Hospitality.
          </p>
          <Link href="/blog" className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 rounded-xl font-bold text-[14.5px]" style={{ backgroundColor: CORP_TEAL, color: '#fff' }}>
            Read Field Notes <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <CorporateFooter />
    </div>
  );
}