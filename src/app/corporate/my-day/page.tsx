'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Building2, ClipboardCheck, Calendar, TrendingUp, Flag, Users, Plus, X,
  Check, ChevronRight, LogOut, Home, Megaphone, Target, Send, Image as ImageIcon,
} from 'lucide-react';

const TEAL = '#158A7C';

type Task = { id: string; title: string; detail: string | null; kind: string; status: string; priority: string; due_date: string | null; client_id: string | null; assignee_id: string | null };
type Event = { id: string; title: string; detail: string | null; start_at: string; client_id: string | null };
type Deal = { id: string; name: string; property_name: string | null; stage: string; value: number | null; next_follow_up: string | null; owner_id: string | null; client_id: string | null };
type Client = { id: string; slug: string; name: string; brand: string | null; rooms: number | null; status: string };
type Team = { id: string; name: string | null; title: string | null; confirmed_position: string | null };
type Comment = { id: string; parent_type: string; parent_id: string; author_id: string; body: string; created_at: string };
type Update = { id: string; client_id: string; author_id: string; body: string; image_path: string | null; created_at: string };
type Snapshot = {
  client: Client & { address?: string | null };
  activity: { last7: number; done30: number; pending30: number; inProgress30: number; openNow: number; byType: { type: string; count: number }[] } | null;
  productivity: { score: number; done: number; total: number } | null;
  goals: any[];
  team: { id: string; name: string | null; title: string | null }[];
};
type Me = {
  corporate: boolean;
  user: { id: string; name: string; title: string | null; onboarding_completed: boolean };
  authorizedPositions: { key: string; title: string; color: string }[];
  duties: { position_key: string; title: string; detail: string | null }[];
  assignments: { id: string; client: Client }[];
  isSuperAdmin: boolean;
};

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won'] as const;
const KIND_BADGE: Record<string, string> = { checklist: 'AUDIT', task: 'TASK', report: 'REPORT', flag: 'FLAG', assigned: 'DELEGATED' };

