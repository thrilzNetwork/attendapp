'use client';

import { useState, useEffect } from 'react';
import {
  Plus, CalendarDays, X as XIcon, ArrowRight, ArrowLeft, SendHorizontal, CheckCircle2,
} from 'lucide-react';
import {
  getStaffSchedulesRange, createStaffSchedule, deleteStaffSchedule,
  getWeeklyForecasts,
  type StaffSchedule, type WeeklyForecast, type StaffAccount,
} from '@/lib/supabase';
import {
  createScheduleChangeRequest, today,
  DEPARTMENTS, type DepartmentKey,
} from '@/lib/opsStore';

const TEAL = '#0D9488';

function getWeekStart(date: string, weekStartsOn?: string): string {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  if (weekStartsOn === 'Monday') {
    const monOffset = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - monOffset);
  } else {
    d.setDate(d.getDate() - day);
  }
  return d.toISOString().split('T')[0];
}

function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function dayName(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

function formatDateRange(a: string, b: string): string {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return `${da.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${db.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function formatTime24to12(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t.slice(0,5);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

export default function SchedulesView({
  hotelId, isAdmin, staffName, staffList, weekStartsOn, hotelName,
}: {
  hotelId: string;
  isAdmin: boolean;
  staffName?: string;
  staffList: { id?: string; name: string; role?: string; department?: string; hire_date?: string; min_hours?: number; employment_type?: string; email?: string }[];
  weekStartsOn?: string;
  hotelName?: string;
}) {
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [forecasts, setForecasts] = useState<WeeklyForecast[]>([]);
  const [weekStart, setWeekStart] = useState<string>(getWeekStart(today(), weekStartsOn));
  const [showAdd, setShowAdd] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const [addForm, setAddForm] = useState({
    staff_id: '', staff_name: '', shift_date: today(),
    start_time: '07:00', end_time: '15:00', role: 'staff', notes: '',
  });

  const [reqForm, setReqForm] = useState({
    shift_date: today(),
    is_pto: true,
    details: '',
  });

  const load = async () => {
    const weekEnd = addDays(weekStart, 6);
    const [s, f] = await Promise.all([
      getStaffSchedulesRange(hotelId, weekStart, weekEnd),
      getWeeklyForecasts(hotelId, weekStart),
    ]);
    setSchedules(s || []);
    setForecasts(f || []);
  };
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, weekStart]);

  const handleAdd = async () => {
    if (!addForm.staff_name.trim() || !addForm.shift_date) return;
    setSubmitting(true); setError(null);
    try {
      const data = await createStaffSchedule({
        hotel_id: hotelId,
        staff_name: addForm.staff_name.trim(),
        staff_id: addForm.staff_id || undefined,
        shift_date: addForm.shift_date,
        start_time: addForm.start_time,
        end_time: addForm.end_time,
        role: addForm.role,
        notes: addForm.notes || undefined,
      });
      if (data) {
        const m = staffList.find(s => s.name === addForm.staff_name.trim()) as StaffAccount | undefined;
        if (m?.email) {
          fetch('/api/email', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
            body: JSON.stringify({
              type: 'schedule_posted',
              data: { staffEmail: m.email, staffName: addForm.staff_name.trim(), hotelName: hotelName || '', shiftDate: addForm.shift_date, startTime: addForm.start_time, endTime: addForm.end_time, role: addForm.role },
            }),
          }).catch(() => {});
        }
      }
      setShowAdd(false);
      setAddForm({ staff_id: '', staff_name: '', shift_date: today(), start_time: '07:00', end_time: '15:00', role: 'staff', notes: '' });
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save shift';
      setError(msg);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this shift?')) return;
    setError(null);
    try {
      await deleteStaffSchedule(id);
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove shift';
      setError(msg);
    }
  };

  // ── Publish Schedule ──
  const handlePublish = async () => {
    if (!confirm('Send this week\'s schedule to all staff via email?')) return;
    setPublishing(true); setError(null);
    try {
      const weekEnd = addDays(weekStart, 6);
      const [s] = await Promise.all([
        getStaffSchedulesRange(hotelId, weekStart, weekEnd),
      ]);
      const weekSchedules = s || [];

      // Group shifts by staff member
      const staffShifts: Record<string, { name: string; email: string; shifts: StaffSchedule[] }> = {};
      weekSchedules.forEach(shift => {
        const name = shift.staff_name;
        if (!staffShifts[name]) {
          const sInfo = staffList.find(x => x.name === name);
          staffShifts[name] = { name, email: sInfo?.email || '', shifts: [] };
        }
        staffShifts[name].shifts.push(shift);
      });

      // Add staff with no shifts but who have emails
      staffList.forEach(s => {
        if (s.email && !staffShifts[s.name]) {
          staffShifts[s.name] = { name: s.name, email: s.email, shifts: [] };
        }
      });

      // Send one email per staff member
      const results = await Promise.allSettled(
        Object.values(staffShifts)
          .filter(s => s.email)
          .map(s => {
            const days = s.shifts.map(sh => ({
              date: sh.shift_date,
              time: `${formatTime24to12(sh.start_time || '')}–${formatTime24to12(sh.end_time || '')}`,
              role: sh.role || 'staff',
              notes: sh.notes || '',
            }));
            return fetch('/api/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
              body: JSON.stringify({
                type: 'schedule_published',
                data: {
                  staffEmail: s.email,
                  staffName: s.name,
                  hotelName: hotelName || 'Hotel',
                  weekStart,
                  weekEnd,
                  days,
                },
              }),
            });
          })
      );

      const sent = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      setPublished(true);
      setTimeout(() => setPublished(false), 4000);
      if (failed > 0) {
        setError(`Published — ${sent} sent, ${failed} failed`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      setError(msg);
    }
    setPublishing(false);
  };

  const submitRequest = async () => {
    if (!reqForm.details.trim()) { setError('Tell us why you need the day off.'); return; }
    setSubmitting(true); setError(null);
    const name = staffName || 'Staff';
    const staffMember = staffList.find(s => s.name.toLowerCase() === name.toLowerCase());
    const res = await createScheduleChangeRequest(hotelId, {
      requested_by: name,
      shift_date: reqForm.shift_date,
      department: (staffMember?.department || 'front_desk') as DepartmentKey,
      change_type: (reqForm.is_pto ? 'time_off' : 'other') as 'time_off' | 'other',
      details: reqForm.details,
    });
    if (!res) { setError('Could not send request.'); setSubmitting(false); return; }
    setShowRequest(false);
    setReqForm({ shift_date: today(), is_pto: true, details: '' });
    await load();
    setSubmitting(false);
  };

  const weekDates = getWeekDates(weekStart);
  const weekEnd = weekDates[6];

  // Staff dept lookup
  const staffDept = (name: string): string => {
    const m = staffList.find(s => s.name === name);
    return m?.department || '';
  };

  const shiftColors: Record<string, string> = {
    management: 'bg-purple-100 border-purple-200 text-purple-900',
    front_desk: 'bg-blue-100 border-blue-200 text-blue-900',
    housekeeping: 'bg-emerald-100 border-emerald-200 text-emerald-900',
    maintenance: 'bg-amber-100 border-amber-200 text-amber-900',
    security: 'bg-slate-200 border-slate-300 text-slate-900',
    drivers: 'bg-orange-100 border-orange-200 text-orange-900',
  };
  const shiftColor = (dept: string) => shiftColors[dept] || 'bg-gray-100 border-gray-200 text-gray-800';

  const getStaff = (date: string) => {
    const dayShifts = schedules.filter(s => s.shift_date === date);

    const result: { name: string; shift: StaffSchedule | null }[] = [];

    dayShifts.forEach(s => {
      if (!result.find(r => r.name === s.staff_name)) {
        result.push({ name: s.staff_name, shift: s });
      }
    });

    // Filter by department if set
    let filtered = result;
    if (deptFilter !== 'all') {
      filtered = result.filter(r => staffDept(r.name) === deptFilter);
    }

    return filtered.sort((a, b) => {
      const deptA = staffDept(a.name);
      const deptB = staffDept(b.name);
      if (deptA !== deptB) return deptA.localeCompare(deptB);
      return a.name.localeCompare(b.name);
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900 flex items-center gap-2">
            <CalendarDays size={20} className="text-teal-600" />
            Schedules
          </h1>
          <p className="text-[13px] text-gray-500">{formatDateRange(weekStart, weekEnd)}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[12px] font-bold transition-all active:scale-95"
                style={{ backgroundColor: TEAL }}>
                <Plus size={14} />
                Add Shift
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${
                  published
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {published ? (
                  <><CheckCircle2 size={14} /> Published</>
                ) : publishing ? (
                  <><SendHorizontal size={14} className="animate-pulse" /> Publishing…</>
                ) : (
                  <><SendHorizontal size={14} /> Publish</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><XIcon size={14} /></button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all">
          <ArrowLeft size={14} /> Prev
        </button>
        <button onClick={() => setWeekStart(getWeekStart(today(), weekStartsOn))}
          className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all">
          This week
        </button>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all">
          Next <ArrowRight size={14} />
        </button>
      </div>

      {/* Department filter */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <button
          onClick={() => setDeptFilter('all')}
          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
            deptFilter === 'all'
              ? 'bg-teal-50 border-teal-300 text-teal-700'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        {DEPARTMENTS.map(d => (
          <button
            key={d.key}
            onClick={() => setDeptFilter(deptFilter === d.key ? 'all' : d.key)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
              deptFilter === d.key
                ? 'bg-teal-50 border-teal-300 text-teal-700'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {d.icon} {d.label}
          </button>
        ))}
      </div>

      {/* Mobile: horizontal scroll with snap — Desktop: 7-column grid */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 md:grid md:grid-cols-7 md:gap-2 md:overflow-visible md:pb-0 scrollbar-thin">
        {weekDates.map(date => {
          const dayStaff = getStaff(date);
          const forecast = forecasts.find(f => f.date === date);
          return (
            <div key={date} className="min-w-[85vw] sm:min-w-[45vw] md:min-w-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden snap-start shrink-0">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-center">
                <p className="text-[11px] font-bold text-gray-800">{dayName(date)}</p>
                <p className="text-[10px] text-gray-400">{new Date(date + 'T00:00:00').getDate()}</p>
              </div>
              {forecast ? (
                <div className="px-3 py-2 bg-teal-50/50 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      <span className="text-[9px] font-bold text-teal-700">
                        {(() => {
                          const p = forecast.rooms_occupied;
                          const t = forecast.total_rooms || 54;
                          const pct = t > 0 ? Math.round((p / t) * 100) : 0;
                          return `${pct}%`;
                        })()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-teal-700">
                        {(() => {
                          if (forecast.arrivals !== undefined && forecast.arrivals > 0) return `+${forecast.arrivals}`;
                          if (forecast.departures !== undefined && forecast.departures > 0) return `-${forecast.departures}`;
                          return `${forecast.rooms_occupied}/${forecast.total_rooms || 54}`;
                        })()}
                      </span>
                      <span className="text-[7px] text-gray-400 uppercase">out</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 text-center">
                  <span className="text-[9px] text-gray-300">No forecast</span>
                </div>
              )}
              <div className="px-2 py-1.5 space-y-1.5 min-h-[80px] max-h-[240px] overflow-y-auto">
                {dayStaff.length === 0 ? (
                  <p className="text-[10px] text-gray-300 text-center py-4">—</p>
                ) : (
                  dayStaff.filter(s => s.shift).map(({ name, shift }) => {
                    const s = shift!;
                    const dept = staffDept(name) || 'unassigned';
                    const color = shiftColor(dept);
                    return (
                      <div
                        key={s.id}
                        className={`rounded-lg border px-2 py-1.5 text-[10px] leading-tight mb-1 ${color} ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={() => isAdmin && handleDelete(s.id)}
                        title={isAdmin ? 'Click to remove' : ''}
                      >
                        <p className="font-bold truncate">{name.split(' ')[0]}</p>
                        <p className="text-[9px] opacity-80">
                          {formatTime24to12(s.start_time)}–{formatTime24to12(s.end_time)}
                        </p>
                        {s.notes && (
                          <p className="text-[8px] opacity-60 truncate">{s.notes}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {dayStaff.length > 0 && (
                <div className="px-3 py-1 border-t border-gray-100 bg-gray-50 text-center">
                  <span className="text-[9px] font-semibold text-gray-500">{dayStaff.length} staff</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 border border-gray-200 rounded-xl bg-white flex flex-wrap items-center gap-3 text-[10px]">
        <span className="font-bold text-gray-500 uppercase">Dept:</span>
        {DEPARTMENTS.map(d => (
          <span key={d.key} className={`px-2 py-0.5 rounded-lg border ${shiftColor(d.key)} flex items-center gap-1`}>
            {d.icon} {d.label}
          </span>
        ))}
        {isAdmin && <span className="ml-auto text-gray-400">Click a shift to remove</span>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold">Add Shift</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Staff Member</label>
                <div className="flex gap-2 mt-1">
                  <input value={addForm.staff_name} onChange={e => {
                    setAddForm(p => ({ ...p, staff_name: e.target.value }));
                    const match = staffList.find(s => s.name.toLowerCase() === e.target.value.toLowerCase());
                    if (match) setAddForm(prev => ({ ...prev, staff_id: match.id || '' }));
                  }} list="schedule-staff-list" placeholder="Name"
                    className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
                  <datalist id="schedule-staff-list">
                    {staffList.map(s => <option key={s.id || s.name} value={s.name} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</label>
                  <input type="date" value={addForm.shift_date} onChange={e => setAddForm(p => ({ ...p, shift_date: e.target.value }))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role</label>
                  <input value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))} placeholder="Front Desk"
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start</label>
                  <input type="time" value={addForm.start_time} onChange={e => setAddForm(p => ({ ...p, start_time: e.target.value }))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">End</label>
                  <input type="time" value={addForm.end_time} onChange={e => setAddForm(p => ({ ...p, end_time: e.target.value }))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none mt-1" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Notes (optional)</label>
                <input value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Cover front desk + shuttle"
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none mt-1" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleAdd} disabled={submitting || !addForm.staff_name.trim() || !addForm.shift_date}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                  {submitting ? 'Adding…' : 'Add Shift'}
                </button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRequest && !isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowRequest(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold">Request Day Off</h2>
              <button onClick={() => setShowRequest(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">
              {staffName ? `Requesting as ${staffName}.` : 'Your manager will review this request.'}
            </p>

            {(() => {
              const staffMember = staffName ? staffList.find(s => s.name.toLowerCase() === staffName.toLowerCase()) : undefined;
              if (staffMember?.hire_date) {
                const hd = new Date(staffMember.hire_date + 'T00:00:00');
                const months = Math.floor((Date.now() - hd.getTime()) / (1000*60*60*24*30.44));
                const ptoAccrued = Math.floor(months * 1.25);
                return (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-teal-800">PTO Balance</p>
                      <p className="text-[10px] text-teal-600">
                        Hired {new Date(staffMember.hire_date+'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[20px] font-extrabold text-teal-700">{ptoAccrued}</p>
                      <p className="text-[9px] text-teal-500">days accrued</p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Date</label>
                <input type="date" value={reqForm.shift_date} onChange={e => setReqForm(p => ({ ...p, shift_date: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setReqForm(p => ({ ...p, is_pto: true }))}
                    className={`py-3 rounded-xl text-[13px] font-bold border transition-all ${reqForm.is_pto ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                    PTO (Paid)
                  </button>
                  <button onClick={() => setReqForm(p => ({ ...p, is_pto: false }))}
                    className={`py-3 rounded-xl text-[13px] font-bold border transition-all ${!reqForm.is_pto ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                    Unpaid
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Reason</label>
                <textarea value={reqForm.details} onChange={e => setReqForm(p => ({ ...p, details: e.target.value }))}
                  rows={3} placeholder="Tell your manager why..."
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={submitRequest} disabled={submitting || !reqForm.details.trim() || !reqForm.shift_date}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                  {submitting ? 'Sending…' : 'Send Request'}
                </button>
                <button onClick={() => setShowRequest(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}