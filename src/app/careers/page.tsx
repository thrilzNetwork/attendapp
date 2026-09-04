'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * /careers — public candidate experience (Typeform-style).
 *
 * One beat per screen. Candidates experience the Attenda story, then submit
 * THEMSELVES — skills and experience first, no position gate. Positions are
 * offered based on fit; we hire talent, not openings.
 *
 * Media: drop Higgsfield JPEGs into /public/careers/ (hero.jpg, story.jpg,
 * vision.jpg). Every media slot has a cinematic CSS fallback so the page is
 * fully functional before/without images.
 */

// ---------------------------------------------------------------- palette
const INK = '#07231F';
const INK2 = '#0B3B36';
const MINT = '#E8F4F1';
const TEAL = '#158A7C';
const TEAL_BRIGHT = '#15b79e';

type Form = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  yearsExperience: string;
  industries: string[];
  skills: string[];
  story: string;
  superpower: string;
  availability: string;
  expectations: string;
  website: string; // honeypot — humans never fill this
};

const EMPTY: Form = {
  fullName: '', email: '', phone: '', location: '', linkedin: '', portfolio: '',
  yearsExperience: '', industries: [], skills: [], story: '', superpower: '',
  availability: '', expectations: '', website: '',
};

const YEARS = ['Less than 2 years', '2–5 years', '5–10 years', '10–20 years', '20+ years'];
const INDUSTRIES = ['Hotels & Resorts', 'Restaurants / F&B', 'Events', 'Travel', 'Retail', 'Healthcare', 'Other'];
const AVAILABILITY = ['Immediately', 'In 2 weeks', 'In 30 days', 'Just exploring for now'];
const SKILL_CHIPS = [
  'Front desk', 'Housekeeping', 'Food & beverage', 'Operations', 'Sales',
  'Accounting / finance', 'Training', 'Maintenance', 'Security', 'Leadership',
];

const STEP_ORDER = [
  'welcome', 'intro1', 'intro2', 'intro3', 'who', 'where', 'links', 'years', 'industries',
  'skills', 'story', 'superpower', 'availability', 'expectations', 'submit', 'done',
] as const;
type Step = (typeof STEP_ORDER)[number];

