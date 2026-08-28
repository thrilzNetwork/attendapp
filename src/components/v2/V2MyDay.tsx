'use client';

/* ═══════════════════════════════════════════ components/v2/V2MyDay.tsx
   Attenda V2 — My Day. "What do I need to execute?"

   Personal execution screen: my shift, my assigned tasks, my checklists,
   required reporting, quick links. Formula:
   NOW (my-day strip) → WORK (my tasks + checklists, inline complete) →
   ACTION (required reporting + quick actions rail).

   Data: parent's live `requests` (assigned_to = me) + one mount-time fetch
   for schedules/checklists. No polling, no subscriptions.
   ═════════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import {
  CalendarDays, ClipboardList, CheckCircle2, BarChart3, Clock,
  ArrowRight, BookOpen,
} from 'lucide-react';
import { V2KpiCard, V2Panel, V2Pill, V2ScreenHeader, v2StatusTone } from './ui';
import {
  supabase,
  getStaffSchedulesRange, getChecklists, getChecklistInstances,
  type StaffSchedule, type Checklist, type ChecklistInstance,
} from '@/lib/supabase';

interface Props {
  hotelId: string;
  hotelName: string;
  timezone?: string;
  sessionName: string;
  requests: {
    id: string; guest_name: string; room: string; type: string; details: string;
    status: string; created_at: string; assigned_to?: string;
  }[];
  onOpenTab: (tab: string) => void;
  onUpdateRequest: (id: string, status: string) => Promise<void>;
}

const INK = '#16233B', MUTED = '#5B6B7E', BORDER = '#E5EAF0';

function ageOf(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function V2MyDay({
  hotelId, hotelName, timezone, sessionName, requests, onOpenTab, onUpdateRequest,
}: Props) {
  const [myShifts, setMyShifts] = useState<StaffSchedule[]>([]);
  const [templates, setTemplates] = useState<Checklist[]>([]);
  const [instances, setInstances] = useState<ChecklistInstance[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [asOf, setAsOf] = useState('');

  const tz = timezone || 'America/New_York';
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });

  /* One mount-time load — no polling, no subscriptions. */
  useEffect(() => {
    if (!hotelId) return;
    setAsOf(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }));
    (async () => {
      const [sch, tpl, inst] = await Promise.all([
        getStaffSchedulesRange(hotelId, todayStr, todayStr).catch(() => []),
        getChecklists(hotelId).catch(() => []),
        getChecklistInstances(hotelId, todayStr).catch(() => []),
      ]);
      setMyShifts(sch || []);
      setInstances(inst || []);
      const used = new Set((inst || []).map(i => i.checklist_id));
      setTemplates((tpl || []).filter(t => used.has(t.id)));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const me = (sessionName || '').trim().toLowerCase();

  /* ── NOW: my shift ─────────────────────────────────────────────────── */
  const shift = myShifts.find(s => (s.staff_name || '').trim().toLowerCase() === me) || myShifts[0] || null;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const onDutyNow = shift ? (() => {
    const [sh, sm] = (shift.start_time || '').split(':').map(Number);
    const [eh, em] = (shift.end_time || '').split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return false;
    const a = sh * 60 + sm, b = eh * 60 + em;
    return b <= a ? (nowMin >= a || nowMin <= b) : (nowMin >= a && nowMin <= b);
  })() : false;
  const shiftLabel = shift ? `${shift.start_time?.slice(0, 5)} – ${shift.end_time?.slice(0, 5)}` : 'No shift today';
  const shiftDept = shift?.department || shift?.role || '';

  /* ── WORK: my assigned requests + my checklists ────────────────────── */
  const mine = requests.filter(r => r.assigned_to && (r.assigned_to || '').trim().toLowerCase() === me);
  const myActive = mine.filter(r => r.status === 'pending' || r.status === 'in-progress');
  const myDone = mine.filter(r => r.status === 'completed' || r.status === 'closed');
  const myOpenInstances = instances.filter(i => !i.completed);
  const myDoneInstances = instances.filter(i => i.completed);

  const progressOf = (inst: ChecklistInstance): { done: number; total: number; tpl: Checklist | undefined } => {
    const tpl = templates.find(t => t.id === inst.checklist_id);
    return { done: (inst.checked_items || []).length, total: tpl?.items?.length || 0, tpl };
  };

  const act = async (id: string, status: string) => {
    setBusyId(id);
    try { await onUpdateRequest(id, status); } finally { setBusyId(null); }
  };

  /* Checklist toggle is internal: optimistic local update + one DB write,
     same pattern as the legacy DailyBriefView. */
  const actChecklist = async (inst: ChecklistInstance, itemId: string, currentlyChecked: boolean) => {
    setBusyId(inst.id);
    // optimistic
    const newChecked = currentlyChecked
      ? (inst.checked_items || []).filter(x => x.item_id !== itemId)
      : [...(inst.checked_items || []), { item_id: itemId, checked_at: new Date().toISOString() }];
    const tpl = templates.find(t => t.id === inst.checklist_id);
    const completed = newChecked.length === (tpl?.items?.length || 0) && newChecked.length > 0;
    setInstances(prev => prev.map(i => i.id === inst.id ? { ...i, checked_items: newChecked, completed } : i));
    const { error } = await supabase.from('staff_checklist_instances').update({
      checked_items: newChecked,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', inst.id);
    if (error) {
      // roll back on failure
      setInstances(prev => prev.map(i => i.id === inst.id ? inst : i));
    }
    setBusyId(null);
  };

  /* Greeting */
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (sessionName || '').split(' ')[0] || 'there';
  const dateLabel = new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' });

  /* ═══════════════════════════════════════════════════════ Render ═════ */
  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        greeting={`${greeting}, ${firstName}`}
        title="My Day"
        subtitle={`${hotelName} · ${dateLabel}`}
        dataAsOf={asOf}
      />

      {/* ── 1. NOW — my day strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <V2KpiCard icon={Clock} label="My shift" value={shiftLabel}
          sub={shift ? (onDutyNow ? 'On duty now' : 'Not started yet') : 'Not scheduled'}
          subTone={onDutyNow ? 'green' : 'gray'} />
        <V2KpiCard icon={ClipboardList} label="My tasks" value={myActive.length}
          sub={myActive.length ? `${myDone.length} done today` : 'All clear'}
          subTone={myActive.length ? 'amber' : 'green'}
          onClick={() => onOpenTab('orders')} />
        <V2KpiCard icon={CalendarDays} label="My checklists" value={`${myDoneInstances.length}/${myOpenInstances.length + myDoneInstances.length}`}
          sub={myOpenInstances.length ? `${myOpenInstances.length} to finish` : 'All complete'}
          subTone={myOpenInstances.length ? 'amber' : 'green'} />
        <V2KpiCard icon={BarChart3} label="Required reporting" value={myOpenInstances.length > 0 ? '1 KPI log' : '0'}
          sub={myOpenInstances.length > 0 ? 'before shift end' : 'nothing due'}
          subTone={myOpenInstances.length > 0 ? 'amber' : 'green'}
          onClick={() => onOpenTab('kpis')} />
      </div>

      {/* ── 2. WORK + 3. ACTION ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">

        <div className="xl:col-span-2 flex flex-col gap-4">

          <V2Panel
            title="My tasks"
            action={<button onClick={() => onOpenTab('orders')}
              className="text-[12px] font-bold flex items-center gap-1 hover:underline" style={{ color: '#0E7C74' }}>
              All requests <ArrowRight size={13} />
            </button>}
          >
            {myActive.length === 0 ? (
              <p className="text-[13px] py-6 text-center" style={{ color: MUTED }}>
                Nothing assigned to you right now. {myDone.length > 0 && `You completed ${myDone.length} today.`}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left" style={{ color: MUTED }}>
                      <th className="font-semibold pb-2 pr-3">Task</th>
                      <th className="font-semibold pb-2 pr-3">Room</th>
                      <th className="font-semibold pb-2 pr-3">Status</th>
                      <th className="font-semibold pb-2 pr-3">Age</th>
                      <th className="font-semibold pb-2">Act</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myActive.map(r => (
                      <tr key={r.id} className="border-t" style={{ borderColor: BORDER }}>
                        <td className="py-2.5 pr-3">
                          <div className="font-semibold" style={{ color: INK }}>{r.type}</div>
                          <div className="text-[11px]" style={{ color: MUTED }}>
                            {r.guest_name}{r.details ? ` · ${r.details}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 font-medium" style={{ color: INK }}>{r.room}</td>
                        <td className="py-2.5 pr-3"><V2Pill label={r.status} tone={v2StatusTone(r.status)} /></td>
                        <td className="py-2.5 pr-3 text-[12px]" style={{ color: MUTED }}>{ageOf(r.created_at)}</td>
                        <td className="py-2.5">
                          {r.status === 'pending' ? (
                            <button disabled={busyId === r.id} onClick={() => act(r.id, 'in-progress')}
                              className="text-[11px] font-bold px-2 py-1 rounded-lg border hover:opacity-80 disabled:opacity-40"
                              style={{ borderColor: BORDER, color: '#0E7C74' }}>
                              Start
                            </button>
                          ) : (
                            <button disabled={busyId === r.id} onClick={() => act(r.id, 'completed')}
                              className="text-[11px] font-bold px-2 py-1 rounded-lg text-white hover:opacity-85 disabled:opacity-40"
                              style={{ backgroundColor: '#14A8A0' }}>
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </V2Panel>

          <V2Panel title="My checklists">
            {myOpenInstances.length === 0 ? (
              <p className="text-[13px] py-6 text-center" style={{ color: MUTED }}>
                All checklists complete. ✓
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {myOpenInstances.map(inst => {
                  const { done, total, tpl } = progressOf(inst);
                  const checkedIds = new Set((inst.checked_items || []).map(x => x.item_id));
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <li key={inst.id} className="border rounded-xl p-3.5" style={{ borderColor: BORDER }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-bold" style={{ color: INK }}>{tpl?.name || 'Checklist'}</span>
                        <span className="text-[12px] font-semibold" style={{ color: MUTED }}>{done}/{total} · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full mb-3" style={{ backgroundColor: '#EEF1F4' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: '#14A8A0' }} />
                      </div>
                      <ul className="flex flex-col gap-1.5">
                        {(tpl?.items || []).map(item => {
                          const isChecked = checkedIds.has(item.id);
                          return (
                            <li key={item.id}>
                              <button disabled={busyId === inst.id}
                                onClick={() => actChecklist(inst, item.id, isChecked)}
                                className="flex items-center gap-2.5 w-full text-left text-[13px] hover:opacity-75 disabled:opacity-40">
                                <span className="w-4.5 h-4.5 rounded flex items-center justify-center shrink-0"
                                  style={{
                                    width: 18, height: 18,
                                    backgroundColor: isChecked ? '#14A8A0' : 'transparent',
                                    border: isChecked ? '1px solid #14A8A0' : `1.5px solid ${BORDER}`,
                                  }}>
                                  {isChecked && <CheckCircle2 size={12} color="white" />}
                                </span>
                                <span style={{ color: isChecked ? MUTED : INK, textDecoration: isChecked ? 'line-through' : 'none' }}>
                                  {item.label}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </V2Panel>
        </div>

        {/* ACTION rail */}
        <div className="flex flex-col gap-4">
          <V2Panel title="Required reporting">
            {myOpenInstances.length > 0 ? (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: '#FEF4E4' }}>
                  <BarChart3 size={14} style={{ color: '#D97706' }} />
                </div>
                <div className="text-[13px]" style={{ color: INK }}>
                  <p className="font-semibold">Log today's KPIs before shift end</p>
                  <button onClick={() => onOpenTab('kpis')}
                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-white mt-2 hover:opacity-85"
                    style={{ backgroundColor: '#14A8A0' }}>
                    Open KPI log
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] py-3" style={{ color: MUTED }}>Nothing due — reporting is current. ✓</p>
            )}
          </V2Panel>

          <V2Panel title="Quick actions">
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { icon: BookOpen, label: 'Right Answers', tab: 'knowledge' },
                { icon: ClipboardList, label: 'To-Dos', tab: 'todos' },
                { icon: CalendarDays, label: 'Schedule', tab: 'schedules' },
                { icon: BarChart3, label: 'KPI log', tab: 'kpis' },
              ] as const).map(a => (
                <button key={a.label} onClick={() => onOpenTab(a.tab)}
                  className="flex items-center gap-2 text-[12px] font-semibold px-3 py-2.5 rounded-xl border hover:opacity-80"
                  style={{ borderColor: BORDER, color: INK }}>
                  <a.icon size={14} style={{ color: '#0E7C74' }} /> {a.label}
                </button>
              ))}
            </div>
          </V2Panel>

          <V2Panel title="Reference">
            <p className="text-[12px] leading-relaxed" style={{ color: MUTED }}>
              Your completed work today: <span className="font-bold" style={{ color: INK }}>{myDone.length} task{myDone.length === 1 ? '' : 's'}</span>,{' '}
              <span className="font-bold" style={{ color: INK }}>{myDoneInstances.length} checklist{myDoneInstances.length === 1 ? '' : 's'}</span>.
              Every item above updates the operations record the moment you act.
            </p>
          </V2Panel>
        </div>
      </div>
    </div>
  );
}