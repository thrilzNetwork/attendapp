'use client';
/* eslint-disable */

import { useState, useEffect } from 'react';
import { Bus, CalendarDays, Ship, Settings, X, GripVertical, Check } from 'lucide-react';
import {
  supabase,
  getDailyRecap,
  getAllShuttleSlotsForHotel,
  getShuttleRoutes,
  getChecklists,
  getChecklistInstances,
  getStaffSchedulesRange,
  getCruiseSchedulesAll,
  type HotelConfig,
  type ShuttleSlot,
  type ShuttleRoute,
  type StaffSchedule,
  type Checklist,
  type ChecklistInstance,
  type CruiseSchedule,
} from '@/lib/supabase';
import {
  listShuttleSlots,
  listKpiDefinitions,
  listKpiSubmissions,
  today,
  localDateStr,
  addDaysStr,
  type ShuttleSlot as OpsShuttleSlot,
  type OpRecord,
} from '@/lib/opsStore';

const TEAL = '#0D9488';

const DEPARTMENTS = [
  { key: 'management',   label: 'Management',   icon: '👔' },
  { key: 'front_desk',   label: 'Front Desk',   icon: '🛎️' },
  { key: 'housekeeping', label: 'Housekeeping', icon: '🧹' },
  { key: 'maintenance',  label: 'Maintenance',  icon: '🔧' },
  { key: 'security',     label: 'Security',     icon: '🛡️' },
  { key: 'drivers',      label: 'Drivers',      icon: '🚐' },
] as const;

type WidgetId =
  | 'gm_notes'
  | 'quick_stats'
  | 'kpis'
  | 'activity'
  | 'checklists'
  | 'forecast_14'
  | 'shuttle'
  | 'cruise';

interface WidgetDef {
  id: WidgetId;
  label: string;
  description: string;
  icon: string;
}

const ALL_WIDGETS: WidgetDef[] = [
  { id: 'gm_notes',     label: "Today's Brief",    description: 'GM notes and daily announcements',      icon: '📋' },
  { id: 'quick_stats',  label: 'Quick Stats',       description: 'Pending requests, completed, staff on duty', icon: '📊' },
  { id: 'kpis',         label: 'KPI Snapshot',      description: 'Today\'s KPI values vs targets',        icon: '🎯' },
  { id: 'activity',     label: 'Today\'s Activity', description: 'Request completion progress bar',       icon: '⚡' },
  { id: 'checklists',   label: 'Checklists',        description: 'Interactive shift checklists',          icon: '✅' },
  { id: 'forecast_14',  label: 'Next 14 Days',      description: 'Mini calendar with shuttle & staff counts', icon: '📅' },
  { id: 'shuttle',      label: "Today's Shuttle",   description: 'Shuttle trips scheduled for today',     icon: '🚌' },
  { id: 'cruise',       label: 'Cruise Ships',      description: 'Upcoming cruise ship arrivals',         icon: '🚢' },
];

const DEFAULT_WIDGETS: WidgetId[] = ['gm_notes', 'quick_stats', 'kpis', 'forecast_14', 'shuttle', 'cruise'];

function loadWidgetPrefs(hotelId: string): WidgetId[] {
  try {
    const raw = localStorage.getItem(`attenda_dashboard_widgets_${hotelId}`);
    if (!raw) return DEFAULT_WIDGETS;
    const parsed = JSON.parse(raw) as WidgetId[];
    // Validate that all saved ids are known
    const valid = parsed.filter(id => ALL_WIDGETS.some(w => w.id === id));
    return valid.length > 0 ? valid : DEFAULT_WIDGETS;
  } catch {
    return DEFAULT_WIDGETS;
  }
}

function saveWidgetPrefs(hotelId: string, prefs: WidgetId[]) {
  try {
    localStorage.setItem(`attenda_dashboard_widgets_${hotelId}`, JSON.stringify(prefs));
  } catch {}
}

