'use client';

/* ═══════════════════════════════════════════ components/v2/V2Dashboard.tsx
   Attenda V2 — Dashboard. First screen built on the Attenda Screen Formula:

     NOW    — operational snapshot strip (KPI cards)
     WORK   — the actual queues (active requests, today's plan)
     ACTION — contextual rail (needs attention, quick actions, recent activity)

   Data: parent's live `requests` state (same data OrdersView renders) + a
   single mount-time fetch for schedules/forecast/checklists. No polling, no
   subscriptions, no effects touched at parent level. Presentation only.
   ═════════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import {
  Bell, CheckCircle2, Timer, Users, BedDouble,
  ClipboardList, CalendarDays, Bus, BookOpen, Plus, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { V2KpiCard, V2Panel, V2Pill, V2ScreenHeader, v2StatusTone, type V2Tone } from './ui';
import {
  getStaffSchedulesRange, getWeeklyForecasts, getChecklists, getChecklistInstances,
  type StaffSchedule, type WeeklyForecast, type Checklist, type ChecklistInstance,
} from '@/lib/supabase';

/* ── Props ─────────────────────────────────────────────────────────────── */
export interface V2RequestRow {
  id: string;
  guest_name: string;
  room: string;
  type: string;
  details: string;
  status: string;
  created_at: string;
  assigned_to?: string;
}

interface Props {
  hotelId: string;
  hotelName: string;
  timezone?: string;
  sessionName: string;
  effectiveRole: string;
  requests: V2RequestRow[];
  onOpenTab: (tab: string) => void;
  onUpdateRequest: (id: string, status: string) => Promise<void>;
}

const INK = '#16233B', MUTED = '#5B6B7E', BORDER = '#E5EAF0';