export default function CareersPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [form, setForm] = useState<Form>(EMPTY);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);
  const total = STEP_ORDER.length;
  const progress = Math.round(((stepIndex + 1) / total) * 100);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggle = (k: 'industries' | 'skills', v: string) =>
    setForm((f) => {
      const arr = f[k];
      return { ...f, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.skills.includes(t) && form.skills.length < 15) set('skills', [...form.skills, t]);
    setTagInput('');
  };

  const valid = useMemo((): boolean => {
    switch (step) {
      case 'who': return form.fullName.trim().length > 1 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email);
      case 'years': return !!form.yearsExperience;
      case 'skills': return form.skills.length > 0;
      case 'story': return form.story.trim().length >= 20;
      case 'availability': return !!form.availability;
      default: return true;
    }
  }, [step, form]);

  const next = useCallback(() => {
    if (!valid) return;
    setStep((s) => {
      const i = STEP_ORDER.indexOf(s as Step);
      return STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)];
    });
  }, [valid]);

  const back = useCallback(() => {
    setStep((s) => {
      const i = STEP_ORDER.indexOf(s as Step);
      return STEP_ORDER[Math.max(i - 1, 0)];
    });
  }, []);

  // Focus the input on question steps
  useEffect(() => {
    const t = setTimeout(() => {
      if (step === 'who' || step === 'where' || step === 'links' || step === 'superpower') inputRef.current?.focus();
      if (step === 'story' || step === 'expectations') taRef.current?.focus();
    }, 350);
    return () => clearTimeout(t);
  }, [step]);

  // Keyboard: Enter advances (unless typing a multi-line field or a tag)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const el = document.activeElement;
        if (el?.tagName === 'TEXTAREA') return;
        if (step === 'skills' && el?.tagName === 'INPUT' && tagInput.trim()) { e.preventDefault(); addTag(); return; }
        e.preventDefault();
        if (step === 'submit') doSubmit();
        else next();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, valid, tagInput, form]);

  async function doSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          location: form.location,
          links: { linkedin: form.linkedin, portfolio: form.portfolio },
          yearsExperience: form.yearsExperience,
          industries: form.industries,
          skills: form.skills,
          story: form.story,
          superpower: form.superpower,
          availability: form.availability,
          expectations: form.expectations,
          website: form.website,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Something went wrong.');
      setStep('done');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen text-white transition-colors duration-700"
      style={{ background: step === 'welcome' || step === 'done' ? INK : INK2 }}
    >
      {/* top chrome */}
      <div className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <span className="text-sm font-extrabold tracking-[0.18em]" style={{ color: TEAL_BRIGHT }}>
            ATTENDA
          </span>
          {step !== 'welcome' && step !== 'done' && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-white/50">{progress}%</span>
              <div className="h-1 w-28 overflow-hidden rounded-full bg-white/15 sm:w-44">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${TEAL_BRIGHT}, ${MINT})` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 pb-28 pt-20">
        {/* ---------------------------------------------------- welcome */}
        {step === 'welcome' && (
          <section className="relative overflow-hidden rounded-3xl" style={{ background: INK }}>
            {/* media slot: /careers/hero.jpg */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-60"
              style={{
                backgroundImage:
                  "url('/careers/hero.jpg'), linear-gradient(135deg, #0E6B60 0%, #158A7C 55%, #07231F 100%)",
              }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,35,31,0.15) 0%, rgba(7,35,31,0.92) 78%)' }} />
            <div className="relative px-7 py-14 sm:px-14 sm:py-20">
              <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>
                You found us
              </p>
              <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-6xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
                We don&apos;t hire openings.
                <br />
                <span style={{ color: TEAL_BRIGHT }}>We hire talent.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
                Attenda runs hotel operations for great properties. Tell us who you are and
                what you&apos;re great at — if the fit is right, <em>we&apos;ll bring the position to you.</em>
              </p>
              <button
                onClick={next}
                className="mt-10 rounded-full px-8 py-4 text-base font-bold text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-95"
                style={{ background: `linear-gradient(90deg, ${TEAL_BRIGHT}, ${TEAL})` }}
              >
                Start — it takes 4 minutes →
              </button>
              <p className="mt-4 text-xs text-white/45">12 quick questions · No resume needed</p>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------- intro beats */}
        {step === 'intro1' && (
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>First — who we are</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-6xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
              A digital corporate office<br />for real hotels.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
              Attenda runs hotel operations — staffing, revenue, guest experience, the daily grind —
              for properties people depend on. Not software sold to hotels. <em>A team that runs them.</em>
            </p>
            <p className="mt-8 text-xs text-white/45">Press Enter to continue · story first, questions after</p>
          </section>
        )}

        {step === 'intro2' && (
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>The proof</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-6xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
              30 days. Collapsing property.<br /><span style={{ color: TEAL_BRIGHT }}>Back on its feet.</span>
            </h2>
            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-4xl font-extrabold" style={{ color: TEAL_BRIGHT }}>74.4 → 80+</div>
                <div className="mt-1 text-xs text-white/55">Guest satisfaction recovered in 30 days</div>
              </div>
              <div className="mt-0 rounded-2xl border border-white/10 bg-white/5 p-5 sm:mt-0">
                <div className="text-4xl font-extrabold" style={{ color: TEAL_BRIGHT }}>$3,300/mo</div>
                <div className="mt-1 text-xs text-white/55">New revenue found in the first month</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-4xl font-extrabold" style={{ color: TEAL_BRIGHT }}>54</div>
                <div className="mt-1 text-xs text-white/55">Keys running on the platform today</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-4xl font-extrabold" style={{ color: TEAL_BRIGHT }}>1</div>
                <div className="mt-1 text-xs text-white/55">Accountable team behind every property</div>
              </div>
            </div>
          </section>
        )}

        {step === 'intro3' && (
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>Why we&apos;re talking to you</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-6xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
              We hire talent,<br /><span style={{ color: TEAL_BRIGHT }}>not openings.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
              There may not be a posted role with your name on it. Doesn&apos;t matter. If you&apos;re
              great at what you do and hotels are your world, we want your card in the pool —
              <em> the position comes to you.</em>
            </p>
          </section>
        )}

        {/* ------------------------------------------------------- who */}
        {step === 'who' && (
          <Question kicker="First things first" title="What should we call you?">
            <FieldInput
              ref={inputRef}
              value={form.fullName}
              onChange={(v) => set('fullName', v)}
              placeholder="Type your full name..."
            />
            <FieldInput
              value={form.email}
              onChange={(v) => set('email', v)}
              placeholder="And your best email..."
              type="email"
              className="mt-5"
            />
            <Hint show={!!form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)}>
              That email doesn&apos;t look right yet
            </Hint>
          </Question>
        )}

        {/* ----------------------------------------------------- where */}
        {step === 'where' && (
          <Question kicker={`Nice to meet you, ${form.fullName.split(' ')[0] || 'friend'}`} title="Where are you based?" optional="Optional — but it helps us match you to a property nearby">
            <FieldInput ref={inputRef} value={form.location} onChange={(v) => set('location', v)} placeholder="City, State..." />
            <FieldInput value={form.phone} onChange={(v) => set('phone', v)} placeholder="Phone (optional)" type="tel" className="mt-5" />
          </Question>
        )}

        {/* ----------------------------------------------------- links */}
        {step === 'links' && (
          <Question kicker="Proof beats claims" title="Where can we see your work?" optional="LinkedIn, portfolio, whatever shows you off — all optional">
            <FieldInput ref={inputRef} value={form.linkedin} onChange={(v) => set('linkedin', v)} placeholder="LinkedIn URL..." />
            <FieldInput value={form.portfolio} onChange={(v) => set('portfolio', v)} placeholder="Portfolio or other link (optional)" className="mt-5" />
          </Question>
        )}

        {/* ----------------------------------------------------- years */}
        {step === 'years' && (
          <Question kicker="Experience" title="How long have you been doing what you do?">
            <ChoiceGrid>
              {YEARS.map((y) => (
                <Choice key={y} label={y} selected={form.yearsExperience === y} onClick={() => { set('yearsExperience', y); setTimeout(next, 250); }} />
              ))}
            </ChoiceGrid>
          </Question>
        )}

        {/* ------------------------------------------------ industries */}
        {step === 'industries' && (
          <Question kicker="Background" title="Which worlds do you know best?" optional="Pick as many as apply">
            <ChoiceGrid>
              {INDUSTRIES.map((i) => (
                <Choice key={i} label={i} selected={form.industries.includes(i)} onClick={() => toggle('industries', i)} multi />
              ))}
            </ChoiceGrid>
          </Question>
        )}

        {/* ---------------------------------------------------- skills */}
        {step === 'skills' && (
          <Question kicker="The good stuff" title="What are you great at?" optional="Tap suggestions or type your own — this is what we hire for">
            <ChoiceGrid>
              {SKILL_CHIPS.map((s) => (
                <Choice key={s} label={s} selected={form.skills.includes(s)} onClick={() => toggle('skills', s)} multi />
              ))}
            </ChoiceGrid>
            <form
              className="mt-5 flex gap-3"
              onSubmit={(e) => { e.preventDefault(); addTag(); }}
            >
              <input
                ref={tagInput === '' ? inputRef : undefined}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Type a skill and press Enter..."
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder-white/40 outline-none focus:border-white/50"
              />
            </form>
            {form.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {form.skills.filter((s) => !SKILL_CHIPS.includes(s)).map((s) => (
                  <button key={s} onClick={() => toggle('skills', s)} className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: TEAL }}>
                    {s} ✕
                  </button>
                ))}
              </div>
            )}
          </Question>
        )}

        {/* ----------------------------------------------------- story */}
        {step === 'story' && (
          <Question kicker="Your story" title="In your own words — what&apos;s your path been?" optional="No resume-speak. Just you.">
            <FieldTextarea
              ref={taRef}
              value={form.story}
              onChange={(v) => set('story', v)}
              placeholder="I started..."
              rows={5}
            />
            <Hint show={form.story.trim().length > 0 && form.story.trim().length < 20}>
              A sentence or two more — we want the real story
            </Hint>
          </Question>
        )}

        {/* ------------------------------------------------ superpower */}
        {step === 'superpower' && (
          <Question kicker="One more thing" title="If we asked your last team your superpower, they'd say..." optional="Optional — but the good answers are memorable">
            <FieldInput ref={inputRef} value={form.superpower} onChange={(v) => set('superpower', v)} placeholder="e.g. Turning a chaotic morning shift into a calm one..." />
          </Question>
        )}

        {/* ---------------------------------------------- availability */}
        {step === 'availability' && (
          <Question kicker="Timing" title="When could you start?">
            <ChoiceGrid>
              {AVAILABILITY.map((a) => (
                <Choice key={a} label={a} selected={form.availability === a} onClick={() => { set('availability', a); setTimeout(next, 250); }} />
              ))}
            </ChoiceGrid>
          </Question>
        )}

        {/* ---------------------------------------------- expectations */}
        {step === 'expectations' && (
          <Question kicker="Honesty zone" title="What are you looking for?" optional="Pay, growth, schedule, anything — optional, and it stays between us">
            <FieldTextarea ref={taRef} value={form.expectations} onChange={(v) => set('expectations', v)} placeholder="Say it straight..." rows={4} />
          </Question>
        )}

        {/* ---------------------------------------------------- submit */}
        {step === 'submit' && (
          <section className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>Ready</p>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-5xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
              That&apos;s it, {form.fullName.split(' ')[0]}.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-white/70">
              {form.skills.length} skill{form.skills.length === 1 ? '' : 's'} on your card
              {form.industries.length > 0 && ` · ${form.industries.length} industr${form.industries.length === 1 ? 'y' : 'ies'}`}.
              Send it and you&apos;re in the pool — we review every single one.
            </p>
            {submitError && (
              <p className="mx-auto mt-4 max-w-md rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-200">{submitError}</p>
            )}
            <button
              onClick={doSubmit}
              disabled={submitting}
              className="mt-10 rounded-full px-10 py-4 text-lg font-bold text-white shadow-xl transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-60"
              style={{ background: `linear-gradient(90deg, ${TEAL_BRIGHT}, ${TEAL})` }}
            >
              {submitting ? 'Sending…' : 'Send it →'}
            </button>
          </section>
        )}

        {/* ------------------------------------------------------ done */}
        {step === 'done' && (
          <section className="relative overflow-hidden rounded-3xl text-center" style={{ background: INK }}>
            {/* media slot: /careers/vision.jpg */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-50"
              style={{
                backgroundImage:
                  "url('/careers/vision.jpg'), linear-gradient(135deg, #0E6B60 0%, #158A7C 55%, #07231F 100%)",
              }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,35,31,0.3) 0%, rgba(7,35,31,0.94) 80%)' }} />
            <div className="relative px-7 py-16 sm:px-14 sm:py-24">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ background: TEAL_BRIGHT }}>
                ✓
              </div>
              <h2 className="text-4xl font-extrabold sm:text-6xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
                You&apos;re in the pool, {form.fullName.split(' ')[0]}.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-white/80">
                A human reads every submission. If your experience lights us up, we&apos;ll reach out —
                not with a job posting, but with a position built around what you bring.
              </p>
              <p className="mt-8 text-sm text-white/50">We&apos;ll be in touch at {form.email}</p>
            </div>
          </section>
        )}
      </main>

      {/* bottom nav */}
      {step !== 'welcome' && step !== 'done' && (
        <div className="fixed inset-x-0 bottom-0 z-40" style={{ background: 'linear-gradient(180deg, rgba(7,35,31,0) 0%, rgba(7,35,31,0.9) 45%)' }}>
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
            <button onClick={back} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10">
              ← Back
            </button>
            {step === 'submit' ? (
              <button
                onClick={doSubmit}
                disabled={submitting}
                className="rounded-full px-7 py-3 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: `linear-gradient(90deg, ${TEAL_BRIGHT}, ${TEAL})` }}
              >
                {submitting ? 'Sending…' : 'Send it →'}
              </button>
            ) : (
              <button
                onClick={next}
                disabled={!valid}
                className="rounded-full px-7 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
                style={{ background: valid ? TEAL : '#1a4a44' }}
              >
                {step === 'expectations' ? 'Almost done →' : 'Continue →'} <span className="ml-1 text-white/60">⏎</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- pieces

function Question({ kicker, title, optional, children }: {
  kicker: string; title: string; optional?: string; children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>{kicker}</p>
      <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
        {title}
      </h2>
      {optional && <p className="mt-3 text-sm text-white/55">{optional}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function FieldInput({ ref, value, onChange, placeholder, type = 'text', className = '' }: {
  ref?: React.Ref<HTMLInputElement>;
  value: string; onChange: (v: string) => void; placeholder: string; type?: string; className?: string;
}) {
  return (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-2xl border-2 border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder-white/35 outline-none transition-colors focus:border-[#15b79e] ${className}`}
    />
  );
}

