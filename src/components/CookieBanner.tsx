'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Cookie } from 'lucide-react';

export default function CookieBanner() {
  const [status, setStatus] = useState<'loading' | 'pending' | 'accepted'>('loading');
  const [showTooltip, setShowTooltip] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setStatus(localStorage.getItem('attenda_cookie_ok') ? 'accepted' : 'pending');
  }, []);

  // Auto-hide tooltip after 3s
  useEffect(() => {
    if (!showTooltip) return;
    const t = setTimeout(() => setShowTooltip(false), 3000);
    return () => clearTimeout(t);
  }, [showTooltip]);

  if (pathname.startsWith('/staff') || pathname.startsWith('/admin')) return null;
  if (status === 'loading') return null;

  const accept = () => {
    localStorage.setItem('attenda_cookie_ok', '1');
    setStatus('accepted');
    setShowTooltip(false);
  };

  return (
    <>
      <button
        onClick={() => {
          if (status === 'pending') accept();
          else setShowTooltip((p) => !p);
        }}
        className="fixed bottom-5 left-5 z-40 w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-sm border border-gray-200 flex items-center justify-center active:scale-90 transition-all duration-200 hover:shadow-md hover:bg-white"
        aria-label="Cookie settings"
      >
        <Cookie size={16} className="text-gray-500" />
      </button>

      {showTooltip && (
        <div
          className="fixed bottom-16 left-5 z-40 bg-gray-900 text-white text-[11px] rounded-xl px-3.5 py-2.5 shadow-lg max-w-[200px] leading-snug animate-in fade-in slide-in-from-bottom-1 duration-150"
        >
          Cookies accepted.{' '}
          <a href="/privacy" className="underline text-gray-300 hover:text-white">Privacy</a>
        </div>
      )}
    </>
  );
}
