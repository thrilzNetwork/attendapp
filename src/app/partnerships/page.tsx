'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * /partnerships — public B2B partner experience (Typeform-style).
 *
 * For companies who want to partner with ATTENDA (procurement platforms like
 * Reeco, distributors, tech & service companies) — NOT hotel vendors. The
 * pitch: you're not pitching one hotel, you're pitching every property we run.
 */

const INK = '#07231F';
const INK2 = '#0B3B36';
const MINT = '#E8F4F1';
const TEAL = '#158A7C';
const TEAL_BRIGHT = '#15b79e';

type Form = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  website_url: string; // honeypot — humans never see this
  category: string;
  offering: string;
  coverage: string;
  scaleReadiness: string;
  integrations: string[];
  trackRecord: string;
  whyUs: string;
  contextProperty: string; // tagged from a /pitch/<key> link
};

const EMPTY: Form = {
  companyName: '', contactName: '', email: '', phone: '', website: '', website_url: '',
  category: '', offering: '', coverage: '', scaleReadiness: '', integrations: [],
  trackRecord: '', whyUs: '', contextProperty: '',
};

const CATEGORIES = [
  'Procurement / supply chain',
  'Food & beverage distribution',
  'Technology / software',
  'Facilities & services',
  'Staffing & training',
  'Other',
];
const COVERAGE = ['South Florida', 'Florida statewide', 'Southeast US', 'National', 'International'];
const SCALE = [
  'Ready now — we can serve every property immediately',
  'Within 30 days of signing',
  'Need to scale up first',
  'Pilot with 1–2 properties first',
];
const INTEGRATION_CHIPS = [
  'POS integration', 'Invoicing / AP', 'Inventory sync', 'API / webhooks',
  'Dedicated account manager', 'Rebates / pricing programs', 'None yet',
];

const STEP_ORDER = [
  'welcome', 'intro1', 'intro2', 'intro3', 'company', 'contact', 'category', 'offering', 'coverage',
  'scale', 'integrations', 'trackRecord', 'whyUs', 'submit', 'done',
] as const;
type Step = (typeof STEP_ORDER)[number];

