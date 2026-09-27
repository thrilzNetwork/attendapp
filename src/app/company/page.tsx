'use client';

/* Company — Attenda Technologies story.
   WE BUILD FOR HOW WORK ACTUALLY HAPPENS. */

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BedDouble, Mail, MapPin, Store, Truck } from 'lucide-react';
import { CorporateNav, CorporateFooter, CORP_TEAL, CORP_TEAL_BRIGHT, CORP_INK, CORP_MIST, CORP_BORDER } from '@/components/corporate/Chrome';

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-white">
      <CorporateNav />

      {/* HERO */}
      <section style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-4xl mx-auto px-5 pt-20 pb-16 md:pt-28 md:pb-20">
          <div className="text-[11px] font-black tracking-[0.3em] uppercase mb-6" style={{ color: CORP_TEAL_BRIGHT }}>Attenda Technologies · Miami</div>
          <h1 className="text-[36px] md:text-[56px] leading-[1.04] font-black tracking-tight text-white">
            WE BUILD FOR<br /><span style={{ color: CORP_TEAL_BRIGHT }}>HOW WORK ACTUALLY HAPPENS.</span>
          </h1>
          <div className="mt-10 space-y-2.5">
            {['Attenda started in operations.', 'Not a laboratory. Not a consulting deck. Not a theoretical workflow.', 'Real teams. Real customers. Real businesses. Real transportation. Real operating pressure.'].map((l, i) => (
              <p key={l} className={`leading-relaxed ${i === 0 ? 'text-[19px] font-bold text-white' : 'text-[16px] text-gray-400'}`}>{l}</p>
            ))}
          </div>
          <p className="text-[17px] font-bold text-white mt-8">
            That is why Attenda products start with the operation — and work backward toward the technology.
          </p>
        </div>
      </section>

      {/* STORY */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-[12px] font-black tracking-[0.28em] uppercase mb-4" style={{ color: CORP_TEAL }}>The story</div>
          <h2 className="text-[30px] md:text-[44px] font-black tracking-tight leading-[1.1] text-gray-900">
            Started inside hospitality. Built for every operation since.
          </h2>
          <div className="space-y-5 text-[16.5px] text-gray-600 leading-relaxed mt-7">
            <p>
              Attenda began inside hospitality, where we saw firsthand how much of an operation still depends on disconnected tools, paper, messages and knowledge living inside people&apos;s heads.
            </p>
            <p className="font-bold text-gray-900">
              That experience led to a bigger idea: technology should be built around how people actually operate.
            </p>
            <p>
              Today, Attenda Technologies applies that philosophy across hospitality, commerce and transportation — three products, one principle. We build systems for people doing real work, not software designed in isolation from it.
            </p>
          </div>

          {/* FOUNDER */}
          <div className="rounded-3xl border p-8 mt-12" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
            <div className="text-[11px] font-black tracking-[0.26em] uppercase mb-3" style={{ color: CORP_TEAL }}>Founder</div>
            <div className="text-[24px] font-black text-gray-900">Alejandro Soria</div>
            <p className="text-[15px] text-gray-600 mt-3 leading-relaxed">
              A hotel operator who spent years running properties before writing a line of the platform — Attenda exists because the operations he ran needed it.
            </p>
          </div>
        </div>
      </section>

      {/* MIAMI */}
      <section className="py-20 md:py-28 px-5" style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="relative rounded-3xl overflow-hidden border border-white/15" style={{ minHeight: 360 }}>
            <Image src="https://images.unsplash.com/photo-1534482421-64566f976cfa?w=1400&q=80" alt="Miami skyline — home of Attenda Technologies" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,15,20,0.05) 40%, rgba(8,15,20,0.8) 100%)' }} />
          </div>
          <div>
            <div className="text-[11px] font-black tracking-[0.3em] uppercase mb-3" style={{ color: CORP_TEAL_BRIGHT }}>MIAMI, FLORIDA</div>
            <h2 className="text-[30px] md:text-[42px] font-black tracking-tight leading-[1.08] text-white">Our home.</h2>
            <p className="text-[16.5px] text-gray-300 leading-relaxed mt-6">
              Attenda Technologies is based in Miami — a city connecting the United States, Latin America, hospitality, commerce, transportation and entrepreneurship. It is the natural home for what we&apos;re building.
            </p>
            <p className="text-[15px] text-gray-400 mt-4 flex items-center gap-2">
              <MapPin size={15} style={{ color: CORP_TEAL_BRIGHT }} /> 66 W Flagler St, Suite 900 · Miami, FL 33130
            </p>
          </div>
        </div>
      </section>

      {/* MISSION + PHILOSOPHY + MARKETS */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-5">
          <div className="rounded-3xl border p-8" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
            <div className="text-[11px] font-black tracking-[0.26em] uppercase mb-3" style={{ color: CORP_TEAL }}>Mission</div>
            <p className="text-[20px] font-black text-gray-900 leading-snug">
              Technology for the people who keep business moving.
            </p>
            <p className="text-[15px] text-gray-600 mt-4 leading-relaxed">
              Organize the fragmented work — the WhatsApps, the calls, the paper, the knowledge in people&apos;s heads — into systems the people responsible can actually use.
            </p>
          </div>
          <div className="rounded-3xl border p-8" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
            <div className="text-[11px] font-black tracking-[0.26em] uppercase mb-3" style={{ color: CORP_TEAL }}>Operating philosophy</div>
            <p className="text-[16.5px] text-gray-700 leading-relaxed">
              We don&apos;t build technology to replace the people doing the work. We build technology to make their work work better.
            </p>
            <p className="text-[15px] font-bold text-gray-900 mt-4">
              AI can assist. Software can organize. People still decide.
            </p>
          </div>
          <div className="rounded-3xl border p-8 md:col-span-2" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
            <div className="text-[11px] font-black tracking-[0.26em] uppercase mb-3" style={{ color: CORP_TEAL }}>U.S. + LATAM direction</div>
            <div className="grid sm:grid-cols-3 gap-5 mt-2">
              {[
                ['Hospitality', 'Begins with U.S. operators.', BedDouble, '/hospitality'],
                ['Serve', 'Built with Latin American businesses in mind.', Store, '/serve'],
                ['Transportation', 'Connects physical operations wherever people and vehicles move.', Truck, '/transportation'],
              ].map(([t, c, Icon, href]) => {
                const I = Icon as typeof BedDouble;
                return (
                  <Link key={t as string} href={href as string} className="group">
                    <div className="flex items-center gap-2">
                      <I size={15} style={{ color: CORP_TEAL }} />
                      <div className="text-[14px] font-black text-gray-900">{t as string}</div>
                    </div>
                    <p className="text-[13.5px] text-gray-600 mt-1.5 leading-relaxed">{c as string}</p>
                    <div className="text-[12.5px] font-bold mt-2 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: CORP_TEAL }}>
                      Explore <ArrowRight size={12} />
                    </div>
                  </Link>
                );
              })}
            </div>
            <p className="text-[15px] font-bold text-gray-900 mt-8">The technology changes by market. The principle does not.</p>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="py-24 px-5" style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-[30px] md:text-[44px] font-black tracking-tight text-white leading-[1.08]">Talk to Attenda Technologies</h2>
          <div className="mt-10 rounded-2xl border border-white/15 bg-white/5 p-8 text-left max-w-md mx-auto">
            <div className="text-[16px] font-black text-white">Attenda Technologies LLC</div>
            <div className="text-[14.5px] text-gray-300 mt-2 leading-relaxed">66 W Flagler St<br />Suite 900<br />Miami, FL 33130<br />United States</div>
            <a href="mailto:support@attendaapp.com" className="inline-flex items-center gap-2 text-[14.5px] font-bold mt-4" style={{ color: CORP_TEAL_BRIGHT }}>
              <Mail size={15} /> support@attendaapp.com
            </a>
          </div>
        </div>
      </section>

      <CorporateFooter />
    </div>
  );
}