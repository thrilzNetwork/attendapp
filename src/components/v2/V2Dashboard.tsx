'use client';

/* ═════════════════════════════════════════════ components/v2/V2Dashboard.tsx
   Attenda V2 — Dashboard. EXACT implementation of mockup docs/v2-mockups/
   01-dashboard.jpg (spec: docs/v2-mockups/specs/01-dashboard.md).

   Layout per mockup:
     · 6 KPI cards — Open Requests · Inspections Today · Work Orders ·
       Arrivals Today · Occupancy · My Open Tasks
     · 2-col grid — LEFT: Today's Activity, Critical Alerts
                    RIGHT: Department Status, Occupancy Overview
     · bottom row — Recent Activity, Quick Actions

   Data policy: real data where the system has it; '—' where a mockup field
   has no backing data (Inspections, Work Orders, Department counts).
   ═════════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import {
  Bell, ClipboardCheck, Wrench, PlaneLanding, BedDouble, ListChecks,
  RefreshCw, ArrowRight, AlertTriangle, Plus, ClipboardList, Bus,
  BookOpen, CalendarDays,
} from 'lucide-react';
import { V2KpiCard, V2Panel, V2Pill, V2ScreenHeader, v2StatusTone, type V2Tone } from './ui';
import {
  getStaffSchedulesRange, getWeeklyForecasts, getChecklists, getChecklistInstances,
  type StaffSchedule, type WeeklyForecast, type Checklist, type ChecklistInstance,
} from '@/lib/supabase';

/* ── Props (unchanged — page.tsx contract) ──────────────────────────────── */
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