/* ── Daily Brief View (staff-facing) ──────────────────── */
export default function DailyBriefView({ hotelId, hotelName, config, sessionName, department, isAdmin }: {
  hotelId: string;
  hotelName: string;
  config: HotelConfig | null;
  sessionName: string;
  department?: string;
  isAdmin: boolean;
}) {
  const [recap, setRecap] = useState<{
    requestsToday: number; completedToday: number; pendingNow: number;
    messagesToday: number; shuttleBookingsToday: number;
    avgResponseMin: number; staffOnDuty: number;
    checklistsCompleted: number; checklistsTotal: number;
  } | null>(null);
  const [kpiSnapshot, setKpiSnapshot] = useState<{ name: string; value: number; unit: string; target: number }[]>([]);
  const [todayShuttleSlots, setTodayShuttleSlots] = useState<ShuttleSlot[]>([]);
  const [monthShuttleSlots, setMonthShuttleSlots] = useState<(OpsShuttleSlot & { id: string })[]>([]);
  const [todayShuttleRoutes, setTodayShuttleRoutes] = useState<ShuttleRoute[]>([]);
  const [weekShifts, setWeekShifts] = useState<StaffSchedule[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<Checklist[]>([]);
  const [checklistInstances, setChecklistInstances] = useState<ChecklistInstance[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Widget customizer state
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetId[]>(DEFAULT_WIDGETS);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const tz = config?.timezone || 'America/New_York';
  const todayStr = localDateStr();

  // Load widget prefs from localStorage once hotelId is known
  useEffect(() => {
    if (hotelId) setEnabledWidgets(loadWidgetPrefs(hotelId));
  }, [hotelId]);

  const on = (id: WidgetId) => enabledWidgets.includes(id);

  const toggleWidget = (id: WidgetId) => {
    setEnabledWidgets(prev => {
      const next = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id];
      saveWidgetPrefs(hotelId, next);
      return next;
    });
  };

  // Timezone-aware greeting
  const nowInTz = new Date().toLocaleString('en-US', { timeZone: tz });
  const hotelHour = new Date(nowInTz).getHours();
  const greeting = hotelHour < 12 ? 'Good morning' : hotelHour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingEmoji = hotelHour < 12 ? '☀️' : hotelHour < 17 ? '👋' : '🌙';

  useEffect(() => {
    (async () => {
      const [r, slots, routes, monthSlots, schedules, templates, instances, kpiDefs, kpiLogs] = await Promise.all([
        getDailyRecap(hotelId),
        getAllShuttleSlotsForHotel(hotelId),
        getShuttleRoutes(hotelId),
        listShuttleSlots(hotelId),
        getStaffSchedulesRange(hotelId, today(), addDaysStr(today(), 7)),
        getChecklists(hotelId),
        getChecklistInstances(hotelId, todayStr),
        listKpiDefinitions(hotelId),
        listKpiSubmissions(hotelId),
      ]);
      setRecap(r);
      setTodayShuttleSlots(slots);
      setTodayShuttleRoutes(routes);
      setMonthShuttleSlots(monthSlots || []);
      setWeekShifts(schedules || []);
      setChecklistTemplates(templates || []);
      setChecklistInstances(instances || []);
      // Filter to score-related KPIs only — exclude checklist completion counts and parking items
      const SCORE_KEYWORDS = ['score', 'satisfaction', 'rating', 'review', 'nps', 'tripadvisor', 'google'];
      const EXCLUDE_KEYWORDS = ['checklist', 'parking', 'completion'];
      const scoreDefs = (kpiDefs || []).filter((def: OpRecord) => {
        const d = def.details as Record<string, unknown>;
        const name = ((d.kpi_name as string) || '').toLowerCase();
        if (EXCLUDE_KEYWORDS.some(kw => name.includes(kw))) return false;
        return SCORE_KEYWORDS.some(kw => name.includes(kw));
      });
      const snapshot = scoreDefs.slice(0, 6).map((def: OpRecord) => {
        const d = def.details as Record<string, unknown>;
        const todayLogs = (kpiLogs || []).filter((l: OpRecord) => {
          const ld = l.details as Record<string, unknown>;
          return ld.definition_id === def.id && ld.shift_date === todayStr;
        });
        const latest = todayLogs.sort((a: OpRecord, b: OpRecord) =>
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        )[0];
        const ld = latest ? (latest.details as Record<string, unknown>) : null;
        return {
          name: d.kpi_name as string || 'KPI',
          value: ld ? Number(ld.value) : NaN,
          unit: d.unit as string || '',
          target: Number(d.target) || 0,
        };
      });
      setKpiSnapshot(snapshot);
    })();
  }, [hotelId, todayStr]);

  const startInstance = async (templateId: string) => {
    setSubmitting(true);
    const { error: err } = await supabase.from('staff_checklist_instances').insert({
      checklist_id: templateId,
      hotel_id: hotelId,
      staff_name: sessionName || 'Staff',
      shift_date: todayStr,
      checked_items: [],
      completed: false,
    });
    if (!err) {
      const updated = await getChecklistInstances(hotelId, todayStr);
      setChecklistInstances(updated || []);
    }
    setSubmitting(false);
  };

  const toggleChecklistItem = async (instanceId: string, itemId: string, currentlyChecked: boolean) => {
    const inst = checklistInstances.find(i => i.id === instanceId);
    if (!inst) return;
    const newChecked = currentlyChecked
      ? inst.checked_items.filter(x => x.item_id !== itemId)
      : [...inst.checked_items, { item_id: itemId, checked_at: new Date().toISOString() }];
    const tpl = checklistTemplates.find(t => t.id === inst.checklist_id);
    const completed = newChecked.length === (tpl?.items.length || 0);
    await supabase.from('staff_checklist_instances').update({
      checked_items: newChecked,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', instanceId);
    const updated = await getChecklistInstances(hotelId, todayStr);
    setChecklistInstances(updated || []);
  };

  const myDept = department || '';
  const deptLabel = DEPARTMENTS.find(d => d.key === myDept)?.label || '';
  const deptKeywords = [myDept, deptLabel.toLowerCase(), ...deptLabel.split(' ').map(w => w.toLowerCase())].filter(Boolean);
  const relevantTemplates = isAdmin || !myDept
    ? checklistTemplates
    : checklistTemplates.filter(t => {
        if (t.department === myDept) return true;
        const nameLower = (t.name || '').toLowerCase();
        if (deptKeywords.some(kw => nameLower.includes(kw))) return true;
        const roleLower = (t.assigned_role || '').toLowerCase();
        if (deptKeywords.some(kw => roleLower.includes(kw))) return true;
        if (!t.department && !t.assigned_role) return true;
        return false;
      });

  const todayDay = new Date().getDay();
  const daySlots = todayShuttleSlots.filter(s =>
    (s.date === todayStr) || (s.days_of_week?.includes(todayDay) && !s.date)
  );

  const next14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const ds = localDateStr(d);
    const dow = d.getDay();
    const slotsCount = monthShuttleSlots.filter(s => s.day_of_week === dow).length;
    const shiftsCount = weekShifts.filter(s => s.shift_date === ds).length;
    return { date: ds, day: d.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d.getDate(), slotsCount, shiftsCount, isToday: i === 0 };
  });

  const todaysInstance = (templateId: string) =>
    checklistInstances
      .filter(i => i.checklist_id === templateId)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto print:p-2 print:max-w-none">

      {/* ── Widget Customizer Overlay ── */}
      {showCustomizer && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 print:hidden" onClick={() => setShowCustomizer(false)}>
          <div
            className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-md shadow-2xl p-6 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[17px] font-extrabold text-gray-900">Customize Dashboard</h2>
                <p className="text-[12px] text-gray-500 mt-0.5">Toggle the widgets you want to see</p>
              </div>
              <button onClick={() => setShowCustomizer(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X size={15} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-2">
              {ALL_WIDGETS.map(w => {
                const active = enabledWidgets.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                      active ? 'border-teal-500 bg-teal-50' : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <span className="text-[22px] shrink-0">{w.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-900">{w.label}</p>
                      <p className="text-[11px] text-gray-500 truncate">{w.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      active ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
                    }`}>
                      {active && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { setEnabledWidgets(DEFAULT_WIDGETS); saveWidgetPrefs(hotelId, DEFAULT_WIDGETS); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50"
              >
                Reset to Default
              </button>
              <button
                onClick={() => setShowCustomizer(false)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white"
                style={{ backgroundColor: TEAL }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header Row ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">{greeting}, {sessionName || config?.managerName || 'team'} {greetingEmoji}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {hotelName}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <span className="hidden md:inline text-[11px] text-gray-400">{new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit' })}</span>
          <button
            onClick={() => setShowCustomizer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            title="Customize dashboard"
          >
            <Settings size={13} />
            Customize
          </button>
          {isAdmin && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              title="Print morning brief"
            >
              🖨️ Print
            </button>
          )}
        </div>
      </div>

      {/* ── Today's Brief / GM Notes ── */}
      {on('gm_notes') && (
        config?.gmNotes ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={16} style={{ color: TEAL }} />
              <h2 className="text-[15px] font-bold text-gray-900">Today&apos;s Brief</h2>
            </div>
            <div className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">{config?.gmNotes}</div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
            <p className="text-[13px] text-amber-800 font-medium">No daily brief yet. Add notes in Property Settings → GM Notes.</p>
          </div>
        )
      )}

      {/* ── Quick Stats Row ── */}
      {on('quick_stats') && recap && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pending</p>
            <p className="text-[28px] font-extrabold text-gray-900 mt-1">{recap.pendingNow}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Completed</p>
            <p className="text-[28px] font-extrabold text-gray-900 mt-1">{recap.completedToday}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Staff on Duty</p>
            <p className="text-[28px] font-extrabold text-gray-900 mt-1">{recap.staffOnDuty}</p>
          </div>
        </div>
      )}

      {/* ── KPI Snapshot ── */}
      {on('kpis') && kpiSnapshot.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-gray-900">Today&apos;s KPIs</h3>
            <span className="text-[11px] text-gray-400">Staff input · {new Date().toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {kpiSnapshot.map((k, i) => {
              const hasValue = !isNaN(k.value);
              const pct = hasValue && k.target > 0 ? Math.min((k.value / k.target) * 100, 100) : 0;
              const onTarget = hasValue && k.target > 0 && k.value >= k.target;
              return (
                <div key={i} className="border border-gray-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{k.name}</p>
                  <p className="text-[20px] font-extrabold mt-0.5" style={{ color: hasValue ? (onTarget ? '#16A34A' : TEAL) : '#D1D5DB' }}>
                    {hasValue ? `${k.value}${k.unit ? ' ' + k.unit : ''}` : '—'}
                  </p>
                  {k.target > 0 && (
                    <div className="mt-1.5">
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: onTarget ? '#16A34A' : TEAL }} />
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5">Target: {k.target} {k.unit}</p>
                    </div>
                  )}
                  {!hasValue && <p className="text-[9px] text-gray-400 mt-0.5">Not logged yet</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {on('kpis') && kpiSnapshot.length === 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5 text-center">
          <p className="text-[12px] text-gray-400">No KPIs configured yet. Add them in the <span className="font-bold">KPIs</span> tab or install a pack from <span className="font-bold">Marketplace</span>.</p>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Left column */}
        <div className="space-y-5">

          {/* Today's Activity */}
          {on('activity') && recap && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-gray-900">Today&apos;s Activity</h3>
                <span className="text-[11px] text-gray-400">{recap.requestsToday} requests today</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full transition-all" style={{width:`${recap.requestsToday > 0 ? Math.min((recap.completedToday/recap.requestsToday)*100, 100) : 0}%`, backgroundColor: TEAL}} />
                </div>
                <span className="text-[12px] font-bold text-gray-700">{recap.completedToday}/{recap.requestsToday} done</span>
              </div>
            </div>
          )}

          {/* Checklists */}
          {on('checklists') && relevantTemplates.length > 0 && (
            <div className="space-y-3">
              {relevantTemplates.map(tpl => {
                const inst = todaysInstance(tpl.id);
                const totalItems = tpl.items?.length || 0;
                const doneCount = inst?.checked_items.length || 0;
                return (
                  <div key={tpl.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[13px] font-bold text-gray-900">{tpl.name}</p>
                        <p className="text-[11px] text-gray-500">
                          {totalItems} item{totalItems === 1 ? '' : 's'}
                          {inst ? ` · ${doneCount}/${totalItems} done` : ''}
                        </p>
                      </div>
                      {!inst && totalItems > 0 ? (
                        <button
                          onClick={() => startInstance(tpl.id)}
                          disabled={submitting}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                          style={{ backgroundColor: TEAL }}
                        >
                          {submitting ? '...' : 'Start'}
                        </button>
                      ) : inst?.completed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Done</span>
                      ) : inst ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">In Progress</span>
                      ) : null}
                    </div>
                    {inst && totalItems > 0 && (
                      <>
                        <div className="bg-gray-100 rounded-full h-1.5 mb-2">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${(doneCount / totalItems) * 100}%`, backgroundColor: TEAL }} />
                        </div>
                        <div className="space-y-1">
                          {tpl.items.map(item => {
                            const isChecked = !!inst.checked_items.find(x => x.item_id === item.id);
                            return (
                              <label key={item.id} className="flex items-center gap-2.5 py-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleChecklistItem(inst.id, item.id, isChecked)}
                                  disabled={submitting}
                                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                                  style={{ accentColor: TEAL }}
                                />
                                <span className={`text-[12px] ${isChecked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Next 14 Days */}
          {on('forecast_14') && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={16} style={{ color: TEAL }} />
                <h3 className="text-[13px] font-bold text-gray-900">Next 14 Days</h3>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {next14.map(d => (
                  <div key={d.date} className={`text-center p-2 rounded-xl border ${d.isToday ? 'border-gray-900 bg-gray-50' : 'border-gray-100'}`}>
                    <p className={`text-[9px] font-bold uppercase ${d.isToday ? 'text-gray-900' : 'text-gray-400'}`}>{d.day}</p>
                    <p className={`text-[14px] font-extrabold ${d.isToday ? 'text-gray-900' : 'text-gray-700'}`}>{d.dayNum}</p>
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      {d.slotsCount > 0 && <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ backgroundColor: `${TEAL}20`, color: TEAL }}>{d.slotsCount}🚌</span>}
                      {d.shiftsCount > 0 && <span className="text-[8px] px-1 py-0.5 rounded font-bold bg-gray-100 text-gray-600">{d.shiftsCount}👤</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Today's Shuttle */}
          {on('shuttle') && (
            daySlots.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Bus size={16} style={{ color: TEAL }} />
                  <h3 className="text-[13px] font-bold text-gray-900">Today&apos;s Shuttle</h3>
                  <span className="text-[11px] text-gray-400">{daySlots.length} trips</span>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const routeMap = new Map(todayShuttleRoutes.map(r => [r.id, r.name]));
                    const grouped: Record<string, ShuttleSlot[]> = {};
                    daySlots.forEach(s => {
                      const key = routeMap.get(s.route_id) || 'Shuttle';
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(s);
                    });
                    return Object.entries(grouped).map(([routeName, slots]) => (
                      <div key={routeName}>
                        <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">{routeName}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {slots.sort((a, b) => a.departure_time.localeCompare(b.departure_time)).map(s => (
                            <span key={s.id} className="text-[11px] bg-gray-100 text-gray-600 font-medium px-2 py-1 rounded-lg">
                              {s.departure_time.slice(0, 5)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Bus size={16} className="text-gray-300" />
                  <h3 className="text-[13px] font-bold text-gray-900">Today&apos;s Shuttle</h3>
                </div>
                <p className="text-[12px] text-gray-400">No shuttle trips scheduled today.</p>
              </div>
            )
          )}

          {/* Cruise Calendar */}
          {on('cruise') && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Ship size={16} style={{ color: TEAL }} />
                <h3 className="text-[13px] font-bold text-gray-900">Cruise Ships</h3>
              </div>
              <CruiseCalendar hotelId={hotelId} />
            </div>
          )}

          {/* Empty right column hint when most widgets are off */}
          {!on('shuttle') && !on('cruise') && (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
              <p className="text-[12px] text-gray-400">Enable more widgets via <span className="font-bold">Customize</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Cruise Calendar — reads from cruise_schedules table */
function CruiseCalendar({ hotelId }: { hotelId: string }) {
  const [schedules, setSchedules] = useState<CruiseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const data = await getCruiseSchedulesAll(hotelId);
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 30);
        setSchedules((data || []).filter(s => {
          const dStr = s.departure_date;
          if (!dStr) return false;
          const d = new Date(dStr);
          return d >= new Date() && d <= cutoff;
        }));
      } catch {
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [hotelId]);

  if (loading) return <p className="text-[12px] text-gray-400">Loading cruise schedule…</p>;
  if (schedules.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-[12px] text-gray-500">No cruise ships docking in the next 30 days.</p>
        <p className="text-[11px] text-gray-400 mt-1">Add cruise schedules in Property Settings.</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {schedules.slice(0, 8).map((s, i) => {
        const d = new Date(s.departure_date);
        return (
          <div key={s.id || i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5">
            <div className="text-center w-10">
              <p className="text-[9px] font-bold text-gray-400 uppercase">{d.toLocaleDateString('en-US', { month: 'short' })}</p>
              <p className="text-[16px] font-extrabold text-gray-900">{d.getDate()}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-gray-900 truncate">{s.ship_name || 'Cruise ship'}</p>
              <p className="text-[11px] text-gray-500">{s.cruise_line || ''}{s.terminal ? ` · ${s.terminal}` : ''}{s.departure_time ? ` · ${s.departure_time}` : ''}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
