'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Quote, Sparkles } from 'lucide-react';

/**
 * Attenda Experience Engine — shared block viewer.
 * Modes: interactive (one beat per screen) · presentation (scroll story) · hybrid (scroll + focused steps)
 * Brand: dark teal INK bg, white cards, TEAL accents, Plus Jakarta Sans headings.
 */

const INK = '#07231F';
const INK2 = '#0B3B36';
const TEAL = '#158A7C';
const TEAL_BRIGHT = '#15b79e';
const MINT = '#E8F4F1';
const HEAD_FONT = 'Plus Jakarta Sans, Inter, sans-serif';

export type ExperienceBlockType =
  'hero' | 'text' | 'image' | 'video' | 'stat' | 'features' | 'quote'
  | 'question' | 'mc' | 'select' | 'multi' | 'contact' | 'cta' | 'divider' | 'confirm';

export type ExperienceBlock = {
  id: string;
  type: ExperienceBlockType;
  props: Record<string, unknown>;
};

export type LogKind = 'view' | 'start' | 'complete' | 'submit';

type Props = {
  title: string;
  subtitle?: string | null;
  mode: 'interactive' | 'presentation' | 'hybrid';
  blocks: ExperienceBlock[];
  onLog?: (kind: LogKind, contact?: Record<string, string>, meta?: Record<string, unknown>) => void;
  embedded?: boolean;
  forName?: string | null;
};

const INTERACTIVE_TYPES: ExperienceBlockType[] = ['question', 'mc', 'select', 'multi', 'contact'];
const FOCUS_TYPES: ExperienceBlockType[] = ['question', 'mc', 'select', 'multi', 'contact', 'confirm', 'cta'];

export default function ExperienceViewer({ title, subtitle, mode, blocks, onLog, embedded, forName }: Props) {
  const safeBlocks: ExperienceBlock[] = blocks.length
    ? blocks
    : [{ id: 'b0', type: 'hero', props: { eyebrow: 'ATTENDA', title, subtitle: subtitle || '' } }];

  const viewed = useRef(false);
  const started = useRef(false);
  const completed = useRef(false);

  // view event — once
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    onLog?.('view');
  }, [onLog]);

  const markStart = () => {
    if (started.current) return;
    started.current = true;
    onLog?.('start');
  };

  const markComplete = (contact?: Record<string, string>) => {
    if (completed.current) return;
    completed.current = true;
    onLog?.('complete');
    if (contact) onLog?.('submit', contact);
  };

  return (
    <div
      className={`${embedded ? 'h-full overflow-y-auto' : 'min-h-screen'} w-full`}
      style={{ background: `radial-gradient(1200px 600px at 80% -10%, ${INK2}, ${INK})`, color: '#fff' }}
    >
      {forName ? (
        <div className="pt-6 text-center text-[11px] font-extrabold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>
          Prepared for {forName}
        </div>
      ) : null}
      {(mode === 'interactive') ? (
        <InteractiveFlow blocks={safeBlocks} title={title} subtitle={subtitle} markStart={markStart} markComplete={markComplete} />
      ) : (
        <ScrollStory blocks={safeBlocks} title={title} subtitle={subtitle} mode={mode} markStart={markStart} markComplete={markComplete} />
      )}
    </div>
  );
}

/* ─────────────────────────── INTERACTIVE ─────────────────────────── */

function InteractiveFlow({ blocks, title, subtitle, markStart, markComplete }: {
  blocks: ExperienceBlock[]; title: string; subtitle?: string | null;
  markStart: () => void; markComplete: (c?: Record<string, string>) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [contact, setContact] = useState<Record<string, string>>({});
  const last = idx === blocks.length - 1;

  const next = () => {
    if (idx >= blocks.length - 1) return;
    const ni = idx + 1;
    setIdx(ni);
    const t = blocks[ni]?.type;
    if (ni === blocks.length - 1 && t && !INTERACTIVE_TYPES.includes(t)) markComplete(contact);
  };
  const back = () => { if (idx > 0) setIdx(idx - 1); };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !last) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, last]);

  useEffect(() => {
    if (!last) return;
    const t = blocks[blocks.length - 1]?.type;
    if (t && !INTERACTIVE_TYPES.includes(t)) markComplete(contact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* progress */}
      <div className="flex items-center justify-center gap-1.5 px-4 pt-6">
        {blocks.map((b, i) => (
          <span key={b.id} className="h-1.5 rounded-full transition-all" style={{ width: i === idx ? 22 : 8, background: i <= idx ? TEAL_BRIGHT : 'rgba(255,255,255,0.18)' }} />
        ))}
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div key={idx} className="w-full max-w-xl anim-fadein">
          <BlockView block={blocks[idx]} contact={contact} setContact={setContact} markStart={markStart} markComplete={markComplete} />
        </div>
      </div>

      <div className="flex items-center justify-between px-5 pb-6">
        <button onClick={back} disabled={idx === 0} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold disabled:opacity-0" style={{ color: MINT }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        {!last && (
          <button onClick={next} className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-[1.03]" style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="w-[70px]" />
      </div>
    </div>
  );
}

