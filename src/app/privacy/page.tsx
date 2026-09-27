'use client';

/* Privacy — Attenda Technologies LLC master framework.
   Corporate policy covering all products; product-specific provisions below. */

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { CorporateNav, CorporateFooter, CORP_TEAL, CORP_TEAL_BRIGHT, CORP_INK, CORP_MIST, CORP_BORDER } from '@/components/corporate/Chrome';

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'About this policy',
    body: (
      <>
        <p>
          Attenda Technologies LLC (&ldquo;Attenda&rdquo;, &ldquo;we&rdquo;), 66 W Flagler St, Suite 900, Miami, FL 33130, United States, operates the products Attenda Hospitality, Attenda Serve and Attenda Transportation, and the website attendaapp.com.
        </p>
        <p>
          This policy explains how we handle information across those products. Where a product or property operates its own policy, that policy applies to its guests and customers.
        </p>
      </>
    ),
  },
  {
    title: 'What we collect',
    body: (
      <>
        <p><strong>Attenda Hospitality (guests):</strong> information you provide during your stay — name, room number, check-out date — used to personalize your in-stay experience and route service requests to the right hotel team.</p>
        <p><strong>Attenda Serve (businesses &amp; their customers):</strong> business account information (business name, contact, country, menu/products) and customer order information (name, contact, delivery/pickup details) collected by businesses using Serve. Businesses own their customer relationships; we process order data to operate the service.</p>
        <p><strong>Attenda Transportation:</strong> trip, scheduling, vehicle and dispatch information, plus passenger contact details needed to coordinate pickups and communicate arrival information.</p>
      </>
    ),
  },
  {
    title: 'How we use it',
    body: (
      <>
        <p>We use information to operate the products: process service requests, orders, trips and workflows; ensure requests reach the correct team; provide support; and improve reliability.</p>
        <p>We do not sell, share, or transfer personal data to third parties for marketing purposes. Attenda does not take a percentage of Serve sales, and order data is used to run the business&apos;s own channel — not ours.</p>
      </>
    ),
  },
  {
    title: 'Cookies &amp; local storage',
    body: (
      <p>
        We use browser local storage to remember sessions (in-stay, staff, merchant and partner logins). No cross-site tracking cookies are used. In-stay session data is automatically cleared after the check-out date. Aggregate, non-identifying product analytics help us understand feature usage.
      </p>
    ),
  },
  {
    title: 'Payments',
    body: (
      <p>
        Payments on Attenda Serve are processed by local payment providers in each market and handled between the business and its customer. Card and account details are handled by those providers and are subject to their own privacy policies. Attenda does not store card numbers.
      </p>
    ),
  },
  {
    title: 'Third-party services &amp; partner businesses',
    body: (
      <p>
        Food and service orders may be fulfilled by individual hotel or merchant partners. Transportation may be provided by independent providers operating on Attenda Transportation. Those partners act as controllers of their own customers&apos; data and are subject to their own policies; Attenda processes data on their behalf to deliver the service.
      </p>
    ),
  },
  {
    title: 'Data retention',
    body: (
      <p>
        Operational records (orders, trips, service requests) are retained as needed to run the operation and as required by law. Guest session data on your device is automatically expired after check-out. Business and partner account data is retained while the account is active and for a reasonable period after closure.
      </p>
    ),
  },
  {
    title: 'Your choices',
    body: (
      <p>
        You may request access to, correction of, or deletion of your personal data. Guests may ask the front desk of the property they are staying at; businesses and partners may contact us directly.
      </p>
    ),
  },
  {
    title: 'Contact',
    body: (
      <p>
        Questions about your privacy? Contact <a href="mailto:support@attendaapp.com" className="font-bold underline" style={{ color: CORP_TEAL }}>support@attendaapp.com</a> or write to Attenda Technologies LLC, 66 W Flagler St, Suite 900, Miami, FL 33130, United States.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <CorporateNav />
      <section style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-3xl mx-auto px-5 pt-16 pb-12 md:pt-20 md:pb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}22` }}>
              <ShieldCheck size={18} style={{ color: CORP_TEAL_BRIGHT }} />
            </div>
            <span className="text-[11px] font-black tracking-[0.26em] uppercase" style={{ color: CORP_TEAL_BRIGHT }}>Attenda Technologies LLC</span>
          </div>
          <h1 className="text-[34px] md:text-[48px] font-black tracking-tight text-white leading-[1.06]">Privacy Policy</h1>
          <p className="text-[14px] text-gray-400 mt-3">Last updated: September 2026</p>
        </div>
      </section>
      <section className="py-14 md:py-20 px-5 bg-white">
        <div className="max-w-3xl mx-auto space-y-4">
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-2xl border p-6 md:p-7" style={{ borderColor: CORP_BORDER, backgroundColor: CORP_MIST }}>
              <h2 className="text-[17px] font-black text-gray-900 mb-2.5">{s.title}</h2>
              <div className="space-y-3 text-[14px] text-gray-700 leading-relaxed">{s.body}</div>
            </div>
          ))}
          <p className="text-[13px] text-gray-500 px-1 pt-2">
            See also our <Link href="/terms" className="underline font-semibold" style={{ color: CORP_TEAL }}>Terms of Service</Link>.
          </p>
        </div>
      </section>
      <CorporateFooter />
    </div>
  );
}