function FieldTextarea({ ref, value, onChange, placeholder, rows = 4, className = '' }: {
  ref?: React.Ref<HTMLTextAreaElement>;
  value: string; onChange: (v: string) => void; placeholder: string; rows?: number; className?: string;
}) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full resize-none rounded-2xl border-2 border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder-white/35 outline-none transition-colors focus:border-[#15b79e] ${className}`}
    />
  );
}

function Hint({ show, children }: { show: boolean; children: React.ReactNode }) {
  return <p className={`mt-3 text-sm font-medium text-amber-300/90 transition-opacity ${show ? 'opacity-100' : 'opacity-0'}`}>{children}</p>;
}

function ChoiceGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Choice({ label, selected, onClick, multi = false }: {
  label: string; selected: boolean; onClick: () => void; multi?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left text-base font-semibold transition-all hover:border-white/50"
      style={{
        borderColor: selected ? TEAL_BRIGHT : 'rgba(255,255,255,0.2)',
        background: selected ? 'rgba(21,183,158,0.18)' : 'rgba(255,255,255,0.05)',
      }}
    >
      <span>{label}</span>
      {multi && (
        <span className="ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs" style={{ borderColor: selected ? TEAL_BRIGHT : 'rgba(255,255,255,0.3)', background: selected ? TEAL_BRIGHT : 'transparent' }}>
          {selected ? '✓' : ''}
        </span>
      )}
    </button>
  );
}