function ageOf(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

/* ═══════════════════════════════════════════════════════ Component ═════ */
export default function V2Dashboard({
  hotelId, hotelName, timezone, sessionName, effectiveRole, requests,
  onOpenTab, onUpdateRequest,
}: Props) {
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [forecast, setForecast] = useState<WeeklyForecast | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [instances, setInstances] = useState<ChecklistInstance[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [asOf, setAsOf] = useState('');

  const tz = timezone || 'America/New_York';

  /* Single mount-time load — same pattern as the legacy DailyBriefView. */
  useEffect(() => {
    if (!hotelId) return;
    setAsOf(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }));
    (async () => {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
      const [sch, fws, tpl, inst] = await Promise.all([
        getStaffSchedulesRange(hotelId, todayStr, todayStr).catch(() => []),
        getWeeklyForecasts(hotelId, todayStr).catch(() => []),
        getChecklists(hotelId).catch(() => []),
        getChecklistInstances(hotelId, todayStr).catch(() => []),
      ]);
      setSchedules(sch || []);
      setForecast((fws || [])[0] || null);
      setChecklists(tpl || []);
      setInstances(inst || []);
    })();
  }, [hotelId, tz]);

  /* ── Derived: NOW ──────────────────────────────────────────────────── */
  const live = requests.filter(r => r.room !== 'STAFF' && r.type !== 'Shuttle Booking');
  const active = live.filter(r => r.status === 'pending' || r.status === 'in-progress');
  const pending = live.filter(r => r.status === 'pending');
  const unassigned = active.filter(r => !r.assigned_to);
  const completed = live.filter(r => r.status === 'completed' || r.status === 'closed');
  const responded = live.filter(r => r.status !== 'pending');
  const avgResponseMin = responded.length
    ? Math.round(responded.reduce((a, r) => a + Math.max(0, (Date.now() - new Date(r.created_at).getTime()) / 60000), 0) / responded.length)
    : 0;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const onDuty = schedules.filter(s => {
    if (!s.start_time || !s.end_time) return false;
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return false;
    const a = sh * 60 + sm, b = eh * 60 + em;
    return b <= a ? (nowMin >= a || nowMin <= b) : (nowMin >= a && nowMin <= b);
  }).length;

  const occ = forecast ? Number(forecast.occupancy_pct) : null;
  const arrivals = forecast ? forecast.arrivals : null;
  const departures = forecast ? forecast.departures : null;

  /* ── Derived: incomplete checklist items (who owns what) ───────────── */
  const tplName = (id: string) => checklists.find(c => c.id === id)?.name || 'Checklist';
  const openInstances = instances.filter(i => !i.completed).slice(0, 4);
  const doneCount = instances.filter(i => i.completed).length;

  /* ── Derived: ACTION — needs attention ─────────────────────────────── */
  type Alert = { key: string; text: string; cta: string; tab: string; tone: V2Tone };
  const alerts: Alert[] = [];
  if (unassigned.length) alerts.push({ key: 'unassigned', text: `${unassigned.length} active request${unassigned.length > 1 ? 's' : ''} without an owner`, cta: 'Assign in Requests', tab: 'orders', tone: 'red' });
  if (pending.length > 3) alerts.push({ key: 'pending', text: `${pending.length} requests waiting on action`, cta: 'Open queue', tab: 'orders', tone: 'amber' });
  if (openInstances.length) alerts.push({ key: 'checklists', text: `${openInstances.length} checklist${openInstances.length > 1 ? 's' : ''} not completed today`, cta: 'Open checklists', tab: 'todos', tone: 'amber' });

  const recentDone = [...completed]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 4);

  /* ── Greeting ──────────────────────────────────────────────────────── */
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (sessionName || '').split(' ')[0] || 'there';
  const dateLabel = new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' });

  const act = async (id: string, status: string) => {
    setBusyId(id);
    try { await onUpdateRequest(id, status); } finally { setBusyId(null); }
  };

  const roleCanAct = effectiveRole !== 'vendor';

  /* ═══════════════════════════════════════════════════════ Render ═════ */
  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        greeting={`${greeting}, ${firstName}`}
        title="Operations Snapshot"
        subtitle={`${hotelName} · ${dateLabel} · staff-reported activity`}
        dataAsOf={asOf}
      />

      {/* ── 1. NOW — operational snapshot strip ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <V2KpiCard icon={Bell} label="Active requests" value={active.length}
          sub={pending.length ? `${pending.length} pending` : 'All in progress'}
          subTone={pending.length ? 'amber' : 'green'}
          onClick={() => onOpenTab('orders')} />
        <V2KpiCard icon={CheckCircle2} label="Completed today" value={completed.length}
          sub={active.length === 0 ? 'Queue clear' : `${active.length} still open`}
          subTone={active.length === 0 ? 'green' : 'gray'}
          onClick={() => onOpenTab('orders')} />
        <V2KpiCard icon={Timer} label="Avg response" value={avgResponseMin ? `${avgResponseMin}m` : '—'}
          sub="time to first action" onClick={() => onOpenTab('orders')} />
        <V2KpiCard icon={Users} label="Staff on duty" value={onDuty}
          sub={`${schedules.length} scheduled today`} onClick={() => onOpenTab('schedules')} />
        <V2KpiCard icon={BedDouble} label="Occupancy" value={occ != null ? `${Math.round(occ)}%` : '—'}
          sub={arrivals != null ? `${arrivals} in · ${departures} out` : 'no forecast yet'}
          onClick={() => onOpenTab('forecast')} />
      </div>

      {/* ── 2. WORK + 3. ACTION — center working area, right rail ──────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">

        {/* WORK · left+center (spans 2 cols on xl) */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          <V2Panel
            title="Active requests"
            action={
              <button onClick={() => onOpenTab('orders')}
                className="text-[12px] font-bold flex items-center gap-1 hover:underline"
                style={{ color: '#0E7C74' }}>
                Open queue <ArrowRight size={13} />
              </button>
            }
          >
            {active.length === 0 ? (
              <p className="text-[13px] py-6 text-center" style={{ color: MUTED }}>
                Nothing waiting. Every reported request is completed.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left" style={{ color: MUTED }}>
                      <th className="font-semibold pb-2 pr-3">Request</th>
                      <th className="font-semibold pb-2 pr-3">Room</th>
                      <th className="font-semibold pb-2 pr-3">Status</th>
                      <th className="font-semibold pb-2 pr-3">Owner</th>
                      <th className="font-semibold pb-2 pr-3">Age</th>
                      {roleCanAct && <th className="font-semibold pb-2">Act</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {active.slice(0, 8).map(r => (
                      <tr key={r.id} className="border-t" style={{ borderColor: BORDER }}>
                        <td className="py-2.5 pr-3">
                          <div className="font-semibold" style={{ color: INK }}>{r.type}</div>
                          <div className="text-[11px]" style={{ color: MUTED }}>
                            {r.guest_name}{r.details ? ` · ${r.details}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 font-medium" style={{ color: INK }}>{r.room}</td>
                        <td className="py-2.5 pr-3"><V2Pill label={r.status} tone={v2StatusTone(r.status)} /></td>
                        <td className="py-2.5 pr-3">
                          {r.assigned_to
                            ? <span className="text-[12px] font-medium" style={{ color: INK }}>{r.assigned_to}</span>
                            : <V2Pill label="Unassigned" tone="amber" />}
                        </td>
                        <td className="py-2.5 pr-3 text-[12px]" style={{ color: MUTED }}>{ageOf(r.created_at)}</td>
                        {roleCanAct && (
                          <td className="py-2.5">
                            <div className="flex gap-1.5">
                              {r.status === 'pending' && (
                                <button disabled={busyId === r.id}
                                  onClick={() => act(r.id, 'in-progress')}
                                  className="text-[11px] font-bold px-2 py-1 rounded-lg border hover:opacity-80 disabled:opacity-40"
                                  style={{ borderColor: BORDER, color: '#0E7C74' }}>
                                  Start
                                </button>
                              )}
                              {r.status === 'in-progress' && (
                                <button disabled={busyId === r.id}
                                  onClick={() => act(r.id, 'completed')}
                                  className="text-[11px] font-bold px-2 py-1 rounded-lg text-white hover:opacity-85 disabled:opacity-40"
                                  style={{ backgroundColor: '#14A8A0' }}>
                                  Complete
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {active.length > 8 && (
                  <p className="text-[12px] mt-2" style={{ color: MUTED }}>
                    +{active.length - 8} more in the queue
                  </p>
                )}
              </div>
            )}
          </V2Panel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <V2Panel title="Today's plan">
              <ul className="flex flex-col gap-3 text-[13px]">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2" style={{ color: INK }}>
                    <ClipboardList size={15} style={{ color: '#0E7C74' }} /> Checklists
                  </span>
                  <span className="font-bold" style={{ color: INK }}>
                    {doneCount}/{instances.length} done
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2" style={{ color: INK }}>
                    <CalendarDays size={15} style={{ color: '#0E7C74' }} /> Shifts on duty
                  </span>
                  <span className="font-bold" style={{ color: INK }}>{onDuty}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2" style={{ color: INK }}>
                    <BedDouble size={15} style={{ color: '#0E7C74' }} /> Arrivals / departures
                  </span>
                  <span className="font-bold" style={{ color: INK }}>
                    {arrivals != null ? `${arrivals} / ${departures}` : '—'}
                  </span>
                </li>
              </ul>
            </V2Panel>

            <V2Panel
              title="Incomplete today"
              action={<span className="text-[11px] font-semibold" style={{ color: MUTED }}>owner · next step</span>}
            >
              {openInstances.length === 0 ? (
                <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>
                  All checklists completed. ✓
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {openInstances.map(i => (
                    <li key={i.id} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="font-medium truncate" style={{ color: INK }}>{tplName(i.checklist_id)}</span>
                      <button onClick={() => onOpenTab('todos')}
                        className="text-[11px] font-bold px-2 py-1 rounded-lg whitespace-nowrap hover:opacity-80"
                        style={{ backgroundColor: '#FEF4E4', color: '#D97706' }}>
                        {i.staff_name || 'Unassigned'} · finish
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </V2Panel>
          </div>
        </div>

        {/* ACTION · right rail */}
        <div className="flex flex-col gap-4">
          <V2Panel title="Needs attention">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2.5 py-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E7F6EC' }}>
                  <CheckCircle2 size={16} style={{ color: '#16A34A' }} />
                </div>
                <p className="text-[13px] font-semibold" style={{ color: INK }}>All clear — nothing waiting on a decision.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {alerts.map(a => (
                  <li key={a.key} className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: a.tone === 'red' ? '#FDECEC' : '#FEF4E4' }}>
                        <AlertTriangle size={14} style={{ color: a.tone === 'red' ? '#DC2626' : '#D97706' }} />
                      </div>
                      <p className="text-[13px] font-medium leading-snug" style={{ color: INK }}>{a.text}</p>
                    </div>
                    <button onClick={() => onOpenTab(a.tab)}
                      className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap text-white hover:opacity-85 shrink-0"
                      style={{ backgroundColor: '#14A8A0' }}>
                      {a.cta}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </V2Panel>

          <V2Panel title="Quick actions">
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { icon: Plus, label: 'New request', tab: 'orders' },
                { label: 'My day', icon: ClipboardList, tab: 'todos' },
                { icon: CalendarDays, label: 'Schedule', tab: 'schedules' },
                { icon: Bus, label: 'Shuttle', tab: 'shuttle' },
                { icon: BookOpen, label: 'Right Answers', tab: 'knowledge' },
              ] as const).map(a => (
                <button key={a.label} onClick={() => onOpenTab(a.tab)}
                  className="flex items-center gap-2 text-[12px] font-semibold px-3 py-2.5 rounded-xl border hover:opacity-80"
                  style={{ borderColor: BORDER, color: INK }}>
                  <a.icon size={14} style={{ color: '#0E7C74' }} /> {a.label}
                </button>
              ))}
            </div>
          </V2Panel>

          <V2Panel
            title="Recent activity"
            action={<button onClick={() => onOpenTab('reports')}
              className="text-[12px] font-bold flex items-center gap-1 hover:underline" style={{ color: '#0E7C74' }}>
              Reports <ArrowRight size={13} />
            </button>}
          >
            {recentDone.length === 0 ? (
              <p className="text-[13px] py-3" style={{ color: MUTED }}>No completed activity yet today.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {recentDone.map(r => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="truncate" style={{ color: INK }}>
                      <span className="font-semibold">{r.type}</span>
                      <span style={{ color: MUTED }}> · {r.guest_name} · rm {r.room}</span>
                    </span>
                    <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: MUTED }}>
                      {new Date(r.created_at).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </V2Panel>
        </div>
      </div>

      <p className="text-[11px] mt-6 flex items-center gap-1.5" style={{ color: MUTED }}>
        Every number here traces to staff-reported activity — its owner and next action are one click away.
      </p>
    </div>
  );
}