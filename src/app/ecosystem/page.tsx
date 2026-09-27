'use client';

/* Ecosystem — how Attenda products connect.
   ONE COMPANY. MULTIPLE OPERATING SYSTEMS. ONE CONNECTED ECOSYSTEM.
   Every solution stands alone; connection happens where workflows overlap. */

import Link from 'next/link';
import { ArrowRight, BedDouble, Store, Truck } from 'lucide-react';
import { CorporateNav, CorporateFooter, CORP_TEAL, CORP_TEAL_BRIGHT, CORP_INK, CORP_MIST, CORP_BORDER } from '@/components/corporate/Chrome';

function Diagram() {
  const nodes = [
    { label: 'HOSPITALITY', icon: BedDouble, href: '/hospitality', tint: 'linear-gradient(160deg,#0F2E33,#0A1A1F)' },
    { label: 'TRANSPORTATION', icon: Truck, href: '/transportation', tint: 'linear-gradient(160deg,#101B2E,#0A111E)' },
    { label: 'SERVE', icon: Store, href: '/serve', tint: 'linear-gradient(160deg,#172A26,#0E1A17)' },
  ] as const;
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-center mb-10">
        <div className="rounded-2xl border-2 px-8 py-5 text-center" style={{ borderColor: CORP_TEAL, backgroundColor: 'rgba(21,138,124,0.08)' }}>
          <div className="text-[18px] font-black tracking-tight" style={{ color: CORP_TEAL }}>ATTENDA TECHNOLOGIES</div>
          <div className="text-[11px] font-bold tracking-[0.24em] mt-1" style={{ color: CORP_TEAL_BRIGHT }}>THE COMPANY ABOVE THE PRODUCTS</div>
        </div>
      </div>
      <div className="flex justify-center mb-10">
        <div className="text-[11px] font-bold tracking-[0.3em] text-gray-400 uppercase">Designed to connect · Can connect where workflows overlap</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4">
        {[
          <Link key="h" href={nodes[0].href} className="block rounded-2xl border p-6 text-center transition-transform hover:-translate-y-0.5" style={{ borderColor: `${CORP_TEAL}44`, background: nodes[0].tint }}>
            <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}22` }}>
              <BedDouble size={19} style={{ color: CORP_TEAL_BRIGHT }} />
            </div>
            <div className="text-[13px] font-black tracking-[0.14em] text-white">HOSPITALITY</div>
            <div className="text-[11px] text-gray-400 mt-1">Hotel operations</div>
          </Link>,
          <div key="l1" className="hidden md:flex flex-col items-center justify-center px-1">
            <div className="text-teal-300 text-[17px] font-black">⇄</div>
            <div className="text-[9.5px] text-gray-500 font-bold text-center leading-tight mt-1 max-w-[120px]">Guest demand ⇄ Commerce</div>
          </div>,
          <Link key="s" href={nodes[2].href} className="block rounded-2xl border p-6 text-center transition-transform hover:-translate-y-0.5" style={{ borderColor: `${CORP_TEAL}44`, background: nodes[2].tint }}>
            <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}22` }}>
              <Store size={19} style={{ color: CORP_TEAL_BRIGHT }} />
            </div>
            <div className="text-[13px] font-black tracking-[0.14em] text-white">SERVE</div>
            <div className="text-[11px] text-gray-400 mt-1">Commerce & orders</div>
          </Link>,
          <div key="l2" className="hidden md:flex flex-col items-center justify-center px-1">
            <div className="text-teal-300 text-[17px] font-black">⇄</div>
            <div className="text-[9.5px] text-gray-500 font-bold text-center leading-tight mt-1 max-w-[120px]">Fulfillment ⇄ Movement</div>
          </div>,
          <Link key="t" href={nodes[1].href} className="block rounded-2xl border p-6 text-center transition-transform hover:-translate-y-0.5" style={{ borderColor: `${CORP_TEAL}44`, background: nodes[1].tint }}>
            <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}22` }}>
              <Truck size={19} style={{ color: CORP_TEAL_BRIGHT }} />
            </div>
            <div className="text-[13px] font-black tracking-[0.14em] text-white">TRANSPORTATION</div>
            <div className="text-[11px] text-gray-400 mt-1">Live vehicle operations</div>
          </Link>,
        ]}
      </div>
    </div>
  );
}

const CONNECTIONS = [
  { pair: 'HOSPITALITY + TRANSPORTATION', copy: 'A hotel can coordinate shuttle demand while a transportation provider manages vehicles, drivers, pickups and ETAs. Same movement. Different operational views.', chain: 'Guest → Hotel → Transportation → Driver' },
  { pair: 'HOSPITALITY + SERVE', copy: 'Hospitality guests can access curated food and commerce options while participating businesses manage orders through their own operating environment — a connection between guest demand and local businesses without turning Attenda into a marketplace.', chain: 'Guest → Hospitality experience → Merchant → Serve' },
  { pair: 'SERVE + TRANSPORTATION', copy: 'Commerce eventually creates fulfillment. Where transportation or delivery is needed, transportation workflows can connect sellers, customers and drivers.', chain: 'Order → Fulfillment → Driver → Customer' },
];

export default function EcosystemPage() {
  return (
    <div className="min-h-screen bg-white">
      <CorporateNav />

      {/* HERO */}
      <section style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-4xl mx-auto px-5 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
          <h1 className="text-[34px] md:text-[52px] leading-[1.06] font-black tracking-tight text-white">
            ONE COMPANY.<br />
            MULTIPLE OPERATING SYSTEMS.<br />
            <span style={{ color: CORP_TEAL_BRIGHT }}>ONE CONNECTED ECOSYSTEM.</span>
          </h1>
          <p className="text-[17px] text-gray-300 leading-relaxed mt-7 max-w-2xl mx-auto">
            Attenda Technologies builds products for different industries that share one problem: work happens everywhere, and it needs to be organized.
          </p>
        </div>
      </section>

      {/* DIAGRAM */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <Diagram />
      </section>

      {/* STANDALONE + CONNECTED */}
      <section className="py-20 md:py-24 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-[30px] md:text-[42px] font-black tracking-tight leading-[1.1] text-gray-900">
            Every solution can stand alone.
          </h2>
          <p className="text-[17px] text-gray-600 leading-relaxed mt-6">
            Each product works on its own — a hotel runs its operation, a business sells, a transportation provider moves people. Nothing requires anything else to function.
          </p>
          <p className="text-[17px] text-gray-800 font-bold mt-5">
            When there is value in connecting them, they can share workflows across the Attenda ecosystem.
          </p>
        </div>
        <div className="max-w-4xl mx-auto mt-14 grid md:grid-cols-3 gap-4">
          {CONNECTIONS.map((c) => (
            <div key={c.pair} className="rounded-2xl border p-6 bg-white" style={{ borderColor: CORP_BORDER }}>
              <div className="text-[10.5px] font-black tracking-[0.16em] mb-3" style={{ color: CORP_TEAL }}>{c.pair}</div>
              <p className="text-[14px] text-gray-600 leading-relaxed">{c.copy}</p>
              <div className="text-[12px] font-bold text-gray-800 mt-4 font-mono">{c.chain}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY ONE COMPANY */}
      <section className="py-24 md:py-28 px-5" style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-[28px] md:text-[42px] font-black tracking-tight leading-[1.1] text-white">
            Why these three belong<br />under one company.
          </h2>
          <p className="text-[16.5px] text-gray-400 leading-relaxed mt-7">
            Because they are the same problem wearing different clothes: people doing real work across messages, paper, calls and memory. Hospitality, commerce and transportation all need the same thing — operational technology that fits how the work actually happens.
          </p>
          <p className="text-[17px] md:text-[19px] font-bold text-white mt-8">
            One philosophy. Built once, applied everywhere the work is real.
          </p>
          <Link href="/company" className="inline-flex items-center gap-2 mt-10 px-8 py-4 rounded-xl font-semibold text-[15px] border border-white/25 text-white hover:border-white/50 transition-all">
            Read the company story <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <CorporateFooter />
    </div>
  );
}