export default function PartnershipsPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [form, setForm] = useState<Form>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);
  const total = STEP_ORDER.length;
  const progress = Math.round(((stepIndex + 1) / total) * 100);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Tag from a personalized pitch link: /partnerships?property=<name>
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('property');
    if (p) setForm((f) => ({ ...f, contextProperty: p.slice(0, 160) }));
  }, []);

  const toggle = (k: 'integrations', v: string) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v],
    }));

  const valid = useMemo((): boolean => {
    switch (step) {
      case 'company': return form.companyName.trim().length > 1;
      case 'contact': return form.contactName.trim().length > 1 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email);
      case 'category': return !!form.category;
      case 'offering': return form.offering.trim().length >= 20;
      case 'coverage': return !!form.coverage;
      case 'scale': return !!form.scaleReadiness;
      default: return true;
    }
  }, [step, form]);

  const next = useCallback(() => {
    if (!valid) return;
    setStep((s) => STEP_ORDER[Math.min(STEP_ORDER.indexOf(s as Step) + 1, STEP_ORDER.length - 1)]);
  }, [valid]);

  const back = useCallback(() => {
    setStep((s) => STEP_ORDER[Math.max(STEP_ORDER.indexOf(s as Step) - 1, 0)]);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (step === 'company' || step === 'contact') inputRef.current?.focus();
      if (step === 'offering' || step === 'trackRecord' || step === 'whyUs') taRef.current?.focus();
    }, 350);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (document.activeElement?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        if (step === 'submit') doSubmit();
        else next();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, valid, form]);

  async function doSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/partnerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone,
          website: form.website,
          category: form.category,
          offering: form.offering,
          coverage: form.coverage,
          scaleReadiness: form.scaleReadiness,
          integrations: form.integrations,
          trackRecord: form.trackRecord,
          whyUs: form.whyUs,
          contextProperty: form.contextProperty,
          website_url: form.website_url,
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
      <div className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <span className="text-sm font-extrabold tracking-[0.18em]" style={{ color: TEAL_BRIGHT }}>
            ATTENDA
          </span>
          {step !== 'welcome' && step !== 'done' && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-white/50">{progress}%</span>
              <div className="h-1 w-28 overflow-hidden rounded-full bg-white/15 sm:w-44">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${TEAL_BRIGHT}, ${MINT})` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 pb-28 pt-20">
        {/* welcome */}
        {step === 'welcome' && (
          <section className="relative overflow-hidden rounded-3xl" style={{ background: INK }}>
            <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: "url('/partnerships/hero.jpg'), linear-gradient(135deg, #0E6B60 0%, #158A7C 55%, #07231F 100%)" }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,35,31,0.15) 0%, rgba(7,35,31,0.92) 78%)' }} />
            <div className="relative px-7 py-14 sm:px-14 sm:py-20">
              <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>Partnerships</p>
              <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-6xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
                Don&apos;t pitch one hotel.
                <br />
                <span style={{ color: TEAL_BRIGHT }}>Pitch all of them.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
                Attenda runs operations for great properties. Our partners — procurement
                platforms, distributors, tech and service companies — reach
                <em> every property we run, through one relationship.</em>
              </p>
              <button onClick={next} className="mt-10 rounded-full px-8 py-4 text-base font-bold text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-95" style={{ background: `linear-gradient(90deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
                Apply to partner →
              </button>
              <p className="mt-4 text-xs text-white/45">10 questions · A real human reads every application</p>
            </div>
          </section>
        )}

        {/* intro beats — the partner presentation */}
        {step === 'intro1' && (
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>First — what Attenda is</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-6xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
              The corporate office<br />behind great hotels.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
              Attenda runs hotel operations end to end — staffing, revenue, guest services, daily ops —
              through one platform and one accountable team.
            </p>
          </section>
        )}

        {step === 'intro2' && (
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>The proof</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-6xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
              We turn properties around.<br /><span style={{ color: TEAL_BRIGHT }}>Fast.</span>
            </h2>
            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-4xl font-extrabold" style={{ color: TEAL_BRIGHT }}>74.4 → 80+</div>
                <div className="mt-1 text-xs text-white/55">Satisfaction recovered in 30 days at a collapsing property</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-4xl font-extrabold" style={{ color: TEAL_BRIGHT }}>$3,300/mo</div>
                <div className="mt-1 text-xs text-white/55">New revenue found in the first 30 days</div>
              </div>
            </div>
          </section>
        )}

        {step === 'intro3' && (
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>What partnership means here</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-6xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
              One contract.<br /><span style={{ color: TEAL_BRIGHT }}>Every property.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
              One onboarding, one invoice, one relationship — and your product or service reaches
              every property Attenda runs, present and future. No pitching hotel by hotel.
            </p>
            <p className="mt-8 text-xs text-white/45">Press Enter — the questions start next</p>
          </section>
        )}

        {step === 'company' && (
          <Question kicker="Who's reaching out" title="What's your company called?">
            <FieldInput ref={inputRef} value={form.companyName} onChange={(v) => set('companyName', v)} placeholder="Company name..." />
            <FieldInput value={form.website} onChange={(v) => set('website', v)} placeholder="Website (optional)" className="mt-5" />
          </Question>
        )}

        {step === 'contact' && (
          <Question kicker={`Meeting ${form.companyName || 'your team'}`} title="And who are you?" optional="The person we'd actually work with">
            <FieldInput ref={inputRef} value={form.contactName} onChange={(v) => set('contactName', v)} placeholder="Your name..." />
            <FieldInput value={form.email} onChange={(v) => set('email', v)} placeholder="Work email..." type="email" className="mt-5" />
            <FieldInput value={form.phone} onChange={(v) => set('phone', v)} placeholder="Phone (optional)" type="tel" className="mt-5" />
            <Hint show={!!form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)}>That email doesn&apos;t look right yet</Hint>
          </Question>
        )}

        {step === 'category' && (
          <Question kicker="Your world" title="What kind of partner are you?">
            <ChoiceGrid>
              {CATEGORIES.map((c) => (
                <Choice key={c} label={c} selected={form.category === c} onClick={() => { set('category', c); setTimeout(next, 250); }} />
              ))}
            </ChoiceGrid>
          </Question>
        )}

        {step === 'offering' && (
          <Question kicker="The pitch" title="What do you bring to our properties?">
            <FieldTextarea ref={taRef} value={form.offering} onChange={(v) => set('offering', v)} placeholder="Describe what you offer — products, platform, service..." rows={4} />
            <Hint show={form.offering.trim().length > 0 && form.offering.trim().length < 20}>A little more — sell it like you mean it</Hint>
          </Question>
        )}

        {step === 'coverage' && (
          <Question kicker="Reach" title="Where can you serve today?">
            <ChoiceGrid>
              {COVERAGE.map((c) => (
                <Choice key={c} label={c} selected={form.coverage === c} onClick={() => { set('coverage', c); setTimeout(next, 250); }} />
              ))}
            </ChoiceGrid>
          </Question>
        )}

        {step === 'scale' && (
          <Question kicker="Capacity" title="If we signed today, how fast could you serve every property?">
            <ChoiceGrid>
              {SCALE.map((s) => (
                <Choice key={s} label={s} selected={form.scaleReadiness === s} onClick={() => { set('scaleReadiness', s); setTimeout(next, 250); }} />
              ))}
            </ChoiceGrid>
          </Question>
        )}

        {step === 'integrations' && (
          <Question kicker="Plugging in" title="How do you connect?" optional="Pick all that apply — optional">
            <ChoiceGrid>
              {INTEGRATION_CHIPS.map((c) => (
                <Choice key={c} label={c} selected={form.integrations.includes(c)} onClick={() => toggle('integrations', c)} multi />
              ))}
            </ChoiceGrid>
          </Question>
        )}

        {step === 'trackRecord' && (
          <Question kicker="Proof" title="Who do you already work with?" optional="Hotels, groups, brands — optional but it counts">
            <FieldTextarea ref={taRef} value={form.trackRecord} onChange={(v) => set('trackRecord', v)} placeholder="Names, numbers, stories..." rows={4} />
          </Question>
        )}

        {step === 'whyUs' && (
          <Question kicker="Last one" title="Why Attenda?" optional="Optional — the good answers are specific">
            <FieldTextarea ref={taRef} value={form.whyUs} onChange={(v) => set('whyUs', v)} placeholder="Tell us what you see here..." rows={4} />
          </Question>
        )}

        {step === 'submit' && (
          <section className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>Ready</p>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-5xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>
              One relationship.
              <br />
              Every property.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-white/70">
              Sending {form.companyName}&apos;s application. We review every one — expect a real
              conversation, not a form reply.
            </p>
            {submitError && <p className="mx-auto mt-4 max-w-md rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-200">{submitError}</p>}
            <button onClick={doSubmit} disabled={submitting} className="mt-10 rounded-full px-10 py-4 text-lg font-bold text-white shadow-xl transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-60" style={{ background: `linear-gradient(90deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
              {submitting ? 'Sending…' : 'Send application →'}
            </button>
          </section>
        )}

        {step === 'done' && (
          <section className="relative overflow-hidden rounded-3xl text-center" style={{ background: INK }}>
            <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: "url('/partnerships/vision.jpg'), linear-gradient(135deg, #0E6B60 0%, #158A7C 55%, #07231F 100%)" }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,35,31,0.3) 0%, rgba(7,35,31,0.94) 80%)' }} />
            <div className="relative px-7 py-16 sm:px-14 sm:py-24">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-3xl" style={{ background: TEAL_BRIGHT }}>✓</div>
              <h2 className="text-4xl font-extrabold sm:text-6xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>Application in.</h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-white/80">
                Thanks, {form.contactName.split(' ')[0]}. We&apos;ll review {form.companyName}&apos;s
                application and reach out at {form.email} — with a real next step, not a template.
              </p>
            </div>
          </section>
        )}
      </main>

      {step !== 'welcome' && step !== 'done' && (
        <div className="fixed inset-x-0 bottom-0 z-40" style={{ background: 'linear-gradient(180deg, rgba(7,35,31,0) 0%, rgba(7,35,31,0.9) 45%)' }}>
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
            <button onClick={back} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10">← Back</button>
            {step === 'submit' ? (
              <button onClick={doSubmit} disabled={submitting} className="rounded-full px-7 py-3 text-sm font-bold text-white disabled:opacity-60" style={{ background: `linear-gradient(90deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
                {submitting ? 'Sending…' : 'Send application →'}
              </button>
            ) : (
              <button onClick={next} disabled={!valid} className="rounded-full px-7 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40" style={{ background: valid ? TEAL : '#1a4a44' }}>
                {step === 'whyUs' ? 'Almost done →' : 'Continue →'} <span className="ml-1 text-white/60">⏎</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Question({ kicker, title, optional, children }: { kicker: string; title: string; optional?: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>{kicker}</p>
      <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: 'var(--font-jakarta), Inter, sans-serif' }}>{title}</h2>
      {optional && <p className="mt-3 text-sm text-white/55">{optional}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function FieldInput({ ref, value, onChange, placeholder, type = 'text', className = '' }: {
  ref?: React.Ref<HTMLInputElement>; value: string; onChange: (v: string) => void; placeholder: string; type?: string; className?: string;
}) {
  return (
    <input ref={ref} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full rounded-2xl border-2 border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder-white/35 outline-none transition-colors focus:border-[#15b79e] ${className}`} />
  );
}

function FieldTextarea({ ref, value, onChange, placeholder, rows = 4, className = '' }: {
  ref?: React.Ref<HTMLTextAreaElement>; value: string; onChange: (v: string) => void; placeholder: string; rows?: number; className?: string;
}) {
  return (
    <textarea ref={ref} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full resize-none rounded-2xl border-2 border-white/20 bg-white/5 px-5 py-4 text-lg text-white placeholder-white/35 outline-none transition-colors focus:border-[#15b79e] ${className}`} />
  );
}

function Hint({ show, children }: { show: boolean; children: React.ReactNode }) {
  return <p className={`mt-3 text-sm font-medium text-amber-300/90 transition-opacity ${show ? 'opacity-100' : 'opacity-0'}`}>{children}</p>;
}

function ChoiceGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Choice({ label, selected, onClick, multi = false }: { label: string; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left text-base font-semibold transition-all hover:border-white/50"
      style={{ borderColor: selected ? TEAL_BRIGHT : 'rgba(255,255,255,0.2)', background: selected ? 'rgba(21,183,158,0.18)' : 'rgba(255,255,255,0.05)' }}>
      <span>{label}</span>
      {multi && (
        <span className="ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs" style={{ borderColor: selected ? TEAL_BRIGHT : 'rgba(255,255,255,0.3)', background: selected ? TEAL_BRIGHT : 'transparent' }}>
          {selected ? '✓' : ''}
        </span>
      )}
    </button>
  );
}