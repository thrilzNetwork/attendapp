'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, KeyRound, Quote, Sparkles } from 'lucide-react';

/**
 * Attenda Experience Engine — cinematic image-first viewer.
 * Modes: interactive (one scene per beat) · presentation (scroll story) · hybrid (scroll + focused beats)
 * Look: full-bleed photography with slow Ken Burns moves, crossfading scene backdrops,
 * film grain + vignette, Sora display type, serif pull-quotes, glass panels, blur-reveal transitions.
 * Inputs always render white text (never inherits) — fixes the invisible-typing bug for good.
 */

const INK = '#07231F';
const INK2 = '#0B3B36';
const TEAL = '#158A7C';
const TEAL_BRIGHT = '#15b79e';
const MINT = '#E8F4F1';
const WHITE = '#FFFFFF';
const WHITE_85 = 'rgba(255,255,255,0.85)';
const WHITE_75 = 'rgba(255,255,255,0.75)';
const WHITE_60 = 'rgba(255,255,255,0.6)';
const WHITE_45 = 'rgba(255,255,255,0.45)';
const GLASS_BG = 'rgba(255,255,255,0.055)';
const IMG_CARD_BG = 'rgba(7,35,31,0.62)';
const GLASS_BORDER = 'rgba(255,255,255,0.14)';
const HEAD_FONT = 'Sora, Plus Jakarta Sans, Inter, sans-serif';
const SERIF = '"Instrument Serif", Georgia, serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export type ExperienceBlockType =
  'hero' | 'text' | 'image' | 'video' | 'stat' | 'features' | 'quote' | 'fullbleed'
  | 'question' | 'mc' | 'select' | 'multi' | 'contact' | 'credentials' | 'cta' | 'divider' | 'confirm';

export type ExperienceBlock = {
  id: string;
  type: ExperienceBlockType;
  props: Record<string, unknown>;
};

export type LogKind = 'view' | 'start' | 'complete' | 'submit';

export type ExperienceCreds = { username: string; password: string | null; existing?: boolean };

type Props = {
  title: string;
  subtitle?: string | null;
  mode: 'interactive' | 'presentation' | 'hybrid';
  blocks: ExperienceBlock[];
  onLog?: (kind: LogKind, contact?: Record<string, string>, meta?: Record<string, unknown>) => void;
  onSubmit?: (contact: Record<string, string>) => Promise<ExperienceCreds | null>;
  embedded?: boolean;
  forName?: string | null;
};

const INTERACTIVE_TYPES: ExperienceBlockType[] = ['question', 'mc', 'select', 'multi', 'contact'];
const FOCUS_TYPES: ExperienceBlockType[] = ['question', 'mc', 'select', 'multi', 'contact', 'credentials', 'confirm', 'cta'];

/** Replace {{key}} placeholders in strings with collected answers ("Hi {{name}}"). */
function fill(v: unknown, contact: Record<string, string>): string {
  if (typeof v !== 'string') return String(v ?? '');
  return v.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (contact[k] || '').trim() || m);
}

export default function ExperienceViewer({ title, subtitle, mode, blocks, onLog, onSubmit, embedded, forName }: Props) {
  const safeBlocks: ExperienceBlock[] = blocks.length
    ? blocks
    : [{ id: 'b0', type: 'hero', props: { eyebrow: 'ATTENDA', title, subtitle: subtitle || '' } }];

  const viewed = useRef(false);
  const started = useRef(false);
  const completed = useRef(false);

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
      className={`${embedded ? 'h-full overflow-y-auto' : 'min-h-screen'} relative w-full`}
      style={{ background: `radial-gradient(1200px 600px at 80% -10%, ${INK2}, ${INK})`, color: WHITE }}
    >
      <div className="exf-vignette" aria-hidden />
      <div className="exf-grain" aria-hidden />
      {forName ? (
        <div className="relative z-[60] pt-6 text-center text-[11px] font-extrabold uppercase tracking-[0.3em]" style={{ color: TEAL_BRIGHT }}>
          Prepared for {forName}
        </div>
      ) : null}
      {mode === 'interactive' ? (
        <InteractiveFlow blocks={safeBlocks} title={title} subtitle={subtitle} markStart={markStart} markComplete={markComplete} onSubmit={onSubmit} />
      ) : (
        <ScrollStory blocks={safeBlocks} title={title} subtitle={subtitle} mode={mode} markStart={markStart} markComplete={markComplete} onSubmit={onSubmit} />
      )}
    </div>
  );
}

