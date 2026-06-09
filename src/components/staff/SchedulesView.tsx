'use client';

import { useState, useEffect, Fragment } from 'react';
import {
  Plus, TrendingUp, CalendarDays, X as XIcon,
} from 'lucide-react';
import {
  getStaffSchedulesRange, createStaffSchedule, deleteStaffSchedule,
  getWeeklyForecasts,
  type StaffSchedule, type WeeklyForecast, type StaffAccount,
} from '@/lib/supabase';
import {
  listScheduleChangeRequests, createScheduleChangeRequest, updateOps, today,
  DEPARTMENTS, type DepartmentKey, type ScheduleChangeRequest,
} from '@/lib/opsStore';

const TEAL = '#0D9488';

function getWeekStart(date: string, weekStartsOn?: string): string {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
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

function dayMonth(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<WeeklyForecast[]>([]);
  const [weekStart, setWeekStart] = useState<string>(getWeekStart(today(), weekStartsOn));
  const [showAdd, setShowAdd] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showForecast, setShowForecast] = useState(false);
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
    setChangeRequests(cr);
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

  // Week dates
  const weekDates = getWeekDates(weekStart);
  const weekEnd = weekDates[6];

  // Group schedules by staff_name, then by day
  const staffNames = schedules.map(s => s.staff_name).filter((v, i, a) => a.indexOf(v) === i).sort();
  // Also include all active staff from staffList if they have no schedules
  const allStaffMap: Record<string, boolean> = {};
  staffNames.forEach(n => allStaffMap[n] = true);
  staffList.forEach(s => allStaffMap[s.name] = true);
  const allStaffSorted = Object.keys(allStaffMap).sort();

  // Get department for each staff member from staffList
  const staffDept = (name: string): string => {
    const m = staffList.find(s => s.name === name);
    return m?.department || '';
  };

  // Group by department
  const staffByDept: Record<string, string[]> = {};
  allStaffSorted.forEach(name => {
    const dept = staffDept(name) || 'unassigned';
    if (!staffByDept[dept]) staffByDept[dept] = [];
    staffByDept[dept].push(name);
  });

  const daySchedule = (staffName: string, date: string): StaffSchedule[] => {
    return schedules.filter(s => s.staff_name === staffName && s.shift_date === date);
  };

  const deptBg = (dept: string) => {
    const colors: Record<string, string> = {
      management: 'bg-purple-50',
      front_desk: 'bg-sky-50',
      housekeeping: 'bg-emerald-50',
      maintenance: 'bg-amber-50',
      security: 'bg-slate-100',
      drivers: 'bg-orange-50',
      unassigned: 'bg-gray-50',
    };
    return colors[dept] || 'bg-gray-50';
  };

  const shiftColors: Record<string, string> = {
    management: 'bg-purple-100 border-purple-200 text-purple-900',
    front_desk: 'bg-blue-100 border-blue-200 text-blue-900',
    housekeeping: 'bg-emerald-100 border-emerald-200 text-emerald-900',
    maintenance: 'bg-amber-100 border-amber-200 text-amber-900',
    security: 'bg-slate-200 border-slate-300 text-slate-900',
    drivers: 'bg-orange-100 border-orange-200 text-orange-900',
  };
  const shiftColor = (dept: string) => shiftColors[dept] || 'bg-gray-100 border-gray-200';

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Schedules</h1>
          <p className="text-[13px] text-gray-500">{formatDateRange(weekStart, weekEnd)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
            <Plus size={14} /> Add Shift
          </button>
          {isAdmin && (
            <button onClick={() => setShowForecast(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[12px] font-bold text-gray-600">
              <TrendingUp size={14} /> Forecast
            </button>
          )}
          {!isAdmin && (
            <button onClick={() => setShowRequest(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[12px] font-bold text-gray-600">
              <CalendarDays size={14} /> Request Off
            </button>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-gray-600">← Prev</button>
        <button onClick={() => setWeekStart(getWeekStart(today(), weekStartsOn))} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-gray-600">This week</button>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-gray-600">Next →</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-xl px-4 py-3 mb-4">{error}</div>}

      {/* Pending change requests banner (admin) */}
      {isAdmin && changeRequests.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 mb-5">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">⏳ {changeRequests.length} request{changeRequests.length === 1 ? '' : 's'} pending</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {changeRequests.slice(0, 5).map(cr => (
              <div key={cr.id} className="bg-white rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-gray-900 truncate">{cr.details.requested_by} · {cr.details.change_type}</p>
                  <p className="text-[10px] text-gray-500">{cr.details.shift_date} · {DEPARTMENTS.find(d => d.key === cr.details.department)?.label} · {cr.details.details}</p>
                </div>
                <button onClick={() => completeChange(cr.id)} className="text-[10px] font-bold px-2 py-1 rounded-lg text-white shrink-0" style={{ backgroundColor: TEAL }}>Done</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff × Day matrix */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="bg-gray-50 border-b border-r border-gray-200 p-2.5 w-[140px] sticky left-0 z-10 text-left">
                  <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">Staff</span>
                </th>
                {weekDates.map(d => {
                  const isToday = d === today();
                  return (
                    <th key={d} className={`border-b border-r border-gray-200 p-2 text-center min-w-[100px] ${isToday ? 'bg-teal-50' : 'bg-gray-50'}`}>
                      <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">{dayName(d)}</div>
                      <div className={`text-[15px] font-extrabold mt-0.5 ${isToday ? 'text-teal-700' : 'text-gray-900'}`}>{dayMonth(d)}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* ── Forecast row (3 metrics × 7 days) ── */}
              <tr className="bg-blue-50/40">
                <td className="border-b border-r border-gray-200 p-1.5 sticky left-0 bg-blue-50/40">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={12} className="text-blue-500" />
                    <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Forecast</span>
                  </div>
                </td>
                {weekDates.map(d => {
                  const fc = forecasts.find(f => f.date === d);
                  return (
                    <td key={d} className="border-b border-r border-gray-200 p-1.5 text-center">
                      {fc ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] font-bold text-gray-800">{fc.occupancy_pct}%</span>
                            <span className="text-[7px] text-gray-400">occ</span>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] font-semibold text-gray-700">{fc.arrivals}</span>
                            <span className="text-[7px] text-gray-400">arr</span>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] font-semibold text-gray-700">{fc.rooms_occupied}</span>
                            <span className="text-[7px] text-gray-400">rooms</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {Object.entries(staffByDept).map(([dept, names]) => (
                <Fragment key={dept}>
                  {/* Department header row */}
                  <tr key={`dept-${dept}`}>
                    <td className={`${deptBg(dept)} border-b border-r border-gray-200 px-3 py-1.5 sticky left-0`} colSpan={8}>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-gray-500">
                        {DEPARTMENTS.find(d => d.key === dept)?.icon} {DEPARTMENTS.find(d => d.key === dept)?.label || 'Unassigned'}
                      </span>
                    </td>
                  </tr>
                  {/* Staff rows */}
                  {names.map(name => {
                    const deptColor = shiftColor(dept);
                    // Calculate weekly hours for this staff member
                    const weeklyShifts = schedules.filter(s => s.staff_name === name);
                    const totalMinutes = weeklyShifts.reduce((sum, s) => {
                      const [sh, sm] = s.start_time.split(':').map(Number);
                      const [eh, em] = s.end_time.split(':').map(Number);
                      return sum + (eh * 60 + em) - (sh * 60 + sm);
                    }, 0);
                    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
                    const staffInfo = staffList.find(s => s.name === name);
                    const minHrs = staffInfo?.min_hours || 0;
                    const empType = staffInfo?.employment_type === 'part_time' ? 'PT' : 'FT';
                    const meetsMin = minHrs === 0 || totalHours >= minHrs;
                    return (
                      <tr key={name}>
                        <td className="bg-white border-b border-r border-gray-200 p-2 sticky left-0">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{backgroundColor: TEAL}}>
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[12px] font-semibold text-gray-900 truncate block">{name}</span>
                              <span className={`text-[9px] font-medium ${meetsMin ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {empType} · {totalHours}h{minHrs > 0 ? ` / ${minHrs}h` : ''}
                              </span>
                            </div>
                          </div>
                        </td>
                        {weekDates.map(d => {
                          const shifts = daySchedule(name, d);
                          return (
                            <td key={d} className="border-b border-r border-gray-100 p-1.5 align-middle min-h-[48px]">
                              {shifts.length > 0 ? (
                                <div className="space-y-1">
                                  {shifts.map(s => (
                                    <div key={s.id} className={`rounded-lg border px-2 py-1.5 text-[11px] leading-tight ${deptColor} ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                                      onClick={() => isAdmin && handleDelete(s.id)}
                                      title={isAdmin ? 'Click to remove' : ''}
                                    >
                                      <p className="font-bold">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</p>
                                      {s.notes && <p className="text-[9px] opacity-70 truncate">{s.notes}</p>}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center">
                                  <span className="text-[10px] text-gray-300">—</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
              {allStaffSorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-[13px] text-gray-400">
                    No staff assigned yet. Add a shift to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3 text-[10px]">
          <span className="font-bold text-gray-500 uppercase">Legend:</span>
          {DEPARTMENTS.map(d => (
            <span key={d.key} className={`px-2 py-0.5 rounded-lg border ${shiftColor(d.key)}`}>{d.icon} {d.label}</span>
          ))}
          {isAdmin && <span className="ml-auto text-gray-400">Click a shift to remove it</span>}
        </div>
      </div>

      {/* Add Shift modal */}
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
                  }} list="schedule-staff-list" placeholder="Name or pick from list"
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

      {/* Staff: Request Day Off / Change modal */}
      {showRequest && !isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowRequest(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold">Request Day Off / Change</h2>
              <button onClick={() => setShowRequest(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">Your manager will see this in their queue.</p>
            {/* PTO balance */}
            {(() => {
              const staffMember = staffList.find(s => s.name.toLowerCase() === reqForm.staff_name.toLowerCase());
              if (staffMember?.hire_date) {
                const hd = new Date(staffMember.hire_date + 'T00:00:00');
                const months = Math.floor((Date.now() - hd.getTime()) / (1000*60*60*24*30.44));
                const ptoAccrued = Math.floor(months * 1.25);
                const used = 0; // will come from pto_used field later
                return (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-teal-800">PTO Balance</p>
                      <p className="text-[10px] text-teal-600">Hired {new Date(staffMember.hire_date+'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[20px] font-extrabold text-teal-700">{ptoAccrued - used}</p>
                      <p className="text-[9px] text-teal-500">days accrued ({ptoAccrued})</p>
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
                    className={`py-2 rounded-xl text-[11px] font-bold border ${reqForm.change_type === t ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                    {t === 'time_off' ? 'Day off' : t === 'time_change' ? 'Time change' : t === 'swap' ? 'Swap' : t === 'cover' ? 'Cover' : 'Other'}
                  </button>
                ))}
              </div>
              <textarea value={reqForm.details} onChange={e => setReqForm(p => ({ ...p, details: e.target.value }))} rows={3} placeholder="Reason / details (optional for Day off)"
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