'use client';

/* Attenda Technologies — corporate homepage (company page).
   What Attenda is, who built it, what it makes, why it works.
   Guest QR sessions still hit / and keep working (handled in page.tsx gate).

   Structure: dark identity hero → founder → three layers (the mark) →
   principles → founder-direct contact. No product mockups on this page. */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { CorporateNav, CorporateFooter, CORP_TEAL, CORP_TEAL_BRIGHT, CORP_INK, CORP_MIST, CORP_BORDER } from '@/components/corporate/Chrome';
import { LangProvider, useLang } from '@/lib/corp-lang';

/* ── Scroll reveal ── */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}
      style={{ opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(26px)', transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms` }}>
      {children}
    </div>
  );
}

const BANDS = [
  { n: '03', hKey: 'home2.b3.h', pKey: 'home2.b3.p', badgeKey: 'home2.b3.badge', href: '/serve' },
  { n: '02', hKey: 'home2.b2.h', pKey: 'home2.b2.p', badgeKey: 'home2.b2.badge', href: '/hospitality' },
  { n: '01', hKey: 'home2.b1.h', pKey: 'home2.b1.p', badgeKey: 'home2.b1.badge', href: '/hospitality' },
] as const;

const WHYS = [
  { hKey: 'home2.w1.h', pKey: 'home2.w1.p' },
  { hKey: 'home2.w2.h', pKey: 'home2.w2.p' },
  { hKey: 'home2.w3.h', pKey: 'home2.w3.p' },
] as const;

export default function CorporateHomePage() {
  return (
    <LangProvider>
      <CorpHomeInner />
    </LangProvider>
  );
}

