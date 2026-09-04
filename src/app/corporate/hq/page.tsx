'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Building2, Zap, Users, Bot, Wrench, MessagesSquare, Hammer, LayoutGrid,
  Check, ArrowLeft, LogOut, Send, AlertTriangle, CircleDollarSign, Sparkles, ShieldCheck,
} from 'lucide-react';

const TEAL = '#158A7C';
const INK = '#07231F';

type Capability = { key: string; name: string; why: string | null; coverage: string; maturity: string | null; sort_order: number | null };
type MyCap = { key: string; proficiency: string; accountable: boolean };
type Holder = { key: string; user_id: string; name: string | null; accountable: boolean; proficiency: string };
type Agent = { id: string; name: string; purpose: string | null; status: string; capabilities: string[] | null; tools: string[] | null; data_permissions: string | null; actions_permitted: string[] | null; actions_require_approval: string[] | null; supervisor_id: string | null; mine: boolean };
type Tool = { id: string; name: string; category: string | null; why: string | null; url: string | null; access_granted?: boolean; note?: string | null };
type Space = { id: string; kind: string; title: string; client_id: string | null };
type SpacePost = { id: string; space_id: string; kind: string; body: string; created_at: string; corporate_users: { name: string | null } | null; hq_agents: { name: string | null } | null };
type BuildingPost = { id: string; kind: string; title: string; body: string; created_at: string };
type Client = { id: string; slug: string; name: string; brand: string | null; rooms: number | null };
type ClientCap = { client_id: string; capability_key: string; owner_user_id: string | null; agent_id: string | null; notes: string | null; hq_capabilities: { name: string } | null; hq_agents: { name: string } | null; owner: { name: string | null } | null };
type Signal = { id: string; summary: string; status: string; source: string | null; created_at: string; client_id: string | null; capability_key: string | null; assigned_user_id: string | null; corporate_clients: { name: string } | null; hq_capabilities: { name: string } | null; hq_agents: { name: string } | null; assignee: { name: string | null } | null };
type Person = { id: string; name: string | null; title: string | null; status: string | null };
type Hq = {
  me: { id: string; name: string; status: string; isSuper: boolean };
  capabilities: Capability[];
  myCapabilities: MyCap[];
  capabilityHolders: Holder[];
  agents: Agent[];
  tools: Tool[];
  myTools: Tool[];
  spaces: Space[];
  spacePosts: SpacePost[];
  building: BuildingPost[];
  myClients: Client[];
  clientCapabilities: ClientCap[];
  signals: Signal[];
  people: Person[];
};

const COV_STYLE: Record<string, string> = {
  covered: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-amber-100 text-amber-800',
  gap: 'bg-red-100 text-red-700',
};
const COV_LABEL: Record<string, string> = { covered: 'COVERED', partial: 'PARTIAL', gap: 'GAP' };
const KIND_ICON: Record<string, string> = { now: '●', win: '▲', gap: '■', opportunity: '◆', update: '○' };

