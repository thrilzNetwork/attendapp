'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, LogIn } from 'lucide-react';

/**
 * /corporate/story — the hired-employee presentation.
 * Sits BEFORE onboarding: who Attenda is → founder story → proof → vision →
 * "start my onboarding". Gated: hired people only (session required).
 */

const INK = '#07231F';
const INK2 = '#0B3B36';
const MINT = '#E8F4F1';
const TEAL = '#158A7C';
const TEAL_BRIGHT = '#15b79e';

const BEATS = [
  {
    kicker: 'Welcome to the corporate office',
    title: "You're not joining a software tool.",
    body: "You're joining the team that runs hotels. Attenda is the digital corporate office behind properties people depend on — staffing, revenue, guest experience, the daily grind made to actually work.",
    media: '/corporate/hero.jpg',
    fallback: `radial-gradient(120% 90% at 50% 0%, ${INK2} 0%, ${INK} 70%)`,
  },
  {
    kicker: 'The founder story',
    title: 'Built inside the hotels, not above them.',
    body: 'Attenda was founded by operators who spent years in the trenches — front desks, night audits, group sales, everything. Every workflow in this platform exists because someone lived the problem it solves.',
    media: '/corporate/founder.jpg',
    fallback: `radial-gradient(120% 90% at 30% 20%, ${INK2} 0%, ${INK} 75%)`,
  },
  {
    kicker: 'The proof',
    title: '30 days. A collapsing property. Back on its feet.',
    body: 'Guest satisfaction recovered from 74.4 to 80+. $3,300 a month in new revenue found in the first month. That is what a real corporate office does — it shows up in the numbers.',
    media: '/corporate/proof.jpg',
    fallback: `radial-gradient(120% 90% at 70% 30%, ${INK2} 0%, ${INK} 75%)`,
  },
  {
    kicker: 'The vision',
    title: 'One team. Every property. Nothing falls through.',
    body: 'We are building the corporate office that runs many properties as well as the best GM runs one — and then hands that standard to every hotel that joins.',
    media: '/corporate/vision.jpg',
    fallback: `radial-gradient(120% 90% at 50% 80%, ${INK2} 0%, ${INK} 75%)`,
  },
  {
    kicker: 'Your first day',
    title: 'Now — make it yours.',
    body: 'Next up is your onboarding: the Attenda way of working, your position, and what your day looks like. Take your time. This is the foundation for everything you do here.',
    media: '/corporate/start.jpg',
    fallback: `radial-gradient(120% 90% at 50% 50%, ${INK2} 0%, ${INK} 70%)`,
  },
];

export default function CorporateStory() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: s } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      setAuthed(!!s.session);
    })();
  }, []);

  const next = useCallback(() => {
    setIdx((i) => Math.min(i + 1, BEATS.length - 1));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next]);

  if (authed === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ background: INK }}>
        <p className="text-lg font-semibold" style={{ color: MINT }}>This presentation is for hired team members.</p>
        <a href="/corporate" className="mt-6 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ background: TEAL }}>
          <LogIn className="h-4 w-4" /> Sign in first
        </a>
      </div>
    );
  }

  const beat = BEATS[idx];
  const last = idx === BEATS.length - 1;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: beat.fallback, color: MINT }}>
      {/* progress dots */}
      <div className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <span className="text-sm font-extrabold tracking-[0.18em]" style={{ color: TEAL_BRIGHT }}>ATTENDA</span>
          <div className="flex items-center gap-1.5">
            {BEATS.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className="h-2 rounded-full transition-all"
                style={{ width: i === idx ? 22 : 8, background: i <= idx ? TEAL_BRIGHT : 'rgba(232,244,241,0.25)' }} />
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-24">
        <div key={idx} className="animate-[fadeIn_0.6s_ease-out]">
          <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>{beat.kicker}</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] sm:text-6xl" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
            {beat.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: 'rgba(232,244,241,0.75)' }}>
            {beat.body}
          </p>
        </div>

        <div className="mt-12 flex items-center gap-4">
          {last ? (
            <button
              onClick={() => {
                fetch('/api/experience', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'log-event', slug: 'corporate-onboarding', kind: 'complete' }),
                }).catch(() => {});
                router.push('/corporate/onboarding');
              }}
              className="flex items-center gap-2 rounded-2xl px-7 py-4 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}
            >
              Start my onboarding <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={next}
              className="flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <span className="text-[11px]" style={{ color: 'rgba(232,244,241,0.4)' }}>
            Press Enter to continue
          </span>
        </div>
      </main>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}