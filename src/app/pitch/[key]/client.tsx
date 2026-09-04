'use client';

import { useEffect, useState } from 'react';
import { Loader2, ArrowRight, MapPin, BedDouble, Building2, StickyNote } from 'lucide-react';

const INK = '#07231F';
const INK2 = '#0B3B36';
const TEAL = '#158A7C';
const TEAL_BRIGHT = '#15b79e';
const MINT = '#E8F4F1';

type ClientInfo = {
  slug: string;
  name: string;
  brand: string | null;
  rooms: number | null;
  address: string | null;
  notes: string | null;
};

export default function PitchClient({ apiKey }: { apiKey: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [info, setInfo] = useState<ClientInfo | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/pitch/${apiKey}`)
      .then(async (r) => {
        if (!alive) return;
        if (!r.ok) return setState('missing');
        const j = await r.json();
        setInfo(j.client);
        setState('ready');
      })
      .catch(() => alive && setState('missing'));
    return () => { alive = false; };
  }, [apiKey]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: INK }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: TEAL_BRIGHT }} />
      </div>
    );
  }

  if (state === 'missing' || !info) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ background: INK }}>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>Attenda</div>
        <p className="mt-3 max-w-sm text-lg font-semibold" style={{ color: MINT }}>
          This pitch link is invalid or no longer active.
        </p>
        <a href="/partnerships" className="mt-6 rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: TEAL }}>
          Go to partnerships
        </a>
      </div>
    );
  }

  const propertyLine = [info.brand, info.rooms ? `${info.rooms} rooms` : null].filter(Boolean).join(' · ');

  return (
    <div className="min-h-screen" style={{ background: INK, color: MINT }}>
      {/* HERO */}
      <section
        className="flex min-h-[85vh] flex-col items-center justify-center px-6 text-center"
        style={{ background: `radial-gradient(120% 90% at 50% 0%, ${INK2} 0%, ${INK} 70%)` }}
      >
        <div className="text-[10px] font-bold uppercase tracking-[0.35em]" style={{ color: TEAL_BRIGHT }}>
          Attenda · Partnership briefing
        </div>
        <h1
          className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight md:text-6xl"
          style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
        >
          One relationship.<br />
          <span style={{ color: TEAL_BRIGHT }}>Every property we run.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed" style={{ color: 'rgba(232,244,241,0.72)' }}>
          Attenda is the digital corporate office behind the hotels we operate. When you partner with
          Attenda, you don&apos;t win one account — you plug into all of them, starting with the
          property on this page.
        </p>
        <div className="mt-8 rounded-2xl px-6 py-4" style={{ background: 'rgba(21,138,124,0.14)', border: `1px solid rgba(21,183,158,0.35)` }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: TEAL_BRIGHT }}>Currently presenting</div>
          <div className="mt-1 text-2xl font-bold">{info.name}</div>
          {propertyLine && <div className="mt-1 text-sm" style={{ color: 'rgba(232,244,241,0.65)' }}>{propertyLine}</div>}
        </div>
        <a
          href={`/partnerships?property=${encodeURIComponent(info.name)}`}
          className="mt-10 flex items-center gap-2 rounded-2xl px-7 py-4 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}
        >
          Start the partnership conversation <ArrowRight className="h-4 w-4" />
        </a>
      </section>

      {/* STORY BEATS */}
      <section className="mx-auto max-w-3xl px-6 py-16 space-y-10">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: TEAL_BRIGHT }}>What Attenda is</div>
          <p className="mt-3 text-xl font-semibold leading-snug">
            A digital corporate office for hotel operations — staffing, revenue, guest services and
            day-to-day ops, run from one platform by one accountable team.
          </p>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: TEAL_BRIGHT }}>The proof</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl p-5" style={{ background: INK2 }}>
              <div className="text-3xl font-bold" style={{ color: TEAL_BRIGHT }}>74.4 → 80+</div>
              <div className="mt-1 text-xs" style={{ color: 'rgba(232,244,241,0.6)' }}>Guest satisfaction recovered in 30 days at a collapsing property</div>
            </div>
            <div className="rounded-2xl p-5" style={{ background: INK2 }}>
              <div className="text-3xl font-bold" style={{ color: TEAL_BRIGHT }}>$3,300/mo</div>
              <div className="mt-1 text-xs" style={{ color: 'rgba(232,244,241,0.6)' }}>New revenue found in the first 30 days</div>
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: TEAL_BRIGHT }}>How you plug in</div>
          <p className="mt-3 text-lg leading-relaxed" style={{ color: 'rgba(232,244,241,0.8)' }}>
            One contract, one onboarding, one invoice. Your product or service becomes available to
            every property Attenda runs — present and future — without pitching them one by one.
          </p>
        </div>
      </section>

      {/* PROPERTY SNAPSHOT */}
      <section className="mx-auto max-w-3xl px-6 pb-16">
        <div className="rounded-3xl p-6" style={{ background: INK2, border: '1px solid rgba(21,183,158,0.2)' }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: TEAL_BRIGHT }}>
            Why this property, why now
          </div>
          <div className="mt-4 space-y-3 text-sm" style={{ color: 'rgba(232,244,241,0.85)' }}>
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TEAL_BRIGHT }} />
              <div><span className="font-bold">{info.name}</span>{info.brand ? ` — ${info.brand}` : ''}</div>
            </div>
            {info.rooms != null && (
              <div className="flex items-start gap-3">
                <BedDouble className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TEAL_BRIGHT }} />
                <div>{info.rooms} keys under Attenda operations</div>
              </div>
            )}
            {info.address && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TEAL_BRIGHT }} />
                <div>{info.address}</div>
              </div>
            )}
            {info.notes && (
              <div className="flex items-start gap-3">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TEAL_BRIGHT }} />
                <div>{info.notes}</div>
              </div>
            )}
          </div>
          <a
            href={`/partnerships?property=${encodeURIComponent(info.name)}`}
            className="mt-6 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}
          >
            Apply as a partner <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-3 text-center text-[11px]" style={{ color: 'rgba(232,244,241,0.45)' }}>
            Your application is tagged to {info.name} so the right conversation starts immediately.
          </p>
        </div>
      </section>
    </div>
  );
}