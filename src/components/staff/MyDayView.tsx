'use client';
/* eslint-disable */
// My Day — §31: the staff home base. Dashboard = Hotel, My Day = Me.
// Answers: When do I work? What do I need to do? What checklist is due?
// What requests are assigned to me? What training do I need? Manager note.

import { useState, useEffect } from 'react';
import {
  Sunrise, CalendarClock, ClipboardList, Bell, ListChecks,
  GraduationCap, StickyNote, ArrowRight, Check,
} from 'lucide-react';
import {
  supabase,
  getStaffSchedulesRange,
  getPositionTodoTemplates,
  getTodayInstances,
  getChecklists,
  getChecklistInstances,
  createInstance,
  completeInstance,
  type HotelConfig,
  type StaffSchedule,
  type Checklist,
  type ChecklistInstance,
} from '@/lib/supabase';
import {
  localDateStr,
  listCourses,
  listModules,
  listModuleCompletions,
  type OpRecord,
} from '@/lib/opsStore';

const TEAL = '#158A7C';

export interface MyDayRequest {
  id: string;
  guest_name: string;
  room: string;
  type: string;
  details: string;
  status: string;
  created_at: string;
  assigned_to?: string;
}

export default function MyDayView({
  hotelId,
  hotelName,
  config,
  sessionName,
  department,
  positions,
  isAdmin,
  requests,
  onNavigate,
}: {
  hotelId: string;
  hotelName: string;
  config: HotelConfig | null;
  sessionName: string;
  department?: string;
  positions?: string[];
  isAdmin: boolean;
  requests: MyDayRequest[];
  onNavigate: (tab: string) => void;
}) {
  const [shifts, setShifts] = useState<StaffSchedule[]>([]);
  const [posTodoTemplates, setPosTodoTemplates] = useState<Record<string, unknown>[]>([]);
  const [posTodoInstances, setPosTodoInstances] = useState<Record<string, unknown>[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<Checklist[]>([]);
  const [checklistInstances, setChecklistInstances] = useState<ChecklistInstance[]>([]);
  const [courses, setCourses] = useState<OpRecord[]>([]);
  const [courseProgress, setCourseProgress] = useState<{ id: string; title: string; done: number; total: number }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const tz = config?.timezone || 'America/New_York';
  const todayStr = localDateStr();

  useEffect(() => {
    if (!hotelId || !sessionName) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const [shiftRows, templates, instances, clTemplates, clInstances, courseRows] = await Promise.all([
        getStaffSchedulesRange(hotelId, todayStr, todayStr),
        getPositionTodoTemplates(hotelId),
        getTodayInstances(hotelId),
        getChecklists(hotelId),
        getChecklistInstances(hotelId, todayStr),
        listCourses(hotelId).catch(() => []),
      ]);
      if (!alive) return;
      setShifts(shiftRows || []);
      setPosTodoTemplates((templates || []) as unknown as Record<string, unknown>[]);
      setPosTodoInstances((instances || []) as unknown as Record<string, unknown>[]);
      setChecklistTemplates(clTemplates || []);
      setChecklistInstances(clInstances || []);
      setCourses(courseRows || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [hotelId, sessionName, todayStr]);

  // Training progress: published courses → modules → my completions
  useEffect(() => {
    if (!hotelId || courses.length === 0) { setCourseProgress([]); return; }
    let alive = true;
    (async () => {
      const published = courses.filter(c => (c.details as Record<string, unknown>).published);
      const [modGroups, completions] = await Promise.all([
        Promise.all(published.map(c => listModules(hotelId, c.id).catch(() => []))),
        listModuleCompletions(hotelId).catch(() => []),
      ]);
      if (!alive) return;
      const mine = (completions || []).filter(c =>
        ((c.details as Record<string, unknown>).staff_name as string || '').toLowerCase() === sessionName.toLowerCase());
      const progress = published.map((c, i) => {
        const mods = modGroups[i] || [];
        const done = mods.filter(m => mine.some(x => (x.details as Record<string, unknown>).module_id === m.id)).length;
        return { id: c.id, title: (c.details as Record<string, unknown>).title as string || 'Course', done, total: mods.length };
      }).filter(p => p.total > 0);
      setCourseProgress(progress);
    })();
    return () => { alive = false; };
  }, [hotelId, courses, sessionName]);

  /* ── Derived ─────────────────────────────────────────── */

  const nowInTz = new Date().toLocaleString('en-US', { timeZone: tz });
  const hotelHour = new Date(nowInTz).getHours();
  const firstName = (sessionName || '').split(' ')[0];
  const greeting = hotelHour < 12 ? 'Good morning' : hotelHour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date(nowInTz).toLocaleDateString('en-US', {
    timeZone: tz, weekday: 'long', month: 'long', day: 'numeric',
  });

  const fmtTime = (t?: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${(m || 0).toString().padStart(2, '0')} ${ampm}`;
  };

  // My shift today (DailyBrief's proven match)
  const myShift = shifts.filter(s =>
    (s.staff_name || '').toLowerCase() === sessionName.toLowerCase()
  )[0];

  // My position todos — templates matching my positions/dept, instances by name
  const myPositions = positions && positions.length > 0 ? positions : department ? [department] : [];
  const myTodoTemplates = posTodoTemplates.filter((t: Record<string, unknown>) => {
    if (t.is_active === false) return false;
    if (isAdmin && myPositions.length === 0) return true;
    if (!t.department) return true;
    return myPositions.includes(t.department as string);
  });
  const getTodoInstance = (templateId: string) =>
    posTodoInstances.find((i: Record<string, unknown>) =>
      i.template_id === templateId &&
      ((i.staff_name as string) || '').toLowerCase() === sessionName.toLowerCase());
  const todoRemaining = myTodoTemplates.filter(t => getTodoInstance(t.id as string)?.status !== 'completed').length;

  // My requests (assigned to me, still open)
  const myRequests = requests.filter(r =>
    (r.assigned_to || '').toLowerCase() === sessionName.toLowerCase() &&
    (r.status === 'pending' || r.status === 'in-progress'));

  // My checklists — dept match + today's instance progress
  const myChecklists = checklistTemplates.filter(c => {
    if (c.is_active === false) return false;
    const deptOk = !c.department || !department || c.department === department;
    const roleOk = !c.assigned_role || c.assigned_role.toLowerCase() === department?.toLowerCase();
    return deptOk && roleOk;
  });
  const clProgress = (c: Checklist) => {
    const inst = checklistInstances
      .filter(i => i.checklist_id === c.id)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .find(i => ((i.staff_name as string) || '').toLowerCase() === sessionName.toLowerCase())
      || checklistInstances.filter(i => i.checklist_id === c.id)
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
    return { inst, done: inst?.checked_items?.length || 0, total: c.items?.length || 0 };
  };

  // Next up: shift start if later today → first open request → first incomplete todo
  let next: { label: string; detail: string } | null = null;
  if (myShift) {
    const startH = Number(myShift.start_time.split(':')[0]);
    const nowHr = Number(new Date(nowInTz).getHours());
    if (startH > nowHr) next = { label: `Shift starts ${fmtTime(myShift.start_time)}`, detail: myShift.role || myShift.department || '' };
  }
  if (!next && myRequests.length > 0) {
    const r = [...myRequests].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))[0];
    next = { label: `Room ${r.room} · ${r.type}`, detail: r.details || '' };
  }
  if (!next) {
    const t = myTodoTemplates.find(x => getTodoInstance(x.id as string)?.status !== 'completed');
    if (t) next = { label: t.name as string, detail: 'To-Do' };
  }

  const startTodo = async (templateId: string) => {
    setBusy(templateId);
    try { await createInstance({ hotel_id: hotelId, template_id: templateId, staff_name: sessionName }); } finally { setBusy(null); }
    const fresh = await getTodayInstances(hotelId);
    setPosTodoInstances((fresh || []) as unknown as Record<string, unknown>[]);
  };
  const finishTodo = async (instanceId: string, templateId: string) => {
    setBusy(templateId);
    try { await completeInstance(instanceId); } finally { setBusy(null); }
    const fresh = await getTodayInstances(hotelId);
    setPosTodoInstances((fresh || []) as unknown as Record<string, unknown>[]);
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

  const trainingIncomplete = courseProgress.filter(p => p.done < p.total);

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[#158A7C] mb-1">
          <Sunrise size={18} />
          <span className="text-[11px] font-bold uppercase tracking-wider">My Day</span>
        </div>
        <h1 className="text-[24px] md:text-[28px] font-extrabold text-gray-900 leading-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-[13px] text-gray-500">{dateLabel}{hotelName ? ` · ${hotelName}` : ''}</p>
      </div>

      {/* Shift */}
      <section className="mb-5">
        <SectionTitle icon={<CalendarClock size={14} style={{ color: TEAL }} />} label="Shift" />
        {myShift ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[20px] font-extrabold text-gray-900">
                {fmtTime(myShift.start_time)} – {fmtTime(myShift.end_time)}
              </p>
              <p className="text-[12px] text-gray-500">{myShift.role || myShift.department || 'Scheduled'}</p>
            </div>
            <button onClick={() => onNavigate('schedules')} className="text-[12px] font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
              View Schedule
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
            <p className="text-[12px] text-gray-400">No shift scheduled today.</p>
            <button onClick={() => onNavigate('schedules')} className="text-[12px] font-bold mt-1" style={{ color: TEAL }}>View full schedule →</button>
          </div>
        )}
      </section>

      {/* Next */}
      {next && (
        <section className="mb-5">
          <SectionTitle icon={<ArrowRight size={14} style={{ color: TEAL }} />} label="Next" />
          <div className="rounded-2xl p-4 shadow-sm text-white" style={{ backgroundColor: TEAL }}>
            <p className="text-[15px] font-bold">{next.label}</p>
            {next.detail && <p className="text-[12px] opacity-80 mt-0.5">{next.detail}</p>}
          </div>
        </section>
      )}

      {/* My To-Dos */}
      <section className="mb-5">
        <SectionTitle icon={<ClipboardList size={14} style={{ color: TEAL }} />} label="My To-Dos" />
        {myTodoTemplates.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
            <p className="text-[12px] text-gray-400">No to-dos assigned to your position yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-gray-500">{myTodoTemplates.length} assigned</span>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${todoRemaining === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {todoRemaining} remaining
              </span>
            </div>
            {myTodoTemplates.map(t => {
              const inst = getTodoInstance(t.id as string);
              const isDone = inst?.status === 'completed';
              const inProg = inst && inst.status !== 'completed';
              return (
                <div key={t.id as string} className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${isDone ? 'bg-emerald-50 border-emerald-100' : inProg ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[16px]">{isDone ? '✅' : inProg ? '🔄' : '⬜'}</span>
                    <p className={`text-[13px] font-semibold truncate ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{t.name as string}</p>
                  </div>
                  {!inst && (
                    <button disabled={busy === t.id} onClick={() => startTodo(t.id as string)}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-full text-white shrink-0 disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                      Start
                    </button>
                  )}
                  {inProg && (
                    <button disabled={busy === t.id} onClick={() => finishTodo((inst as Record<string, unknown>).id as string, t.id as string)}
                      className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full bg-emerald-600 text-white shrink-0 disabled:opacity-50">
                      <Check size={11} /> Done
                    </button>
                  )}
                  {isDone && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 shrink-0">Done</span>}
                </div>
              );
            })}
            <p className="text-[10px] text-gray-400 text-center pt-1">Full list in To-Dos →</p>
          </div>
        )}
      </section>

      {/* My Requests */}
      <section className="mb-5">
        <SectionTitle icon={<Bell size={14} style={{ color: TEAL }} />} label="My Requests" />
        {myRequests.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
            <p className="text-[12px] text-gray-400">Nothing assigned to you right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myRequests.slice(0, 5).map(r => (
              <button key={r.id} onClick={() => onNavigate('orders')}
                className="w-full text-left bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 truncate">Room {r.room} · {r.type}</p>
                    <p className="text-[12px] text-gray-500 truncate">{r.details}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {r.status === 'pending' ? 'Pending' : 'In progress'}
                  </span>
                </div>
              </button>
            ))}
            {myRequests.length > 5 && (
              <button onClick={() => onNavigate('orders')} className="text-[12px] font-bold pl-1" style={{ color: TEAL }}>
                + {myRequests.length - 5} more · Open Requests →
              </button>
            )}
          </div>
        )}
      </section>

      {/* Checklists */}
      {myChecklists.length > 0 && (
        <section className="mb-5">
          <SectionTitle icon={<ListChecks size={14} style={{ color: TEAL }} />} label="Checklists" />
          <div className="space-y-2">
            {myChecklists.slice(0, 4).map(c => {
              const { inst, done, total } = clProgress(c);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-bold text-gray-900">{c.name}</p>
                    <span className={`text-[11px] font-bold ${done === total ? 'text-emerald-600' : 'text-gray-500'}`}>{done}/{total}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: done === total ? '#059669' : TEAL }} />
                  </div>
                  {inst && done < total && (
                    <div className="mt-3 space-y-1.5">
                      {c.items.filter(item => !inst.checked_items.some(x => x.item_id === item.id)).slice(0, 3).map(item => (
                        <button key={item.id} onClick={() => toggleChecklistItem(inst.id, item.id, false)}
                          className="w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-100">
                          <span className="w-3.5 h-3.5 rounded border border-gray-300 shrink-0" />
                          <span className="text-[12px] text-gray-700 truncate">{item.label}</span>
                        </button>
                      ))}
                      {(c.items.filter(item => !inst.checked_items.some(x => x.item_id === item.id)).length > 3) && (
                        <p className="text-[10px] text-gray-400 pl-3">+ {c.items.filter(item => !inst.checked_items.some(x => x.item_id === item.id)).length - 3} more items</p>
                      )}
                    </div>
                  )}
                  {done === total && <p className="text-[11px] font-bold text-emerald-600 mt-2">✓ Complete</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Training */}
      <section className="mb-5">
        <SectionTitle icon={<GraduationCap size={14} style={{ color: TEAL }} />} label="Training" />
        {trainingIncomplete.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
            <p className="text-[12px] text-gray-400">{courseProgress.length === 0 ? 'No training published yet.' : 'All training complete ✓'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-2.5">
            {trainingIncomplete.slice(0, 3).map(p => (
              <button key={p.id} onClick={() => onNavigate('learning_hr')} className="w-full text-left">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">{p.title}</p>
                  <span className="text-[11px] text-gray-400 shrink-0">{p.done}/{p.total} modules</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
                </div>
              </button>
            ))}
            <button onClick={() => onNavigate('learning_hr')} className="text-[12px] font-bold" style={{ color: TEAL }}>Open Learning Hub →</button>
          </div>
        )}
      </section>

      {/* Manager Note */}
      {config?.gmNotes ? (
        <section className="mb-5">
          <SectionTitle icon={<StickyNote size={14} style={{ color: TEAL }} />} label="Manager Note" />
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-[13px] text-gray-800 whitespace-pre-wrap leading-relaxed">{config.gmNotes}</p>
          </div>
        </section>
      ) : (
        <section className="mb-5">
          <SectionTitle icon={<StickyNote size={14} style={{ color: TEAL }} />} label="Manager Note" />
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
            <p className="text-[12px] text-gray-400">No note from your manager today.</p>
          </div>
        </section>
      )}

      {loading && (
        <div className="text-center text-[12px] text-gray-400 py-4">Loading your day…</div>
      )}
    </div>
  );
}

/* ── Local helpers ─────────────────────────────────────── */
function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <h2 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">{label}</h2>
    </div>
  );
}