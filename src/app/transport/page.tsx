'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bus, Car } from 'lucide-react';
import { getHotelConfig, HotelConfig } from '@/lib/supabase';
import { goBackToHotel } from '@/lib/guest-context';
import { TaxiCallerRide } from '@/components/TaxiCallerRide';
import { AirportSchedule } from '@/components/AirportSchedule';

export default function TransportPage() {
  const router = useRouter();
  const [method, setMethod] = useState<null | 'shuttle' | 'taxi'>(null);
  const [brandColor, setBrandColor] = useState('#6B1D3C');
  const [config, setConfig] = useState<HotelConfig | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotel = params.get('hotel');
    if (hotel) localStorage.setItem('attenda_hotel_slug', hotel);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getHotelConfig().then(cfg => {
      if (cancelled) return;
      setConfig(cfg);
      if (cfg?.brandColor) setBrandColor(cfg.brandColor);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button onClick={() => goBackToHotel(router)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-black">Transport</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-8">
          {!method && (
            <div className="space-y-3">
              <p className="text-[13px] text-gray-500 font-semibold text-center mb-1">How would you like to travel?</p>
              <button onClick={() => setMethod('shuttle')}
                className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform text-left">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Bus size={22} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-extrabold text-gray-900">Complementary Airport Shuttle</p>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">FREE</span>
                  </div>
                  <p className="text-[12px] text-gray-400 mt-0.5">Every hour 6am–11pm · Select your time</p>
                </div>
                <ArrowLeft size={16} className="text-gray-300 rotate-180 shrink-0" />
              </button>
              <button onClick={() => setMethod('taxi')}
                className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform text-left">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}15` }}>
                  <Car size={22} style={{ color: brandColor }} />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-extrabold text-gray-900">Book an Attenda Taxi</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">On-demand · Get a price &amp; pay online</p>
                </div>
                <ArrowLeft size={16} className="text-gray-300 rotate-180 shrink-0" />
              </button>
            </div>
          )}
          {method === 'shuttle' && (
            <div>
              <button onClick={() => setMethod(null)} className="flex items-center gap-1.5 text-[13px] text-gray-500 font-semibold mb-3">
                <ArrowLeft size={14} /> Back
              </button>
              <AirportSchedule brandColor={brandColor} config={config} />
            </div>
          )}
          {method === 'taxi' && (
            <div>
              <button onClick={() => setMethod(null)} className="flex items-center gap-1.5 text-[13px] text-gray-500 font-semibold mb-3">
                <ArrowLeft size={14} /> Back
              </button>
              <TaxiCallerRide brandColor={brandColor} config={config} title="Book an Attenda Taxi" pickupDefault={config?.address || ''} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
