'use client';
/* eslint-disable */

import { useState, useEffect } from 'react';
import { Bus, CalendarDays, Ship } from 'lucide-react';
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
  today,
  localDateStr,
  addDaysStr,
  type ShuttleSlot as OpsShuttleSlot,
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
  const [todayShuttleSlots, setTodayShuttleSlots] = useState<ShuttleSlot[]>([]);
  const [monthShuttleSlots, setMonthShuttleSlots] = useState<(OpsShuttleSlot & { id: string })[]>([]);
  const [todayShuttleRoutes, setTodayShuttleRoutes] = useState<ShuttleRoute[]>([]);
  const [weekShifts, setWeekShifts] = useState<StaffSchedule[]>([]);
  // Checklists loaded inline from supabase staff_checklists + instances
  const [checklistTemplates, setChecklistTemplates] = useState<Checklist[]>([]);
  const [checklistInstances, setChecklistInstances] = useState<ChecklistInstance[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = localDateStr();

  useEffect(() => {
    (async () => {
      const [r, slots, routes, monthSlots, schedules, templates, instances] = await Promise.all([
        getDailyRecap(hotelId),
        getAllShuttleSlotsForHotel(hotelId),
        getShuttleRoutes(hotelId),
        listShuttleSlots(hotelId),
        getStaffSchedulesRange(hotelId, today(), addDays(today(), 7)),
        getChecklists(hotelId),
        getChecklistInstances(hotelId, todayStr),
      ]);
      setRecap(r);
      setTodayShuttleSlots(slots);
      setTodayShuttleRoutes(routes);
      setMonthShuttleSlots(monthSlots || []);
      setWeekShifts(schedules || []);
      setChecklistTemplates(templates || []);
      setChecklistInstances(instances || []);
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

  // Filter checklists by department + title match: staff see their dept, admin/managers see all
  // Checks both the `department` field AND the checklist name for department keywords
  const myDept = department || '';
  const deptLabel = DEPARTMENTS.find(d => d.key === myDept)?.label || '';
  const deptKeywords = [myDept, deptLabel.toLowerCase(), ...deptLabel.split(' ').map(w => w.toLowerCase())].filter(Boolean);
  const relevantTemplates = isAdmin || !myDept
    ? checklistTemplates
    : checklistTemplates.filter(t => {
        // Exact department match
        if (t.department === myDept) return true;
        // Match by name/title containing department keywords
        const nameLower = (t.name || '').toLowerCase();
        if (deptKeywords.some(kw => nameLower.includes(kw))) return true;
        // Match by assigned_role
        const roleLower = (t.assigned_role || '').toLowerCase();
        if (deptKeywords.some(kw => roleLower.includes(kw))) return true;
        // Show unassigned checklists to everyone
        if (!t.department && !t.assigned_role) return true;
        return false;
      });

  // Day-of-week 0=Sun..6=Sat, matching getDay() used everywhere else in this file.
  const todayDay = new Date().getDay();
  const daySlots = todayShuttleSlots.filter(s =>
    (s.date === todayStr) || (s.days_of_week?.includes(todayDay) && !s.date)
  );

  const addDays = addDaysStr;
  const next14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const ds = localDateStr(d);
    const dow = d.getDay();
    const slotsCount = monthShuttleSlots.filter(s => s.day_of_week === dow).length;
    const shiftsCount = weekShifts.filter(s => s.shift_date === ds).length;
    return { date: ds, day: d.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d.getDate(), slotsCount, shiftsCount, isToday: i === 0 };
  });

  // Get today's instance for a template
  const todaysInstance = (templateId: string) =>
    checklistInstances
      .filter(i => i.checklist_id === templateId)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* ── Header Row ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Good morning, {sessionName || config?.managerName || 'team'} ☀️</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {hotelName}</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[11px] text-gray-400">Today</span>
          <span className="text-[11px] font-bold text-gray-900">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* ── Today's Brief / GM Notes ── */}
      {config?.gmNotes ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={16} style={{ color: TEAL }} />
            <h2 className="text-[15px] font-bold text-gray-900">Today&apos;s Brief</h2>
          </div>
          <div className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">{config?.gmNotes}</div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
          <p className="text-[13px] text-amber-800 font-medium">No daily brief yet. The GM/Manager can add notes in Property Settings.</p>
        </div>
      )}

      {/* ── Quick Stats Row ── */}
      {recap && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
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
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Avg Response</p>
            <p className="text-[20px] font-extrabold text-gray-900 mt-1">{recap.avgResponseMin}<span className="text-[12px] font-normal text-gray-400"> min</span></p>
          </div>
        </div>
      )}

      {/* ── Two-column layout for main content ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Left column: Today's Activity */}
        <div className="space-y-5">
          {/* Requests Today */}
          {recap && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-gray-900">Today&apos;s Activity</h3>
                <span className="text-[11px] text-gray-400">{recap.requestsToday} requests · {recap.messagesToday} messages</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full transition-all" style={{width:`${recap.requestsToday > 0 ? Math.min((recap.completedToday/recap.requestsToday)*100, 100) : 0}%`, backgroundColor: TEAL}} />
                </div>
                <span className="text-[12px] font-bold text-gray-700">{recap.completedToday}/{recap.requestsToday} done</span>
              </div>
            </div>
          )}

          {/* ── Interactive Checklists ── */}
          {relevantTemplates.length > 0 && (
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
        </div>

        {/* Right column: Schedule & Shuttle */}
        <div className="space-y-5">
          {/* Today's Shuttle */}
          {daySlots.length > 0 ? (
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
          )}

          {/* Cruise Calendar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Ship size={16} style={{ color: TEAL }} />
              <h3 className="text-[13px] font-bold text-gray-900">Cruise Ships</h3>
            </div>
            <CruiseCalendar hotelId={hotelId} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Cruise Calendar — reads from cruise_schedules table; falls back to a quiet empty state */
function CruiseCalendar({ hotelId }: { hotelId: string }) {
  const [schedules, setSchedules] = useState<CruiseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const data = await getCruiseSchedulesAll(hotelId);
        // Filter to next 30 days
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
        <p className="text-[11px] text-gray-400 mt-1">Add cruise schedules in Property Settings to see them here.</p>
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
            <div className="text-[10px] font-bold text-gray-400 uppercase">{s.notes ? s.notes.slice(0, 12) : ''}</div>
          </div>
        );
      })}
    </div>
  );
}