export default function Hq() {
  const router = useRouter();
  const [me, setMe] = useState<Hq['me'] | null>(null);
  const [hq, setHq] = useState<Hq | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spaceOpen, setSpaceOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [buildingDraft, setBuildingDraft] = useState({ title: '', body: '', kind: 'update' });
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) { router.replace('/corporate'); return; }
    const meRes = await fetch(`/api/corporate/me?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!meRes.ok) { router.replace('/corporate'); return; }
    const meData = await meRes.json();
    if (!meData.onboardingCompleted) { router.replace('/corporate/onboarding'); return; }
    const hqRes = await fetch(`/api/corporate/hq?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!hqRes.ok) { setError('HQ unavailable'); setLoading(false); return; }
    const d: Hq = await hqRes.json();
    setMe(d.me);
    setHq(d);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const act = async (payload: Record<string, unknown>, key: string) => {
    setActing(key);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      const r = await fetch('/api/corporate/hq', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); setError(e.error || 'Action failed'); }
      else { setError(null); await load(); }
    } finally { setActing(null); }
  };

  const postToSpace = async (spaceId: string) => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    await act({ action: 'post-space', space_id: spaceId, body: draft.trim() }, 'space');
    setDraft('');
    setPosting(false);
  };

  const signOut = async () => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.auth.signOut();
    router.replace('/corporate');
  };

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--mint, #E8F4F1)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: TEAL }} />
      </main>
    );
  }

  if (me && me.status === 'pending') {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6" style={{ background: '#E8F4F1' }}>
        <div className="max-w-sm w-full rounded-2xl bg-white p-6 shadow-sm text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: TEAL }} />
          <h1 className="font-semibold text-lg text-gray-900">HQ awaits your activation</h1>
          <p className="text-sm text-gray-500 mt-2">Your account is pending — Alejandro confirms new members from the admin console first.</p>
        </div>
      </main>
    );
  }

  const d = hq;
  if (!d || !me) return null;
  const mySigs = d.signals.filter((x) => x.status !== 'resolved');
  const myCaps = d.myCapabilities;
  const isSuper = me.isSuper;

  return (
    <main className="min-h-dvh pb-24" style={{ background: '#F4F7F6' }}>
      {/* Command bar */}
      <div className="sticky top-0 z-20" style={{ background: INK }}>
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-[0.2em] font-semibold" style={{ color: '#7FC8BE' }}>ATTENDA HQ</p>
              <h1 className="text-white font-bold text-lg leading-tight">The company, running</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/corporate/my-day')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full text-white/90 hover:bg-white/10 min-h-[36px]">
                <ArrowLeft className="w-3.5 h-3.5" /> My Day
              </button>
              <button onClick={signOut} className="p-2 rounded-full text-white/70 hover:bg-white/10 min-h-[36px] min-w-[36px] flex items-center justify-center" aria-label="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-white/50 mt-1">{me.name}{isSuper ? ' · Super Admin' : ''} · capabilities before titles</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-6 mt-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* SIGNALS — every signal has a path to action */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
            <Zap className="w-4 h-4" style={{ color: TEAL }} /> Signals needing attention
            {mySigs.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{mySigs.length}</span>}
          </h2>
          {mySigs.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white rounded-xl p-4">No open signals. Quiet building.</p>
          ) : (
            <div className="space-y-2">
              {mySigs.map((sig) => (
                <div key={sig.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] tracking-wide font-semibold text-gray-400 uppercase">
                        {sig.hq_capabilities?.name || sig.capability_key || 'Signal'}{sig.corporate_clients?.name ? ` · ${sig.corporate_clients.name}` : ''}
                      </p>
                      <p className="text-sm text-gray-800 mt-0.5">{sig.summary}</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {sig.source === 'agent' ? `Agent: ${sig.hq_agents?.name || 'AI'}` : 'Property signal'} · {sig.status}
                      </p>
                    </div>
                    <button
                      disabled={acting === sig.id}
                      onClick={() => act({ action: 'act-signal', signal_id: sig.id, status: 'resolved' }, sig.id)}
                      className="shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-full text-white disabled:opacity-50 min-h-[36px]"
                      style={{ background: TEAL }}
                    >
                      {acting === sig.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* MY CAPABILITIES */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2"><Users className="w-4 h-4" style={{ color: TEAL }} /> My capabilities</h2>
          {myCaps.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white rounded-xl p-4">No capabilities assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {myCaps.map((c) => {
                const cap = d.capabilities.find((x) => x.key === c.key);
                return (
                  <div key={c.key} className="bg-white rounded-full pl-4 pr-2 py-2 shadow-sm border border-gray-100 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{cap?.name || c.key}</span>
                    {c.accountable && <ShieldCheck className="w-3.5 h-3.5" style={{ color: TEAL }} />}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">{c.proficiency}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* MY CLIENTS → WORKSPACES */}
        {d.myClients.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2"><Building2 className="w-4 h-4" style={{ color: TEAL }} /> My clients</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {d.myClients.map((c) => (
                <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                  <p className="text-[11px] text-gray-500">{c.brand || 'Client'}{c.rooms ? ` · ${c.rooms} rooms` : ''}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{d.clientCapabilities.filter((cc) => cc.client_id === c.id).length} capabilities mapped</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MY AGENTS */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2"><Bot className="w-4 h-4" style={{ color: TEAL }} /> AI agents {isSuper ? `(${d.agents.length})` : 'extending my work'}</h2>
          <div className="space-y-2">
            {(isSuper ? d.agents : d.agents.filter((a) => a.mine)).map((a) => (
              <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">{a.status}</span>
                </div>
                <p className="text-[13px] text-gray-600 mt-1">{a.purpose}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(a.tools || []).map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">{t}</span>)}
                </div>
                {isSuper && (a.actions_require_approval || []).length > 0 && (
                  <p className="text-[11px] text-amber-700 mt-2">⚠ Requires approval: {(a.actions_require_approval || []).join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* MY TOOLS */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2"><Wrench className="w-4 h-4" style={{ color: TEAL }} /> My tools</h2>
          {d.myTools.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white rounded-xl p-4">No tool access assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {d.myTools.map((t) => (
                <div key={t.id} className="bg-white rounded-full px-4 py-2 shadow-sm border border-gray-100 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{t.name}</span>
                  {t.access_granted && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SPACES */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2"><MessagesSquare className="w-4 h-4" style={{ color: TEAL }} /> Spaces</h2>
          <div className="space-y-2">
            {d.spaces.map((s) => {
              const posts = d.spacePosts.filter((p) => p.space_id === s.id);
              const open = spaceOpen === s.id;
              return (
                <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <button onClick={() => setSpaceOpen(open ? null : s.id)} className="w-full flex items-center justify-between px-4 py-3 text-left min-h-[48px]">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                      <p className="text-[11px] text-gray-400">{s.kind === 'client' ? 'Client workspace' : 'Company space'} · {posts.length} posts</p>
                    </div>
                    <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-3">
                      {posts.map((p) => (
                        <div key={p.id} className="rounded-lg bg-gray-50 p-3">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase">
                            {p.corporate_users?.name || (p.hq_agents?.name ? `Agent · ${p.hq_agents.name}` : 'Member')} · {new Date(p.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-[13px] text-gray-700 mt-1 whitespace-pre-wrap">{p.body}</p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') postToSpace(s.id); }}
                          placeholder="Post an update…"
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-teal-600/30"
                        />
                        <button
                          onClick={() => postToSpace(s.id)}
                          disabled={posting || !draft.trim()}
                          className="px-4 rounded-lg text-white disabled:opacity-40 flex items-center min-h-[44px]"
                          style={{ background: TEAL }}
                        >
                          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CAPABILITY LIBRARY */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2"><LayoutGrid className="w-4 h-4" style={{ color: TEAL }} /> Capability library
            <span className="text-[11px] font-normal text-gray-400">tap coverage to cycle{isSuper ? '' : ' (super admin)'}</span>
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {d.capabilities.map((cap) => {
              const holders = d.capabilityHolders.filter((h) => h.key === cap.key);
              const accountable = holders.find((h) => h.accountable);
              const canEdit = isSuper && (me.status || 'active') !== 'pending';
              return (
                <div key={cap.key} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{cap.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {accountable ? `Owner: ${accountable.name}` : holders.length ? `${holders.length} capable` : 'No capable humans yet'}
                        {cap.maturity ? ` · ${cap.maturity}` : ''}
                      </p>
                    </div>
                    <button
                      disabled={!canEdit || acting === `cov-${cap.key}`}
                      onClick={() => {
                        const next = cap.coverage === 'covered' ? 'partial' : cap.coverage === 'partial' ? 'gap' : 'covered';
                        act({ action: 'set-coverage', capability_key: cap.key, coverage: next }, `cov-${cap.key}`);
                      }}
                      className={`shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-full ${COV_STYLE[cap.coverage] || COV_STYLE.gap} disabled:opacity-70`}
                    >
                      {acting === `cov-${cap.key}` ? '…' : COV_LABEL[cap.coverage] || 'GAP'}
                    </button>
                  </div>
                  {cap.why && <p className="text-[12px] text-gray-500 mt-1">{cap.why}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* BUILDING ATTENDA */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2"><Hammer className="w-4 h-4" style={{ color: TEAL }} /> Building Attenda</h2>
          <div className="space-y-2">
            {d.building.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-[10px] font-bold tracking-wide uppercase" style={{ color: TEAL }}>{p.kind}</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{p.title}</p>
                <p className="text-[13px] text-gray-600 mt-1">{p.body}</p>
              </div>
            ))}
          </div>
          {isSuper && (
            <div className="mt-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
              <input
                value={buildingDraft.title}
                onChange={(e) => setBuildingDraft({ ...buildingDraft, title: e.target.value })}
                placeholder="Title — what changed in the company?"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-teal-600/30"
              />
              <textarea
                value={buildingDraft.body}
                onChange={(e) => setBuildingDraft({ ...buildingDraft, body: e.target.value })}
                placeholder="Detail…"
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30"
              />
              <div className="flex gap-2">
                <select
                  value={buildingDraft.kind}
                  onChange={(e) => setBuildingDraft({ ...buildingDraft, kind: e.target.value })}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white min-h-[44px]"
                >
                  <option value="update">Update</option>
                  <option value="now">Now</option>
                  <option value="win">Win</option>
                  <option value="gap">Gap</option>
                  <option value="opportunity">Opportunity</option>
                </select>
                <button
                  disabled={!buildingDraft.title.trim() || acting === 'building'}
                  onClick={async () => {
                    await act({ action: 'post-building', ...buildingDraft }, 'building');
                    setBuildingDraft({ title: '', body: '', kind: 'update' });
                  }}
                  className="flex-1 rounded-lg text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 min-h-[44px]"
                  style={{ background: INK }}
                >
                  {acting === 'building' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post to company
                </button>
              </div>
            </div>
          )}
        </section>

        {/* PEOPLE (super admin) */}
        {isSuper && d.people.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2"><Users className="w-4 h-4" style={{ color: TEAL }} /> People</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
              {d.people.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name || p.title || 'Member'}</p>
                    <p className="text-[11px] text-gray-400">{p.title || '—'}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {p.status || 'active'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-[11px] text-gray-400 pt-2 pb-6">
          Capabilities before titles · Information follows responsibility · AI multiplies human capability
        </p>
      </div>
    </main>
  );
}