'use client';

/* Contact — corporate contact for Attenda Technologies. */

import Link from 'next/link';
import { ArrowRight, Mail, MapPin } from 'lucide-react';
import { CorporateNav, CorporateFooter, CORP_TEAL, CORP_TEAL_BRIGHT, CORP_INK, CORP_MIST, CORP_BORDER, PRODUCTS } from '@/components/corporate/Chrome';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <CorporateNav />

      {/* HERO */}
      <section style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-4xl mx-auto px-5 pt-20 pb-16 md:pt-24 md:pb-20">
          <div className="text-[11px] font-black tracking-[0.3em] uppercase mb-6" style={{ color: CORP_TEAL_BRIGHT }}>Contact</div>
          <h1 className="text-[38px] md:text-[54px] leading-[1.04] font-black tracking-tight text-white">
            Talk to Attenda.
          </h1>
          <p className="text-[17px] text-gray-300 leading-relaxed mt-6 max-w-2xl">
            Tell us what you&apos;re trying to operate. We&apos;ll point you at the right product — or build toward what&apos;s missing.
          </p>
        </div>
      </section>

      {/* CONTACT BODY */}
      <section className="py-20 md:py-24 px-5 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {/* details */}
          <div>
            <div className="rounded-3xl border p-8" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
              <div className="text-[11px] font-black tracking-[0.26em] uppercase mb-4" style={{ color: CORP_TEAL }}>Company</div>
              <div className="text-[20px] font-black text-gray-900">Attenda Technologies LLC</div>
              <div className="text-[15px] text-gray-600 mt-4 leading-relaxed flex items-start gap-2.5">
                <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: CORP_TEAL }} />
                <span>66 W Flagler St<br />Suite 900<br />Miami, FL 33130<br />United States</span>
              </div>
              <a href="mailto:support@attendaapp.com" className="inline-flex items-center gap-2 text-[15px] font-bold mt-5" style={{ color: CORP_TEAL }}>
                <Mail size={15} /> support@attendaapp.com
              </a>
              <div className="text-[12.5px] text-gray-500 mt-2">Public support — we reply to every message.</div>
            </div>
            <div className="text-[13px] text-gray-500 mt-4 px-1">
              attendaapp.com · Miami, FL · Operating across the U.S. and Latin America
            </div>
          </div>

          {/* what are you trying to operate */}
          <div>
            <div className="text-[11px] font-black tracking-[0.26em] uppercase mb-4" style={{ color: CORP_TEAL }}>What are you trying to operate?</div>
            <div className="space-y-3">
              {[
                ['A hospitality property', 'Attenda Hospitality'],
                ['A business that sells', 'Attenda Serve'],
                ['A transportation operation', 'Attenda Transportation'],
              ].map(([q, a], i) => {
                const p = [PRODUCTS[0], PRODUCTS[1], PRODUCTS[2]][i];
                return (
                  <Link key={q} href={p.href} className="block rounded-2xl border p-5 hover:-translate-y-0.5 transition-transform" style={{ borderColor: CORP_BORDER, backgroundColor: '#fff' }}>
                    <div className="text-[13px] text-gray-500 font-semibold">{q}</div>
                    <div className="text-[16.5px] font-black text-gray-900 mt-1">{a}</div>
                    <div className="text-[12.5px] font-bold mt-2 inline-flex items-center gap-1.5" style={{ color: CORP_TEAL }}>
                      Explore <ArrowRight size={12} />
                    </div>
                  </Link>
                );
              })}
            </div>
            <p className="text-[13px] text-gray-500 mt-4 px-1 leading-relaxed">
              Not sure which fits? Email us — a real person from the operation reads it.
            </p>
          </div>
        </div>
      </section>

      <CorporateFooter />
    </div>
  );
}