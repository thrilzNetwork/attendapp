'use client';

import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

export default function CookieNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="absolute bottom-3 left-3 right-3 z-40">
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-2xl px-3 py-2.5 shadow-lg flex items-center gap-2">
        <ShieldCheck size={14} className="text-[#3A1A2D] shrink-0" />
        <p className="text-[10px] text-gray-500 leading-tight flex-1">
          By using Attenda, you agree to our{' '}
          <a href="/terms" className="text-[#3A1A2D] font-bold underline">Terms</a> and{' '}
          <a href="/privacy" className="text-[#3A1A2D] font-bold underline">Privacy Policy</a>.
          We use cookies to improve your experience.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center active:scale-90"
          aria-label="Dismiss"
        >
          <X size={10} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}
