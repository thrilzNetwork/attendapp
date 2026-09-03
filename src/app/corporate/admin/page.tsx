'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X, RefreshCcw, Eye, EyeOff, Check, Copy, ExternalLink } from 'lucide-react';

const TEAL = '#158A7C';

type Position = { key: string; title: string; description: string | null; color: string; active: boolean };
type User = {
  id: string; email: string; name: string | null; title: string | null;
  onboarding_completed: boolean; onboarding_progress: string[]; confirmed_position: string | null; active: boolean;
};
type Client = { id: string; slug: string; name: string; brand: string | null; rooms: number | null; status: string; address: string | null; notes?: string | null; pitch_key?: string | null };
type Page = { slug: string; title: string; audience: string; body: string; sort_order: number; published: boolean };
type Assignment = { id: string; user_id: string; client_id: string; position_key: string | null; active: boolean };
type UP = { user_id: string; position_key: string };

function LinkRow({ url, label, when, copied, onCopy, previewHref }: {
  url: string; label: string; when: string; copied: boolean; onCopy: () => void; previewHref?: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 first:mt-0">
      <div className="min-w-[200px] flex-1">
        <div className="text-xs font-bold text-gray-900">{label}</div>
        <div className="text-[11px] text-gray-400">{when}</div>
        <code className="mt-0.5 block truncate text-[10px] text-gray-500">{url}</code>
      </div>
      {previewHref && (
        <a href={previewHref} target="_blank" rel="noreferrer"
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold" style={{ background: '#F6FAF9', color: TEAL }}>
          <ExternalLink className="h-3 w-3" /> Preview
        </a>
      )}
      <button onClick={onCopy} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white" style={{ background: TEAL }}>
        <Copy className="h-3 w-3" />{copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

function PreviewCard({ track, desc, href, gated }: { track: string; desc: string; href: string; gated?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-50 transition hover:ring-teal-300">
      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEAL }}>{track}</div>
      <div className="mt-1 text-xs text-gray-500">{desc}</div>
      <div className="mt-2 flex items-center gap-1 text-[11px] font-bold" style={{ color: TEAL }}>
        <ExternalLink className="h-3 w-3" /> Open preview{gated ? ' (login required)' : ''}
      </div>
    </a>
  );
}

export default function CorporateAdmin() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'users' | 'clients' | 'content' | 'talent' | 'partners' | 'links'>('users');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [nu, setNu] = useState({ email: '', name: '', title: '', password: '' });
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [showClient, setShowClient] = useState(false);
  const [nc, setNc] = useState({ name: '', brand: '', rooms: '', address: '', hotelSlug: '' });
  const [ec, setEc] = useState<Client | null>(null);
  const [editPage, setEditPage] = useState<Page | null>(null);
  const [talentRows, setTalentRows] = useState<any[]>([]);
  const [partnerRows, setPartnerRows] = useState<any[]>([]);
  const [pitchClients, setPitchClients] = useState<any[]>([]);
  const [copied, setCopied] = useState('');
  const [taskForm, setTaskForm] = useState<{ talentId: string; name: string; title: string; ownerUserId: string } | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);

  const load = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) { router.replace('/corporate'); return; }
    const res = await fetch('/api/corporate/admin', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { router.replace('/corporate/my-day'); return; }
    setData(await res.json());
    // Side panels — talent pool, partner applications, pitch links (best-effort)
    const h = { headers: { Authorization: `Bearer ${token}` } };
    fetch('/api/careers', h).then((r) => (r.ok ? r.json() : null)).then((j) => j && setTalentRows(j.candidates || [])).catch(() => null);
    fetch('/api/partnerships', h).then((r) => (r.ok ? r.json() : null)).then((j) => j && setPartnerRows(j.applications || [])).catch(() => null);
    fetch('/api/corporate/pitch-links', h).then((r) => (r.ok ? r.json() : null)).then((j) => j && setPitchClients(j.clients || [])).catch(() => null);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const act = async (payload: Record<string, unknown>) => {
    const { supabase } = await import('@/lib/supabase');
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    const res = await fetch('/api/corporate/admin', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || 'Something failed');
      setTimeout(() => setMsg(''), 3000);
      return null;
    }
    return res.json();
  };

  const createUser = async () => {
    if (!nu.email || !nu.password) { setMsg('Email and password required'); setTimeout(() => setMsg(''), 2500); return; }
    setCreating(true);
    const r = await act({ action: 'create-user', ...nu });
    setCreating(false);
    if (r?.ok) {
      setCreds({ email: nu.email, password: nu.password });
      setShowCreate(false);
      setNu({ email: '', name: '', title: '', password: '' });
      await act({ action: 'authorize', user_id: r.user_id, position_key: 'field_ops' }).catch(() => null);
      load();
    }
  };

  const createClient = async () => {
    if (!nc.name) return;
    const slug = nc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const r = await act({
      action: 'upsert-client', slug, name: nc.name, brand: nc.brand || null,
      rooms: nc.rooms ? parseInt(nc.rooms, 10) : null, address: nc.address || null,
      hotel_id: null, status: 'active',
    });
    if (r?.ok) { setShowClient(false); setNc({ name: '', brand: '', rooms: '', address: '', hotelSlug: '' }); load(); }
  };

  const saveClient = async () => {
    if (!ec) return;
    const r = await act({
      action: 'edit-client', client_id: ec.id, name: ec.name, brand: ec.brand || null,
      rooms: ec.rooms ?? null, address: ec.address || null, notes: ec.notes || null, status: ec.status,
    });
    if (r?.ok) { setEc(null); load(); }
  };

  const savePage = async () => {
    if (!editPage) return;
    const r = await act({ action: 'upsert-page', ...editPage });
    if (r?.ok) { setEditPage(null); load(); }
  };

  const patchRow = async (api: string, id: string, updates: Record<string, unknown>) => {
    const { supabase } = await import('@/lib/supabase');
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    await fetch(api, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (api === '/api/careers') {
      const r = await fetch('/api/careers', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setTalentRows((await r.json()).candidates || []);
    } else {
      const r = await fetch('/api/partnerships', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setPartnerRows((await r.json()).applications || []);
    }
  };

  const createTalentTask = async () => {
    if (!taskForm || !taskForm.title || !taskForm.ownerUserId) return;
    setTaskSaving(true);
    const { supabase } = await import('@/lib/supabase');
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    const t = talentRows.find((r) => r.id === taskForm.talentId);
    try {
      await fetch('/api/corporate/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          owner_user_id: taskForm.ownerUserId,
          title: taskForm.title,
          entity_type: 'talent',
          entity_id: taskForm.talentId,
          entity_label: t?.full_name || 'Candidate',
        }),
      });
    } catch { /* non-blocking */ }
    setTaskSaving(false);
    setTaskForm(null);
  };

  const copyLink = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch { /* clipboard unavailable */ }
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6FAF9]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  const positions: Position[] = data.positions || [];
  const users: User[] = data.users || [];
  const clients: Client[] = data.clients || [];
  const pages: Page[] = data.pages || [];
  const ups: UP[] = data.userPositions || [];
  const asg: Assignment[] = data.assignments || [];

  return (
    <div className="min-h-screen bg-[#F6FAF9]">
      <div className="sticky top-0 z-20 border-b border-teal-100 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: TEAL }}>Attenda Corporate</div>
              <div className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>Super Admin</div>
            </div>
            <div className="flex items-center gap-1.5">
              {(['users', 'clients', 'content', 'talent', 'partners', 'links'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition"
                  style={tab === t ? { background: TEAL, color: '#fff' } : { color: '#64748b', background: '#f1f5f9' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5">
        {msg && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</div>}

        {/* USERS */}
        {tab === 'users' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-500">{users.length} corporate users</div>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm" style={{ background: TEAL }}>
                <Plus className="h-3.5 w-3.5" /> Add team member
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {users.map((u) => {
                const mine = ups.filter((x) => x.user_id === u.id);
                const myAsg = asg.filter((x) => x.user_id === u.id);
                return (
                  <div key={u.id} className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${u.active ? 'ring-teal-50' : 'ring-red-100 opacity-60'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-gray-900">{u.name || u.email}</div>
                        <div className="text-xs text-gray-400">{u.email}{u.title ? ` · ${u.title}` : ''}</div>
                      </div>
                      <div className="flex gap-1">
                        <button title={u.active ? 'Deactivate' : 'Activate'} onClick={async () => { await act({ action: 'toggle-active', user_id: u.id, active: !u.active }); load(); }}
                          className="rounded-lg p-1.5 text-gray-300 hover:bg-gray-50 hover:text-gray-500">
                          {u.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button title="Reset onboarding" onClick={async () => { await act({ action: 'reset-onboarding', user_id: u.id }); load(); }}
                          className="rounded-lg p-1.5 text-gray-300 hover:bg-amber-50 hover:text-amber-500">
                          <RefreshCcw className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Authorized positions (tap to toggle)</div>
                      <div className="flex flex-wrap gap-1.5">
                        {positions.map((p) => {
                          const has = mine.some((x) => x.position_key === p.key);
                          return (
                            <button key={p.key} onClick={async () => {
                              await act(has ? { action: 'revoke', user_id: u.id, position_key: p.key } : { action: 'authorize', user_id: u.id, position_key: p.key });
                              load();
                            }}
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${has ? 'border-transparent text-white' : 'border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600'}`}
                              style={has ? { background: p.color } : {}}>
                              {has ? '✓ ' : '+ '}{p.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-3 border-t border-gray-50 pt-3">
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Assigned clients</div>
                      <div className="flex flex-wrap gap-1.5">
                        {clients.map((c) => {
                          const has = myAsg.some((x) => x.client_id === c.id);
                          return (
                            <button key={c.id} onClick={async () => {
                              if (has) {
                                const a = myAsg.find((x) => x.client_id === c.id)!;
                                await act({ action: 'unassign-client', assignment_id: a.id });
                              } else {
                                await act({ action: 'assign-client', user_id: u.id, client_id: c.id });
                              }
                              load();
                            }}
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${has ? 'border-transparent bg-teal-600 text-white' : 'border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600'}`}>
                              {has ? '✓ ' : '+ '}{c.name}
                            </button>
                          );
                        })}
                        {!clients.length && <span className="text-xs text-gray-400">No clients yet — add one in the Clients tab.</span>}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {u.onboarding_completed ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">ONBOARDING DONE</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          ONBOARDING {u.onboarding_progress?.length ? `${u.onboarding_progress.length} STEPS` : 'NOT STARTED'}
                        </span>
                      )}
                      {u.confirmed_position && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: '#E8F4F1', color: TEAL }}>
                          CONFIRMED: {positions.find((p) => p.key === u.confirmed_position)?.title || u.confirmed_position}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CLIENTS */}
        {tab === 'clients' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-500">{clients.length} clients · adding #2 is just a record + assignments</div>
              <button onClick={() => setShowClient(true)}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm" style={{ background: TEAL }}>
                <Plus className="h-3.5 w-3.5" /> Add client
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {clients.map((c) => {
                const team = asg.filter((a) => a.client_id === c.id);
                return (
                <div key={c.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-gray-900">{c.name}</div>
                      {c.brand && <div className="text-xs text-gray-400">{c.brand}</div>}
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">{c.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{c.rooms ? `${c.rooms} rooms` : '— rooms'}{c.address ? ` · ${c.address}` : ''}</div>

                  {/* team on this tenant — tap to assign/unassign */}
                  <div className="mt-3">
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Team on this client (tap to add/remove)</div>
                    <div className="flex flex-wrap gap-1.5">
                      {users.map((u) => {
                        const a = team.find((x) => x.user_id === u.id);
                        const has = !!a;
                        return (
                          <button key={u.id} onClick={async () => {
                            if (has) await act({ action: 'unassign-client', assignment_id: a!.id });
                            else await act({ action: 'assign-client', user_id: u.id, client_id: c.id });
                            load();
                          }}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${has ? 'border-transparent text-white' : 'border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600'}`}
                            style={has ? { background: TEAL } : {}}>
                            {has ? '✓ ' : '+ '}{u.name || u.email.split('@')[0]}
                          </button>
                        );
                      })}
                      {!users.length && <span className="text-xs text-gray-400">No team members yet — add them in the Users tab.</span>}
                    </div>
                  </div>

                  {c.notes && <p className="mt-2.5 line-clamp-2 rounded-lg bg-[#F6FAF9] px-3 py-2 text-[10px] leading-relaxed text-gray-500">{c.notes}</p>}

                  <div className="mt-3 flex items-center justify-between border-t border-teal-50 pt-2.5">
                    <span className="text-[10px] font-mono text-gray-300">{c.slug}</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEc({ ...c })}
                        className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-gray-500 transition hover:text-gray-800">
                        Edit
                      </button>
                      {c.pitch_key && (
                        <button onClick={() => copyLink(`https://attendaapp.com/pitch/${c.pitch_key}`, `pitch-${c.id}`)}
                          className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-gray-500 transition hover:text-gray-800">
                          {copied === `pitch-${c.id}` ? 'Copied!' : 'Pitch link'}
                        </button>
                      )}
                      <a href={`/corporate/client?slug=${c.slug}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition hover:opacity-80"
                        style={{ background: '#F6FAF9', color: TEAL }}>
                        <ExternalLink className="h-3 w-3" /> Snapshot
                      </a>
                    </div>
                  </div>
                </div>
                );
              })}
              {!clients.length && <div className="rounded-2xl border border-dashed border-teal-200 bg-white p-6 text-sm text-gray-400">No clients yet. Best Western will appear after the migration seeds it.</div>}
            </div>
          </div>
        )}

        {/* CONTENT — presentations & workflow previews organized by track */}
        {tab === 'content' && (
          <div>
            <div className="mb-3 text-sm font-semibold text-gray-500">Preview every presentation & workflow, organized by track</div>

            {/* STAFF */}
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">👔 Staff (hired team)</div>
            <div className="grid gap-3 md:grid-cols-3">
              <PreviewCard track="Onboarding presentation" desc="Cinematic story flow → confirm position (login required)"
                href="/corporate/onboarding" gated />
              <PreviewCard track="My Day workspace" desc="What they land in after confirming (login required)"
                href="/corporate/my-day" gated />
              <PreviewCard track="Corporate entry" desc="Where new hires start with their credentials"
                href="/corporate" gated />
              <PreviewCard track="Client snapshot" desc="Growth-talk walkthrough per client: property, live activity, goals, productivity, career path (login required)"
                href="/corporate/client" gated />
            </div>

            {/* TALENT */}
            <div className="mt-4 mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">🌟 Talent (candidates)</div>
            <div className="grid gap-3 md:grid-cols-3">
              <PreviewCard track="Careers presentation" desc="Story-first flow → talent pool submission (public)"
                href="/careers" />
            </div>

            {/* PARTNER */}
            <div className="mt-4 mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">🤝 Partners (companies)</div>
            <div className="grid gap-3 md:grid-cols-3">
              <PreviewCard track="Partnerships presentation" desc="Learn-first flow → partner application (public)"
                href="/partnerships" />
              {pitchClients.map((c) => (
                <PreviewCard key={c.id} track={`Pitch: ${c.name}`}
                  desc="Personalized property presentation (public link)"
                  href={`/pitch/${c.pitch_key}`} />
              ))}
            </div>

            {/* Editable CMS pages */}
            <div className="mt-5 mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              📝 Onboarding content pages ({pages.length}) — tap to edit
            </div>
            <div className="space-y-2">
              {pages.map((p) => (
                <button key={p.slug} onClick={() => setEditPage({ ...p })}
                  className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-teal-50 hover:ring-teal-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{p.title}</span>
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: p.audience === 'universal' ? '#E8F4F1' : '#fef3c7', color: p.audience === 'universal' ? TEAL : '#b45309' }}>
                        {p.audience === 'universal' ? 'universal' : p.audience}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">/{p.slug} · order {p.sort_order} · {p.published ? 'published' : 'draft'}</div>
                  </div>
                  <span className="text-xs font-bold" style={{ color: TEAL }}>Edit</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TALENT — candidate pool */}
        {tab === 'talent' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-500">{talentRows.length} candidates in the pool · source: /careers</div>
              <a href="/careers" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold" style={{ background: '#F6FAF9', color: TEAL }}>
                <ExternalLink className="h-3 w-3" /> View careers page
              </a>
            </div>
            {!talentRows.length && <div className="rounded-2xl border border-dashed border-teal-200 bg-white p-6 text-sm text-gray-400">No candidates yet. Share the /careers link (Links tab) — submissions land here and alert your email.</div>}
            <div className="grid gap-3 md:grid-cols-2">
              {talentRows.map((t) => (
                <div key={t.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-gray-900">{t.full_name}</div>
                      <div className="text-xs text-gray-400">{t.email}{t.location ? ` · ${t.location}` : ''}{t.years_experience ? ` · ${t.years_experience} yrs` : ''}</div>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: '#E8F4F1', color: TEAL }}>{t.status}</span>
                  </div>
                  {t.superpower && <div className="mt-2 text-xs font-semibold text-gray-700">⚡ {t.superpower}</div>}
                  {!!t.skills?.length && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.skills.map((s: string) => <span key={s} className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{s}</span>)}
                    </div>
                  )}
                  {t.story && <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-gray-500">{t.story}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-50 pt-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => patchRow('/api/careers', t.id, { rating: n })}
                        className={`h-6 w-6 rounded-full text-[10px] font-bold ${(t.rating ?? 0) >= n ? 'text-white' : 'bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600'}`}
                        style={(t.rating ?? 0) >= n ? { background: TEAL } : {}}>
                        {n}
                      </button>
                    ))}
                    {positions.map((p) => (
                      <button key={p.key} onClick={() => patchRow('/api/careers', t.id, { positionSuggestion: p.key })}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${t.position_suggestion === p.key ? 'border-transparent text-white' : 'border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600'}`}
                        style={t.position_suggestion === p.key ? { background: p.color } : {}}>
                        {p.title}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['new', 'reviewing', 'interview', 'offer', 'archived'].map((s) => (
                      <button key={s} onClick={() => patchRow('/api/careers', t.id, { status: s })}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${t.status === s ? 'text-white' : 'bg-gray-100 text-gray-400 hover:text-teal-600'}`}
                        style={t.status === s ? { background: TEAL } : {}}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {['new', 'contacted', 'interviewing', 'offer', 'placed', 'archived'].map((st) => (
                      <button key={st} onClick={() => patchRow('/api/careers', t.id, { stage: st })}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${t.stage === st ? 'text-white' : 'bg-gray-100 text-gray-400 hover:text-teal-600'}`}
                        style={t.stage === st ? { background: TEAL } : {}}>
                        {st}
                      </button>
                    ))}
                    <button onClick={() => setTaskForm({ talentId: t.id, name: t.full_name, title: '', ownerUserId: users[0]?.id || '' })}
                      className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 hover:bg-amber-100">
                      + Task
                    </button>
                  </div>
                  {taskForm && taskForm.talentId === t.id && (
                    <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Delegate a task — {taskForm.name}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <select value={taskForm.ownerUserId} onChange={(e) => setTaskForm({ ...taskForm, ownerUserId: e.target.value })}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs">
                          {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                        </select>
                        <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          placeholder="e.g. Call candidate Friday" className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none" />
                        <button onClick={createTalentTask} disabled={taskSaving || !taskForm.title || !taskForm.ownerUserId}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40" style={{ background: TEAL }}>
                          {taskSaving ? 'Creating…' : 'Create'}
                        </button>
                        <button onClick={() => setTaskForm(null)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PARTNERS — applications pipeline */}
        {tab === 'partners' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-500">{partnerRows.length} partner applications · source: /partnerships + pitch links</div>
              <a href="/partnerships" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold" style={{ background: '#F6FAF9', color: TEAL }}>
                <ExternalLink className="h-3 w-3" /> View partnerships page
              </a>
            </div>
            {!partnerRows.length && <div className="rounded-2xl border border-dashed border-teal-200 bg-white p-6 text-sm text-gray-400">No applications yet. Send a pitch link (Links tab) — applications land here tagged to the property they came through.</div>}
            <div className="grid gap-3 md:grid-cols-2">
              {partnerRows.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-gray-900">{p.company_name}</div>
                      <div className="text-xs text-gray-400">{p.contact_name}{p.email ? ` · ${p.email}` : ''}{p.website ? ` · ${p.website}` : ''}</div>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: '#E8F4F1', color: TEAL }}>{p.status}</span>
                  </div>
                  {p.context_property && (
                    <div className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: '#E8F4F1', color: TEAL }}>
                      📍 via {p.context_property}
                    </div>
                  )}
                  <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-gray-500">
                    {p.category && <div><span className="font-semibold text-gray-700">Category:</span> {p.category}</div>}
                    {p.offering && <div><span className="font-semibold text-gray-700">Offering:</span> {p.offering}</div>}
                    {p.coverage && <div><span className="font-semibold text-gray-700">Coverage:</span> {p.coverage}</div>}
                    {p.scale_readiness && <div><span className="font-semibold text-gray-700">Scale:</span> {p.scale_readiness}</div>}
                    {p.why_us && <div><span className="font-semibold text-gray-700">Why us:</span> {p.why_us}</div>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-50 pt-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => patchRow('/api/partnerships', p.id, { rating: n })}
                        className={`h-6 w-6 rounded-full text-[10px] font-bold ${(p.rating ?? 0) >= n ? 'text-white' : 'bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600'}`}
                        style={(p.rating ?? 0) >= n ? { background: TEAL } : {}}>
                        {n}
                      </button>
                    ))}
                    {['new', 'reviewing', 'call', 'pilot', 'signed', 'passed'].map((s) => (
                      <button key={s} onClick={() => patchRow('/api/partnerships', p.id, { status: s })}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${p.status === s ? 'text-white' : 'bg-gray-100 text-gray-400 hover:text-teal-600'}`}
                        style={p.status === s ? { background: TEAL } : {}}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LINKS — copy-ready links + pitch builder */}
        {tab === 'links' && (
          <div>
            <div className="mb-4 text-sm font-semibold text-gray-500">Copy a link, send it to the right person</div>

            {/* Pitch links — one per client */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-50">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEAL }}>🎯 Personalized pitch links</div>
              <div className="mt-0.5 text-[11px] text-gray-400">Opens the full Attenda presentation personalized with that property&apos;s info. Sending this = pitching every property at once.</div>
              {pitchClients.map((c) => (
                <LinkRow key={c.id}
                  url={`https://attendaapp.com/pitch/${c.pitch_key}`}
                  label={c.name}
                  when="Send to: prospective partners you want tied to this property"
                  copied={copied === c.id}
                  onCopy={() => copyLink(`https://attendaapp.com/pitch/${c.pitch_key}`, c.id)}
                  previewHref={`/pitch/${c.pitch_key}`}
                />
              ))}
              {!pitchClients.length && <div className="mt-2 text-xs text-gray-400">No clients yet — add one in the Clients tab.</div>}
            </div>

            {/* Track links */}
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal-50">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEAL }}>🔗 Track links</div>
              <LinkRow url="https://attendaapp.com/careers" label="/careers — Talent track"
                when="Send to: strong people you'd hire even without an opening"
                copied={copied === 'careers'} onCopy={() => copyLink('https://attendaapp.com/careers', 'careers')}
                previewHref="/careers" />
              <LinkRow url="https://attendaapp.com/partnerships" label="/partnerships — Partner track"
                when="Send to: companies (procurement, distributors, tech) — general application"
                copied={copied === 'partnerships'} onCopy={() => copyLink('https://attendaapp.com/partnerships', 'partnerships')}
                previewHref="/partnerships" />
              <LinkRow url="https://attendaapp.com/corporate" label="/corporate — Hired staff onboarding"
                when="Send to: new hires with their login (they created via your invite)"
                copied={copied === 'corporate'} onCopy={() => copyLink('https://attendaapp.com/corporate', 'corporate')} />
            </div>
          </div>
        )}
      </div>

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-bold text-gray-900">Add team member</div>
              <button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2.5">
              <input value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} placeholder="name@attenda.com"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <input value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} placeholder="Full name"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <input value={nu.title} onChange={(e) => setNu({ ...nu, title: e.target.value })} placeholder="Title (optional)"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <input value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} placeholder="Temporary password"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <button onClick={createUser} disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
                style={{ background: `linear-gradient(135deg,#3BBCAC,${TEAL})` }}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create member (Field Ops auto-authorized)
              </button>
              <p className="text-center text-[11px] text-gray-400">Positions & client assignments are granted on their card after creation.</p>
            </div>
          </div>
        </div>
      )}

      {/* Credentials handoff — shown right after member creation */}
      {creds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <div className="font-bold text-gray-900">Team member created 🎉</div>
              <button onClick={() => setCreds(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <p className="mb-3 text-[11px] text-gray-400">Share these credentials with them — they log in at attendaapp.com/corporate.</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-[#F6FAF9] px-3.5 py-2.5">
                <span className="truncate font-mono text-xs text-gray-700">{creds.email}</span>
                <button onClick={() => { navigator.clipboard.writeText(creds.email); setCopied('cred-email'); setTimeout(() => setCopied(''), 1500); }}
                  className="ml-2 shrink-0 text-[10px] font-bold" style={{ color: TEAL }}>{copied === 'cred-email' ? 'Copied!' : 'Copy'}</button>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#F6FAF9] px-3.5 py-2.5">
                <span className="font-mono text-xs text-gray-700">{creds.password}</span>
                <button onClick={() => { navigator.clipboard.writeText(creds.password); setCopied('cred-pass'); setTimeout(() => setCopied(''), 1500); }}
                  className="ml-2 shrink-0 text-[10px] font-bold" style={{ color: TEAL }}>{copied === 'cred-pass' ? 'Copied!' : 'Copy'}</button>
              </div>
            </div>
            <button onClick={() => setCreds(null)} className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white shadow-md"
              style={{ background: `linear-gradient(135deg,#3BBCAC,${TEAL})` }}>Done</button>
          </div>
        </div>
      )}

      {/* Add client modal */}
      {showClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-bold text-gray-900">Add client</div>
              <button onClick={() => setShowClient(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2.5">
              <input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} placeholder="Client name (e.g. Best Western Pembroke Pines)"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <input value={nc.brand} onChange={(e) => setNc({ ...nc, brand: e.target.value })} placeholder="Brand (optional)"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <div className="flex gap-2">
                <input value={nc.rooms} onChange={(e) => setNc({ ...nc, rooms: e.target.value })} placeholder="Rooms"
                  className="w-1/3 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
                <input value={nc.address} onChange={(e) => setNc({ ...nc, address: e.target.value })} placeholder="Address (optional)"
                  className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              </div>
              <button onClick={createClient}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md"
                style={{ background: `linear-gradient(135deg,#3BBCAC,${TEAL})` }}>
                <Check className="h-4 w-4" /> Create client record
              </button>
              <p className="text-center text-[11px] text-gray-400">Then assign staff on their user cards. No new onboarding needed.</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit client modal */}
      {ec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-bold text-gray-900">Edit client · <span className="font-mono text-xs text-gray-400">{ec.slug}</span></div>
              <button onClick={() => setEc(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2.5">
              <input value={ec.name} onChange={(e) => setEc({ ...ec, name: e.target.value })} placeholder="Client name"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <input value={ec.brand || ''} onChange={(e) => setEc({ ...ec, brand: e.target.value })} placeholder="Brand (optional)"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <div className="flex gap-2">
                <input type="number" value={ec.rooms ?? ''} onChange={(e) => setEc({ ...ec, rooms: e.target.value ? parseInt(e.target.value, 10) : null })} placeholder="Rooms"
                  className="w-1/3 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
                <input value={ec.address || ''} onChange={(e) => setEc({ ...ec, address: e.target.value })} placeholder="Address (optional)"
                  className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              </div>
              <textarea value={ec.notes || ''} onChange={(e) => setEc({ ...ec, notes: e.target.value })} rows={3} placeholder="Notes (contacts, context, anything the team should know)"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <select value={ec.status} onChange={(e) => setEc({ ...ec, status: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                {!['active', 'onboarding', 'paused', 'churned'].includes(ec.status) && <option value={ec.status}>{ec.status}</option>}
                <option value="active">Active</option>
                <option value="onboarding">Onboarding</option>
                <option value="paused">Paused</option>
                <option value="churned">Churned</option>
              </select>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setEc(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={saveClient} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md"
                  style={{ background: `linear-gradient(135deg,#3BBCAC,${TEAL})` }}>Save changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit page modal */}
      {editPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-bold text-gray-900">Edit page · /{editPage.slug}</div>
              <button onClick={() => setEditPage(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2.5">
              <input value={editPage.title} onChange={(e) => setEditPage({ ...editPage, title: e.target.value })} placeholder="Title"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-teal-400" />
              <div className="flex gap-2">
                <select value={editPage.audience} onChange={(e) => setEditPage({ ...editPage, audience: e.target.value })}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400">
                  <option value="universal">Universal (everyone)</option>
                  {positions.map((p) => <option key={p.key} value={p.key}>{p.title}</option>)}
                </select>
                <input type="number" value={editPage.sort_order} onChange={(e) => setEditPage({ ...editPage, sort_order: parseInt(e.target.value, 10) || 0 })}
                  className="w-24 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400" />
              </div>
              <textarea value={editPage.body} onChange={(e) => setEditPage({ ...editPage, body: e.target.value })} rows={12}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 font-mono text-xs leading-relaxed outline-none focus:border-teal-400" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditPage(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500">Cancel</button>
                <button onClick={savePage} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md"
                  style={{ background: `linear-gradient(135deg,#3BBCAC,${TEAL})` }}>Save page</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}