/* ═══════════════════════════════════════════════════════ Component ═════ */
export default function V2Dashboard({
  hotelId, hotelName, timezone, sessionName, effectiveRole, requests,
  onOpenTab, onUpdateRequest,
}: Props) {
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [forecast, setForecast] = useState<WeeklyForecast | null>(null);
  const [instances, setInstances] = useState<ChecklistInstance[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [asOf, setAsOf] = useState('');

  const tz = timezone || 'America/New_York';

  /* Single mount-time load (same wiring as before — presentation changed only). */
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

  /* ── Derived (real data) ───────────────────────────────────────────── */
  const live = requests.filter(r => r.room !== 'STAFF' && r.type !== 'Shuttle Booking');
  const active = live.filter(r => r.status === 'pending' || r.status === 'in-progress');
  const completed = live.filter(r => r.status === 'completed' || r.status === 'closed');
  const unassigned = active.filter(r => !r.assigned_to);
  const openTasks = instances.filter(i => !i.completed);

  const occ = forecast ? Number(forecast.occupancy_pct) : null;
  const arrivals = forecast ? forecast.arrivals : null;
  const departures = forecast ? forecast.departures : null;

  const refresh = () => { setAsOf(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })); };

  /* ── Critical alerts (real derivations) ────────────────────────────── */
  type Alert = { key: string; text: string; cta: string; tab: string; tone: V2Tone };
  const alerts: Alert[] = [];
  if (unassigned.length) alerts.push({ key: 'unassigned', text: `${unassigned.length} active request${unassigned.length > 1 ? 's' : ''} without an owner`, cta: 'Assign', tab: 'orders', tone: 'red' });
  if (openTasks.length) alerts.push({ key: 'tasks', text: `${openTasks.length} task${openTasks.length > 1 ? 's' : ''} not completed today`, cta: 'Open tasks', tab: 'todos', tone: 'amber' });

  /* ── Greeting ──────────────────────────────────────────────────────── */
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (sessionName || '').split(' ')[0] || 'there';

  const act = async (id: string, status: string) => {
    setBusyId(id);
    try { await onUpdateRequest(id, status); } finally { setBusyId(null); }
  };
  const roleCanAct = effectiveRole !== 'vendor';

  const tplName = (id: string) => checklists.find(c => c.id === id)?.name || 'Checklist';
  const recentDone = [...completed]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 5);

  /* ═══════════════════════════════════════════════════════ Render ═════ */
  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        greeting={`${greeting}, ${firstName}`}
        title="Dashboard"
        subtitle={`${hotelName} · daily operations overview`}
        dataAsOf={asOf}
        onRefresh={refresh}
      />

      {/* ── KPI row — 6 cards, exactly as mockup ────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <V2KpiCard icon={Bell} label="Open Requests" value={active.length}
          sub={`${unassigned.length} unassigned`} subTone={unassigned.length ? 'amber' : 'green'}
          onClick={() => onOpenTab('orders')} />
        <V2KpiCard icon={ClipboardCheck} label="Inspections Today" value="—"
          sub="not tracked yet" onClick={() => onOpenTab('inspections')} />
        <V2KpiCard icon={Wrench} label="Work Orders" value="—"
          sub="not tracked yet" onClick={() => onOpenTab('maintenance')} />
        <V2KpiCard icon={PlaneLanding} label="Arrivals Today" value={arrivals != null ? arrivals : '—'}
          sub={departures != null ? `${departures} departures` : 'no forecast'}
          onClick={() => onOpenTab('forecast')} />
        <V2KpiCard icon={BedDouble} label="Occupancy" value={occ != null ? `${Math.round(occ)}%` : '—'}
          sub="from forecast" onClick={() => onOpenTab('forecast')} />
        <V2KpiCard icon={ListChecks} label="My Open Tasks" value={openTasks.length}
          sub={`${instances.length} total today`} subTone={openTasks.length ? 'amber' : 'green'}
          onClick={() => onOpenTab('todos')} />
      </div>

      {/* ── Main grid: left 2/3 activity + alerts · right 1/3 status ────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">

        {/* LEFT */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <V2Panel
            title="Today's Activity"
            action={
              <button onClick={() => onOpenTab('orders')}
                className="text-[12px] font-bold flex items-center gap-1 hover:underline" style={{ color: '#0E7C74' }}>
                Open queue <ArrowRight size={13} />
              </button>
            }
          >
            {active.length === 0 ? (
              <p className="text-[13px] py-6 text-center" style={{ color: MUTED }}>
                Nothing waiting. Every reported request is completed.
              </p>
            ) : (
              <ul className="flex flex-col">
                {active.slice(0, 8).map(r => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5 border-t first:border-t-0" style={{ borderColor: BORDER }}>
                    <span className="text-[11px] font-semibold w-14 shrink-0" style={{ color: MUTED }}>
                      {new Date(r.created_at).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold truncate" style={{ color: INK }}>{r.type}</span>
                      <span className="block text-[11px] truncate" style={{ color: MUTED }}>
                        {r.guest_name} · rm {r.room}{r.details ? ` · ${r.details}` : ''}
                      </span>
                    </span>
                    <V2Pill label={r.status} tone={v2StatusTone(r.status)} />
                    {roleCanAct && r.status === 'pending' && (
                      <button disabled={busyId === r.id} onClick={() => { void act(r.id, 'in-progress'); }}
                        className="text-[11px] font-bold px-2 py-1 rounded-lg border hover:opacity-80 disabled:opacity-40 shrink-0"
                        style={{ borderColor: BORDER, color: '#0E7C74' }}>
                        Start
                      </button>
                    )}
                    {roleCanAct && r.status === 'in-progress' && (
                      <button disabled={busyId === r.id} onClick={() => { void act(r.id, 'completed'); }}
                        className="text-[11px] font-bold px-2 py-1 rounded-lg text-white hover:opacity-85 disabled:opacity-40 shrink-0"
                        style={{ backgroundColor: '#14A8A0' }}>
                        Complete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </V2Panel>

          <V2Panel title="Critical Alerts">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2.5 py-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E7F6EC' }}>
                  <RefreshCw size={0} style={{ display: 'none' }} />
                  <span className="text-[15px]" style={{ color: '#16A34A' }}>✓</span>
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
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4">
          <V2Panel title="Department Status">
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {['Front Office', 'Housekeeping', 'Maintenance', 'F&B', 'Transportation'].map(d => (
                <li key={d} className="flex items-center justify-between">
                  <span className="flex items-center gap-2" style={{ color: INK }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#D6DEE8' }} />
                    {d}
                  </span>
                  <span className="font-semibold" style={{ color: MUTED }}>—</span>
                </li>
              ))}
            </ul>
          </V2Panel>

          <V2Panel title="Occupancy Overview">
            <div className="py-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-bold leading-none" style={{ color: INK }}>
                  {occ != null ? `${Math.round(occ)}%` : '—'}
                </span>
                <span className="text-[12px]" style={{ color: MUTED }}>tonight</span>
              </div>
              <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ backgroundColor: '#E9EEF4' }}>
                <div className="h-full rounded-full" style={{ width: `${occ != null ? Math.min(100, Math.max(0, occ)) : 0}%`, backgroundColor: '#14A8A0' }} />
              </div>
              <div className="flex justify-between mt-3 text-[12px]" style={{ color: MUTED }}>
                <span>Arrivals <b style={{ color: INK }}>{arrivals != null ? arrivals : '—'}</b></span>
                <span>Departures <b style={{ color: INK }}>{departures != null ? departures : '—'}</b></span>
              </div>
            </div>
          </V2Panel>
        </div>
      </div>

      {/* ── Bottom row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-start">
        <V2Panel title="Recent Activity">
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

        <V2Panel title="Quick Actions">
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { icon: Plus, label: 'New Request', tab: 'orders' },
              { icon: ClipboardCheck, label: 'Log Inspection', tab: 'inspections' },
              { icon: Wrench, label: 'Create Work Order', tab: 'maintenance' },
              { icon: Bus, label: 'Shuttle', tab: 'shuttle' },
              { icon: CalendarDays, label: 'Schedule', tab: 'schedules' },
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
      </div>
    </div>
  );
}