function CorpHomeInner() {
  const { t } = useLang();
  const facts = [
    { b: t('home2.hero.f1b'), s: t('home2.hero.f1s') },
    { b: t('home2.hero.f2b'), s: t('home2.hero.f2s') },
    { b: t('home2.hero.f3b'), s: t('home2.hero.f3s') },
  ];
  const chips = [
    t('home2.chip.1'), t('home2.chip.2'), t('home2.chip.3'), t('home2.chip.4'),
  ];

  return (
    <div className="min-h-screen bg-white">
      <CorporateNav />

      {/* ── HERO — identity, dark ── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: CORP_INK }}>
        <div className="relative max-w-6xl mx-auto px-5 pt-32 pb-16 md:pt-40 md:pb-24">
          <Reveal>
            <div className="inline-flex items-center gap-2.5 mb-7">
              <span className="w-7 h-[3px] rounded-full" style={{ backgroundColor: CORP_TEAL_BRIGHT }} />
              <span className="text-[11px] font-black tracking-[0.24em] uppercase" style={{ color: CORP_TEAL_BRIGHT }}>
                {t('home2.hero.eyebrow')}
              </span>
            </div>
            <h1 className="text-[40px] md:text-[56px] lg:text-[62px] leading-[1.03] font-black tracking-[-0.02em] text-white max-w-4xl">
              {t('home2.hero.l1')}<br />
              <span style={{ color: CORP_TEAL_BRIGHT }}>{t('home2.hero.l2')}</span>
            </h1>
            <p className="text-[17px] md:text-[19px] text-gray-300 leading-relaxed mt-7 max-w-2xl">
              {t('home2.hero.sub')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12 border-t border-white/15 pt-8 max-w-2xl">
              {facts.map((f, i) => (
                <div key={i}>
                  <div className="text-[19px] font-black tracking-tight text-white">{f.b}</div>
                  <div className="text-[12.5px] font-semibold text-gray-400 mt-1">{f.s}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section className="py-20 md:py-28 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-[320px_1fr] gap-10 md:gap-16 items-start">
          <Reveal>
            <div className="relative rounded-3xl overflow-hidden border shadow-lg" style={{ borderColor: CORP_BORDER, aspectRatio: '4/5' }}>
              <Image
                src="/founder-headshot.jpg"
                alt={t('home2.founder.photoAlt')}
                fill
                sizes="(max-width: 768px) 100vw, 320px"
                className="object-cover"
                style={{ objectPosition: '50% 18%' }}
              />
            </div>
          </Reveal>
          <Reveal delay={90}>
            <h2 className="text-[32px] md:text-[40px] font-black tracking-[-0.02em] leading-[1.06] text-gray-900">
              {t('home2.founder.h')}
            </h2>
            <div className="text-[15px] font-bold mt-2.5" style={{ color: CORP_TEAL }}>
              {t('home2.founder.role')}
            </div>
            <a href="https://somehowimanage.netlify.app" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13.5px] font-bold mt-3 hover:gap-3 transition-all"
              style={{ color: CORP_TEAL }}>
              <span aria-hidden>📖</span>{t('home2.founder.book')}
              <ArrowRight size={13} />
            </a>
            <p className="text-[16.5px] text-gray-600 leading-relaxed mt-7 max-w-2xl">
              {t('home2.founder.p1a')}<strong className="text-gray-900">{t('home2.founder.p1b')}</strong>{t('home2.founder.p1c')}
            </p>
            <p className="text-[16.5px] text-gray-600 leading-relaxed mt-4 max-w-2xl">
              {t('home2.founder.p2a')}<strong className="text-gray-900">{t('home2.founder.p2b')}</strong>{t('home2.founder.p2c')}
            </p>
            <p className="text-[16.5px] text-gray-600 leading-relaxed mt-4 max-w-2xl">
              {t('home2.founder.p3a')}<strong className="text-gray-900">{t('home2.founder.p3b')}</strong>{t('home2.founder.p3c')}
            </p>
            <div className="flex flex-wrap gap-2.5 mt-8">
              {chips.map((c) => (
                <span key={c} className="text-[12px] font-bold rounded-full px-4 py-2 border bg-white" style={{ color: CORP_TEAL, borderColor: CORP_BORDER }}>
                  {c}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── WHAT WE BUILD — three layers (the mark) ── */}
      <section className="py-20 md:py-28 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="max-w-2xl">
              <h2 className="text-[32px] md:text-[44px] font-black tracking-[-0.02em] leading-[1.06] text-gray-900">
                {t('home2.build.h')}
              </h2>
              <p className="text-[16.5px] text-gray-600 leading-relaxed mt-4">
                {t('home2.build.sub')}
              </p>
            </div>
          </Reveal>
          <div className="mt-12 space-y-4">
            {BANDS.map((b, i) => (
              <Reveal key={b.n} delay={i * 80}>
                <div className="rounded-2xl border bg-white p-6 md:p-8 grid md:grid-cols-[52px_1fr_auto] gap-5 md:gap-8 items-center hover:shadow-lg transition-shadow" style={{ borderColor: CORP_BORDER }}>
                  <div className="text-[26px] font-black tracking-tight" style={{ color: CORP_TEAL }}>{b.n}</div>
                  <div>
                    <h3 className="text-[18px] md:text-[20px] font-black tracking-[-0.01em] text-gray-900">{t(b.hKey)}</h3>
                    <p className="text-[14.5px] text-gray-600 leading-relaxed mt-1.5 max-w-2xl">{t(b.pKey)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center text-[11.5px] font-bold whitespace-nowrap rounded-full px-3.5 py-1.5 border" style={{ color: '#159A52', backgroundColor: '#F0FAF4', borderColor: '#CBEED9' }}>
                      {t(b.badgeKey)}
                    </span>
                    <Link href={b.href} aria-label={t('home2.build.hint')}
                      className="w-9 h-9 rounded-full border flex items-center justify-center hover:translate-x-0.5 transition-transform"
                      style={{ borderColor: CORP_BORDER, color: CORP_TEAL }}>
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="flex items-center gap-3 mt-9 text-[14px] font-bold" style={{ color: CORP_TEAL }}>
              <span className="text-gray-500 font-semibold">{t('home2.build.hint')}:</span>
              <Link href="/hospitality" className="inline-flex items-center gap-1.5 hover:gap-2.5 transition-all">{t('home2.build.hint2')} <ArrowRight size={14} /></Link>
              <span className="text-gray-300">·</span>
              <Link href="/serve" className="inline-flex items-center gap-1.5 hover:gap-2.5 transition-all">{t('home2.build.hint3')} <ArrowRight size={14} /></Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── WHY IT WORKS — principles, dark ── */}
      <section className="py-24 md:py-32 px-5" style={{ backgroundColor: CORP_INK }}>
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-[11px] font-black tracking-[0.24em] uppercase mb-5" style={{ color: CORP_TEAL_BRIGHT }}>{t('home2.whye.eyebrow')}</div>
            <h2 className="text-[32px] md:text-[46px] font-black tracking-[-0.02em] leading-[1.08] text-white">
              {t('home2.whye.h1')}<br />
              <span style={{ color: CORP_TEAL_BRIGHT }}>{t('home2.whye.h2')}</span>
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8 md:gap-10 mt-14">
            {WHYS.map((w, i) => (
              <Reveal key={w.hKey} delay={i * 90}>
                <div>
                  <span className="text-[20px] font-black" style={{ color: '#22C55E' }}>✓</span>
                  <h4 className="text-[16.5px] font-black text-white mt-3">{t(w.hKey)}</h4>
                  <p className="text-[14px] text-gray-400 leading-relaxed mt-2.5">{t(w.pKey)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT — founder-direct ── */}
      <section className="py-24 md:py-32 px-5" style={{ backgroundColor: CORP_MIST }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_auto] gap-10 items-center">
          <Reveal>
            <h2 className="text-[32px] md:text-[44px] font-black tracking-[-0.02em] leading-[1.06] text-gray-900">
              {t('home2.cta.h')}
            </h2>
            <p className="text-[16px] text-gray-600 leading-relaxed mt-4 max-w-xl">
              {t('home2.cta.p')}
            </p>
          </Reveal>
          <Reveal delay={100}>
            <a href="mailto:thrilznetwork@gmail.com"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-[15px] text-white transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: CORP_TEAL }}>
              {t('home2.cta.btn')}
            </a>
          </Reveal>
        </div>
      </section>

      <CorporateFooter />
    </div>
  );
}