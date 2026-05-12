'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Wifi, Check, Coffee, Dumbbell, Printer, WashingMachine, Car, Bus, IceCream } from 'lucide-react';

export default function FacilitiesPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const copyWiFi = () => {
    navigator.clipboard.writeText('BWFREE');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const amenities = [
    { icon: <Coffee size={20} />, title: 'Complimentary Breakfast', desc: '6:30 AM — 9:30 AM daily. Hot & continental options.' },
    { icon: <Dumbbell size={20} />, title: 'Pool & Fitness Center', desc: 'Open 6:00 AM — 10:00 PM. Towels provided at front desk.' },
    { icon: <Printer size={20} />, title: 'Business Center', desc: '24-hour access. Printing, fax, and computer stations available.' },
    { icon: <WashingMachine size={20} />, title: 'Guest Laundry', desc: 'Coin-operated washers & dryers on 2nd floor. Detergent available at front desk.' },
    { icon: <IceCream size={20} />, title: 'Ice & Vending', desc: 'Ice machines on every floor. Snack & beverage vending in lobby.' },
    { icon: <Car size={20} />, title: 'Complimentary Parking', desc: 'Free parking for hotel guests. Oversized vehicle spots available.' },
    { icon: <Bus size={20} />, title: 'Airport / Cruise Shuttle', desc: 'Scheduled shuttle to MIA & Port of Miami. Book 24hrs in advance.' },
  ];

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button onClick={() => router.push('/')} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-black">Facilities</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-8 space-y-3">
          {/* WiFi Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#6B1D3C]/10 flex items-center justify-center">
                <Wifi size={20} className="text-[#6B1D3C]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-gray-800">Free Wi-Fi</p>
                <p className="text-[11px] text-gray-400">Complimentary high-speed internet</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Network</p>
                <p className="text-[15px] font-mono font-bold text-gray-800">BWFREE</p>
              </div>
              <button
                onClick={copyWiFi}
                className="px-3 py-1.5 rounded-lg bg-[#6B1D3C] text-white text-[11px] font-bold active:scale-95 flex items-center gap-1"
              >
                {copied ? <Check size={12} /> : null}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">No password required. Connect and accept terms on splash page.</p>
          </div>

          {/* Amenities */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-[12px] text-gray-400 uppercase tracking-wider mb-3 font-semibold">Amenities</p>
            <div className="space-y-3">
              {amenities.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#6B1D3C]/10 flex items-center justify-center shrink-0 text-[#6B1D3C]">
                    {a.icon}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-800">{a.title}</p>
                    <p className="text-[12px] text-gray-500">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
