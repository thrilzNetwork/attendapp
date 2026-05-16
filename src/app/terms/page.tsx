'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95"
        >
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-black">Terms of Service</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-8 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#6B1D3C]/10 flex items-center justify-center">
                <FileText size={20} className="text-[#6B1D3C]" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-gray-800">Terms of Service</p>
                <p className="text-[11px] text-gray-400">Last updated: May 2025</p>
              </div>
            </div>

            <div className="space-y-4 text-[13px] text-gray-700 leading-relaxed">
              <section>
                <p className="font-bold text-gray-800 mb-1">Acceptance of Terms</p>
                <p>
                  By using the Attenda guest experience platform, you agree to these terms. Attenda is provided
                  by your hotel as a convenience service to enhance your stay.
                </p>
              </section>

              <section>
                <p className="font-bold text-gray-800 mb-1">Use of Service</p>
                <p>
                  Attenda is intended for hotel guests during their stay. You agree to use the platform only for
                  legitimate service requests and communications with hotel staff. Misuse, abuse, or submission
                  of false requests may result in removal of access.
                </p>
              </section>

              <section>
                <p className="font-bold text-gray-800 mb-1">Service Requests</p>
                <p>
                  Requests submitted through Attenda (transport, food orders, housekeeping, etc.) are subject
                  to availability and the hotel&apos;s standard service policies. Response times and fulfillment
                  are at the hotel&apos;s discretion.
                </p>
              </section>

              <section>
                <p className="font-bold text-gray-800 mb-1">Food &amp; Beverage Orders</p>
                <p>
                  Menu items, pricing, and availability are set by individual hotel partners. Orders placed
                  through Attenda are subject to partner policies regarding refunds, allergens, and preparation
                  times. Always inform staff of dietary restrictions or allergies.
                </p>
              </section>

              <section>
                <p className="font-bold text-gray-800 mb-1">Transport Services</p>
                <p>
                  Shuttle and transport bookings are subject to availability and must be made in advance as
                  specified. Attenda is not responsible for delays caused by traffic, weather, or third-party
                  transport providers.
                </p>
              </section>

              <section>
                <p className="font-bold text-gray-800 mb-1">Limitation of Liability</p>
                <p>
                  Attenda is provided &quot;as is&quot; as a convenience tool. The hotel and Attenda are not liable for
                  service failures, delays, or errors beyond reasonable control.
                </p>
              </section>

              <section>
                <p className="font-bold text-gray-800 mb-1">Changes to Terms</p>
                <p>
                  These terms may be updated periodically. Continued use of the platform constitutes acceptance
                  of the current terms.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