/* ─────────────────────────── INTERACTIVE ─────────────────────────── */

/** Crossfading full-bleed photo backdrop for the interactive flow. */
function SceneBackdrop({ blocks, idx }: { blocks: ExperienceBlock[]; idx: number }) {
  const cur = String((blocks[idx]?.props || {})['bg'] || '');
  const [layers, setLayers] = useState<{ src: string; key: number }[]>(cur ? [{ src: cur, key: 0 }] : []);
  useEffect(() => {
    if (!cur) { setLayers([]); return; }
    setLayers((prev) => (prev.length && prev[prev.length - 1].src === cur ? prev : [...prev.slice(-1), { src: cur, key: Date.now() }]));
  }, [cur]);
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {layers.map((l, i) => (
        <div key={l.key} className="exf-bgfade absolute inset-0" style={{ opacity: i === layers.length - 1 ? 1 : 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={l.src} alt="" className="exf-kb h-full w-full object-cover" />
        </div>
      ))}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,35,31,0.74), rgba(7,35,31,0.5) 42%, rgba(7,35,31,0.93))' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(900px 480px at 70% 8%, rgba(11,59,54,0.38), transparent 70%)' }} />
    </div>
  );
}

function InteractiveFlow({ blocks, title, subtitle, markStart, markComplete, onSubmit }: {
  blocks: ExperienceBlock[]; title: string; subtitle?: string | null;
  markStart: () => void; markComplete: (c?: Record<string, string>) => void;
  onSubmit?: (contact: Record<string, string>) => Promise<ExperienceCreds | null>;
}) {
  const [idx, setIdx] = useState(0);
  const [contact, setContact] = useState<Record<string, string>>({});
  const [creds, setCreds] = useState<ExperienceCreds | null>(null);
  const [busy, setBusy] = useState(false);
  const last = idx === blocks.length - 1;

  const next = () => {
    if (idx >= blocks.length - 1) return;
    const ni = idx + 1;
    setIdx(ni);
    const t = blocks[ni]?.type;
    if (ni === blocks.length - 1 && t && !INTERACTIVE_TYPES.includes(t)) markComplete(contact);
  };
  const back = () => { if (idx > 0 && !busy) setIdx(idx - 1); };

  const handleSubmit = async (c: Record<string, string>) => {
    markComplete(c);
    if (onSubmit) {
      setBusy(true);
      const r = await onSubmit(c).catch(() => null);
      setBusy(false);
      if (r) setCreds(r);
    }
    next();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !last && !busy) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, last, busy, contact]);

  useEffect(() => {
    if (!last) return;
    const t = blocks[blocks.length - 1]?.type;
    if (t && !INTERACTIVE_TYPES.includes(t)) markComplete(contact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last]);

  return (
    <div className="relative min-h-screen">
      <SceneBackdrop blocks={blocks} idx={idx} />
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="pt-5 text-center text-[10px] font-extrabold uppercase tracking-[0.5em]" style={{ color: WHITE_60 }}>Attenda</div>
        <div className="mt-3 flex items-center justify-center gap-1.5 px-4">
          {blocks.map((b, i) => (
            <span key={b.id} className="h-1 rounded-full transition-all duration-500" style={{ width: i === idx ? 26 : 8, background: i <= idx ? TEAL_BRIGHT : 'rgba(255,255,255,0.25)' }} />
          ))}
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div key={idx} className="w-full max-w-xl anim-scene">
            <BlockView block={blocks[idx]} contact={contact} setContact={setContact} markStart={markStart} handleSubmit={handleSubmit} markComplete={() => markComplete()} busy={busy} creds={creds} sceneIdx={idx} onImage />
          </div>
        </div>

        <div className="flex items-center justify-between px-5 pb-6">
          <button onClick={back} disabled={idx === 0} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-opacity disabled:opacity-0" style={{ color: WHITE_75 }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          {!last && (
            <button onClick={() => { if (!busy) next(); }} className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-black/30 transition-transform hover:scale-[1.04]" style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="w-[70px]" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SCROLL / HYBRID ─────────────────────────── */

/** Full-bleed pinned photo layer used by scroll-mode scenes. */
function PinnedBg({ src, tall }: { src: string; tall?: boolean }) {
  return (
    <div className={`absolute inset-0 ${tall ? 'min-h-screen' : ''}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="exf-kb h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,35,31,0.66), rgba(7,35,31,0.42) 45%, rgba(7,35,31,0.94))' }} />
    </div>
  );
}

function ScrollStory({ blocks, title, subtitle, mode, markStart, markComplete, onSubmit }: {
  blocks: ExperienceBlock[]; title: string; subtitle?: string | null;
  mode: 'presentation' | 'hybrid'; markStart: () => void; markComplete: (c?: Record<string, string>) => void;
  onSubmit?: (contact: Record<string, string>) => Promise<ExperienceCreds | null>;
}) {
  const [contact, setContact] = useState<Record<string, string>>({});
  const [creds, setCreds] = useState<ExperienceCreds | null>(null);
  const [busy, setBusy] = useState(false);
  const lastIdx = blocks.length - 1;
  const finishRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef<Record<string, string>>({});
  contactRef.current = contact;

  const handleSubmit = async (c: Record<string, string>) => {
    markComplete(c);
    if (onSubmit) {
      setBusy(true);
      const r = await onSubmit(c).catch(() => null);
      setBusy(false);
      if (r) setCreds(r);
    }
  };

  useEffect(() => {
    const lastType = blocks[blocks.length - 1]?.type;
    if (lastType && INTERACTIVE_TYPES.includes(lastType)) return;
    const el = finishRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((x) => x.isIntersecting)) markComplete(contactRef.current);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks.length]);

  const blockEl = (b: ExperienceBlock, onImage: boolean) => (
    <BlockView block={b} contact={contact} setContact={setContact} markStart={markStart} handleSubmit={handleSubmit} markComplete={() => markComplete(contactRef.current)} busy={busy} creds={creds} onImage={onImage} />
  );

  return (
    <div className="w-full">
      <div className="relative z-10 pt-5 pb-2 text-center text-[10px] font-extrabold uppercase tracking-[0.5em]" style={{ color: WHITE_60 }}>Attenda</div>
      {blocks.map((b, i) => {
        const focused = mode === 'hybrid' && FOCUS_TYPES.includes(b.type);
        const bg = String((b.props || {})['bg'] || '');
        const isLast = i === lastIdx;

        if (b.type === 'fullbleed') {
          return (
            <section key={b.id} ref={isLast ? finishRef : undefined} className="relative flex min-h-[92vh] items-center justify-center overflow-hidden">
              <PinnedBg src={String((b.props || {})['src'] || bg)} tall />
              <div className="relative z-10 mx-auto max-w-2xl px-6 py-16 text-center anim-scene">
                {blockEl(b, true)}
              </div>
            </section>
          );
        }

        if (bg) {
          return (
            <section key={b.id} ref={isLast ? finishRef : undefined} className={`relative flex ${focused ? 'min-h-screen' : 'min-h-[78vh]'} items-center overflow-hidden`}>
              <PinnedBg src={bg} tall={focused} />
              <div className={`relative z-10 mx-auto w-full max-w-2xl px-4 ${focused ? 'py-10' : 'py-14'} anim-scene`}>
                {blockEl(b, true)}
              </div>
            </section>
          );
        }

        if (focused) {
          return (
            <section key={b.id} ref={isLast ? finishRef : undefined} className="relative flex min-h-screen items-center py-6">
              <div className="relative z-10 mx-auto w-full max-w-2xl px-4 anim-scene">
                {blockEl(b, false)}
              </div>
            </section>
          );
        }

        return (
          <div key={b.id} ref={isLast ? finishRef : undefined} className="anim-scene relative z-10 mx-auto w-full max-w-2xl px-4 py-10">
            {blockEl(b, false)}
          </div>
        );
      })}
      {!blocks.length && (
        <div className="py-24 text-center text-sm" style={{ color: WHITE_60 }}>{title}{subtitle ? ` — ${subtitle}` : ''}</div>
      )}
    </div>
  );
}

/* ─────────────────────────── BLOCKS ─────────────────────────── */

function BlockView({ block, contact, setContact, markStart, handleSubmit, markComplete, busy, creds, onImage }: {
  block: ExperienceBlock; contact: Record<string, string>; setContact: (c: Record<string, string>) => void;
  markStart: () => void; handleSubmit: (c: Record<string, string>) => void; markComplete: () => void;
  busy?: boolean; creds?: ExperienceCreds | null; onImage?: boolean; sceneIdx?: number;
}) {
  const p = block.props || {};
  const f = (k: string) => fill(p[k], contact);
  const cardBg = onImage ? IMG_CARD_BG : GLASS_BG;
  const cardBlur = 'blur(14px)';
  const cardStyle = { borderColor: GLASS_BORDER, background: cardBg, backdropFilter: cardBlur, WebkitBackdropFilter: cardBlur } as const;

  switch (block.type) {
    case 'hero':
      return (
        <div className="text-center">
          {p.eyebrow ? <div className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.42em]" style={{ color: TEAL_BRIGHT, textShadow: '0 1px 20px rgba(0,0,0,0.6)' }}>{f('eyebrow')}</div> : null}
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl" style={{ fontFamily: HEAD_FONT, color: WHITE, textShadow: '0 2px 40px rgba(0,0,0,0.55)' }}>{f('title')}</h1>
          {p.subtitle ? <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed sm:text-base" style={{ color: WHITE_85 }}>{f('subtitle')}</p> : null}
        </div>
      );

    case 'fullbleed':
      return (
        <div className="text-center">
          {p.eyebrow ? <div className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.42em]" style={{ color: TEAL_BRIGHT, textShadow: '0 1px 20px rgba(0,0,0,0.6)' }}>{f('eyebrow')}</div> : null}
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl" style={{ fontFamily: HEAD_FONT, color: WHITE, textShadow: '0 2px 40px rgba(0,0,0,0.55)' }}>{f('heading')}</h2>
          {p.body ? <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed sm:text-base" style={{ color: WHITE_85 }}>{f('body')}</p> : null}
        </div>
      );

    case 'text':
      return (
        <div>
          {p.eyebrow ? <div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.4em]" style={{ color: TEAL_BRIGHT, textShadow: '0 1px 20px rgba(0,0,0,0.6)' }}>{f('eyebrow')}</div> : null}
          <h2 className="text-2xl font-extrabold leading-snug tracking-tight sm:text-4xl" style={{ fontFamily: HEAD_FONT, color: WHITE, textShadow: '0 2px 40px rgba(0,0,0,0.55)' }}>{f('heading')}</h2>
          {p.body ? <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed sm:text-base" style={{ color: WHITE_85 }}>{f('body')}</p> : null}
        </div>
      );

    case 'image':
      return (
        <div className="overflow-hidden rounded-3xl border shadow-2xl shadow-black/40" style={{ borderColor: GLASS_BORDER }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={String(p.src || '')} alt={String(p.alt || '')} className="w-full object-cover" />
        </div>
      );

    case 'video':
      return (
        <div className="aspect-video overflow-hidden rounded-3xl border shadow-2xl shadow-black/40" style={{ borderColor: GLASS_BORDER }}>
          <iframe src={String(p.url || '')} title="video" className="h-full w-full" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      );

    case 'stat':
      return (
        <div className="rounded-3xl border p-8 text-center shadow-2xl shadow-black/30 sm:p-10" style={{ borderColor: 'rgba(21,183,158,0.4)', background: cardBg, backdropFilter: cardBlur, WebkitBackdropFilter: cardBlur }}>
          <div className="text-5xl font-extrabold tracking-tight sm:text-6xl" style={{ fontFamily: HEAD_FONT, background: `linear-gradient(120deg, ${TEAL_BRIGHT}, #7FE7D2)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{f('value')}</div>
          {p.label ? <div className="mx-auto mt-3 max-w-sm text-sm font-bold" style={{ color: WHITE }}>{f('label')}</div> : null}
          {p.secondary ? <div className="mt-2 text-xs" style={{ color: WHITE_60 }}>{f('secondary')}</div> : null}
        </div>
      );

    case 'features':
      return (
        <div>
          {p.heading ? <h2 className="mb-5 text-center text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ fontFamily: HEAD_FONT, color: WHITE, textShadow: '0 2px 40px rgba(0,0,0,0.55)' }}>{f('heading')}</h2> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {(Array.isArray(p.items) ? p.items : []).map((it: { icon?: string; title?: string; body?: string }, i: number) => (
              <div key={i} className="rounded-2xl border p-5 shadow-lg shadow-black/20" style={{ borderColor: GLASS_BORDER, background: cardBg, backdropFilter: cardBlur, WebkitBackdropFilter: cardBlur }}>
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(21,183,158,0.2)', color: TEAL_BRIGHT }}>
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-sm font-extrabold" style={{ color: WHITE }}>{fill(it.title, contact)}</div>
                {it.body ? <p className="mt-1 text-xs leading-relaxed" style={{ color: WHITE_75 }}>{fill(it.body, contact)}</p> : null}
              </div>
            ))}
          </div>
        </div>
      );

    case 'quote':
      return (
        <div className="px-2 py-4 text-center">
          <Quote className="mx-auto h-6 w-6" style={{ color: TEAL_BRIGHT }} />
          <p className="mx-auto mt-4 max-w-lg text-2xl italic leading-snug sm:text-3xl" style={{ fontFamily: SERIF, color: WHITE, textShadow: '0 2px 40px rgba(0,0,0,0.6)' }}>{f('body')}</p>
          {p.author ? <div className="mt-4 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: WHITE_60 }}>{f('author')}</div> : null}
        </div>
      );

    case 'question':
      return (
        <div className="rounded-3xl border p-6 shadow-2xl shadow-black/30 sm:p-8" style={cardStyle}>
          <div className="text-xl font-extrabold tracking-tight sm:text-2xl" style={{ fontFamily: HEAD_FONT, color: WHITE }}>{f('question')}</div>
          <input
            value={contact[String(p.key || block.id)] || ''}
            onChange={(e) => { markStart(); setContact({ ...contact, [String(p.key || block.id)]: e.target.value }); }}
            placeholder={String(p.placeholder || 'Type your answer…')}
            className="exf-input mt-5 w-full rounded-xl border px-4 py-3.5 text-base outline-none transition-colors focus:border-[#15b79e]"
            style={{ background: 'rgba(255,255,255,0.09)', borderColor: 'rgba(255,255,255,0.18)', color: WHITE }}
          />
        </div>
      );

    case 'mc':
      return (
        <div className="rounded-3xl border p-6 shadow-2xl shadow-black/30 sm:p-8" style={cardStyle}>
          <div className="text-xl font-extrabold tracking-tight sm:text-2xl" style={{ fontFamily: HEAD_FONT, color: WHITE }}>{f('question')}</div>
          <div className="mt-5 space-y-2.5">
            {(Array.isArray(p.options) ? p.options : []).map((o: string, i: number) => {
              const key = String(p.key || block.id);
              const sel = contact[key] === o;
              return (
                <button key={i} onClick={() => { markStart(); setContact({ ...contact, [key]: o }); }}
                  className="flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-bold transition-all hover:border-[#15b79e]"
                  style={{ borderColor: sel ? TEAL_BRIGHT : 'rgba(255,255,255,0.16)', background: sel ? 'rgba(21,183,158,0.2)' : 'rgba(255,255,255,0.05)', color: WHITE }}>
                  {o}
                  {sel && <Check className="h-4 w-4" style={{ color: TEAL_BRIGHT }} />}
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
        <div className="rounded-3xl border p-6 shadow-2xl shadow-black/30 sm:p-8" style={cardStyle}>
          <div className="text-xl font-extrabold tracking-tight sm:text-2xl" style={{ fontFamily: HEAD_FONT, color: WHITE }}>{f('question')}</div>
          <select
            value={contact[key] || ''}
            onChange={(e) => { markStart(); setContact({ ...contact, [key]: e.target.value }); }}
            className="exf-input mt-5 w-full appearance-none rounded-xl border px-4 py-3.5 text-sm font-semibold outline-none transition-colors focus:border-[#15b79e] [&>option]:bg-white [&>option]:text-slate-900"
            style={{ background: 'rgba(255,255,255,0.09)', borderColor: 'rgba(255,255,255,0.16)', color: WHITE }}
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
        const nxt = picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o];
        setContact({ ...contact, [key]: nxt.join(',') });
      };
      return (
        <div className="rounded-3xl border p-6 shadow-2xl shadow-black/30 sm:p-8" style={cardStyle}>
          <div className="text-xl font-extrabold tracking-tight sm:text-2xl" style={{ fontFamily: HEAD_FONT, color: WHITE }}>{f('question')}</div>
          {p.hint ? <div className="mt-1.5 text-xs" style={{ color: WHITE_60 }}>{f('hint')}</div> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {opts.map((o, i) => {
              const sel = picked.includes(o);
              return (
                <button key={i} onClick={() => toggle(o)}
                  className="flex items-center gap-1.5 rounded-full border-2 px-4 py-2.5 text-xs font-bold transition-all"
                  style={{ borderColor: sel ? TEAL_BRIGHT : 'rgba(255,255,255,0.2)', background: sel ? TEAL : 'rgba(255,255,255,0.07)', color: WHITE }}>
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
      const ready = fields.every((fld) => (contact[fld] || '').trim().length > 1);
      return (
        <div className="rounded-3xl border p-6 shadow-2xl shadow-black/30 sm:p-8" style={cardStyle}>
          {p.heading ? <div className="text-xl font-extrabold tracking-tight sm:text-2xl" style={{ fontFamily: HEAD_FONT, color: WHITE }}>{f('heading')}</div> : null}
          {p.sub ? <div className="mt-1.5 text-xs" style={{ color: WHITE_60 }}>{f('sub')}</div> : null}
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {fields.map((fld) => (
              <input key={fld}
                type={fld === 'email' ? 'email' : fld === 'phone' ? 'tel' : 'text'}
                value={contact[fld] || ''}
                onChange={(e) => { markStart(); setContact({ ...contact, [fld]: e.target.value }); }}
                placeholder={fld === 'name' ? 'Full name' : fld === 'email' ? 'Email' : fld === 'phone' ? 'Phone' : fld === 'position' ? 'Position' : fld === 'company' ? 'Company' : fld}
                className="exf-input rounded-xl border px-4 py-3.5 text-base outline-none transition-colors focus:border-[#15b79e]"
                style={{ background: 'rgba(255,255,255,0.09)', borderColor: 'rgba(255,255,255,0.16)', color: WHITE }}
              />
            ))}
          </div>
          <button disabled={!ready || busy}
            onClick={() => handleSubmit(contact)}
            className="mt-5 w-full rounded-xl py-4 text-sm font-extrabold text-white shadow-lg shadow-black/30 transition-all disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
            {busy ? String(p.busyLabel || 'Creating your login…') : String(p.cta || 'Finish')}
          </button>
        </div>
      );
    }

    case 'credentials': {
      return (
        <div className="rounded-3xl border p-6 text-center shadow-2xl shadow-black/40 sm:p-10" style={{ borderColor: 'rgba(21,183,158,0.4)', background: cardBg, backdropFilter: cardBlur, WebkitBackdropFilter: cardBlur }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg" style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ fontFamily: HEAD_FONT, color: WHITE }}>{f('heading') || 'Your Attenda login'}</h2>
          {p.body && !creds ? <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: WHITE_75 }}>{f('body')}</p> : null}

          {busy && !creds ? (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-bold" style={{ color: WHITE_75 }}>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: TEAL_BRIGHT, borderTopColor: 'transparent' }} />
              Creating your account…
            </div>
          ) : null}

          {creds ? (
            <div className="mt-6 space-y-3 text-left">
              <CredRow label="Username" value={creds.username} />
              {creds.password ? (
                <CredRow label="Password" value={creds.password} mono />
              ) : (
                <p className="rounded-xl border px-4 py-3 text-xs leading-relaxed" style={{ borderColor: GLASS_BORDER, background: 'rgba(255,255,255,0.05)', color: WHITE_75 }}>
                  You already have an Attenda account. Sign in with your email and your existing password.
                </p>
              )}
              <p className="pt-1 text-center text-[11px]" style={{ color: WHITE_60 }}>
                {creds.password ? 'Saved to your email too. Keep it safe — see you inside.' : 'See you inside.'}
              </p>
            </div>
          ) : null}

          <a href="/corporate"
            className="mt-6 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-extrabold text-white shadow-xl shadow-black/40 transition-transform hover:scale-[1.04]"
            style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
            Enter Attenda <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      );
    }

    case 'cta':
      return (
        <div className="text-center">
          <a href={String(p.href || '#')} onClick={() => markComplete()}
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-extrabold text-white shadow-2xl shadow-black/40 transition-transform hover:scale-[1.04]"
            style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
            {f('label') || 'Continue'} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      );

    case 'divider':
      return <div className="mx-auto h-px w-24" style={{ background: 'rgba(255,255,255,0.25)' }} />;

    case 'confirm':
      return (
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full shadow-xl shadow-black/40" style={{ background: `linear-gradient(135deg, ${TEAL_BRIGHT}, ${TEAL})` }}>
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: HEAD_FONT, color: WHITE, textShadow: '0 2px 40px rgba(0,0,0,0.55)' }}>{f('heading') || 'You are in.'}</h2>
          {p.body ? <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed" style={{ color: WHITE_85 }}>{f('body')}</p> : null}
        </div>
      );

    default:
      return null;
  }
}

function CredRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* noop */ }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3" style={{ borderColor: GLASS_BORDER, background: 'rgba(255,255,255,0.06)' }}>
      <div className="min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.28em]" style={{ color: WHITE_45 }}>{label}</div>
        <div className="mt-0.5 truncate text-sm font-bold" style={{ fontFamily: mono ? MONO : HEAD_FONT, color: WHITE }}>{value}</div>
      </div>
      <button onClick={copy} className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold transition-colors hover:border-[#15b79e]" style={{ borderColor: GLASS_BORDER, color: WHITE_75 }}>
        {copied ? <Check className="h-3.5 w-3.5" style={{ color: TEAL_BRIGHT }} /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/* ───────────── client-only styling: fonts, scenes, grain (SSR-safe) ───────────── */
if (typeof document !== 'undefined') {
  if (!document.getElementById('exf-fonts')) {
    const link = document.createElement('link');
    link.id = 'exf-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Instrument+Serif:ital,wght@1,400&display=swap';
    document.head.appendChild(link);
  }
  if (!document.getElementById('exf-style')) {
    const style = document.createElement('style');
    style.textContent = `
@keyframes exf{from{opacity:0;transform:translateY(26px) scale(.985);filter:blur(10px)}to{opacity:1;transform:none;filter:blur(0)}}
.anim-scene{animation:exf .7s cubic-bezier(.22,.61,.36,1) both}
@keyframes exf-kb{0%{transform:scale(1.03) translateY(0)}100%{transform:scale(1.14) translateY(-2%)}}
.exf-kb{animation:exf-kb 20s ease-out both}
.exf-bgfade{transition:opacity 1.2s ease}
.exf-grain{position:fixed;inset:0;pointer-events:none;z-index:50;opacity:.07;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='0.5'/></svg>");background-size:160px 160px}
.exf-vignette{position:fixed;inset:0;pointer-events:none;z-index:40;background:radial-gradient(120% 90% at 50% 40%, transparent 52%, rgba(0,0,0,.55) 100%)}
.exf-input::placeholder{color:rgba(255,255,255,.45)}
@media (prefers-reduced-motion: reduce){.exf-kb,.anim-scene{animation:none}.exf-bgfade{transition:none}}
`;
    style.id = 'exf-style';
    document.head.appendChild(style);
  }
}