'use client';

import { useState, useEffect, useRef } from 'react';
import { Bus, MapPin, Phone } from 'lucide-react';

const TEAL = '#0D9488';

export default function AgentDemoPage() {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(true);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/agent-phone')
      .then(r => r.json())
      .then(data => { if (data.ok && data.phone) setPhoneNumber(data.phone); })
      .catch(() => {})
      .finally(() => setPhoneLoading(false));
  }, []);

  // Load widget script the ONLY way that actually executes from React
  useEffect(() => {
    if (document.querySelector('script[data-elevenlabs]')) {
      if (customElements.get('elevenlabs-convai')) setWidgetLoaded(true);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://elevenlabs.io/convai-widget/index.js';
    s.async = true;
    s.setAttribute('data-elevenlabs', 'true');
    s.onload = () => setWidgetLoaded(true);
    document.body.appendChild(s);
  }, []);

  // Once the custom element is registered, inject the widget into the container
  useEffect(() => {
    if (!widgetLoaded || !containerRef.current) return;
    // Poll for custom element registration (script loads async, CE may register late)
    const tryInject = () => {
      if (customElements.get('elevenlabs-convai')) {
        containerRef.current!.innerHTML = '';
        const el = document.createElement('elevenlabs-convai');
        el.setAttribute('agent-id', 'agent_3801kzpf1mfyevn9y1pgjag2q1by');
        el.setAttribute('variant', 'full');
        el.style.cssText = 'display:block;width:100%;height:100%;min-height:440px';
        containerRef.current!.appendChild(el);
      } else {
        setTimeout(tryInject, 200);
      }
    };
    tryInject();
  }, [widgetLoaded]);

  const formatPhone = (p: string) => {
    if (p.includes('*')) return p;
    const d = p.replace(/\D/g, '');
    return d.length === 11 && d.startsWith('1')
      ? `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
      : p;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50/30 flex flex-col items-center py-8 px-4">
      <div className="max-w-md w-full mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${TEAL}15` }}>
            <Bus size={26} style={{ color: TEAL }} />
          </div>
          <div>
            <h1 className="text-[20px] font-black text-gray-900">Shuttle Assistant</h1>
            <p className="text-[12px] text-gray-500">Best Western Fort Lauderdale — Live Demo</p>
          </div>
        </div>
        <p className="text-[13px] text-gray-600">Call or chat with the AI shuttle assistant. It books airport shuttles and tracks the vehicle with live GPS.</p>
      </div>

      <div className="max-w-md w-full mb-4">
        <a
          href={phoneNumber && !phoneNumber.includes('*') ? `tel:${phoneNumber}` : undefined}
          className={`flex items-center gap-3 bg-white border rounded-2xl p-4 shadow-sm transition-all ${phoneNumber && !phoneNumber.includes('*') ? 'border-teal-200 hover:shadow-md' : 'border-gray-200'}`}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${TEAL}15` }}>
            <Phone size={20} style={{ color: TEAL }} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Call to Test (Voice)</p>
            {phoneLoading ? <p className="text-[16px] font-bold text-gray-300">Loading number…</p>
              : phoneNumber ? <p className="text-[16px] font-black text-gray-900">{formatPhone(phoneNumber)}</p>
              : <p className="text-[12px] text-gray-400">No phone number assigned</p>}
          </div>
          {phoneNumber && !phoneNumber.includes('*') && (
            <div className="px-3 py-1.5 rounded-lg text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>CALL NOW</div>
          )}
        </a>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden flex flex-col" style={{ height: '60vh', minHeight: 500 }}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: `${TEAL}08` }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[12px] font-bold text-gray-700">Live — Shuttle Assistant</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500"><Bus size={12} style={{ color: TEAL }} /> AI Powered</div>
        </div>
        <div ref={containerRef} className="flex-1 overflow-hidden" style={{ minHeight: 440 }} />
      </div>

      <div className="max-w-md w-full mt-4 flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500"><MapPin size={13} style={{ color: TEAL }} /> Live GPS Tracking</div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500"><Bus size={13} style={{ color: TEAL }} /> Airport Shuttle Booking</div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500"><Phone size={13} style={{ color: TEAL }} /> Voice + Text</div>
      </div>
      <p className="mt-4 text-[10px] text-gray-400 text-center max-w-md">Powered by Attenda × ElevenLabs — This is a live demo. The assistant can book shuttles, check GPS, and route requests to hotel staff.</p>
    </div>
  );
}