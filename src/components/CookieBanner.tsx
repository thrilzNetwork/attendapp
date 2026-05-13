'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Cookie, X } from 'lucide-react';

export default function CookieBanner() {
  const [status, setStatus] = useState<'loading' | 'pending' | 'accepted'>('loading');
  const [showPanel, setShowPanel] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setStatus(localStorage.getItem('attenda_cookie_ok') ? 'accepted' : 'pending');
  }, []);

  if (pathname.startsWith('/staff') || pathname.startsWith('/admin')) return null;
  if (status === 'loading') return null;

  const accept = () => {
    localStorage.setItem('attenda_cookie_ok', '1');
    setStatus('accepted');
    setShowPanel(false);
  };

  if (status === 'accepted') {
    return (
      <>
        <button
          onClick={() => setShowPanel(p => !p)}
          className="fixed bottom-4 right-4 z-40 w-9 h-9 rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-200 flex items-center justify-center active:scale-95"
          aria-label="Cookie settings"
        >
          <Cookie size={15} className="text-[#6B1D3C]" />
        </button>
        {showPanel && (
          <div className="fixed bottom-16 right-4 z-40 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
            <button onClick={() => setShowPanel(false)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <X size={10} className="text-gray-400" />
            </button>
            <p className="text-[12px] text-gray-600 leading-snug pr-4">
              You&apos;ve accepted cookies. See our{' '}
              <a href="/privacy" className="text-[#6B1D3C] font-bold underline">Privacy Policy</a>.
            </p>
          </div>
        )}
      </>
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
            This site uses cookies to enhance your experience.
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={accept} className="flex-1 py-2 rounded-xl bg-gray-100 text-[12px] font-bold text-gray-700 active:scale-95">
              Got it
            </button>
            <a href="/privacy" className="flex-1 py-2 rounded-xl text-white text-[12px] font-bold text-center active:scale-95" style={{ backgroundColor: '#6B1D3C' }}>
              Learn More
            </a>
          </div>
        </div>
        <button onClick={accept} className="shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-95">
          <X size={12} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}
