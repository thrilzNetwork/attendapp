'use client';

/* Terms — Attenda Technologies LLC master framework + product provisions. */

import Link from 'next/link';
import { ScrollText } from 'lucide-react';
import { CorporateNav, CorporateFooter, CORP_TEAL, CORP_TEAL_BRIGHT, CORP_INK, CORP_MIST, CORP_BORDER } from '@/components/corporate/Chrome';

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'The agreement',
    body: (
      <>
        <p>These Terms of Service govern the products Attenda Hospitality, Attenda Serve and Attenda Transportation, and the website attendaapp.com, all operated by Attenda Technologies LLC (&ldquo;Attenda&rdquo;, &ldquo;we&rdquo;), 66 W Flagler St, Suite 900, Miami, FL 33130, United States.</p>
        <p>By using any Attenda product or website you agree to these terms. Product-specific terms below apply in addition to — not instead of — this framework.</p>
      </>
    ),
  },
  {
    title: 'Attenda Technologies — the company',
    body: (
      <p>Attenda Technologies LLC is the provider of all Attenda products. Attenda Hospitality, Attenda Serve and Attenda Transportation are products and solutions built by Attenda Technologies. Nothing in these terms creates a partnership, agency or employment relationship between Attenda and the businesses, properties or providers using the products.</p>
    ),
  },
  {
    title: 'Attenda Hospitality',
    body: (
      <>
        <p>Attenda Hospitality is a hotel operations platform from Attenda Technologies. It organizes staff workflows, guest requests, housekeeping, maintenance, inspections, procedures and operational visibility for hospitality properties.</p>
        <p>Guest-facing services (transport, food orders, messages) are fulfilled by the property or its partners. Attenda provides the operational layer and does not itself fulfill guest services.</p>
      </>
    ),
  },
  {
    title: 'Attenda Serve — orders & payments',
    body: (
      <>
        <p>Attenda Serve is a commerce platform from Attenda Technologies that gives businesses their own digital sales channel. The business using Serve is the seller of record for its own products and is responsible for its storefront content, pricing, order fulfillment, refunds and compliance with local consumer law.</p>
        <p><strong>Payments:</strong> payments between a customer and a business are processed by local payment providers in each market. Attenda does not take a percentage of a business's sales. Subscription fees (Starter/Growth), the one-time activation fee and partner payouts are governed by the order form or plan presented at purchase. One-time payouts to partners are paid on successfully activated businesses as described in the partner program.</p>
      </>
    ),
  },
  {
    title: 'Attenda Transportation',
    body: (
      <>
        <p>Attenda Transportation is a transportation solution from Attenda Technologies for scheduling, dispatch, live vehicle visibility and operational communication.</p>
        <p><strong>Transportation services:</strong> trips are provided by the transportation providers and operators using the platform (or by the properties coordinating them), not by Attenda. Attenda coordinates information and communication; each provider remains responsible for its vehicles, drivers, safety and compliance with applicable transportation law.</p>
      </>
    ),
  },
  {
    title: 'Third-party providers',
    body: (
      <p>Products may rely on third-party services (payment processors, messaging platforms such as WhatsApp, GPS/location services, hosting). Availability of those services is subject to the providers' own terms. Attenda is not liable for third-party outages but will support customers in working around them.</p>
    ),
  },
  {
    title: 'Accounts & acceptable use',
    body: (
      <p>You are responsible for the accuracy of account information, the security of your credentials, and the activity that happens under your account. Do not use the products to sell unlawful goods, harass anyone, or interfere with another business's or property's operation. We may suspend accounts that create legal or security risk for the platform or its users.</p>
    ),
  },
  {
    title: 'Data & privacy',
    body: (
      <p>Handling of personal information is described in our <Link href="/privacy" className="font-bold underline" style={{ color: CORP_TEAL }}>Privacy Policy</Link>. Businesses and partners remain controllers of their own customers' data; Attenda processes that data to deliver the service.</p>
    ),
  },
  {
    title: 'Disclaimers & liability',
    body: (
      <p>The products are provided &ldquo;as is&rdquo; with reasonable efforts toward availability and correctness. To the maximum extent permitted by law, Attenda is not liable for indirect or consequential damages. Nothing limits liability that cannot be limited under applicable law.</p>
    ),
  },
  {
    title: 'Changes & contact',
    body: (
      <p>We may update these terms as the products evolve; material changes will be posted here. Questions? <a href="mailto:support@attendaapp.com" className="font-bold underline" style={{ color: CORP_TEAL }}>support@attendaapp.com</a> · Attenda Technologies LLC, 66 W Flagler St, Suite 900, Miami, FL 33130, United States.</p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <CorporateNav />
      <section style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-3xl mx-auto px-5 pt-16 pb-12 md:pt-20 md:pb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${CORP_TEAL}22` }}>
              <ScrollText size={18} style={{ color: CORP_TEAL_BRIGHT }} />
            </div>
            <span className="text-[11px] font-black tracking-[0.26em] uppercase" style={{ color: CORP_TEAL_BRIGHT }}>Attenda Technologies LLC</span>
          </div>
          <h1 className="text-[34px] md:text-[48px] font-black tracking-tight text-white leading-[1.06]">Terms of Service</h1>
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
        </div>
      </section>
      <CorporateFooter />
    </div>
  );
}