export default function MyDay() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [scope, setScope] = useState<string>('all'); // 'all' (My day) | client_id | 'corporate'
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [nt, setNt] = useState({ title: '', detail: '', client_id: '', due_date: '', priority: 'normal', assignee_id: '' });
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [ne, setNe] = useState({ title: '', start_at: '', client_id: '' });
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [nd, setNd] = useState({ name: '', property_name: '', value: '', client_id: '' });
  const [updates, setUpdates] = useState<Update[]>([]);
  const [nu, setNu] = useState<{ body: string; image: string | null }>({ body: '', image: null });
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; body: string; pinned: boolean; created_at: string }[]>([]);
  const [myAssignedTasks, setMyAssignedTasks] = useState<Task[]>([]);

  const load = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) { router.replace('/corporate'); return; }
    const meRes = await fetch('/api/corporate/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!meRes.ok) { router.replace('/corporate'); return; }
    const meData = await meRes.json();
    if (!meData.onboardingCompleted) { router.replace('/corporate/onboarding'); return; }
    setMe(meData);
    const dRes = await fetch('/api/corporate/data', { headers: { Authorization: `Bearer ${token}` } });
    if (dRes.ok) {
      const d = await dRes.json();
      setTasks(d.tasks || []); setEvents(d.events || []); setDeals(d.pipeline || []);
      setClients(d.clients || []); setTeam(d.team || []); setComments(d.comments || []);
      setUpdates(d.updates || []);
    }
    // Company feed (announcements) — silent, non-blocking
    try {
      const aRes = await fetch('/api/corporate/announcements', { headers: { Authorization: `Bearer ${token}` } });
      if (aRes.ok) { const a = await aRes.json(); setAnnouncements(a.announcements || []); }
    } catch { /* silent */ }
    // Tasks assigned to me via the corporate task system — silent if route not deployed yet
    try {
      const tRes = await fetch('/api/corporate/tasks', { headers: { Authorization: `Bearer ${token}` } });
      if (tRes.ok) {
        const t = await tRes.json();
        const rows = (t.tasks || []).filter((x: { status?: string }) => x.status !== 'done');
        setMyAssignedTasks(rows.map((x: { id: string; title: string; detail: string | null; status: string; due_date: string | null }) => ({
          id: x.id, title: x.title, detail: x.detail, kind: 'assigned', status: x.status, priority: 'normal',
          due_date: x.due_date, client_id: null, assignee_id: null,
        })));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const act = async (payload: Record<string, unknown>) => {
    const { supabase } = await import('@/lib/supabase');
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    await fetch('/api/corporate/data', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    load();
  };

  const signOut = async () => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.auth.signOut();
    router.replace('/corporate');
  };

  // ---- scoping: property switcher filters everything ----
  const inScope = (clientId: string | null) => {
    if (scope === 'all') return true;
    if (scope === 'corporate') return clientId === null;
    return clientId === scope;
  };
  const myTasks = tasks.filter((t) => inScope(t.client_id));
  const myEvents = events.filter((e) => inScope(e.client_id));
  const myDeals = deals.filter((d) => inScope(d.client_id));

  const positions = me?.authorizedPositions || [];
  const duties = me?.duties || [];
  const posKeys = positions.map((p) => p.key);
  const myClientIds = (me?.assignments || []).map((a) => a.client?.id);
  const snapshotClients = clients.filter((c) => myClientIds.includes(c.id) || me?.isSuperAdmin);
  const visibleClients = scope === 'all' || scope === 'corporate'
    ? clients.filter((c) => myClientIds.includes(c.id) || me?.isSuperAdmin)
    : clients.filter((c) => c.id === scope);

  // Live inline snapshot — follows the scope switcher (specific client shows that one, My day shows first assigned)
  const snapTarget = scope !== 'all' && scope !== 'corporate' ? clients.find((c) => c.id === scope) : (snapshotClients[0] || null);
  useEffect(() => {
    let dead = false;
    setSnap(null);
    if (!snapTarget?.slug || !me) return;
    setSnapLoading(true);
    (async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) return;
      const r = await fetch(`/api/corporate/client-snapshot?slug=${snapTarget.slug}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { if (!dead) setSnapLoading(false); return; }
      const j = await r.json();
      if (!dead) { setSnap(j); setSnapLoading(false); }
    })();
    return () => { dead = true; };
  }, [snapTarget?.slug, me?.user?.id]);
  const isField = posKeys.includes('field_ops');
  const isSales = posKeys.includes('sales');
  const isController = posKeys.includes('controller');
  const isTrainer = posKeys.includes('trainer');
  const isLeader = posKeys.includes('property_leader');
  // kinds already rendered inside role sections (client workspace) — don't repeat them in "Other tasks"
  const coveredKinds = new Set<string>();
  if (isField) { coveredKinds.add('checklist'); coveredKinds.add('task'); }
  if (isController) { coveredKinds.add('report'); coveredKinds.add('flag'); }

  const today = new Date().toISOString().slice(0, 10);
  const auditTasks = myTasks.filter((t) => t.kind === 'checklist');
  const openTasks = myTasks.filter((t) => t.kind === 'task' && t.status === 'open');
  const flags = myTasks.filter((t) => t.kind === 'flag' && t.status === 'open');
  const reports = myTasks.filter((t) => t.kind === 'report');
  const followUps = myDeals.filter((d) => d.next_follow_up && d.stage !== 'won' && d.next_follow_up <= new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
  const upcoming = myEvents.filter((e) => e.start_at >= new Date().toISOString()).slice(0, 4);
  // Property board — shared team updates for the property in focus
  const boardUpdates = scope !== 'all' && scope !== 'corporate' ? updates.filter((u) => u.client_id === scope).slice(0, 30) : [];
  const mediaUrl = (p: string) => `https://zhhhyrodqndeyjxveszu.supabase.co/storage/v1/object/public/corporate-media/${p}`;
  const timeAgo = (iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // ONE deduped, prioritized list for My day — every task kind lives here exactly once
  const todayList: Task[] = (() => {
    const seen = new Set<string>();
    const rows: Task[] = [];
    for (const t of [...myTasks, ...myAssignedTasks]) {
      if (seen.has(t.id) || t.status === 'done') continue;
      seen.add(t.id);
      rows.push(t);
    }
    return rows.sort((a, b) => {
      if ((a.priority === 'high') !== (b.priority === 'high')) return a.priority === 'high' ? -1 : 1;
      if (!!a.due_date !== !!b.due_date) return a.due_date ? -1 : 1;
      return (a.due_date || '').localeCompare(b.due_date || '');
    });
  })();
  const otherInScope = myTasks.filter((t) => (t.kind === 'checklist' ? !(isField || isController) : !coveredKinds.has(t.kind)));

  // Compact "More" grid — secondary sections collapsed until tapped
  const moreCards: { key: string; icon: React.ReactNode; label: string; sub: string }[] = [
    ...(scope === 'all' ? [{ key: 'clients', icon: <Building2 className="h-3.5 w-3.5" />, label: 'Clients', sub: `${visibleClients.length} assigned` }] : []),
    ...(isSales ? [{ key: 'pipeline', icon: <TrendingUp className="h-3.5 w-3.5" />, label: 'Pipeline', sub: `${myDeals.length} deals · ${followUps.length} due` }] : []),
    { key: 'calendar', icon: <Calendar className="h-3.5 w-3.5" />, label: 'Calendar', sub: `${upcoming.length} upcoming` },
    ...(isTrainer ? [{ key: 'team', icon: <Users className="h-3.5 w-3.5" />, label: 'Team', sub: `${team.length} members` }] : []),
    { key: 'company', icon: <Megaphone className="h-3.5 w-3.5" />, label: 'Company', sub: `${announcements.length} posts` },
  ];

  const addTask = async () => {
    if (!nt.title) return;
    await act({ action: 'create-task', title: nt.title, detail: nt.detail || null, client_id: nt.client_id || null, due_date: nt.due_date || null, priority: nt.priority, assignee_id: nt.assignee_id || null });
    setShowNewTask(false); setNt({ title: '', detail: '', client_id: '', due_date: '', priority: 'normal', assignee_id: '' });
  };
  const addEvent = async () => {
    if (!ne.title || !ne.start_at) return;
    await act({ action: 'create-event', title: ne.title, start_at: new Date(ne.start_at).toISOString(), client_id: ne.client_id || null });
    setShowNewEvent(false); setNe({ title: '', start_at: '', client_id: '' });
  };
  const deleteEvent = async (id: string) => {
    await act({ action: 'delete-event', event_id: id });
  };
  const addDeal = async () => {
    if (!nd.name) return;
    await act({ action: 'create-pipeline', name: nd.name, property_name: nd.property_name || null, value: nd.value ? parseFloat(nd.value) : null, client_id: nd.client_id || null });
    setShowNewDeal(false); setNd({ name: '', property_name: '', value: '', client_id: '' });
  };

  const postUpdate = async () => {
    if (!nu.body && !nu.image) return;
    setPosting(true);
    try {
      await act({ action: 'add-update', client_id: scope, body: nu.body || '', image: nu.image || null });
      setNu({ body: '', image: null });
    } finally { setPosting(false); }
  };
  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1280;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setNu((v) => ({ ...v, image: canvas.toDataURL('image/jpeg', 0.82) }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const toggleToday = async (t: Task) => {
    if (t.kind === 'assigned') {
      const { supabase } = await import('@/lib/supabase');
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      await fetch('/api/corporate/tasks', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', id: t.id }),
      }).catch(() => null);
      load();
    } else {
      act({ action: 'toggle-task', task_id: t.id, done: t.status !== 'done' });
    }
  };

  const firstName = me?.user?.name?.split(' ')[0] || 'there';
  const primary = positions[0];
  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

  if (loading || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6FAF9]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  const isMyDay = scope === 'all' || scope === 'corporate';

  return (
    <div className="min-h-screen bg-[#F6FAF9] pb-24" style={{ backgroundImage: 'radial-gradient(1200px 400px at 50% -80px, rgba(21,134,124,0.09), transparent 70%)' }}>
      {/* Header — dark command bar */}
      <div className="sticky top-0 z-20 bg-[#07231F]/95 shadow-[0_12px_32px_-16px_rgba(7,35,31,0.55)] backdrop-blur-md">
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#15b79e,#0E6B60 55%,rgba(14,107,96,0))' }} />
        <div className="mx-auto max-w-3xl px-4 pb-3 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#7FD4C7]">Attenda Corporate</div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight text-white" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                {greeting}, <span className="text-[#8ADBCD]">{firstName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {primary && (
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[#8ADBCD] ring-1 ring-white/15">
                  {primary.title}
                </span>
              )}
              <button onClick={signOut} className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white" title="Sign out"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
          {/* Property switcher — My day = home, tap a property to focus, Corporate = internal-only */}
          <div className="mt-3.5 flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => { setScope('all'); setExpanded(null); }}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold transition"
              style={scope === 'all' ? { background: '#fff', color: '#07231F', boxShadow: '0 4px 14px -4px rgba(0,0,0,0.4)' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Home className="h-3 w-3" /> My day
            </button>
            {clients.filter((c) => myClientIds.includes(c.id) || me.isSuperAdmin).map((c) => (
              <button key={c.id} onClick={() => { setScope(c.id); setExpanded(null); }}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold transition"
                style={scope === c.id ? { background: '#fff', color: '#07231F', boxShadow: '0 4px 14px -4px rgba(0,0,0,0.4)' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Building2 className="h-3 w-3" /> {c.name.split(' ').slice(0, 2).join(' ')}{c.rooms ? ` · ${c.rooms}` : ''}
              </button>
            ))}
            <button onClick={() => { setScope('corporate'); setExpanded(null); }}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold transition"
              style={scope === 'corporate' ? { background: '#fff', color: '#07231F', boxShadow: '0 4px 14px -4px rgba(0,0,0,0.4)' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.12)' }}>
              Corporate
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-5 md:px-6 md:py-8">
      {isMyDay ? (
        <div className="space-y-6 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-6 lg:space-y-0">
        {/* PROPERTY SNAPSHOT — full width on desktop */}
        {scope !== 'corporate' && snapTarget && (
        <section className="lg:col-span-12">
            <SectionTitle icon={<Building2 className="h-4 w-4" />} title="Property snapshot" count={snap?.productivity ? `${snap.productivity.score}% productive` : undefined} />
            <div className="rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(7,35,31,0.05),0_12px_28px_-18px_rgba(7,35,31,0.3)] ring-1 ring-teal-50/80">
              {snapLoading && (
                <div className="flex items-center gap-2 py-6 text-xs text-gray-400"><Loader2 className="h-4 w-4 animate-spin" style={{ color: TEAL }} /> Loading live snapshot…</div>
              )}
              {!snapLoading && snap && (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-extrabold text-gray-900">{snap.client.name}</div>
                      <div className="text-[11px] text-gray-400">{snap.client.rooms ? `${snap.client.rooms} rooms` : ''}{snap.client.address ? ` · ${snap.client.address}` : ''}</div>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ background: '#E8F4F1', color: TEAL }}>live</span>
                  </div>
                  {snap.activity ? (
                    <>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {[['Requests · 7d', snap.activity.last7], ['Done · 30d', snap.activity.done30], ['Open now', snap.activity.openNow]].map(([label, v]) => (
                          <div key={label as string} className="rounded-2xl bg-[#F6FAF9] p-3">
                            <div className="text-2xl font-extrabold text-gray-900">{v as number}</div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label as string}</div>
                          </div>
                        ))}
                      </div>
                      {snap.productivity && (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-gray-400"><span className="uppercase tracking-wider">Productivity</span><span style={{ color: TEAL }}>{snap.productivity.score}%</span></div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full" style={{ width: `${snap.productivity.score}%`, background: `linear-gradient(90deg,#5ECFC0,${TEAL})` }} />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-3 rounded-2xl bg-[#F6FAF9] p-3 text-[11px] leading-relaxed text-gray-500">Live guest activity connects here once this property is onboarded on the platform.</div>
                  )}
                  {(snap.goals?.length || 0) > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {snap.goals.slice(0, 2).map((g: any, i: number) => (
                        <div key={i} className="flex items-center justify-between rounded-xl border border-teal-50 px-3 py-2">
                          <span className="text-[11px] font-bold text-gray-700">{g.title || g.name || g.metric_name || 'Goal'}</span>
                          {g.target && <span className="text-[10px] text-gray-400">{g.target}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* FOLLOW-UPS DUE — money at risk, always visible (desktop: left rail) */}
        {followUps.length > 0 && (
          <section className="lg:col-span-4 lg:self-start">
            <SectionTitle icon={<Flag className="h-4 w-4" />} title="Follow-ups due" count={`${followUps.length}`} />
            <div className="space-y-2">
              {followUps.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800">{d.name}</div>
                    <div className="text-xs text-gray-400">Due {d.next_follow_up}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => act({ action: 'move-pipeline', deal_id: d.id, stage: 'won' })}
                      className="rounded-lg px-3.5 py-2.5 text-[11px] font-bold text-white transition hover:opacity-90 active:scale-95" style={{ background: '#0E6B60' }}>Won</button>
                    <button onClick={() => act({ action: 'move-pipeline', deal_id: d.id, stage: d.stage, next_follow_up: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) })}
                      className="rounded-lg px-3.5 py-2.5 text-[11px] font-bold text-white transition hover:opacity-90 active:scale-95" style={{ background: TEAL }}>Snooze 7d</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TODAY — one deduped list: audits, tasks, reports, flags, delegated. Nothing repeats. */}
        <section className="lg:col-span-8 lg:row-start-1 lg:col-start-5">
          <SectionTitle icon={<Check className="h-4 w-4" />} title="Today" count={`${todayList.length} open`} />
          <div className="space-y-2">
            {todayList.map((t) => t.kind === 'flag' ? (
              <div key={t.id} className="rounded-2xl border border-red-100 bg-red-50/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-800">{t.title}</div>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700">FLAG</span>
                </div>
                {t.detail && <div className="mt-0.5 text-xs text-gray-500">{t.detail}</div>}
                <button onClick={() => act({ action: 'toggle-task', task_id: t.id, done: true })} className="mt-1.5 text-[10px] font-bold" style={{ color: TEAL }}>Mark resolved</button>
              </div>
            ) : (
              <TaskRow key={t.id} t={t} badge={KIND_BADGE[t.kind]} onToggle={() => toggleToday(t)} />
            ))}
            {!todayList.length && <Empty label="Clean day — nothing open" />}
          </div>
          <button onClick={() => setShowNewTask(true)} className="mt-3 flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm" style={{ background: TEAL }}>
            <Plus className="h-3.5 w-3.5" /> New task
          </button>
        </section>

        {/* MORE — compact grid, tap a card to expand that section (one at a time, no mega-scroll) */}
        <section className="lg:col-span-12">
          <SectionTitle icon={<ChevronRight className="h-4 w-4" />} title="More" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {moreCards.map((c) => (
              <button key={c.key} onClick={() => setExpanded(expanded === c.key ? null : c.key)}
                className={`rounded-2xl bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(7,35,31,0.05),0_8px_20px_-14px_rgba(7,35,31,0.3)] ring-1 transition ${expanded === c.key ? 'ring-teal-300' : 'ring-teal-50/80 hover:-translate-y-px hover:ring-teal-200'}`}>
                <div className="flex items-center gap-1.5" style={{ color: TEAL }}>
                  {c.icon}<span className="text-[11px] font-extrabold uppercase tracking-wider">{c.label}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">{c.sub}</div>
              </button>
            ))}
          </div>

          {expanded === 'pipeline' && isSales && (
            <div className="mt-3 rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(7,35,31,0.05),0_12px_28px_-18px_rgba(7,35,31,0.3)] ring-1 ring-teal-50/80">
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {STAGES.map((stage) => (
                  <div key={stage} className="w-40 flex-shrink-0">
                    <div className="mb-1.5 border-b-2 pb-1 text-[9px] font-extrabold uppercase tracking-wider text-gray-400" style={{ borderColor: stage === 'won' ? '#0E6B60' : stage === 'proposal' ? '#3BBCAC' : stage === 'qualified' ? '#5ECFC0' : '#94a3b8' }}>{stage}</div>
                    <div className="space-y-1.5">
                      {myDeals.filter((d) => d.stage === stage).map((d) => (
                        <div key={d.id} className="rounded-xl border border-teal-50 bg-white p-2.5 shadow-sm" style={stage === 'won' ? { background: '#E8F4F1' } : {}}>
                          <div className="text-[11px] font-bold leading-tight text-gray-800">{d.name}</div>
                          <div className="mt-0.5 text-[9.5px] text-gray-400">
                            {d.value ? `$${d.value}/mo · ` : ''}{d.next_follow_up ? `follow-up ${d.next_follow_up}` : d.property_name || ''}
                          </div>
                          {stage !== 'won' && (
                            <button onClick={() => act({ action: 'move-pipeline', deal_id: d.id, stage: STAGES[STAGES.indexOf(stage) + 1] })}
                              className="mt-1 flex items-center gap-0.5 text-[9px] font-bold" style={{ color: TEAL }}>
                              advance <ChevronRight className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowNewDeal(true)} className="mt-2 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-white" style={{ background: TEAL }}>
                <Plus className="h-3 w-3" /> Add deal
              </button>
            </div>
          )}

          {expanded === 'calendar' && (
            <div className="mt-3 rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(7,35,31,0.05),0_12px_28px_-18px_rgba(7,35,31,0.3)] ring-1 ring-teal-50/80">
              <div className="space-y-2">
                {upcoming.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-50 p-3.5">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-800">{e.title}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(e.start_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {new Date(e.start_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        {' · '}{e.client_id ? clients.find((c) => c.id === e.client_id)?.name || 'property' : 'Corporate'}
                      </div>
                    </div>
                    <button onClick={() => deleteEvent(e.id)} className="shrink-0 rounded-lg p-2.5 text-gray-300 transition hover:bg-red-50 hover:text-red-500 active:scale-90" title="Delete event"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                {!upcoming.length && <Empty label="No upcoming events" />}
              </div>
              <button onClick={() => setShowNewEvent(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-bold text-white shadow-sm transition active:scale-[0.98]" style={{ background: TEAL }}>
                <Plus className="h-3.5 w-3.5" /> Add event
              </button>
            </div>
          )}

          {expanded === 'company' && (
            <div className="mt-3 space-y-2">
              {announcements.slice(0, 4).map((a) => (
                <div key={a.id} className="rounded-2xl border border-teal-50 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    {a.pinned && <span className="rounded-full bg-[#E8F4F1] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider" style={{ color: TEAL }}>Pinned</span>}
                    <div className="text-sm font-bold text-gray-800">{a.title}</div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-500">{a.body}</p>
                  <div className="mt-1.5 text-[10px] text-gray-300">{new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                </div>
              ))}
              {!announcements.length && <Empty label="No announcements yet" />}
            </div>
          )}

          {expanded === 'team' && isTrainer && (
            <div className="mt-3 space-y-2">
              {team.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-2xl border border-teal-50 bg-white p-3 shadow-[0_1px_2px_rgba(7,35,31,0.05),0_8px_20px_-14px_rgba(7,35,31,0.3)]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: TEAL }}>{(m.name || '?')[0]}</div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{m.name}</div>
                      <div className="text-[10px] text-gray-400">{m.title || '—'}</div>
                    </div>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                    style={m.confirmed_position ? { background: '#E8F4F1', color: TEAL } : { background: '#fef3c7', color: '#b45309' }}>
                    {m.confirmed_position ? 'certified' : 'in training'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {expanded === 'clients' && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {visibleClients.map((c) => (
                <button key={c.id} onClick={() => { setScope(c.id); setExpanded(null); }} className="rounded-2xl bg-white p-4 text-left shadow-[0_1px_2px_rgba(7,35,31,0.05),0_8px_20px_-14px_rgba(7,35,31,0.3)] ring-1 ring-teal-50/80 transition hover:-translate-y-px hover:ring-teal-200">
                  <div className="font-bold text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.rooms ? `${c.rooms} rooms` : '—'} · {c.brand || c.status}</div>
                  <div className="mt-1.5 text-[10px] font-bold" style={{ color: TEAL }}>Open workspace →</div>
                </button>
              ))}
              {!visibleClients.length && <Empty label="No client assignments yet" />}
            </div>
          )}
        </section>
        </div>
      ) : (
        <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:space-y-0">
        {/* ===== CLIENT WORKSPACE — focused on one property ===== */}
        {/* PROPERTY BOARD — shared team updates: notes + photos, everyone assigned sees everything */}
        <section className="lg:col-span-2">
          <SectionTitle icon={<ImageIcon className="h-4 w-4" />} title="Property board" count={`${boardUpdates.length} updates`} />
          <div className="rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(7,35,31,0.05),0_12px_28px_-18px_rgba(7,35,31,0.3)] ring-1 ring-teal-50/80">
            <textarea value={nu.body} onChange={(e) => setNu((v) => ({ ...v, body: e.target.value }))} rows={2}
              placeholder={`Post an update for the team… what's happening at ${clients.find((c) => c.id === scope)?.name || 'this property'}?`}
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
            {nu.image && (
              <div className="relative mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={nu.image} alt="attachment preview" className="max-h-44 w-full rounded-xl object-cover" />
                <button onClick={() => setNu((v) => ({ ...v, image: null }))} className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition active:scale-90" title="Remove photo"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2.5 text-[11px] font-bold text-gray-500 transition hover:border-teal-300 hover:text-teal-600 active:scale-95">
                <ImageIcon className="h-4 w-4" /> Photo
              </button>
              <button onClick={postUpdate} disabled={posting || (!nu.body && !nu.image)}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-40" style={{ background: TEAL }}>
                {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Post to team
              </button>
            </div>
          </div>
          <div className="mt-2 space-y-2">
            {boardUpdates.map((u) => {
              const author = team.find((t) => t.id === u.author_id);
              const canDelete = u.author_id === me?.user?.id || me?.isSuperAdmin;
              return (
                <div key={u.id} className="rounded-2xl bg-white p-3.5 shadow-[0_1px_2px_rgba(7,35,31,0.05),0_8px_20px_-14px_rgba(7,35,31,0.3)] ring-1 ring-teal-50/80">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: TEAL }}>{(author?.name || '?')[0]}</div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-bold text-gray-800">{author?.name || 'Team member'}</div>
                        <div className="text-[10px] text-gray-400">{author?.title ? `${author.title} · ` : ''}{timeAgo(u.created_at)}</div>
                      </div>
                    </div>
                    {canDelete && (
                      <button onClick={() => act({ action: 'delete-update', update_id: u.id })} className="shrink-0 rounded-lg p-2 text-gray-300 transition hover:bg-red-50 hover:text-red-500 active:scale-90" title="Delete update"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                  {u.body && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700">{u.body}</p>}
                  {u.image_path && (
                    <a href={mediaUrl(u.image_path)} target="_blank" rel="noreferrer" className="mt-2 block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(u.image_path)} alt="update photo" loading="lazy" className="max-h-72 w-full rounded-xl object-cover" />
                    </a>
                  )}
                </div>
              );
            })}
            {!boardUpdates.length && <Empty label="No updates yet — post the first note or photo for the team" />}
          </div>
        </section>

        {duties.length > 0 && (
          <section className="lg:col-span-2">
            <SectionTitle icon={<ClipboardCheck className="h-4 w-4" />} title="Your duties" count={`${duties.length}`} />
            <div className="rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(7,35,31,0.05),0_12px_28px_-18px_rgba(7,35,31,0.3)] ring-1 ring-teal-50/80">
              {duties.slice(0, 8).map((d, i) => (
                <div key={`${d.position_key}-${i}`} className={i > 0 ? 'mt-2 border-t border-teal-50 pt-2' : ''}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-bold text-gray-800">{d.title}</span>
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-gray-300">{positions.find((p) => p.key === d.position_key)?.title || d.position_key}</span>
                  </div>
                  {d.detail && <div className="truncate text-[11px] text-gray-500">{d.detail}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {isField && (
          <section>
            <SectionTitle icon={<ClipboardCheck className="h-4 w-4" />} title="Daily audit" count={`${auditTasks.filter((t) => t.status === 'done').length}/${auditTasks.length}`} />
            <div className="space-y-2">
              {auditTasks.length ? auditTasks.map((t) => <TaskRow key={t.id} t={t} onToggle={() => act({ action: 'toggle-task', task_id: t.id, done: t.status !== 'done' })} />) : <Empty label="No checklist items in this scope yet" />}
            </div>
            <SectionTitle icon={<Building2 className="h-4 w-4" />} title="Property visits & tasks" />
            <div className="space-y-2">
              {openTasks.map((t) => <TaskRow key={t.id} t={t} onToggle={() => act({ action: 'toggle-task', task_id: t.id, done: true })} />)}
              {!openTasks.length && <Empty label="No open tasks — clean day" />}
            </div>
          </section>
        )}

        {isSales && (
          <section>
            <SectionTitle icon={<TrendingUp className="h-4 w-4" />} title="Pipeline" count={`${myDeals.length} deals`} />
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {STAGES.map((stage) => (
                <div key={stage} className="w-40 flex-shrink-0">
                  <div className="mb-1.5 border-b-2 pb-1 text-[9px] font-extrabold uppercase tracking-wider text-gray-400" style={{ borderColor: stage === 'won' ? '#0E6B60' : stage === 'proposal' ? '#3BBCAC' : stage === 'qualified' ? '#5ECFC0' : '#94a3b8' }}>{stage}</div>
                  <div className="space-y-1.5">
                    {myDeals.filter((d) => d.stage === stage).map((d) => (
                      <div key={d.id} className="rounded-xl border border-teal-50 bg-white p-2.5 shadow-sm" style={stage === 'won' ? { background: '#E8F4F1' } : {}}>
                        <div className="text-[11px] font-bold leading-tight text-gray-800">{d.name}</div>
                        <div className="mt-0.5 text-[9.5px] text-gray-400">
                          {d.value ? `$${d.value}/mo · ` : ''}{d.next_follow_up ? `follow-up ${d.next_follow_up}` : d.property_name || ''}
                        </div>
                        {stage !== 'won' && (
                          <button onClick={() => act({ action: 'move-pipeline', deal_id: d.id, stage: STAGES[STAGES.indexOf(stage) + 1] })}
                            className="mt-1 flex items-center gap-0.5 text-[9px] font-bold" style={{ color: TEAL }}>
                            advance <ChevronRight className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowNewDeal(true)} className="mt-2 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-white" style={{ background: TEAL }}>
              <Plus className="h-3 w-3" /> Add deal
            </button>
            <SectionTitle icon={<Flag className="h-4 w-4" />} title="Follow-ups due" count={`${followUps.length}`} />
            <div className="space-y-2">
              {followUps.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800">{d.name}</div>
                    <div className="text-xs text-gray-400">Due {d.next_follow_up}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => act({ action: 'move-pipeline', deal_id: d.id, stage: 'won' })}
                      className="rounded-lg px-3.5 py-2.5 text-[11px] font-bold text-white transition hover:opacity-90 active:scale-95" style={{ background: '#0E6B60' }}>Won</button>
                    <button onClick={() => act({ action: 'move-pipeline', deal_id: d.id, stage: d.stage, next_follow_up: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) })}
                      className="rounded-lg px-3.5 py-2.5 text-[11px] font-bold text-white transition hover:opacity-90 active:scale-95" style={{ background: TEAL }}>Snooze 7d</button>
                  </div>
                </div>
              ))}
              {!followUps.length && <Empty label="Nothing due in the next 3 days" />}
            </div>
          </section>
        )}

        {isController && (
          <section>
            <SectionTitle icon={<ClipboardCheck className="h-4 w-4" />} title="Reports to review" count={`${reports.length}`} />
            <div className="space-y-2">
              {reports.map((t) => <TaskRow key={t.id} t={t} onToggle={() => act({ action: 'toggle-task', task_id: t.id, done: t.status !== 'done' })} />)}
              {!reports.length && <Empty label="No pending reports" />}
            </div>
            <SectionTitle icon={<Flag className="h-4 w-4" />} title="Flags" count={`${flags.length}`} />
            <div className="space-y-2">
              {flags.map((t) => (
                <div key={t.id} className="rounded-2xl border border-red-100 bg-red-50/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-800">{t.title}</div>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700">FLAG</span>
                  </div>
                  {t.detail && <div className="mt-0.5 text-xs text-gray-500">{t.detail}</div>}
                  <button onClick={() => act({ action: 'toggle-task', task_id: t.id, done: true })} className="mt-1.5 text-[10px] font-bold" style={{ color: TEAL }}>Mark resolved</button>
                </div>
              ))}
              {!flags.length && <Empty label="No open flags" />}
            </div>
          </section>
        )}

        {isTrainer && (
          <section>
            <SectionTitle icon={<Users className="h-4 w-4" />} title="Team & certification" />
            <div className="space-y-2">
              {team.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-2xl border border-teal-50 bg-white p-3 shadow-[0_1px_2px_rgba(7,35,31,0.05),0_8px_20px_-14px_rgba(7,35,31,0.3)]">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: TEAL }}>{(m.name || '?')[0]}</div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{m.name}</div>
                      <div className="text-[10px] text-gray-400">{m.title || '—'}</div>
                    </div>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                    style={m.confirmed_position ? { background: '#E8F4F1', color: TEAL } : { background: '#fef3c7', color: '#b45309' }}>
                    {m.confirmed_position ? 'certified' : 'in training'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {isLeader && (
          <section>
            <SectionTitle icon={<Building2 className="h-4 w-4" />} title="Your property" />
            <div className="space-y-2">
              {(visibleClients.length ? visibleClients : clients.slice(0, 1)).map((c) => (
                <div key={c.id} className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(7,35,31,0.05),0_8px_20px_-14px_rgba(7,35,31,0.3)] ring-1 ring-teal-50/80">
                  <div className="font-bold text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.rooms} rooms · {c.brand}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* OTHER TASKS — only kinds not already shown above, so nothing repeats */}
        {otherInScope.length > 0 && (
          <section>
            <SectionTitle icon={<Check className="h-4 w-4" />} title="Other tasks" count={`${otherInScope.filter((t) => t.status === 'open').length} open`} />
            <div className="space-y-2">
              {otherInScope.map((t) => <TaskRow key={t.id} t={t} onToggle={() => act({ action: 'toggle-task', task_id: t.id, done: t.status !== 'done' })} />)}
            </div>
          </section>
        )}

        <button onClick={() => setShowNewTask(true)} className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm" style={{ background: TEAL }}>
          <Plus className="h-3.5 w-3.5" /> New task
        </button>
        </div>
      )}
      </div>

      {/* New task modal */}
      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-bold text-gray-900">New task</div>
              <button onClick={() => setShowNewTask(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2.5">
              <input value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} placeholder="What needs to happen?"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <input value={nt.detail} onChange={(e) => setNt({ ...nt, detail: e.target.value })} placeholder="Details (optional)"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <div className="flex gap-2">
                <select value={nt.client_id} onChange={(e) => setNt({ ...nt, client_id: e.target.value })}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                  <option value="">Corporate (no property)</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="date" value={nt.due_date} onChange={(e) => setNt({ ...nt, due_date: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400" />
              </div>
              <div className="flex gap-2">
                <select value={nt.priority} onChange={(e) => setNt({ ...nt, priority: e.target.value })}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                  <option value="normal">Normal priority</option>
                  <option value="high">High priority</option>
                </select>
                <select value={nt.assignee_id} onChange={(e) => setNt({ ...nt, assignee_id: e.target.value })}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                  <option value="">Assign to: me</option>
                  {team.map((m) => <option key={m.id} value={m.id}>{m.name || 'Teammate'}</option>)}
                </select>
              </div>
              <button onClick={addTask} className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-md" style={{ background: `linear-gradient(135deg,#3BBCAC,${TEAL})` }}>Create task</button>
            </div>
          </div>
        </div>
      )}

      {/* New event modal */}
      {showNewEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-bold text-gray-900">Add event</div>
              <button onClick={() => setShowNewEvent(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2.5">
              <input value={ne.title} onChange={(e) => setNe({ ...ne, title: e.target.value })} placeholder="Event title (e.g. Owner check-in call)"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <input type="datetime-local" value={ne.start_at} onChange={(e) => setNe({ ...ne, start_at: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <select value={ne.client_id} onChange={(e) => setNe({ ...ne, client_id: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                <option value="">Corporate (no property)</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={addEvent} className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-md" style={{ background: `linear-gradient(135deg,#3BBCAC,${TEAL})` }}>Add to calendar</button>
            </div>
          </div>
        </div>
      )}

      {/* New deal modal */}
      {showNewDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-bold text-gray-900">New deal</div>
              <button onClick={() => setShowNewDeal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2.5">
              <input value={nd.name} onChange={(e) => setNd({ ...nd, name: e.target.value })} placeholder="Property / group name"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <input value={nd.property_name} onChange={(e) => setNd({ ...nd, property_name: e.target.value })} placeholder="Notes (e.g. 3 properties, owner met)"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <div className="flex gap-2">
                <input value={nd.value} onChange={(e) => setNd({ ...nd, value: e.target.value })} placeholder="Monthly value ($)"
                  className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
                <select value={nd.client_id} onChange={(e) => setNd({ ...nd, client_id: e.target.value })}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                  <option value="">No property link</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button onClick={addDeal} className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-md" style={{ background: `linear-gradient(135deg,#3BBCAC,${TEAL})` }}>Add to pipeline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isLeaderCheck(keys: string[]) { return keys.includes('property_leader'); }

function SectionTitle({ icon, title, count }: { icon: React.ReactNode; title: string; count?: string }) {
  return (
    <div className="mb-2.5 mt-1 flex items-center gap-2 px-1">
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-teal-100" style={{ color: TEAL }}>
        {icon}
      </span>
      <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0B3B36]">{title}</span>
      {count && <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold shadow-sm ring-1 ring-teal-100 normal-case tracking-normal" style={{ color: TEAL }}>{count}</span>}
    </div>
  );
}

function TaskRow({ t, onToggle, badge }: { t: Task; onToggle: () => void; badge?: string }) {
  const done = t.status === 'done';
  const today = new Date().toISOString().slice(0, 10);
  return (
    <button onClick={onToggle} className="group flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(7,35,31,0.05),0_8px_24px_-16px_rgba(7,35,31,0.25)] ring-1 ring-teal-50 transition hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(7,35,31,0.06),0_14px_32px_-16px_rgba(7,35,31,0.3)] hover:ring-teal-100 active:scale-[0.995]">
      <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${done ? '' : 'border-gray-300 group-hover:border-teal-400'}`}
        style={done ? { background: TEAL, borderColor: TEAL } : {}}>
        {done && <Check className="h-3.5 w-3.5 text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-semibold ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{t.title}</div>
        {t.detail && <div className="truncate text-xs text-gray-400">{t.detail}</div>}
      </div>
      {badge && !done && <span className="shrink-0 rounded-full bg-[#F0F7F5] px-2 py-0.5 text-[9px] font-bold text-[#0B3B36] ring-1 ring-teal-50">{badge}</span>}
      {t.priority === 'high' && <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-600 ring-1 ring-red-100">HIGH</span>}
      {t.due_date && !done && <span className="shrink-0 text-[10px] font-semibold text-gray-400">{t.due_date === today ? 'today' : t.due_date.slice(5)}</span>}
    </button>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-teal-100 bg-white/50 p-5 text-center text-xs font-medium text-gray-400">{label}</div>;
}