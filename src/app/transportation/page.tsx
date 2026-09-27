'use client';

/* Attenda Transportation — product page.
   Positioning: scheduling, dispatch, live vehicle visibility and customer
   communication in one operational workflow. Real UI, not stock vans.
   Audiences: hospitality, transportation providers, operators. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Bus, CheckCircle2, Clock, MapPin, MessageSquare, Navigation,
  PhoneCall, Radio, Users,
} from 'lucide-react';
import { CorporateNav, CorporateFooter, CORP_TEAL, CORP_TEAL_BRIGHT, CORP_INK, CORP_MIST, CORP_BORDER } from '@/components/corporate/Chrome';

/* ── Live dispatch board visual ── */
function DispatchBoard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 2200);
    return () => clearInterval(t);
  }, []);
  const trips = [
    { id: 'TRP-2041', from: 'MIA Airport · T2', to: '66 W Flagler St', eta: '12 min', status: 'En route', driver: 'M. Alvarez', veh: 'Van 3' },
    { id: 'TRP-2042', from: 'PortMiami · Terminal D', to: 'Homewood Suites', eta: '26 min', status: 'Pickup scheduled', driver: 'J. Reyes', veh: 'Van 1' },
    { id: 'TRP-2043', from: 'Brickell Ave 1101', to: 'MIA Airport · T1', eta: '8 min', status: 'Arriving', driver: 'L. Campos', veh: 'Sedan 2' },
  ];
  return (
    <div className="rounded-2xl border bg-gray-950/95 p-5 md:p-6 shadow-2xl" style={{ borderColor: 'rgba(21,179,158,0.25)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio size={15} style={{ color: CORP_TEAL_BRIGHT }} />
          <span className="text-[11px] font-black tracking-[0.2em] text-white">LIVE DISPATCH BOARD</span>
        </div>
        <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${CORP_TEAL}22`, color: CORP_TEAL_BRIGHT }}>
          3 ACTIVE TRIPS
        </span>
      </div>
      <div className="space-y-2.5">
        {trips.map((t, i) => (
          <div key={t.id}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all"
            style={tick % 3 === i ? { borderColor: `${CORP_TEAL_BRIGHT}55`, transform: 'translateY(-1px)' } : undefined}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-black text-white tracking-wide">{t.id}</div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: CORP_TEAL_BRIGHT }}>
                <Clock size={12} /> ETA {t.eta}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11.5px] text-gray-300">
              <MapPin size={11} className="text-gray-500 shrink-0" />
              <span className="truncate">{t.from}</span>
              <ArrowRight size={11} className="text-gray-600 shrink-0" />
              <span className="truncate">{t.to}</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-[10.5px] text-gray-500 font-semibold">
              <span>{t.driver} · {t.veh}</span>
              <span className="px-2 py-0.5 rounded-full bg-white/8 text-gray-300">{t.status}</span>
            </div>
          </div>
        ))}
      </div>
      {/* mini map strip */}
      <div className="mt-4 rounded-xl border border-white/10 h-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B1524 0%, #0E1E33 100%)' }}>
        <svg className="absolute inset-0 w-full h-full" aria-hidden>
          <path d="M10,70 C80,55 120,30 190,25 S300,40 340,18" stroke={CORP_TEAL_BRIGHT} strokeWidth="2" fill="none" strokeDasharray="5 7" opacity="0.7" />
          <circle cx={10 + ((tick * 37) % 320)} cy={70 - ((tick * 13) % 45)} r="5" fill={CORP_TEAL_BRIGHT} opacity="0.95" />
          <circle cx="340" cy="18" r="4" fill="#fff" opacity="0.7" />
        </svg>
        <div className="absolute bottom-2 left-3 text-[9.5px] font-bold tracking-[0.2em] text-gray-500">VEHICLE LOCATION · LIVE GPS</div>
      </div>
    </div>
  );
}

const WORKFLOW = [
  'Customer/passenger requests transportation.',
  'Pickup enters the live board.',
  'Dispatcher sees upcoming demand.',
  'Driver receives the assignment.',
  'Vehicle location and ETA update.',
  'Customer/property sees arrival information.',
  'Trip is completed and recorded.',
];

const CAPABILITIES = [
  ['Live scheduling', 'Pickups and trips on one live board — today, tonight, this week.'],
  ['Pickup management', 'Time, location, party size and status for every pickup, organized.'],
  ['Driver workflows', 'Assignments reach the right driver with everything they need.'],
  ['Live GPS', 'Know where the vehicle is without calling anyone.'],
  ['ETAs', 'Arrival times update as the trip happens, not after.'],
  ['Demand forecasting', 'Dispatcher sees upcoming demand before it becomes a scramble.'],
  ['Guest/passenger communication', 'Status and arrival information reach the people waiting.'],
  ['Hotel connectivity', 'Properties coordinate shuttle demand with transportation providers.'],
  ['Multi-property / vendor operation', 'One provider serving several properties, cleanly separated.'],
  ['Performance history', 'Trips recorded and searchable after completion.'],
] as const;

const AUDIENCES = [
  { t: 'HOSPITALITY', d: 'Hotels with airport, cruise-port or local shuttle operations.', icon: Users },
  { t: 'TRANSPORTATION PROVIDERS', d: 'Companies operating transportation for one or multiple properties.', icon: Bus },
  { t: 'OPERATORS', d: 'Organizations coordinating scheduled movement and customer pickup.', icon: Navigation },
] as const;

export default function TransportationPage() {
  return (
    <div className="min-h-screen bg-white">
      <CorporateNav />

      {/* ── HERO ── */}
      <section style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-7xl mx-auto px-5 pt-16 pb-12 md:pt-24 md:pb-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-[11px] font-black tracking-[0.3em] uppercase mb-6" style={{ color: CORP_TEAL_BRIGHT }}>
              Attenda Transportation
            </div>
            <h1 className="text-[40px] md:text-[58px] leading-[1.02] font-black tracking-tight text-white">
              STOP GUESSING<br /><span style={{ color: CORP_TEAL_BRIGHT }}>WHERE THE VEHICLE IS.</span>
            </h1>
            <p className="text-[17px] md:text-[19px] text-gray-300 leading-relaxed mt-6 max-w-xl">
              Scheduling, dispatch, live vehicle visibility and customer communication in one operational workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-9">
              <a href="#workflow" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-[15px]" style={{ backgroundColor: CORP_TEAL_BRIGHT, color: CORP_INK }}>
                See Transportation <ArrowRight size={17} />
              </a>
              <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[15px] border border-white/20 text-white/90 hover:border-white/40 transition-all">
                Talk to our team
              </Link>
            </div>
          </div>
          <DispatchBoard />
        </div>
      </section>

      {/* ── WORKFLOW ── */}
      <section id="workflow" className="py-20 md:py-28 px-5 bg-white scroll-mt-20">
        <div className="max-w-3xl mx-auto mb-14">
          <h2 className="text-[32px] md:text-[44px] font-black tracking-tight leading-[1.08] text-gray-900">One workflow. No radio silence.</h2>
          <p className="text-[17px] text-gray-600 mt-5 leading-relaxed">
            The trip lives in one system from request to record — instead of across phone calls, messages and memory.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          {WORKFLOW.map((step, i) => (
            <div key={step} className="flex items-start gap-5">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black shrink-0 border-2"
                  style={{ borderColor: CORP_TEAL, color: CORP_TEAL, backgroundColor: '#fff' }}>{i + 1}</div>
                {i < WORKFLOW.length - 1 && <div className="w-px h-7 my-1" style={{ backgroundColor: `${CORP_TEAL}55` }} />}
              </div>
              <p className="text-[16.5px] font-semibold text-gray-800 pt-1.5 pb-4">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CORE PRODUCT ── */}
      <section className="py-20 md:py-28 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[32px] md:text-[44px] font-black tracking-tight text-gray-900 leading-[1.08] mb-14">What the operation gets.</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {CAPABILITIES.map(([t, c]) => (
              <div key={t} className="rounded-2xl bg-white border p-6" style={{ borderColor: CORP_BORDER }}>
                <div className="text-[15px] font-black text-gray-900">{t}</div>
                <p className="text-[14px] text-gray-600 mt-1.5 leading-relaxed">{c}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AUDIENCES ── */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[32px] md:text-[44px] font-black tracking-tight text-gray-900 leading-[1.08] mb-4">Built for more than one buyer.</h2>
          <p className="text-[17px] text-gray-600 max-w-2xl mb-14 leading-relaxed">
            Hospitality is a major use case — not the boundary. Transportation coordination is its own operating solution.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.t} className="rounded-3xl border p-8" style={{ borderColor: CORP_BORDER, background: 'linear-gradient(160deg, #101B2E 0%, #0A111E 100%)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: `${CORP_TEAL}22` }}>
                    <Icon size={19} style={{ color: CORP_TEAL_BRIGHT }} />
                  </div>
                  <div className="text-[12px] font-black tracking-[0.2em] text-white">{a.t}</div>
                  <p className="text-[14.5px] text-gray-400 mt-2.5 leading-relaxed">{a.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-5" style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-[30px] md:text-[44px] font-black tracking-tight leading-[1.08] text-white">
            Know who&apos;s moving,<br />where and when.
          </h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-[15px]" style={{ backgroundColor: CORP_TEAL_BRIGHT, color: CORP_INK }}>
              Talk to our team <ArrowRight size={16} />
            </Link>
            <Link href="/ecosystem" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[15px] border border-white/25 text-white/90 hover:border-white/50 transition-all">
              How it connects <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <CorporateFooter />
    </div>
  );
}