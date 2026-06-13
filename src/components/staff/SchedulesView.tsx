'use client';

import { useState, useEffect } from 'react';
import {
  Plus, CalendarDays, X as XIcon, ArrowRight, ArrowLeft,
} from 'lucide-react';
import {
  getStaffSchedulesRange, createStaffSchedule, deleteStaffSchedule,
  getWeeklyForecasts,
  type StaffSchedule, type WeeklyForecast, type StaffAccount,
} from '@/lib/supabase';
import {
  listScheduleChangeRequests, createScheduleChangeRequest, updateOps, today,
  DEPARTMENTS, type DepartmentKey, type ScheduleChangeRequest, type OpRecord,
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

export default function SchedulesView({
  hotelId, isAdmin, staffList, weekStartsOn,
}: {
  hotelId: string;
  isAdmin: boolean;
  staffList: { id?: string; name: string; role?: string; department?: string; hire_date?: string; min_hours?: number; employment_type?: string }[];
  weekStartsOn?: string;
}) {
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [changeRequests, setChangeRequests] = useState<OpRecord[]>([]);
  const [forecasts, setForecasts] = useState<WeeklyForecast[]>([]);
  const [weekStart, setWeekStart] = useState<string>(getWeekStart(today(), weekStartsOn));
  const [showAdd, setShowAdd] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({
    staff_id: '', staff_name: '', shift_date: today(),
    start_time: '07:00', end_time: '15:00', role: 'staff', notes: '',
  });

  const [reqForm, setReqForm] = useState({
    staff_name: '', department: 'front_desk' as DepartmentKey,
    shift_date: today(), change_type: 'time_off' as ScheduleChangeRequest['change_type'], details: '',
  });

  const load = async () => {
    const weekEnd = addDays(weekStart, 6);
    const [s, cr, f] = await Promise.all([
      getStaffSchedulesRange(hotelId, weekStart, weekEnd),
      listScheduleChangeRequests(hotelId, 'pending'),
      getWeeklyForecasts(hotelId, weekStart),
    ]);
    setSchedules(s || []);
    setChangeRequests(cr || []);
    setForecasts(f || []);
  };
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, weekStart]);

  const handleAdd = async () => {
    if (!addForm.staff_name.trim() || !addForm.shift_date) return;
    setSubmitting(true); setError(null);
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
            data: { staffEmail: m.email, staffName: addForm.staff_name.trim(), hotelName: '', shiftDate: addForm.shift_date, startTime: addForm.start_time, endTime: addForm.end_time, role: addForm.role },
          }),
        }).catch(() => {});
      }
    }
    setShowAdd(false);
    setAddForm({ staff_id: '', staff_name: '', shift_date: today(), start_time: '07:00', end_time: '15:00', role: 'staff', notes: '' });
    await load();
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this shift?')) return;
    await deleteStaffSchedule(id);
    await load();
  };

  const submitRequest = async () => {
    if (!reqForm.details.trim() && reqForm.change_type === 'other') { setError('Tell us what you need.'); return; }
    setSubmitting(true); setError(null);
    const res = await createScheduleChangeRequest(hotelId, {
      requested_by: reqForm.staff_name || 'Staff',
      shift_date: reqForm.shift_date,
      department: reqForm.department,
      change_type: reqForm.change_type,
      details: reqForm.details,
    });
    if (!res) { setError('Could not send request.'); setSubmitting(false); return; }
    setShowRequest(false);
    setReqForm({ staff_name: '', department: 'front_desk', shift_date: today(), change_type: 'time_off', details: '' });
    await load();
    setSubmitting(false);
  };

  const completeChange = async (id: string) => { await updateOps(id, { status: 'completed' }); load(); };

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
    const scheduledNames = new Set(dayShifts.map(s => s.staff_name));

    // Always show ALL staff from the roster, mark who has a shift
    const result: { name: string; shift: StaffSchedule | null }[] = [];

    // Add staff who have shifts
    dayShifts.forEach(s => {
      if (!result.find(r => r.name === s.staff_name)) {
        result.push({ name: s.staff_name, shift: s });
      }
    });

    // Add staff from roster who DON'T have a shift (shown as "off")
    staffList.forEach(s => {
      if (!scheduledNames.has(s.name) && !result.find(r => r.name === s.name)) {
        result.push({ name: s.name, shift: null });
      }
    });

    return result.sort((a, b) => {
      const deptA = staffDept(a.name);
      const deptB = staffDept(b.name);
      if (deptA !== deptB) return deptA.localeCompare(deptB);
      return a.name.localeCompare(b.name);
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
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
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[12px] font-bold transition-all active:scale-[0.97]" style={{ backgroundColor: TEAL }}>
              <Plus size={14} /> Add Shift
            </button>
          )}
          {!isAdmin && (
            <button onClick={() => setShowRequest(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-all">
              <CalendarDays size={14} /> Request Off
            </button>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1">
          <ArrowLeft size={14} /> Prev
        </button>
        <button onClick={() => setWeekStart(getWeekStart(today(), weekStartsOn))}
          className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all">
          This week
        </button>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1">
          Next <ArrowRight size={14} />
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-xl px-4 py-3 mb-4">{error}</div>}

      {/* Pending change requests banner (admin) */}
      {isAdmin && changeRequests.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 mb-5">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">
            ⏳ {changeRequests.length} request{changeRequests.length === 1 ? '' : 's'} pending
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {changeRequests.slice(0, 5).map(cr => (
              <div key={cr.id} className="bg-white rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-gray-900 truncate">
                    {cr.details?.requested_by || 'Staff'} · {cr.details?.change_type || 'request'}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {cr.details?.shift_date} · {DEPARTMENTS.find(d => d.key === cr.details?.department)?.label || ''} · {cr.details?.details || ''}
                  </p>
                </div>
                <button onClick={() => completeChange(cr.id)}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg text-white shrink-0" style={{ backgroundColor: TEAL }}>Done</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DAILY CALENDAR VIEW ── */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDates.map((d, idx) => {
          const isToday = d === today();
          const fc = forecasts.find(f => f.date === d);
          const dayStaff = getStaff(d);

          return (
            <div
              key={d}
              className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${
                isToday ? 'border-teal-400 ring-1 ring-teal-200' : 'border-gray-200'
              }`}
            >
              {/* Day Header */}
              <div className={`px-3 py-2.5 text-center ${isToday ? 'bg-teal-50' : 'bg-gray-50'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-teal-700' : 'text-gray-500'}`}>
                  {dayName(d)}
                </p>
                <p className={`text-[18px] font-extrabold ${isToday ? 'text-teal-800' : 'text-gray-900'}`}>
                  {new Date(d + 'T12:00:00').getDate()}
                </p>
                <p className={`text-[9px] ${isToday ? 'text-teal-600' : 'text-gray-400'}`}>
                  {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
                </p>
              </div>

              {/* Forecast Summary */}
              {fc ? (
                <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-teal-50 border-b border-blue-100">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-blue-700">{fc.occupancy_pct}%</span>
                      <span className="text-[7px] text-blue-400 uppercase">occ</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-[9px] font-bold text-teal-700">{fc.rooms_occupied}</span>
                      <span className="text-[7px] text-teal-400 uppercase">rms</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-semibold text-gray-700">{fc.arrivals}</span>
                      <span className="text-[7px] text-gray-400 uppercase">in</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-[9px] font-semibold text-gray-700">
                        {fc.rooms_occupied && fc.arrivals !== undefined
                          ? Math.max(0, (() => {
                              // Calculate departures from previous day
                              const prevFc = forecasts[idx - 1];
                              const prevRooms = prevFc?.rooms_occupied || fc.rooms_occupied;
                              return prevRooms + (fc.arrivals || 0) - fc.rooms_occupied;
                            })())
                          : '—'}
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

              {/* Staff Shifts */}
              <div className="px-2 py-1.5 space-y-1.5 min-h-[80px] max-h-[240px] overflow-y-auto">
                {dayStaff.length === 0 ? (
                  <p className="text-[10px] text-gray-300 text-center py-4">—</p>
                ) : (
                  dayStaff.map(({ name, shift }) => {
                    const dept = staffDept(name) || 'unassigned';
                    if (shift) {
                      const color = shiftColor(dept);
                      return (
                        <div
                          key={shift.id}
                          className={`rounded-lg border px-2 py-1.5 text-[10px] leading-tight mb-1 ${color} ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                          onClick={() => isAdmin && handleDelete(shift.id)}
                          title={isAdmin ? 'Click to remove' : ''}
                        >
                          <p className="font-bold truncate">{name.split(' ')[0]}</p>
                          <p className="text-[9px] opacity-80">
                            {shift.start_time.slice(0,5)}–{shift.end_time.slice(0,5)}
                          </p>
                          {shift.notes && (
                            <p className="text-[8px] opacity-60 truncate">{shift.notes}</p>
                          )}
                        </div>
                      );
                    } else {
                      // Staff off this day
                      const color = shiftColor(dept);
                      return (
                        <div
                          key={`off-${name}`}
                          className={`rounded-lg border border-dashed px-2 py-1.5 text-[10px] leading-tight mb-1 ${color.replace('bg-', 'bg-opacity-20 bg-').replace('border-', 'border-dashed border-gray-200')}`}
                        >
                          <p className="font-bold truncate text-gray-400">{name.split(' ')[0]}</p>
                          <p className="text-[9px] text-gray-300 italic">Off</p>
                        </div>
                      );
                    }
                  })
                )}
              </div>

              {/* Shift Count Badge */}
              {dayStaff.length > 0 && (
                <div className="px-3 py-1 border-t border-gray-100 bg-gray-50 text-center">
                  <span className="text-[9px] font-semibold text-gray-500">{dayStaff.length} staff</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 p-3 border border-gray-200 rounded-xl bg-white flex flex-wrap items-center gap-3 text-[10px]">
        <span className="font-bold text-gray-500 uppercase">Dept:</span>
        {DEPARTMENTS.map(d => (
          <span key={d.key} className={`px-2 py-0.5 rounded-lg border ${shiftColor(d.key)} flex items-center gap-1`}>
            {d.icon} {d.label}
          </span>
        ))}
        {isAdmin && <span className="ml-auto text-gray-400">Click a shift to remove</span>}
      </div>

      {/* ── Add Shift Modal ── */}
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

      {/* ── Staff Request Off Modal ── */}
      {showRequest && !isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowRequest(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold">Request Day Off / Change</h2>
              <button onClick={() => setShowRequest(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">Your manager will see this in their queue.</p>
            {(() => {
              const staffMember = staffList.find(s => s.name.toLowerCase() === reqForm.staff_name.toLowerCase());
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
            <div className="space-y-3">
              <input value={reqForm.staff_name} onChange={e => setReqForm(p => ({ ...p, staff_name: e.target.value }))} placeholder="Your name"
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
              <select value={reqForm.department} onChange={e => setReqForm(p => ({ ...p, department: e.target.value as DepartmentKey }))}
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none">
                {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
              </select>
              <input value={reqForm.shift_date} onChange={e => setReqForm(p => ({ ...p, shift_date: e.target.value }))} type="date"
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
              <div className="grid grid-cols-3 gap-2">
                {(['time_off', 'swap', 'cover', 'time_change', 'other'] as const).map(t => (
                  <button key={t} onClick={() => setReqForm(p => ({ ...p, change_type: t }))}
                    className={`py-2 rounded-xl text-[11px] font-bold border ${
                      reqForm.change_type === t
                        ? 'bg-teal-50 border-teal-300 text-teal-700'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}>
                    {t === 'time_off' ? 'Day off' : t === 'time_change' ? 'Time change' : t === 'swap' ? 'Swap' : t === 'cover' ? 'Cover' : 'Other'}
                  </button>
                ))}
              </div>
              <textarea value={reqForm.details} onChange={e => setReqForm(p => ({ ...p, details: e.target.value }))} rows={3} placeholder="Reason / details"
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
              <div className="flex gap-2 pt-1">
                <button onClick={submitRequest} disabled={submitting}
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
