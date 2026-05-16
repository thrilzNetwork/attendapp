'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getHotelConfig, HotelConfig } from '@/lib/guest-context';

export default function WelcomePage() {
  const router = useRouter();
  const [config, setConfig] = useState<HotelConfig | null>(null);

  useEffect(() => {
    getHotelConfig().then(setConfig);
  }, []);

  if (!config) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#3A1A2D] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 h-[52px] border-b border-gray-100">
          <button onClick={() => router.push('/')} className="p-2 rounded-full hover:bg-gray-100 active:scale-95">
            <ArrowLeft size={20} className="text-[#3A1A2D]" />
          </button>
          <span className="text-[15px] font-bold text-black">Welcome</span>
          <div className="w-9" />
        </div>
      </div>

      <div className="pt-[68px] px-6 pb-10">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
          <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{config.welcomeLetter || 'Thank you for choosing our hotel. We are delighted to welcome you and hope you have a wonderful stay with us.'}</p>
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-[14px] font-bold text-[#3A1D3C] mb-0.5">{config.managerName || 'Hotel Manager'}</p>
            <p className="text-[12px] text-gray-400">{config.name || 'Best Western'}</p>
          </div>
        </div>

        {config.teamPhotoUrl ? (
          <div className="rounded-2xl overflow-hidden border border-gray-100">
            <div className="relative h-64 w-full">
              <Image src={config.teamPhotoUrl} alt="Team" fill className="object-cover" sizes="100vw" />
            </div>
            <div className="p-4 bg-white">
              <p className="text-xs font-semibold text-gray-800">Your team at {config.name}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
            <p className="text-sm text-gray-400">No team photo uploaded yet.</p>
            <p className="text-xs text-gray-300 mt-1">Add one in Admin Settings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
