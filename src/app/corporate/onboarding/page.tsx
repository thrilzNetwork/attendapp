'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check, ChevronRight, Loader2, Lock, Sparkles, Building2, ClipboardCheck, ListChecks,
} from 'lucide-react';

const TEAL = '#158A7C';

type Page = { slug: string; title: string; audience: string; body: string; sort_order: number };
type Me = {
  corporate: boolean;
  user: { name: string; onboarding_completed: boolean; confirmed_position: string | null } | null;
  authorizedPositions: { key: string; title: string }[];
  confirmedPosition: string | null;
  onboardingCompleted: boolean;
};

function Markdownish({ text }: { text: string }) {
  const blocks = text.split('\n').filter((l) => l.trim() !== '');
  return (
    <div className="space-y-3">
      {blocks.map((line, i) => {
        const clean = line.replace(/\*\*(.+?)\*\*/g, (_, b) => b); // bold stripped; styled below
        const isBoldOnly = /^\*\*.+\*\*:?$/.test(line.trim());
        const numbered = /^(\d+)\.\s+(.*)$/.exec(clean);
        const bulleted = /^-\s+(.*)$/.exec(clean);
        const html = clean
          .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0E6B60;font-weight:600">$1</strong>')
          .replace(/"(.+?)"/g, '"$1"');
        if (numbered) {
          return (
            <div key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white mt-0.5" style={{ background: TEAL }}>{numbered[1]}</span>
              <span className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: numbered[2] }} />
            </div>
          );
        }
        if (bulleted) {
          return (
            <div key={i} className="flex gap-3">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TEAL }} />
              <span className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: bulleted[1] }} />
            </div>
          );
        }
        return <p key={i} className={isBoldOnly ? 'font-semibold' : 'text-gray-700 leading-relaxed'} dangerouslySetInnerHTML={{ __html: clean }} />;
      })}
    </div>
  );
}

