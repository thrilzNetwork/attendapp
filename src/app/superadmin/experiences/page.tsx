'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Plus, RefreshCw, Copy, Check, Trash2, ArrowUp, ArrowDown, PencilLine,
  Monitor, Smartphone, Globe, Eye, EyeOff, Save, ExternalLink,
} from 'lucide-react';
import ExperienceViewer, { ExperienceBlock, ExperienceBlockType } from '@/components/experience/ExperienceViewer';

/**
 * Experience Builder — Attenda Experience Engine control surface.
 * Lives at /superadmin/experiences. Own auth gate (same session as /superadmin).
 */

const TEAL = '#158A7C';

type Analytics = { views: number; starts: number; completes: number; submits: number; completionPct: number; lastActivity: string | null };
type Experience = {
  id: string; slug: string; type: string; title: string; subtitle: string | null;
  mode: 'interactive' | 'presentation' | 'hybrid'; blocks: ExperienceBlock[];
  published: boolean; updated_at: string; analytics?: Analytics;
};

const BLOCK_TYPES: { type: ExperienceBlockType; label: string }[] = [
  { type: 'hero', label: 'Hero' }, { type: 'text', label: 'Text' }, { type: 'image', label: 'Image' },
  { type: 'video', label: 'Video' }, { type: 'stat', label: 'Statistic' }, { type: 'features', label: 'Features' },
  { type: 'quote', label: 'Quote' }, { type: 'question', label: 'Question' }, { type: 'mc', label: 'Multiple choice' },
  { type: 'contact', label: 'Contact' }, { type: 'cta', label: 'CTA' }, { type: 'divider', label: 'Divider' },
  { type: 'confirm', label: 'Confirmation' },
];

const uid = () => `b${Math.random().toString(36).slice(2, 9)}`;

