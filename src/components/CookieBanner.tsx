'use client';

import { useState } from 'react';
import { Cookie } from 'lucide-react';

export default function CookieBanner() {
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-20 left-4 z-40 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center active:scale-95"
        aria-label="Cookie settings"
      >
        <Cookie size={18} className="text-[#6B1D3C]" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#6B1D3C]/10 flex items-center justify-center shrink-0 mt-0.5">
          <Cookie size={18} className="text-[#6B1D3C]" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] text-gray-700 leading-snug">
            This site uses cookies to enhance your experience. By continuing, you agree to our use of cookies.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setMinimized(true)}
              className="flex-1 py-2 rounded-xl bg-gray-100 text-[12px] font-bold text-gray-700 active:scale-95"
            >
              Got it
            </button>
            <a
              href="/privacy"
              className="flex-1 py-2 rounded-xl text-white text-[12px] font-bold text-center active:scale-95"
              style={{ backgroundColor: '#6B1D3C' }}
            >
              Learn More
            </a>
          </div>
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-95"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