export default function CorporateOnboarding() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [progress, setProgress] = useState<string[]>([]);
  const [resp, setResp] = useState<{ position_key: string; title: string; detail: string }[]>([]);
  const [kpis, setKpis] = useState<{ position_key: string; name: string; target: string; unit: string; detail: string }[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data: sess } = await (await import('@/lib/supabase')).supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { router.replace('/corporate'); return; }
    const [meRes, obRes] = await Promise.all([
      fetch('/api/corporate/me', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/corporate/onboarding', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (!meRes.ok) { router.replace('/corporate'); return; }
    const meData = await meRes.json();
    const obData = await obRes.json();
    if (meData.onboardingCompleted) { router.replace('/corporate/my-day'); return; }
    setMe(meData);
    setPages(obData.pages || []);
    setProgress(obData.progress || []);
    setResp(obData.responsibilities || []);
    setKpis(obData.kpis || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const token = async () => (await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session?.access_token;

  const completeStep = async (slug: string) => {
    const t = await token();
    if (!t) return;
    setProgress((p) => (p.includes(slug) ? p : [...p, slug]));
    await fetch('/api/corporate/onboarding', {
      method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete-step', slug }),
    });
  };

  const confirmPosition = async (key: string) => {
    const t = await token();
    if (!t) return;
    const res = await fetch('/api/corporate/onboarding', {
      method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm-position', position_key: key }),
    });
    if (!res.ok) { setError('Position not authorized — contact the super admin.'); return; }
    setMe((m) => (m ? { ...m, confirmedPosition: key } : m));
  };

  const finish = async () => {
    setError('');
    setFinishing(true);
    const t = await token();
    if (!t) return;
    const res = await fetch('/api/corporate/onboarding', {
      method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.missing?.length) setError(`Some pages aren't marked done yet — flip back through and check them off.`);
      else if (res.status === 400 && data.error?.includes('Confirm')) setError('Confirm your position first.');
      else setError(data.error || 'Could not complete onboarding.');
      setFinishing(false);
      return;
    }
    router.replace('/corporate/my-day');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6FAF9]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  // ------- Position confirmation step (last step before finish) -------
  const positionStep = pages.length; // index of the confirm step
  const total = pages.length + 1;
  const isConfirmStep = idx === positionStep;
  const current = !isConfirmStep ? pages[idx] : null;
  const authorized = me?.authorizedPositions || [];
  const single = authorized.length === 1 ? authorized[0] : null;
  const doneCount = progress.length;
  const pct = Math.round((doneCount / Math.max(total - 1, 1)) * 100);

  const goNext = async () => {
    if (!isConfirmStep && current) {
      await completeStep(current.slug);
      setIdx((i) => Math.min(i + 1, total - 1));
      window.scrollTo({ top: 0 });
    } else {
      setIdx((i) => Math.min(i + 1, total - 1));
    }
  };

  return (
    <div className="min-h-screen bg-[#F6FAF9] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-teal-100">
        <div className="mx-auto max-w-2xl px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: TEAL }}>Attenda Corporate</div>
              <div className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                {isConfirmStep ? 'Confirm your position' : current?.title}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-500">{doneCount}/{total - 1} read</div>
              <div className="text-[10px] text-gray-400">Onboarding</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-teal-50">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#5ECFC0,#158A7C)' }} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-5">
        {/* Content page */}
        {current && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-teal-50 sm:p-6">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase"
              style={{ background: '#E8F4F1', color: TEAL }}>
              <Sparkles className="h-3 w-3" />
              {current.audience === 'universal' ? 'Everyone' : 'Your role'}
            </div>
            <Markdownish text={current.body} />

            {/* Role pages also show responsibilities + KPIs */}
            {current.audience !== 'universal' && (
              <div className="mt-6 space-y-4 border-t border-teal-50 pt-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: TEAL }}>
                    <ClipboardCheck className="h-4 w-4" /> Responsibilities
                  </div>
                  <div className="space-y-2">
                    {resp.filter((r) => r.position_key === current.audience).map((r) => (
                      <div key={r.title} className="rounded-xl bg-[#F6FAF9] p-3">
                        <div className="text-sm font-semibold text-gray-800">{r.title}</div>
                        <div className="text-xs text-gray-500">{r.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: TEAL }}>
                    <ListChecks className="h-4 w-4" /> KPIs you own
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {kpis.filter((k) => k.position_key === current.audience).map((k) => (
                      <div key={k.name} className="rounded-xl border border-teal-50 p-3">
                        <div className="text-sm font-semibold text-gray-800">{k.name}</div>
                        <div className="text-xs font-bold" style={{ color: TEAL }}>{k.target} <span className="font-normal text-gray-400">{k.unit}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirm-position step */}
        {isConfirmStep && (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-teal-50 sm:p-6">
            <div className="mb-1 text-sm text-gray-600">
              Your position was set by the super admin. Confirmation records your role for display —
              it never grants permissions.
            </div>
            {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="mt-4 space-y-3">
              {authorized.map((p) => {
                const selected = me?.confirmedPosition === p.key;
                return (
                  <button key={p.key} onClick={() => confirmPosition(p.key)}
                    className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition-all ${selected ? 'border-teal-500 bg-[#E8F4F1]' : 'border-gray-100 bg-white hover:border-teal-200'}`}>
                    <div>
                      <div className="font-bold text-gray-900">{p.title}</div>
                      <div className="text-xs text-gray-500">Authorized for you</div>
                    </div>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${selected ? 'text-white' : 'text-gray-300'}`}
                      style={selected ? { background: TEAL } : { border: '2px solid #d1d5db' }}>
                      {selected && <Check className="h-4 w-4" />}
                    </div>
                  </button>
                );
              })}
              {single && !me?.confirmedPosition && (
                <button onClick={() => confirmPosition(single.key)}
                  className="w-full rounded-2xl p-4 text-center text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, #3BBCAC, ${TEAL})` }}>
                  Confirm {single.title}
                </button>
              )}
              {!authorized.length && (
                <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                  <Lock className="h-4 w-4 shrink-0" />
                  No position authorized yet. The super admin must authorize you before you can continue.
                </div>
              )}
            </div>
          </div>
        )}

        {error && !isConfirmStep && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      </div>

      {/* Bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-teal-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <button disabled={idx === 0} onClick={() => { setIdx((i) => Math.max(i - 1, 0)); window.scrollTo({ top: 0 }); }}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 disabled:opacity-30">
            Back
          </button>
          <div className="flex items-center gap-2">
            {!isConfirmStep ? (
              <button onClick={goNext}
                className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                style={{ background: `linear-gradient(135deg, #3BBCAC, ${TEAL})` }}>
                {idx === total - 2 ? 'Last page' : 'Mark read'} <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={finish} disabled={finishing || !me?.confirmedPosition || !authorized.length}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, #3BBCAC, ${TEAL})` }}>
                {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                Enter Attenda Corporate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}