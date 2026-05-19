'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { getHotelConfig } from '@/lib/supabase';

export default function PrivacyPage() {
  const router = useRouter();
  const [brandColor, setBrandColor] = useState('#6B1D3C');

  useEffect(() => {
    getHotelConfig().then((config) => {
      if (config?.brandColor) setBrandColor(config.brandColor);
    }).catch(() => {});
  }, []);

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95"
        >
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-black">Privacy Policy</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-8 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: `${brandColor}1A` }}>
                <ShieldCheck size={20} style={{ color: brandColor }} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-gray-800">Your Privacy Matters</p>
                <p className="text-[11px] text-gray-400">Last updated: May 2025</p>
              </div>
            </div>

            <div className="space-y-4 text-[13px] text-gray-700 leading-relaxed">
              <section>
                <p className="font-bold text-gray-800 mb-1">What We Collect</p>
                <p>
                  Attenda collects only the information you provide during your stay: your name, room number, and
                  check-out date. This information is stored locally on your device and used solely to personalize
                  your in-stay experience.
                </p>
              </section>

              <section>
                <p className="font-bold text-gray-800 mb-1">How We Use It</p>
                <p>
                  Your information is used to process service requests (transport, food orders, messages) and to
                  ensure requests reach the correct hotel team. We do not sell, share, or transfer your personal
                  data to third parties for marketing purposes.
                </p>
              </section>

              <section>
                <p className="font-bold text-gray-800 mb-1">Cookies &amp; Local Storage</p>
                <p>
                  We use browser local storage to remember your session during your stay. No tracking cookies or
                  cross-site identifiers are used. Session data is automatically cleared after your check-out date.
                </p>
              </section>

              <section>
                <p className="font-bold text-gray-800 mb-1">Third-Party Services</p>
                <p>
                  Food and service orders may be processed via Clover point-of-sale systems operated by individual
                  hotel partners. Payments are handled directly by those partners and are subject to their own
                  privacy policies.
                </p>
              </section>

              <section>
                <p className="font-bold text-gray-800 mb-1">Data Retention</p>
                <p>
                  Service request records are retained by the hotel for operational purposes. Guest session data
                  on your device is automatically expired after check-out.
                </p>
              </section>

              <section>
                <p className="font-bold text-gray-800 mb-1">Contact</p>
                <p>
                  Questions about your privacy? Ask the front desk or contact the hotel directly.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