export default function ExperiencesBuilderPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'checking' | 'ready' | 'denied'>('checking');
  const [exps, setExps] = useState<Experience[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [sel, setSel] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({ slug: '', title: '', type: 'onboarding' });
  const [err, setErr] = useState('');

  const token = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    return s.session?.access_token || null;
  }, []);

  const load = useCallback(async () => {
    const t = await token();
    if (!t) { router.replace('/superadmin'); return; }
    const r = await fetch('/api/experience', { headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) { setMode('denied'); router.replace('/superadmin'); return; }
    const j = await r.json();
    setExps(j.experiences || []);
    if (!selId && j.experiences?.length) setSelId(j.experiences[0].id);
    setMode('ready');
    setLoading(false);
  }, [router, token, selId]);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (!selId) return;
    setSel(exps.find((e) => e.id === selId) || null);
  }, [selId, exps]);

  const save = async () => {
    if (!sel) return;
    setSaving(true);
    const t = await token();
    await fetch('/api/experience', {
      method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: sel.id, title: sel.title, subtitle: sel.subtitle, mode: sel.mode, blocks: sel.blocks }),
    });
    setSaving(false);
    load();
  };

  const act = async (body: Record<string, unknown>) => {
    const t = await token();
    const r = await fetch('/api/experience', {
      method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Failed');
    load();
  };

  /* ── block ops ── */
  const updBlock = (id: string, props: Record<string, unknown>) => {
    if (!sel) return;
    setSel({ ...sel, blocks: sel.blocks.map((b) => (b.id === id ? { ...b, props } : b)) });
  };
  const moveBlock = (i: number, dir: -1 | 1) => {
    if (!sel) return;
    const nb = [...sel.blocks];
    const j = i + dir;
    if (j < 0 || j >= nb.length) return;
    [nb[i], nb[j]] = [nb[j], nb[i]];
    setSel({ ...sel, blocks: nb });
  };
  const delBlock = (id: string) => {
    if (!sel) return;
    setSel({ ...sel, blocks: sel.blocks.filter((b) => b.id !== id) });
  };
  const dupBlock = (i: number) => {
    if (!sel) return;
    const nb = [...sel.blocks];
    nb.splice(i + 1, 0, { ...nb[i], id: uid() });
    setSel({ ...sel, blocks: nb });
  };
  const addBlock = (type: ExperienceBlockType) => {
    if (!sel) return;
    const base: Record<string, unknown> =
      type === 'hero' ? { eyebrow: 'ATTENDA', title: 'New hero', subtitle: '' } :
      type === 'text' ? { heading: 'Heading', body: 'Body copy…' } :
      type === 'stat' ? { value: '74.4 → 80+', label: 'Label', secondary: '' } :
      type === 'features' ? { items: [{ title: 'Feature', body: 'What it does' }] } :
      type === 'quote' ? { body: 'Quote…', author: 'Name' } :
      type === 'question' ? { question: 'Ask something…', placeholder: 'Answer…' } :
      type === 'mc' ? { question: 'Pick one', options: ['Option A', 'Option B'] } :
      type === 'contact' ? { heading: 'Your details', fields: ['name', 'email'] } :
      type === 'cta' ? { label: 'Continue', href: '/corporate' } :
      type === 'confirm' ? { heading: 'You are in.', body: 'What happens next…' } :
      type === 'image' ? { src: '', alt: '' } :
      type === 'video' ? { url: '' } : {};
    setSel({ ...sel, blocks: [...sel.blocks, { id: uid(), type, props: base }] });
    setShowAdd(false);
  };

  /* ── gate ── */
  if (mode === 'checking' || mode === 'denied') {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">Checking access…</div>;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white text-[13px]" style={{ background: TEAL }}>A</div>
          <div>
            <h1 className="text-[15px] font-extrabold text-gray-900">Experience Builder</h1>
            <p className="text-[10px] text-gray-400">Attenda Experience Engine · presentations, onboarding, partners</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadHealthNoop(); }} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:bg-gray-100">
            <RefreshCw size={12} /> Refresh
          </button>
          <a href="/superadmin" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:bg-gray-100">
            ← Control Center
          </a>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white" style={{ background: TEAL }}>
            <Plus size={12} /> New experience
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-60px)]">
        {/* list */}
        <div className="w-64 shrink-0 overflow-y-auto border-r border-gray-100 bg-white p-3">
          {loading && <div className="p-3 text-[12px] text-gray-400">Loading…</div>}
          {exps.map((e) => (
            <button key={e.id} onClick={() => setSelId(e.id)}
              className={`mb-2 w-full rounded-xl p-3 text-left transition-all ${selId === e.id ? 'bg-teal-50 ring-1 ring-teal-200' : 'hover:bg-gray-50'}`}>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${e.published ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                <span className="truncate text-[12px] font-extrabold text-gray-800">{e.title}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500">{e.type}</span>
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-400">{e.mode}</span>
              </div>
              <div className="mt-1.5 text-[10px] text-gray-400">
                {e.analytics ? `${e.analytics.views} views → ${e.analytics.completionPct}% complete` : 'No activity yet'}
              </div>
            </button>
          ))}
          {!loading && !exps.length && <div className="p-3 text-[12px] text-gray-400">No experiences yet.</div>}
        </div>

        {/* editor + preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* editor */}
          <div className="w-[420px] shrink-0 overflow-y-auto p-4">
            {sel && (
              <>
                <div className="mb-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Title</label>
                  <input value={sel.title} onChange={(e) => setSel({ ...sel, title: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-gray-50 px-3 py-2 text-[13px] outline-none focus:border-teal-400 border border-gray-100" />
                  <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Subtitle</label>
                  <input value={sel.subtitle || ''} onChange={(e) => setSel({ ...sel, subtitle: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-gray-50 px-3 py-2 text-[13px] outline-none focus:border-teal-400 border border-gray-100" />
                  <div className="mt-3 flex items-center gap-2">
                    <select value={sel.mode} onChange={(e) => setSel({ ...sel, mode: e.target.value as Experience['mode'] })}
                      className="flex-1 rounded-xl bg-gray-50 px-3 py-2 text-[12px] outline-none border border-gray-100">
                      <option value="hybrid">Hybrid (story + steps)</option>
                      <option value="interactive">Interactive (one beat/screen)</option>
                      <option value="presentation">Presentation (scroll story)</option>
                    </select>
                    <button onClick={() => act({ action: 'publish', id: sel.id, published: !sel.published })}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold ${sel.published ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {sel.published ? <Eye size={12} /> : <EyeOff size={12} />} {sel.published ? 'Live' : 'Draft'}
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={save} disabled={saving} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] font-extrabold text-white" style={{ background: TEAL }}>
                      <Save size={12} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => act({ action: 'duplicate', id: sel.id }).catch((e2) => setErr(String(e2)))} className="rounded-xl bg-gray-100 px-3 py-2.5 text-[11px] font-bold text-gray-600">Duplicate</button>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/e/${sel.slug}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-xl bg-gray-100 px-3 py-2.5 text-[11px] font-bold text-gray-600">
                      {copied ? <Check size={12} /> : <Copy size={12} />} Link
                    </button>
                    <button onClick={() => { if (confirm(`Delete "${sel.title}"? This cannot be undone.`)) act({ action: 'delete', id: sel.id }).catch((e2) => setErr(String(e2))); }} className="rounded-xl bg-red-50 px-3 py-2.5 text-[11px] font-bold text-red-600">Delete</button>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-400">Public link: <span className="font-mono">/e/{sel.slug}</span></div>
                  {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600">{err}</div>}
                </div>

                {/* blocks */}
                <div className="space-y-2">
                  {sel.blocks.map((b, i) => (
                    <div key={b.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider" style={{ color: TEAL }}>{b.type}</span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => moveBlock(i, -1)} className="p-1 text-gray-300 hover:text-gray-600"><ArrowUp size={12} /></button>
                          <button onClick={() => moveBlock(i, 1)} className="p-1 text-gray-300 hover:text-gray-600"><ArrowDown size={12} /></button>
                          <button onClick={() => dupBlock(i)} className="p-1 text-gray-300 hover:text-gray-600"><Copy size={12} /></button>
                          <button onClick={() => delBlock(b.id)} className="p-1 text-gray-300 hover:text-red-500"><TrashIcon size={12} /></button>
                        </div>
                      </div>
                      <BlockEditor block={b} updBlock={updBlock} />
                    </div>
                  ))}
                  <button onClick={() => setShowAdd(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-3 text-[11px] font-bold text-gray-400 hover:border-teal-300 hover:text-teal-600">
                    <Plus size={12} /> Add block
                  </button>
                </div>
              </>
            )}
            {!sel && !loading && <div className="p-4 text-[12px] text-gray-400">Select an experience to edit.</div>}
          </div>

          {/* preview */}
          <div className="flex flex-1 flex-col bg-gray-100 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Live preview</span>
              <div className="ml-auto flex rounded-lg bg-white p-0.5 shadow-sm">
                <button onClick={() => setDevice('desktop')} className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold ${device === 'desktop' ? 'bg-gray-900 text-white' : 'text-gray-400'}`}><Monitor size={11} /> Desktop</button>
                <button onClick={() => setDevice('mobile')} className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold ${device === 'mobile' ? 'bg-gray-900 text-white' : 'text-gray-400'}`}><Smartphone size={11} /> Mobile</button>
              </div>
              {sel && (
                <a href={`/e/${sel.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-gray-500 shadow-sm">
                  <ExternalLinkIcon size={11} /> Open public
                </a>
              )}
            </div>
            <div className="flex flex-1 items-start justify-center overflow-hidden">
              {sel ? (
                <div className={device === 'mobile' ? 'h-full w-[390px] overflow-hidden rounded-[2rem] shadow-2xl ring-8 ring-gray-900/90' : 'h-full w-full overflow-hidden rounded-2xl shadow-xl'}>
                  <ExperienceViewer
                    key={`${sel.id}-${sel.blocks.length}-${sel.mode}`}
                    title={sel.title} subtitle={sel.subtitle} mode={sel.mode} blocks={sel.blocks} embedded
                  />
                </div>
              ) : (
                <div className="text-[12px] text-gray-400">Nothing selected.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* new experience modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 text-[15px] font-extrabold text-gray-900">New experience</div>
            <div className="space-y-2.5">
              <input value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="Title (e.g. Partner Intro)"
                className="w-full rounded-xl bg-gray-50 px-3.5 py-2.5 text-sm outline-none border border-gray-100 focus:border-teal-400" />
              <input value={newForm.slug} onChange={(e) => setNewForm({ ...newForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                placeholder="slug-for-link" className="w-full rounded-xl bg-gray-50 px-3.5 py-2.5 font-mono text-sm outline-none border border-gray-100 focus:border-teal-400" />
              <select value={newForm.type} onChange={(e) => setNewForm({ ...newForm, type: e.target.value })} className="w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none border border-gray-100">
                <option value="onboarding">Corporate onboarding</option>
                <option value="talent">Talent</option>
                <option value="partner">Partner</option>
                <option value="client">Client / hotel</option>
              </select>
              <button onClick={async () => {
                try {
                  const t2 = await token();
                  const r = await fetch('/api/experience', {
                    method: 'POST', headers: { Authorization: `Bearer ${t2}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'create', slug: newForm.slug, title: newForm.title, type: newForm.type }),
                  });
                  const j = await r.json();
                  if (!r.ok) throw new Error(j.error);
                  setShowAdd(false);
                  setNewForm({ slug: '', title: '', type: 'onboarding' });
                  load();
                } catch (e2) { setErr(String((e2 as Error).message)); }
              }} disabled={!newForm.slug || !newForm.title}
                className="w-full rounded-xl py-3 text-sm font-extrabold text-white disabled:opacity-40" style={{ background: TEAL }}>
                Create experience
              </button>
            </div>
          </div>
        </div>
      )}

      {/* add block modal */}
      {showAdd && sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 text-[15px] font-extrabold text-gray-900">Add block</div>
            <div className="grid grid-cols-3 gap-2">
              {BLOCK_TYPES.map((bt) => (
                <button key={bt.type} onClick={() => addBlock(bt.type)} className="rounded-xl bg-gray-50 px-2 py-3 text-[11px] font-bold text-gray-600 hover:bg-teal-50 hover:text-teal-700">
                  {bt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function loadHealthNoop() { /* refresh handled by load() */ }

function BlockEditor({ block, updBlock }: { block: ExperienceBlock; updBlock: (id: string, props: Record<string, unknown>) => void }) {
  const p = block.props || {};
  const F = ({ label, value, onChange, mono }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) => (
    <div className="mb-1.5">
      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className={`mt-0.5 w-full rounded-lg bg-gray-50 px-2.5 py-1.5 text-[12px] outline-none border border-gray-100 focus:border-teal-400 ${mono ? 'font-mono' : ''}`} />
    </div>
  );
  const TA = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="mb-1.5">
      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
        className="mt-0.5 w-full rounded-lg bg-gray-50 px-2.5 py-1.5 text-[12px] outline-none border border-gray-100 focus:border-teal-400" />
    </div>
  );
  const set = (k: string, v: unknown) => updBlock(block.id, { ...p, [k]: v });

  switch (block.type) {
    case 'hero': return <><F label="Eyebrow" value={String(p.eyebrow || '')} onChange={(v) => set('eyebrow', v)} /><F label="Title" value={String(p.title || '')} onChange={(v) => set('title', v)} /><F label="Subtitle" value={String(p.subtitle || '')} onChange={(v) => set('subtitle', v)} /></>;
    case 'text': return <><F label="Heading" value={String(p.heading || '')} onChange={(v) => set('heading', v)} /><TA label="Body" value={String(p.body || '')} onChange={(v) => set('body', v)} /></>;
    case 'image': return <><F label="Image URL" mono value={String(p.src || '')} onChange={(v) => set('src', v)} /><F label="Alt" value={String(p.alt || '')} onChange={(v) => set('alt', v)} /></>;
    case 'video': return <F label="Embed URL" mono value={String(p.url || '')} onChange={(v) => set('url', v)} />;
    case 'stat': return <><F label="Value" value={String(p.value || '')} onChange={(v) => set('value', v)} /><F label="Label" value={String(p.label || '')} onChange={(v) => set('label', v)} /><F label="Secondary" value={String(p.secondary || '')} onChange={(v) => set('secondary', v)} /></>;
    case 'features': return <TA label="Items (one per line: Title | Body)" value={(Array.isArray(p.items) ? p.items : []).map((it: { title?: string; body?: string }) => `${it.title || ''} | ${it.body || ''}`).join('\n')} onChange={(v) => set('items', v.split('\n').filter(Boolean).map((l) => { const [t, ...rest] = l.split('|'); return { title: (t || '').trim(), body: rest.join('|').trim() }; }))} />;
    case 'quote': return <><TA label="Quote" value={String(p.body || '')} onChange={(v) => set('body', v)} /><F label="Author" value={String(p.author || '')} onChange={(v) => set('author', v)} /></>;
    case 'question': return <><F label="Question" value={String(p.question || '')} onChange={(v) => set('question', v)} /><F label="Placeholder" value={String(p.placeholder || '')} onChange={(v) => set('placeholder', v)} /></>;
    case 'mc': return <><F label="Question" value={String(p.question || '')} onChange={(v) => set('question', v)} /><TA label="Options (one per line)" value={(Array.isArray(p.options) ? p.options : []).join('\n')} onChange={(v) => set('options', v.split('\n').filter(Boolean))} /></>;
    case 'contact': return <><F label="Heading" value={String(p.heading || '')} onChange={(v) => set('heading', v)} /><F label="Fields (comma: name,email,phone,position)" value={(Array.isArray(p.fields) ? p.fields : []).join(',')} onChange={(v) => set('fields', v.split(',').map((x) => x.trim()).filter(Boolean))} /></>;
    case 'cta': return <><F label="Label" value={String(p.label || '')} onChange={(v) => set('label', v)} /><F label="Href" mono value={String(p.href || '')} onChange={(v) => set('href', v)} /></>;
    case 'confirm': return <><F label="Heading" value={String(p.heading || '')} onChange={(v) => set('heading', v)} /><TA label="Body" value={String(p.body || '')} onChange={(v) => set('body', v)} /></>;
    default: return <div className="text-[10px] text-gray-300">No settings</div>;
  }
}

function TrashIcon({ size }: { size: number }) { return <PencilLine size={size} className="hidden" />; }
function ExternalLinkIcon({ size }: { size: number }) { return <Globe size={size} />; }