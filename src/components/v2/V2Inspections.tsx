'use client';

/* ═════════════════════════════════════════════ components/v2/V2Inspections.tsx
   Attenda V2 — Inspections (module 5). NO MOCKUP EXISTS — built from the
   brief's description ("Brand, local, safety, and departmental inspections")
   on the established V2 screen pattern. An inspection = a checklist template
   (`staff_checklists`) run as an instance (`staff_checklist_instances`) with
   per-item pass tracking and a computed score. Every number traces to real
   rows — no fabricated data (guardrail §7).
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck, ShieldCheck, AlertTriangle, CheckCircle2, Clock,
  Building2, Play, RefreshCw, ChevronDown, ChevronRight, ListChecks, Timer,
} from 'lucide-react';
import {
  getChecklists, getChecklistInstances, createChecklistInstance,
  updateChecklistInstance, type Checklist, type ChecklistInstance,
} from '@/lib/supabase';
import { V2KpiCard, V2Panel, V2Pill, V2ScreenHeader, V2QuickActions, v2StatusTone } from './ui';

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function scoreOf(inst: ChecklistInstance, total: number): number {
  if (!total) return 0;
  return Math.round(((inst.checked_items?.length || 0) / total) * 100);
}

type Row = { inst: ChecklistInstance; checklist: Checklist };

export default function V2Inspections({ hotelId, userName, isAdmin }: { hotelId: string; userName?: string; isAdmin?: boolean }) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [todayRows, setTodayRows] = useState<ChecklistInstance[]>([]);
  const [weekRows, setWeekRows] = useState<ChecklistInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'In progress' | 'Completed'>('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [starting, setStarting] = useState<string>('');

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true); setError(null);
    try {
      const cls = await getChecklists(hotelId);
      setChecklists(cls);
      const today = await getChecklistInstances(hotelId);
      setTodayRows(today);
      // 7-day trend: fetch each of the last 6 prior days in parallel
      const dates: string[] = [];
      for (let i = 1; i <= 6; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dates.push(isoDate(d));
      }
      const rest = await Promise.all(dates.map(ds => getChecklistInstances(hotelId, ds)));
      setWeekRows([...today, ...rest.flat()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inspections');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => { void load(); }, [load]);

  const byId = useMemo(() => new Map(checklists.map(c => [c.id, c])), [checklists]);
  const rows: Row[] = useMemo(
    () => todayRows
      .map(inst => {
        const checklist = byId.get(inst.checklist_id);
        return checklist ? { inst, checklist } : null;
      })
      .filter((r): r is Row => r !== null),
    [todayRows, byId],
  );

  const totalItems = useCallback((c: Checklist) => c.items?.length || 0, []);

  // KPIs — all traced to real rows
  const completedToday = rows.filter(r => r.inst.completed).length;
  const weekCompleted = weekRows.filter(i => i.completed).length;
  const passRate = useMemo(() => {
    const scored = weekRows.filter(i => i.completed && byId.get(i.checklist_id));
    if (!scored.length) return null;
    const pct = scored.reduce((s, i) => {
      const c = byId.get(i.checklist_id);
      return s + (c ? scoreOf(i, totalItems(c)) : 0);
    }, 0) / scored.length;
    return Math.round(pct);
  }, [weekRows, byId, totalItems]);
  const avgMins = useMemo(() => {
    const timed = weekRows.filter(i => i.completed && i.completed_at);
    if (!timed.length) return null;
    const mins = timed.reduce((s, i) => {
      const t = (new Date(i.completed_at as string).getTime() - new Date(i.created_at).getTime()) / 60000;
      return s + Math.max(0, t);
    }, 0) / timed.length;
    return Math.round(mins);
  }, [weekRows]);
  const departments = useMemo(() => new Set(checklists.map(c => c.department || c.assigned_role).filter(Boolean)).size, [checklists]);

  const filtered = rows.filter(r =>
    filter === 'All' ? true : filter === 'Completed' ? r.inst.completed : !r.inst.completed,
  );

  const startInspection = async (checklistId: string) => {
    if (!checklistId) return;
    try {
      await createChecklistInstance({ checklist_id: checklistId, hotel_id: hotelId, staff_name: userName || undefined });
      setStarting('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start inspection');
    }
  };

  const toggleItem = async (row: Row, itemId: string, checked: boolean) => {
    const inst = row.inst;
    const next = checked
      ? (inst.checked_items || []).filter(x => x.item_id !== itemId)
      : [...(inst.checked_items || []), { item_id: itemId, checked_at: new Date().toISOString() }];
    const allDone = row.checklist.items.length > 0 && next.length === row.checklist.items.length;
    // optimistic
    setTodayRows(prev => prev.map(p => p.id === inst.id ? { ...p, checked_items: next, completed: allDone ? true : p.completed } : p));
    try {
      await updateChecklistInstance(inst.id, { checked_items: next, completed: allDone || undefined });
      if (allDone) await load();
    } catch {
      void load();
    }
  };

  const quickActions = [
    { icon: RefreshCw, label: 'Refresh', sub: 'Reload today\'s runs', onClick: () => void load() },
    ...(checklists.length ? [{
      icon: Play, label: 'Start an inspection', sub: checklists[0]?.name || '', onClick: () => void startInspection(checklists[0].id),
    }] : []),
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        title="Inspections"
        subtitle="Brand, local, safety, and departmental inspections — scored from real checklist runs."
        banner="Inspections run from your checklist templates. Score = items passed ÷ items on the checklist. Every score traces to a real run."
      />

      {error && (
        <div className="mb-4 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold flex items-center justify-between"
          style={{ backgroundColor: '#FDECEC', color: '#DC2626' }}>
          <span className="flex items-center gap-2"><AlertTriangle size={14} /> {error}</span>
          <button onClick={() => void load()} className="underline font-bold">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-[13px] font-semibold" style={{ color: '#5B6B7E' }}>
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading inspections…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
            <V2KpiCard icon={ClipboardCheck} label="Runs today" value={rows.length} sub={`${completedToday} completed`} subTone={completedToday === rows.length && rows.length > 0 ? 'green' : 'gray'} />
            <V2KpiCard icon={CheckCircle2} label="Completed (7d)" value={weekCompleted} sub="All checklist runs" />
            <V2KpiCard icon={ShieldCheck} label="Pass rate (7d)" value={passRate === null ? '—' : `${passRate}%`} sub={passRate === null ? 'No completed runs yet' : passRate >= 90 ? 'Strong' : passRate >= 70 ? 'Watch' : 'Action needed'} subTone={passRate === null ? 'gray' : passRate >= 90 ? 'green' : passRate >= 70 ? 'amber' : 'red'} />
            <V2KpiCard icon={Timer} label="Avg completion" value={avgMins === null ? '—' : `${avgMins}m`} sub={avgMins === null ? 'No timed runs yet' : 'Start → completed'} />
            <V2KpiCard icon={Building2} label="Departments" value={departments} sub="With active checklists" />
            <V2KpiCard icon={ListChecks} label="Active templates" value={checklists.length} sub="Available to run" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
            {/* WORK — inspection runs */}
            <div className="xl:col-span-2 flex flex-col gap-4">
              <V2Panel title="Today's Inspection Runs">
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {(['All', 'In progress', 'Completed'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={filter === f ? { backgroundColor: '#14A8A0', color: 'white' } : { backgroundColor: '#EEF1F4', color: '#5B6B7E' }}>
                      {f}
                    </button>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <div className="py-10 text-center text-[13px]" style={{ color: '#5B6B7E' }}>
                    {rows.length === 0
                      ? 'No inspection runs today. Start one from a template on the right.'
                      : 'No runs match this filter.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-left" style={{ color: '#5B6B7E' }}>
                          <th className="font-semibold pb-2 pr-3">Inspection</th>
                          <th className="font-semibold pb-2 pr-3">Score</th>
                          <th className="font-semibold pb-2 pr-3">Status</th>
                          <th className="font-semibold pb-2 pr-3">By</th>
                          <th className="font-semibold pb-2">Completed</th>
                          <th className="pb-2 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(({ inst, checklist }) => {
                          const total = totalItems(checklist);
                          const pct = scoreOf(inst, total);
                          const status = inst.completed ? 'Completed' : 'In progress';
                          const isOpen = expanded === inst.id;
                          return (
                            <React.Fragment key={inst.id}>
                              <tr
                                className="border-t cursor-pointer hover:bg-[#F6F8FA]" style={{ borderColor: '#E5EAF0' }}
                                onClick={() => setExpanded(isOpen ? null : inst.id)}
                              >
                                <td className="py-2.5 pr-3">
                                  <div className="font-semibold" style={{ color: '#16233B' }}>{checklist.name}</div>
                                  <div className="text-[11px]" style={{ color: '#5B6B7E' }}>
                                    {checklist.department || checklist.assigned_role} · {total} items
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3">
                                  <V2Pill label={`${pct}%`} tone={pct >= 90 ? 'green' : pct >= 70 ? 'amber' : 'red'} />
                                </td>
                                <td className="py-2.5 pr-3"><V2Pill label={status} tone={v2StatusTone(status)} /></td>
                                <td className="py-2.5 pr-3" style={{ color: '#16233B' }}>{inst.staff_name || '—'}</td>
                                <td className="py-2.5 pr-3" style={{ color: '#5B6B7E' }}>{inst.completed ? fmtTime(inst.completed_at) : '—'}</td>
                                <td className="py-2.5" style={{ color: '#5B6B7E' }}>{isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                              </tr>
                              {isOpen && (
                                <tr className="border-t" style={{ borderColor: '#E5EAF0', backgroundColor: '#FBFCFD' }}>
                                  <td colSpan={6} className="py-3 px-2">
                                    <div className="flex flex-col gap-1.5">
                                      {checklist.items.map(item => {
                                        const done = (inst.checked_items || []).some(x => x.item_id === item.id);
                                        return (
                                          <button
                                            key={item.id}
                                            onClick={e => { e.stopPropagation(); if (!inst.completed) void toggleItem({ inst, checklist }, item.id, done); }}
                                            className="flex items-center gap-2.5 text-left text-[12.5px] px-2 py-1.5 rounded-lg hover:bg-white"
                                            style={{ cursor: inst.completed ? 'default' : 'pointer' }}
                                          >
                                            <span
                                              className="flex items-center justify-center flex-none w-4 h-4 rounded border"
                                              style={done
                                                ? { backgroundColor: '#14A8A0', borderColor: '#14A8A0', color: 'white' }
                                                : { borderColor: '#C6CFDA', color: 'transparent' }}
                                            >
                                              <CheckCircle2 size={12} />
                                            </span>
                                            <span style={{ color: done ? '#16233B' : '#5B6B7E', textDecoration: done ? 'none' : 'none' }}>{item.label}</span>
                                          </button>
                                        );
                                      })}
                                      {!inst.completed && (
                                        <div className="text-[11px] mt-1" style={{ color: '#5B6B7E' }}>
                                          Tap items to pass them. Score updates live — completing every item closes the run.
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </V2Panel>
            </div>

            {/* ACTION rail */}
            <div className="flex flex-col gap-4">
              <V2Panel title="Needs Attention">
                {rows.filter(r => !r.inst.completed).length === 0 ? (
                  <div className="text-[13px] py-3" style={{ color: '#5B6B7E' }}>All of today's runs are closed. Clean board. ✅</div>
                ) : (
                  <ul className="flex flex-col gap-2.5 text-[13px]">
                    {rows.filter(r => !r.inst.completed).map(({ inst, checklist }) => (
                      <li key={inst.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate" style={{ color: '#16233B' }}>{checklist.name}</div>
                          <div className="text-[11px]" style={{ color: '#5B6B7E' }}>
                            {inst.staff_name || 'Unassigned'} · started {fmtTime(inst.created_at)}
                          </div>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-1 rounded-lg whitespace-nowrap"
                          style={{ backgroundColor: '#FEF4E4', color: '#D97706' }}>
                          {scoreOf(inst, totalItems(checklist))}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </V2Panel>

              <V2Panel title="Recently Completed">
                {rows.filter(r => r.inst.completed).length === 0 ? (
                  <div className="text-[13px] py-3" style={{ color: '#5B6B7E' }}>No completed runs today yet.</div>
                ) : (
                  <ul className="flex flex-col gap-2.5 text-[13px]">
                    {rows.filter(r => r.inst.completed).slice(0, 5).map(({ inst, checklist }) => (
                      <li key={inst.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate" style={{ color: '#16233B' }}>{checklist.name}</div>
                          <div className="text-[11px]" style={{ color: '#5B6B7E' }}>{inst.staff_name || '—'} · {fmtTime(inst.completed_at)}</div>
                        </div>
                        <V2Pill label={`${scoreOf(inst, totalItems(checklist))}%`} tone={scoreOf(inst, totalItems(checklist)) >= 90 ? 'green' : scoreOf(inst, totalItems(checklist)) >= 70 ? 'amber' : 'red'} />
                      </li>
                    ))}
                  </ul>
                )}
              </V2Panel>

              {checklists.length > 0 && (
                <V2Panel title="Start an Inspection">
                  <div className="flex flex-col gap-2">
                    <select
                      value={starting}
                      onChange={e => setStarting(e.target.value)}
                      className="w-full text-[13px] px-3 py-2 rounded-lg border bg-white"
                      style={{ borderColor: '#E5EAF0', color: '#16233B' }}
                    >
                      <option value="">Choose a checklist…</option>
                      {checklists.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.items?.length || 0} items)</option>
                      ))}
                    </select>
                    <button
                      disabled={!starting}
                      onClick={() => void startInspection(starting)}
                      className="w-full py-2 rounded-lg text-[12.5px] font-bold text-white disabled:opacity-40"
                      style={{ backgroundColor: '#14A8A0' }}
                    >
                      Start run as {userName || 'me'}
                    </button>
                  </div>
                </V2Panel>
              )}

              <V2QuickActions actions={quickActions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}