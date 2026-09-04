'use client';

/**
 * HqPanel — the Attenda HQ operating layer as an embedded component.
 * Rendered inside the Corporate scope of my-day (one system, not two).
 * Own data fetch: /api/corporate/hq (GET) + POST actions. No shell/bar —
 * the host page provides the command bar and navigation.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2, Building2, Zap, Users, Bot, Wrench, MessagesSquare, Hammer, LayoutGrid,
  Check, Send, ClipboardCheck, ShieldCheck, Flag, ArrowRight,
} from 'lucide-react';

const TEAL = '#006077';
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
type WorkTask = { id: string; title: string; status: string; due_date: string | null; priority: string | null; client_id: string | null; client: { name: string } | null };
type TeamA = { client_id: string; corporate_users: { name: string | null; title: string | null } | { name: string | null; title: string | null }[] | null };
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
  myTasks: WorkTask[];
  teamAssignments: TeamA[];
  allClients: Client[];
};

const COV_STYLE: Record<string, string> = {
  covered: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-amber-100 text-amber-800',
  gap: 'bg-red-100 text-red-700',
};
const COV_LABEL: Record<string, string> = { covered: 'COVERED', partial: 'PARTIAL', gap: 'GAP' };
const KIND_ICON: Record<string, string> = { now: '●', win: '▲', gap: '■', opportunity: '◆', update: '○' };

export default function HqPanel() {
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
    if (!token) { setError('Session expired'); setLoading(false); return; }
    const hqRes = await fetch(`/api/corporate/hq?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!hqRes.ok) { setError(`HQ unavailable (${hqRes.status})`); setLoading(false); return; }
    const d: Hq = await hqRes.json();
    setHq(d);
    setLoading(false);
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: TEAL }} /> Loading HQ…
      </div>
    );
  }
  if (error && !hq) {
    return (
      <div className="rounded-3xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100 flex items-center justify-between gap-3">
        <span>{error}</span>
        <button onClick={() => { setError(null); setLoading(true); load(); }} className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[11px] font-bold ring-1 ring-red-200" style={{ color: '#b91c1c' }}>Retry</button>
      </div>
    );
  }

  const d = hq;
  if (!d) return null;
  const mySigs = d.signals.filter((x) => x.status !== 'resolved');
  const myCaps = d.myCapabilities;
  const isSuper = d.me.isSuper;
  const todayISO = new Date().toISOString().slice(0, 10);
  const overdueCount = d.myTasks.filter((t) => t.due_date && t.due_date < todayISO).length;
  const pulse = [
    { label: isSuper ? 'Hotels' : 'My clients', n: isSuper ? d.allClients.length : d.myClients.length },
    { label: 'Open signals', n: mySigs.length, warn: mySigs.length > 0 },
    ...(isSuper ? [{ label: 'Pending people', n: d.people.filter((p) => p.status === 'pending').length, warn: d.people.some((p) => p.status === 'pending') }] : [{ label: 'Spaces', n: d.spaces.length }]),
    { label: 'Capability gaps', n: d.capabilities.filter((c) => c.coverage === 'gap').length, warn: d.capabilities.some((c) => c.coverage === 'gap') },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* §3 NEEDS YOUR ATTENTION — priority feed: signals + overdue */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
          <Zap className="w-4 h-4" style={{ color: TEAL }} /> Needs your attention
          {mySigs.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{mySigs.length}</span>}
        </h2>
        {mySigs.length === 0 && overdueCount === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl p-4">Nothing needs you right now. Quiet building.</p>
        ) : (
          <div className="space-y-2">
            {overdueCount > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100" style={{ borderLeft: '3px solid #B45309' }}>
                <p className="text-[10px] tracking-wide font-semibold text-gray-400 uppercase">My work</p>
                <p className="text-sm text-gray-800 mt-0.5">{overdueCount} task{overdueCount > 1 ? 's' : ''} overdue — see Today below</p>
              </div>
            )}
            {mySigs.map((sig) => (
              <div key={sig.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
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

      {/* §3 TODAY — priorities, deadlines, follow-ups */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
          <ClipboardCheck className="w-4 h-4" style={{ color: TEAL }} /> Today
          {overdueCount > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{overdueCount} overdue</span>}
        </h2>
        {d.myTasks.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl p-4">Nothing assigned. Clear day.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {d.myTasks.map((t) => {
              const late = t.due_date && t.due_date < todayISO;
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                    <p className="text-[11px] text-gray-400">
                      {t.client?.name || 'Corporate'}{t.due_date ? ` · due ${t.due_date}` : ' · no due date'}{t.priority === 'high' ? ' · HIGH' : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${late ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {late ? 'OVERDUE' : (t.priority === 'high' ? 'HIGH' : 'OPEN')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* §3 CONTINUE WORKING — resumable workspaces */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}><MessagesSquare className="w-4 h-4" style={{ color: TEAL }} /> Continue working</h2>
        <div className="space-y-2">
          {d.spaces.map((s) => {
            const posts = d.spacePosts.filter((p) => p.space_id === s.id);
            const open = spaceOpen === s.id;
            return (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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

      {/* §3 COMPANY PULSE — only operationally meaningful numbers */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}><Flag className="w-4 h-4" style={{ color: TEAL }} /> Company pulse</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {pulse.map((p) => (
            <div key={p.label} className="rounded-3xl bg-white p-3.5 shadow-[0_1px_2px_rgba(7,35,31,0.05),0_12px_28px_-18px_rgba(7,35,31,0.3)] ring-1 ring-teal-50/80">
              <p className="text-2xl font-extrabold" style={{ color: p.warn ? '#B45309' : INK }}>{p.n}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{p.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MY CAPABILITIES */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}><Users className="w-4 h-4" style={{ color: TEAL }} /> My capabilities</h2>
        {myCaps.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl p-4">No capabilities assigned yet.</p>
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

      {/* MY CLIENTS → WORKSPACES with assigned team */}
      {d.myClients.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}><Building2 className="w-4 h-4" style={{ color: TEAL }} /> My clients</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {d.myClients.map((c) => {
              const team = d.teamAssignments.filter((ta) => ta.client_id === c.id);
              return (
                <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                  <p className="text-[11px] text-gray-500">{c.brand || 'Client'}{c.rooms ? ` · ${c.rooms} rooms` : ''}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{d.clientCapabilities.filter((cc) => cc.client_id === c.id).length} capabilities mapped</p>
                  {team.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {team.map((ta, i) => {
                        const u = Array.isArray(ta.corporate_users) ? ta.corporate_users[0] : ta.corporate_users;
                        return u?.name ? (
                          <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#E8F4F1] text-[#0B3B36]">
                            {u.name}{u.title ? ` · ${u.title}` : ''}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MY AGENTS */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}><Bot className="w-4 h-4" style={{ color: TEAL }} /> AI agents {isSuper ? `(${d.agents.length})` : 'extending my work'}</h2>
        <div className="space-y-2">
          {(isSuper ? d.agents : d.agents.filter((a) => a.mine)).map((a) => (
            <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
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
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}><Wrench className="w-4 h-4" style={{ color: TEAL }} /> My tools</h2>
        {d.myTools.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white rounded-2xl p-4">No tool access assigned yet.</p>
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

      {/* CAPABILITY LIBRARY */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}><LayoutGrid className="w-4 h-4" style={{ color: TEAL }} /> Capability library
          <span className="text-[11px] font-normal text-gray-400">tap coverage to cycle{isSuper ? '' : ' (super admin)'}</span>
        </h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {d.capabilities.map((cap) => {
            const holders = d.capabilityHolders.filter((h) => h.key === cap.key);
            const accountable = holders.find((h) => h.accountable);
            const canEdit = isSuper && (d.me.status || 'active') !== 'pending';
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
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}><Hammer className="w-4 h-4" style={{ color: TEAL }} /> Building Attenda</h2>
        <div className="space-y-2">
          {d.building.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-[10px] font-bold tracking-wide uppercase" style={{ color: TEAL }}>{KIND_ICON[p.kind] || '○'} {p.kind}</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{p.title}</p>
              <p className="text-[13px] text-gray-600 mt-1">{p.body}</p>
            </div>
          ))}
        </div>
        {isSuper && (
          <div className="mt-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
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
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}><Users className="w-4 h-4" style={{ color: TEAL }} /> People</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
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
  );
}