/* ─────────────────────────── SCROLL / HYBRID ─────────────────────────── */

function ScrollStory({ blocks, title, subtitle, mode, markStart, markComplete }: {
  blocks: ExperienceBlock[]; title: string; subtitle?: string | null;
  mode: 'presentation' | 'hybrid'; markStart: () => void; markComplete: (c?: Record<string, string>) => void;
}) {
  const [contact, setContact] = useState<Record<string, string>>({});
  const lastIdx = blocks.length - 1;
  const finishRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef<Record<string, string>>({});
  contactRef.current = contact;

  useEffect(() => {
    const lastType = blocks[blocks.length - 1]?.type;
    if (lastType && INTERACTIVE_TYPES.includes(lastType)) return; // Submit button completes it
    const el = finishRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((x) => x.isIntersecting)) markComplete(contactRef.current);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks.length]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24">
      {blocks.map((b, i) => {
        const focused = mode === 'hybrid' && FOCUS_TYPES.includes(b.type);
        const isLast = i === lastIdx;
        return (
          <div key={b.id} ref={isLast ? finishRef : undefined}
            className={`anim-fadein ${focused ? 'flex min-h-screen items-center py-6' : 'py-8'}`}>
            <div className="w-full">
              <BlockView block={b} contact={contact} setContact={setContact} markStart={markStart} markComplete={markComplete} />
            </div>
          </div>
        );
      })}
      {!blocks.length && (
        <div className="py-24 text-center text-sm" style={{ color: MINT }}>{title}{subtitle ? ` — ${subtitle}` : ''}</div>
      )}
    </div>
  );
}

/* ─────────────────────────── BLOCKS ─────────────────────────── */

function BlockView({ block, contact, setContact, markStart, markComplete }: {
  block: ExperienceBlock; contact: Record<string, string>; setContact: (c: Record<string, string>) => void; markStart: () => void; markComplete: (c?: Record<string, string>) => void;
}) {
  const p = block.props || {};
  switch (block.type) {
    case 'hero':
      return (
        <div className="text-center">
          {p.eyebrow ? <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>{String(p.eyebrow)}</div> : null}
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: HEAD_FONT }}>{String(p.title || '')}</h1>
          {p.subtitle ? <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed" style={{ color: MINT }}>{String(p.subtitle)}</p> : null}
        </div>
      );

    case 'text':
      return (
        <div className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          {p.heading ? <h2 className="text-xl font-extrabold text-gray-900 sm:text-2xl" style={{ fontFamily: HEAD_FONT }}>{String(p.heading)}</h2> : null}
          {p.body ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{String(p.body)}</p> : null}
        </div>
      );

    case 'image':
      return (
        <div className="overflow-hidden rounded-3xl shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={String(p.src || '')} alt={String(p.alt || '')} className="w-full object-cover" />
        </div>
      );

    case 'video':
      return (
        <div className="aspect-video overflow-hidden rounded-3xl shadow-xl">
          <iframe src={String(p.url || '')} title="video" className="h-full w-full" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      );

    case 'stat':
      return (
        <div className="rounded-3xl p-8 text-center shadow-xl" style={{ background: `linear-gradient(135deg, ${INK2}, ${TEAL})` }}>
          <div className="text-4xl font-extrabold text-white sm:text-5xl" style={{ fontFamily: HEAD_FONT }}>{String(p.value || '')}</div>
          {p.label ? <div className="mt-2 text-sm font-bold" style={{ color: MINT }}>{String(p.label)}</div> : null}
          {p.secondary ? <div className="mt-1 text-xs" style={{ color: 'rgba(232,244,241,0.7)' }}>{String(p.secondary)}</div> : null}
        </div>
      );

    case 'features':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {(Array.isArray(p.items) ? p.items : []).map((it: { icon?: string; title?: string; body?: string }, i: number) => (
            <div key={i} className="rounded-2xl bg-white p-5 shadow-lg">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: MINT, color: TEAL }}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="text-sm font-extrabold text-gray-900">{String(it.title || '')}</div>
              {it.body ? <p className="mt-1 text-xs leading-relaxed text-gray-500">{String(it.body)}</p> : null}
            </div>
          ))}
        </div>
      );

    case 'quote':
      return (
        <div className="rounded-3xl bg-white p-6 shadow-xl">
          <Quote className="h-5 w-5" style={{ color: TEAL }} />
          <p className="mt-2 text-base font-semibold leading-relaxed text-gray-800" style={{ fontFamily: HEAD_FONT }}>{String(p.body || '')}</p>
          {p.author ? <div className="mt-3 text-xs font-bold uppercase tracking-wider text-gray-400">— {String(p.author)}</div> : null}
        </div>
      );

    case 'question':
      return (
        <div className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="text-lg font-extrabold text-gray-900" style={{ fontFamily: HEAD_FONT }}>{String(p.question || '')}</div>
          <input
            value={contact[String(p.key || block.id)] || ''}
            onChange={(e) => { markStart(); setContact({ ...contact, [String(p.key || block.id)]: e.target.value }); }}
            placeholder={String(p.placeholder || 'Type your answer…')}
            className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-teal-400"
          />
        </div>
      );

    case 'mc':
      return (
        <div className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="text-lg font-extrabold text-gray-900" style={{ fontFamily: HEAD_FONT }}>{String(p.question || '')}</div>
          <div className="mt-4 space-y-2.5">
            {(Array.isArray(p.options) ? p.options : []).map((o: string, i: number) => {
              const key = String(p.key || block.id);
              const sel = contact[key] === o;
              return (
                <button key={i} onClick={() => { markStart(); setContact({ ...contact, [key]: o }); }}
                  className="flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-bold transition-all"
                  style={{ borderColor: sel ? TEAL : '#e5e7eb', background: sel ? MINT : '#fff', color: sel ? TEAL : '#374151' }}>
                  {String(o)}
                  {sel && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      );

    case 'select': {
      const key = String(p.key || block.id);
      const opts: string[] = Array.isArray(p.options) ? p.options : [];
      return (
        <div className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="text-lg font-extrabold text-gray-900" style={{ fontFamily: HEAD_FONT }}>{String(p.question || '')}</div>
          <select
            value={contact[key] || ''}
            onChange={(e) => { markStart(); setContact({ ...contact, [key]: e.target.value }); }}
            className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-teal-400"
          >
            <option value="" disabled>{String(p.placeholder || 'Pick one…')}</option>
            {opts.map((o, i) => (<option key={i} value={o}>{o}</option>))}
          </select>
        </div>
      );
    }

    case 'multi': {
      const key = String(p.key || block.id);
      const opts: string[] = Array.isArray(p.options) ? p.options : [];
      const picked = (contact[key] || '').split(',').filter(Boolean);
      const toggle = (o: string) => {
        markStart();
        const next = picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o];
        setContact({ ...contact, [key]: next.join(',') });
      };
      return (
        <div className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="text-lg font-extrabold text-gray-900" style={{ fontFamily: HEAD_FONT }}>{String(p.question || '')}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {opts.map((o, i) => {
              const sel = picked.includes(o);
              return (
                <button key={i} onClick={() => toggle(o)}
                  className="flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-xs font-bold transition-all"
                  style={{ borderColor: sel ? TEAL : '#e5e7eb', background: sel ? MINT : '#fff', color: sel ? TEAL : '#374151' }}>
                  {sel ? <Check className="h-3.5 w-3.5" /> : null}{o}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'contact': {
      const fields: string[] = Array.isArray(p.fields) && p.fields.length ? p.fields : ['name', 'email'];
      const ready = fields.every((f) => (contact[f] || '').trim().length > 1);
      return (
        <div className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          {p.heading ? <div className="text-lg font-extrabold text-gray-900" style={{ fontFamily: HEAD_FONT }}>{String(p.heading)}</div> : null}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {fields.map((f) => (
              <input key={f}
                value={contact[f] || ''}
                onChange={(e) => { markStart(); setContact({ ...contact, [f]: e.target.value }); }}
                placeholder={f === 'name' ? 'Full name' : f === 'email' ? 'Email' : f === 'phone' ? 'Phone' : f === 'position' ? 'Position' : f === 'company' ? 'Company' : f}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-teal-400"
              />
            ))}
          </div>
          <button disabled={!ready}
            onClick={() => markComplete(contact)}
            className="mt-4 w-full rounded-xl py-3.5 text-sm font-extrabold text-white shadow-lg transition-all disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
            Submit
          </button>
        </div>
      );
    }

    case 'cta':
      return (
        <div className="text-center">
          <a href={String(p.href || '#')} onClick={() => markComplete()}
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-extrabold text-white shadow-2xl transition-transform hover:scale-[1.03]"
            style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
            {String(p.label || 'Continue')} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      );

    case 'divider':
      return <div className="mx-auto h-px w-24" style={{ background: 'rgba(255,255,255,0.2)' }} />;

    case 'confirm':
      return (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-xl" style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white" style={{ fontFamily: HEAD_FONT }}>{String(p.heading || 'You are in.')}</h2>
          {p.body ? <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed" style={{ color: MINT }}>{String(p.body)}</p> : null}
        </div>
      );

    default:
      return null;
  }
}

/* small fade-in animation (client-only — guard everything for SSR/SSG) */
if (typeof document !== 'undefined' && !document.getElementById('exf-style')) {
  const style = document.createElement('style');
  style.textContent = `.anim-fadein{animation:exf .5s ease both}@keyframes exf{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`;
  style.id = 'exf';
  document.head.appendChild(style);
}