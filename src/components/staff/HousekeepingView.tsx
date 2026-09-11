'use client';

import { useState, useEffect, useCallback } from 'react';
import { BedDouble, Timer, Package, Plus, RefreshCw, Clock, CheckCircle2, Pencil, Sunrise, Moon, X, Wrench, EyeOff, Eye } from 'lucide-react';
import {
  getRoomStatuses, updateRoomStatus, getLinenCounts, createLinenCount,
  getHkLaborLogs, createHkLaborLog,
  getStaffSchedulesRange, getWeeklyForecasts, updateStaffSchedule,
  getMaintenancePms,
  type RoomStatus, type StaffSchedule, type WeeklyForecast, type HkLaborLog, type MaintenancePm,
} from '@/lib/supabase';
import { listOps, createOps, type OpRecord } from '@/lib/opsStore';

const TEAL = '#158A7C';
/** Productivity model (locked): checkout = 30 min, stayover = 15 min, 8h shifts (480 min). */
const MIN_CHECKOUT = 30;
const MIN_STAYOVER = 15;
const SHIFT_MIN = 480;

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0 Sun
  d.setDate(d.getDate() - ((dow + 6) % 7));
  return localDateStr(d);
}
function fmtTime(t?: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const H = parseInt(h, 10);
  const ampm = H >= 12 ? 'PM' : 'AM';
  const h12 = H % 12 === 0 ? 12 : H % 12;
  return `${h12}:${m} ${ampm}`;
}
/** Expected shift end = scheduled start + 8h, capped at 23:59 */
function expectedEnd(start?: string | null): string | null {
  if (!start) return null;
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + SHIFT_MIN;
  const capped = Math.min(total, 23 * 60 + 59);
  return `${String(Math.floor(capped / 60)).padStart(2, '0')}:${String(capped % 60).padStart(2, '0')}`;
}
function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const STATUS_STYLE: Record<string, string> = {
  dirty: 'bg-orange-50 text-orange-700 border-orange-200',
  clean: 'bg-blue-50 text-blue-700 border-blue-200',
  inspected: 'bg-teal-50 text-teal-800 border-teal-200',
  out_of_order: 'bg-red-50 text-red-700 border-red-200',
};

interface SodPlan {
  plan_date: string;
  checkouts: number;
  stayovers: number;
  workload_min: number;
  maids_needed: number;
  est_end: string | null;
  created_by: string;
}

export default function HousekeepingView({
  hotelId, hotelName, staffName, isAdmin,
}: { hotelId: string; hotelName: string; staffName: string; isAdmin: boolean }) {
  const today = localDateStr();
  const [rooms, setRooms] = useState<RoomStatus[]>([]);
  const [linen, setLinen] = useState<{ item_type: string; count: number; par_level: number }[]>([]);
  const [labor, setLabor] = useState<HkLaborLog[]>([]);
  const [hkShifts, setHkShifts] = useState<StaffSchedule[]>([]);
  const [pms, setPms] = useState<MaintenancePm[]>([]);
  const [expectedRooms, setExpectedRooms] = useState<number | null>(null);
  const [sodPlan, setSodPlan] = useState<SodPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLinen, setShowLinen] = useState(false);
  const [lnItemType, setLnItemType] = useState('');
  const [lnCount, setLnCount] = useState('');
  const [lnPar, setLnPar] = useState('');
  const [lbRooms, setLbRooms] = useState('');
  const [lbMinutes, setLbMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  // SOD plan inputs
  const [sodCheckouts, setSodCheckouts] = useState('');
  const [sodStayovers, setSodStayovers] = useState('');
  const [sodSaving, setSodSaving] = useState(false);
  // Per-room popup (status actions + DND + matched PMs)
  const [popupRoom, setPopupRoom] = useState<RoomStatus | null>(null);
  // Admin edit of an already-logged exit time
  const [editingEndId, setEditingEndId] = useState<string | null>(null);
  const [editEndVal, setEditEndVal] = useState('');

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [r, ln, lb, scheds, fcs, pmList, plans] = await Promise.all([
      getRoomStatuses(hotelId),
      getLinenCounts(hotelId, today).catch(() => []),
      getHkLaborLogs(hotelId, today),
      getStaffSchedulesRange(hotelId, today, today).catch(() => [] as StaffSchedule[]),
      getWeeklyForecasts(hotelId, mondayOf(today)).catch(() => [] as WeeklyForecast[]),
      getMaintenancePms(hotelId).catch(() => [] as MaintenancePm[]),
      listOps(hotelId, 'hk_sod_plan').catch(() => [] as OpRecord[]),
    ]);
    const sorted = (r || []).sort((a, b) => {
      // cleaned today first (most recent), then numerically
      const at = a.cleaned_at || '', bt = b.cleaned_at || '';
      const aToday = at.slice(0, 10) === today, bToday = bt.slice(0, 10) === today;
      if (aToday !== bToday) return aToday ? -1 : 1;
      if (aToday && bToday && at !== bt) return bt.localeCompare(at);
      const na = parseInt(a.room_number, 10), nb = parseInt(b.room_number, 10);
      return (isNaN(na) || isNaN(nb)) ? a.room_number.localeCompare(b.room_number) : na - nb;
    });
    setRooms(sorted);
    setLinen(ln || []);
    setLabor(lb || []);
    setPms(pmList || []);
    setHkShifts((scheds || []).filter(s => (s.department || '').toLowerCase().includes('house') || (s.role || '').toLowerCase().includes('house') || (s.role || '').toLowerCase().includes('hk')));
    const t = (fcs || []).find(f => f.date === today);
    if (t) {
      const stayovers = Math.max(0, (t.rooms_occupied || 0) - (t.departures || 0));
      setExpectedRooms((t.departures || 0) + stayovers);
    } else {
      setExpectedRooms(null);
    }
    // Latest hk_sod_plan saved today
    const todays = ((plans || []) as OpRecord[])
      .map(p => p.details as unknown as SodPlan)
      .filter(d => d && d.plan_date === today)
      .sort((a, b) => (b.created_by || '').localeCompare(a.created_by || ''));
    setSodPlan(todays[0] || null);
    setLoading(false);
  }, [hotelId, today]);

  useEffect(() => { load(); }, [load]);

  const markInspected = async (room: RoomStatus) => {
    setRooms(prev => prev.map(r => (r.id === room.id ? { ...r, status: 'inspected', inspected_by: staffName, inspected_at: new Date().toISOString() } : r)));
    setPopupRoom(prev => (prev && prev.id === room.id ? { ...prev, status: 'inspected' } : prev));
    await updateRoomStatus(room.id, { status: 'inspected', inspected_by: staffName || undefined });
  };

  const logShiftEnd = async (s: StaffSchedule, value: string) => {
    if (!value) return;
    setHkShifts(prev => prev.map(row => (row.id === s.id ? { ...row, end_time: value } : row)));
    await updateStaffSchedule(s.id, { end_time: value });
  };

  const isDnd = (r: RoomStatus) => (r.notes || '').toUpperCase().includes('DND');

  const setDnd = async (room: RoomStatus, on: boolean) => {
    const other = (room.notes || '').split(',').map(s => s.trim()).filter(s => s.toUpperCase() !== 'DND');
    const notes = on ? (other.length ? `DND, ${other.join(', ')}` : 'DND') : other.join(', ');
    setRooms(prev => prev.map(r => (r.id === room.id ? { ...r, notes } : r)));
    setPopupRoom(prev => (prev && prev.id === room.id ? { ...prev, notes } : prev));
    try {
      await updateRoomStatus(room.id, { status: room.status, notes });
      if (on) setPopupRoom(null);
    } catch { load(); }
  };

  const saveSodPlan = async () => {
    const co = Number(sodCheckouts), so = Number(sodStayovers);
    if (isNaN(co) || isNaN(so) || (co === 0 && so === 0)) return;
    setSodSaving(true);
    const workload = co * MIN_CHECKOUT + so * MIN_STAYOVER;
    const maids = Math.max(1, Math.ceil(workload / SHIFT_MIN));
    const earliest = hkShifts.map(s => s.start_time).filter(Boolean).sort()[0] || null;
    const estEnd = earliest ? addMinutes(earliest, Math.ceil(workload / maids)) : null;
    const plan: SodPlan = {
      plan_date: today, checkouts: co, stayovers: so,
      workload_min: workload, maids_needed: maids, est_end: estEnd,
      created_by: staffName || 'Supervisor',
    };
    const saved = await createOps(hotelId, 'hk_sod_plan', plan, 'active', { guest_name: staffName || 'Supervisor', room: 'HK' });
    if (saved) setSodPlan(plan);
    setSodCheckouts(''); setSodStayovers('');
    setSodSaving(false);
  };

  const minutesToday = labor.reduce((s, l) => s + l.minutes, 0);
  const roomsToday = labor.reduce((s, l) => s + l.rooms_cleaned, 0);
  const minPerRoom = roomsToday > 0 ? Math.round(minutesToday / roomsToday) : null;
  const variance = expectedRooms != null ? roomsToday - expectedRooms : null;
  const pct = expectedRooms != null && expectedRooms > 0 ? Math.min(100, Math.round((roomsToday / expectedRooms) * 100)) : null;
  const cleanedToday = rooms.filter(r => (r.cleaned_at || '').slice(0, 10) === today).length;
  const onPace = variance == null ? null : variance >= 0;
  const endedOnTime = hkShifts.filter(s => { const exp = expectedEnd(s.start_time); return s.end_time && exp && s.end_time <= exp; }).length;
  // EOD variance vs productivity model: actual minutes vs planned workload
  const modelWorkload = sodPlan ? sodPlan.workload_min : null;
  const minVariance = modelWorkload != null ? minutesToday - modelWorkload : null;
  // Latest actual end across logged-out maids vs planned est_end
  const lastActualEnd = hkShifts.map(s => s.end_time).filter(Boolean).sort().pop() || null;
  const endVariance = (() => {
    if (!sodPlan?.est_end || !lastActualEnd) return null;
    const toM = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    return toM(lastActualEnd) - toM(sodPlan.est_end);
  })();

  const pmForRoom = (rn: string): MaintenancePm[] => {
    if (!rn) return [];
    let rx: RegExp;
    try { rx = new RegExp(`\\b${rn}\\b`); } catch { return []; }
    return pms.filter(p => rx.test(`${p.title} ${p.notes || ''} ${p.assigned_to || ''}`));
  };

  const addLinen = async () => {
    const c = Number(lnCount), p = Number(lnPar);
    if (!lnItemType.trim() || isNaN(c) || isNaN(p)) return;
    setSaving(true);
    await createLinenCount({
      hotel_id: hotelId, count_date: today, shift: 'morning',
      item_type: lnItemType.trim(), count: c, par_level: p, counted_by: staffName || undefined,
    });
    setLnItemType(''); setLnCount(''); setLnPar('');
    setSaving(false);
    load();
  };

  const addLabor = async () => {
    const rc = Number(lbRooms), mm = Number(lbMinutes);
    if (isNaN(rc) || isNaN(mm) || (rc === 0 && mm === 0)) return;
    setSaving(true);
    await createHkLaborLog(hotelId, staffName || 'Staff', rc, mm);
    setLbRooms(''); setLbMinutes('');
    setSaving(false);
    load();
  };

  const sec = 'bg-white border border-gray-200 rounded-2xl p-4';
  const belowPar = linen.filter(l => l.count < l.par_level);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Housekeeping — Labor Control</h1>
          <p className="text-[13px] text-gray-500">{hotelName} · checkouts 30 min · stayovers 15 min · 8h shifts</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-xl px-3 py-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Start of Day: productivity plan ── */}
      {isAdmin && (
        <div className={sec + ' mb-4'}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Sunrise size={14} style={{ color: TEAL }} /> Start of Day Plan <span className="text-[11px] font-medium text-gray-400">— workload model</span></div>
            {sodPlan && <span className="text-[10px] font-extrabold rounded-lg px-2 py-1 bg-teal-50 text-teal-800">PLAN SAVED · {sodPlan.created_by}</span>}
          </div>
          {sodPlan ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{sodPlan.checkouts}</div><div className="text-[10px] font-bold text-gray-500">CHECKOUTS ×30</div></div>
              <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{sodPlan.stayovers}</div><div className="text-[10px] font-bold text-gray-500">STAYOVERS ×15</div></div>
              <div className="bg-teal-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-teal-800">{sodPlan.workload_min}</div><div className="text-[10px] font-bold text-teal-700">WORKLOAD (MIN)</div></div>
              <div className="bg-teal-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-teal-800">{sodPlan.maids_needed}</div><div className="text-[10px] font-bold text-teal-700">MAIDS NEEDED</div><div className="text-[9px] text-teal-600 font-medium mt-0.5">÷ 480 min shift</div></div>
              <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{fmtTime(sodPlan.est_end) || '—'}</div><div className="text-[10px] font-bold text-gray-500">APPROX END</div><div className="text-[9px] text-gray-400 font-medium mt-0.5">from first HK shift in</div></div>
            </div>
          ) : (
            <p className="text-[13px] text-gray-400 font-medium mb-3">No plan yet today — enter counts to size the crew.</p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[12px] font-medium text-gray-600">Checkouts today
              <input value={sodCheckouts} onChange={e => setSodCheckouts(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Stayovers today
              <input value={sodStayovers} onChange={e => setSodStayovers(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <button onClick={saveSodPlan} disabled={sodSaving} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
              <span className="flex items-center gap-1"><Plus size={13} /> {sodPlan ? 'Replan' : 'Save plan'}</span>
            </button>
            <span className="text-[11px] text-gray-400">maids = ceil(workload ÷ 480) · approx end = first shift in + workload ÷ maids</span>
          </div>
        </div>
      )}

      {/* ── Daily reconciliation: expected vs actual ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Timer size={14} style={{ color: TEAL }} /> End of Day — Actuals vs Plan <span className="text-[11px] font-medium text-gray-400">— today</span></div>
          {onPace != null && (
            <span className={`text-[10px] font-extrabold rounded-lg px-2 py-1 ${onPace ? 'bg-teal-50 text-teal-800' : 'bg-orange-50 text-orange-700'}`}>
              {onPace ? 'ON PACE' : 'BEHIND'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-teal-50 rounded-xl p-3 text-center">
            <div className="text-[20px] font-extrabold text-teal-800">{expectedRooms != null ? expectedRooms : '—'}</div>
            <div className="text-[10px] font-bold text-teal-700">EXPECTED ROOMS</div>
            <div className="text-[9px] text-teal-600 font-medium mt-0.5">departures + stayovers</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{roomsToday}</div><div className="text-[10px] font-bold text-gray-500">ACTUAL (LOGGED)</div></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className={`text-[20px] font-extrabold ${modelWorkload != null ? 'text-gray-900' : 'text-gray-900'}`}>{modelWorkload != null ? modelWorkload : minutesToday}</div>
            <div className="text-[10px] font-bold text-gray-500">{modelWorkload != null ? 'MODEL WORKLOAD' : 'MINUTES LOGGED'}</div>
            {modelWorkload != null && <div className="text-[9px] text-gray-400 font-medium mt-0.5">logged: {minutesToday} min</div>}
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-[20px] font-extrabold" style={{ color: TEAL }}>{minPerRoom != null ? minPerRoom : '—'}</div>
            <div className="text-[10px] font-bold text-gray-500">MIN / ROOM</div>
            <div className="text-[9px] text-gray-400 font-medium mt-0.5">{minPerRoom != null ? (minPerRoom <= 30 ? 'at target' : 'over 30 target') : 'target 30'}</div>
          </div>
        </div>
        {/* EOD variance chips */}
        {sodPlan && (
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`text-[11px] font-extrabold rounded-lg px-2.5 py-1.5 ${minVariance != null && minVariance > 15 ? 'bg-orange-50 text-orange-700' : 'bg-teal-50 text-teal-800'}`}>
              MINUTES {minVariance == null ? '' : (minVariance >= 0 ? `+${minVariance}` : minVariance)} vs model {modelWorkload}
            </span>
            {endVariance != null && (
              <span className={`text-[11px] font-extrabold rounded-lg px-2.5 py-1.5 ${endVariance > 15 ? 'bg-orange-50 text-orange-700' : 'bg-teal-50 text-teal-800'}`}>
                END {fmtTime(lastActualEnd)} vs est {fmtTime(sodPlan.est_end)} ({endVariance >= 0 ? `+${endVariance}` : endVariance} min)
              </span>
            )}
            <span className="text-[11px] font-bold text-gray-400 rounded-lg px-2.5 py-1.5 bg-gray-50">real leave times logged on the crew board below</span>
          </div>
        )}
        {pct != null && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
              <span>CLEANED vs EXPECTED</span><span>{pct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, background: onPace ? TEAL : '#EA580C' }} />
            </div>
            <div className="text-[11px] text-gray-400 mt-1">{variance != null ? (variance >= 0 ? `${variance} room(s) ahead of expected` : `${Math.abs(variance)} room(s) still to clean`) : ''} · {cleanedToday} room(s) stamped cleaned on the board</div>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[12px] font-medium text-gray-600">Rooms cleaned
            <input value={lbRooms} onChange={e => setLbRooms(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
          </label>
          <label className="text-[12px] font-medium text-gray-600">Minutes
            <input value={lbMinutes} onChange={e => setLbMinutes(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
          </label>
          <button onClick={addLabor} disabled={saving} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
            <span className="flex items-center gap-1"><Plus size={13} /> Log labor</span>
          </button>
          {labor.length > 0 && (
            <div className="text-[11px] text-gray-400">
              {labor.map(l => `${l.staff_name}: ${l.rooms_cleaned}r/${l.minutes}m`).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* ── HK crew: expected vs actual shift end ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Clock size={14} style={{ color: TEAL }} /> HK Crew — Expected vs Actual <span className="text-[11px] font-medium text-gray-400">({hkShifts.length} scheduled · 8h shifts)</span></div>
          {hkShifts.length > 0 && (
            <span className="text-[11px] font-bold text-gray-500">{endedOnTime}/{hkShifts.length} ended on time</span>
          )}
        </div>
        {hkShifts.length === 0 ? (
          <p className="text-[13px] text-gray-400 font-medium py-2">No housekeeping shifts scheduled today</p>
        ) : (
          <div className="space-y-1">
            {hkShifts.map(s => {
              const exp = expectedEnd(s.start_time);
              const late = s.end_time && exp && s.end_time > exp;
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-2 text-[13px] bg-gray-50 rounded-xl px-3 py-2">
                  <span className="font-bold text-gray-800 w-36 truncate">{s.staff_name}</span>
                  <span className="text-[11px] text-gray-400 font-medium w-24 truncate">{(s.role || '').trim()}</span>
                  <span className="text-[12px] text-gray-600">In <b>{fmtTime(s.start_time) || '—'}</b></span>
                  <span className="text-[12px] text-gray-400">Expected out <b className="text-gray-600">{fmtTime(exp) || '—'}</b></span>
                  {s.end_time ? (
                    isAdmin ? (
                      editingEndId === s.id ? (
                        <span className="flex items-center gap-1 ml-auto">
                          <input
                            type="time"
                            value={editEndVal}
                            onChange={e => setEditEndVal(e.target.value)}
                            autoFocus
                            className="w-[92px] px-1.5 py-1 border border-teal-300 rounded-lg text-[11px] font-bold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                            title="Correct actual end time"
                          />
                          <button onClick={async () => {
                            if (!editEndVal) return;
                            setHkShifts(prev => prev.map(row => (row.id === s.id ? { ...row, end_time: editEndVal } : row)));
                            setEditingEndId(null);
                            try { await updateStaffSchedule(s.id, { end_time: editEndVal }); } catch { load(); }
                          }} className="bg-teal-600 text-white rounded-lg px-2 py-1 text-[10px] font-bold">Save</button>
                          <button onClick={() => setEditingEndId(null)} className="text-gray-400 hover:text-gray-600 text-[11px]">✕</button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 ml-auto">
                          <button onClick={() => { setEditingEndId(s.id); setEditEndVal(s.end_time || ''); }}
                            className={`flex items-center gap-1 text-[12px] font-bold ${late ? 'text-orange-600' : 'text-teal-700'} hover:opacity-80`}
                            title="Edit exit time">
                            <CheckCircle2 size={12} /> Out {fmtTime(s.end_time)}{late ? ' (over)' : ''}
                          </button>
                          <Pencil size={11} className="text-gray-400 hover:text-teal-700" />
                        </span>
                      )
                    ) : (
                      <span className={`flex items-center gap-1 text-[12px] font-bold ${late ? 'text-orange-600' : 'text-teal-700'}`}>
                        <CheckCircle2 size={12} /> Out {fmtTime(s.end_time)}{late ? ' (over)' : ''}
                      </span>
                    )
                  ) : isAdmin ? (
                    <span className="flex items-center gap-1 ml-auto">
                      <input
                        type="time"
                        onChange={e => logShiftEnd(s, e.target.value)}
                        className="w-[92px] px-1.5 py-1 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                        title="Log actual end time"
                      />
                      <span className="text-[10px] font-bold text-gray-400">LOG OUT</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-600 ml-auto">WORKING</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Room PM history board (tap any room for actions + DND + PM) ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><BedDouble size={14} style={{ color: TEAL }} /> Room PM History <span className="text-[11px] font-medium text-gray-400">({rooms.length} rooms — tap a room)</span></div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2">
          {rooms.map(r => {
            const isToday = (r.cleaned_at || '').slice(0, 10) === today;
            const hh = r.cleaned_at ? new Date(r.cleaned_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
            const dnd = isDnd(r);
            return (
              <button key={r.id} onClick={() => setPopupRoom(r)}
                title={dnd ? `${r.room_number} — DND` : r.cleaned_by ? `Cleaned by ${r.cleaned_by}${hh ? ' · ' + hh : ''}` : 'Tap for room actions'}
                className={`relative rounded-xl border px-1 py-2 text-center transition-colors ${STATUS_STYLE[r.status] || 'bg-gray-50 text-gray-600 border-gray-200'} hover:ring-2 hover:ring-teal-300`}>
                <div className="text-[13px] font-extrabold">{r.room_number}</div>
                <div className="text-[9px] font-bold uppercase tracking-wide">{r.status === 'out_of_order' ? 'OOO' : r.status}</div>
                {isToday && r.cleaned_by && <div className="text-[8px] font-bold text-gray-500 truncate">{r.cleaned_by.split(' ')[0]}</div>}
                {isToday && hh && <div className="text-[8px] text-gray-400">{hh}</div>}
                {dnd && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" title="DND" />}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-gray-400 mt-2">
          Tap any room for its popup: mark inspected, set Do-Not-Disturb, and see matched PM tasks. Red dot = DND.
        </div>
      </div>

      {/* ── Linen inventory ── */}
      <div className={sec}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Package size={14} style={{ color: TEAL }} /> Linen Inventory <span className="text-[11px] font-medium text-gray-400">— today</span></div>
          <button onClick={() => setShowLinen(!showLinen)} className="text-[11px] font-bold text-teal-700 hover:underline">{showLinen ? 'Hide' : 'Add count'}</button>
        </div>
        {showLinen && (
          <div className="flex flex-wrap items-end gap-2 mb-3 bg-gray-50 rounded-xl p-3">
            <label className="text-[12px] font-medium text-gray-600">Item
              <input value={lnItemType} onChange={e => setLnItemType(e.target.value)} placeholder="Bath towels" className="block w-36 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Count
              <input value={lnCount} onChange={e => setLnCount(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Par level
              <input value={lnPar} onChange={e => setLnPar(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <button onClick={addLinen} disabled={saving} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>Save</button>
          </div>
        )}
        {linen.length === 0 ? (
          <p className="text-[13px] text-gray-400 font-medium py-1">No counts yet today — last counts load on refresh if logged a previous day.</p>
        ) : (
          <div className="space-y-1">
            {linen.map((l, i) => {
              const pct2 = l.par_level > 0 ? Math.round((l.count / l.par_level) * 100) : 0;
              const low = l.count < l.par_level;
              return (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-[13px] font-bold text-gray-800 w-40 truncate">{l.item_type}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(100, pct2)}%`, background: low ? '#EA580C' : TEAL }} />
                  </div>
                  <span className={`text-[12px] font-extrabold ${low ? 'text-orange-600' : 'text-gray-700'}`}>{l.count} / {l.par_level}</span>
                  {low && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 rounded-lg px-1.5 py-0.5">BELOW PAR</span>}
                </div>
              );
            })}
            {belowPar.length > 0 && (
              <div className="text-[11px] text-orange-600 font-bold pt-1">{belowPar.length} item(s) below par — order needed</div>
            )}
          </div>
        )}
      </div>

      {/* ── Per-room popup ── */}
      {popupRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setPopupRoom(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[18px] font-extrabold text-gray-900">Room {popupRoom.room_number}</div>
                <div className="text-[11px] font-bold uppercase text-gray-400">{popupRoom.status === 'out_of_order' ? 'Out of order' : popupRoom.status}{popupRoom.cleaned_by ? ` · cleaned by ${popupRoom.cleaned_by}` : ''}</div>
              </div>
              <button onClick={() => setPopupRoom(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-1.5 mb-3">
              {popupRoom.status === 'clean' && (
                <button onClick={() => markInspected(popupRoom)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-teal-50 text-teal-800 text-[13px] font-bold hover:bg-teal-100">
                  <CheckCircle2 size={14} /> Mark inspected (you as inspector)
                </button>
              )}
              <button onClick={() => setDnd(popupRoom, !isDnd(popupRoom))}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-bold ${isDnd(popupRoom) ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                {isDnd(popupRoom) ? <Eye size={14} /> : <EyeOff size={14} />} {isDnd(popupRoom) ? 'Clear DND' : 'Set DND'}
              </button>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="text-[11px] font-extrabold text-gray-500 mb-1.5 uppercase tracking-wide">Matched PM tasks</div>
              {pmForRoom(popupRoom.room_number).length === 0 ? (
                <p className="text-[12px] text-gray-400 font-medium">No PM tasks mention this room.</p>
              ) : (
                <div className="space-y-1">
                  {pmForRoom(popupRoom.room_number).map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-[12px] font-bold text-gray-800 truncate">{p.title}</span>
                      <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{p.frequency_days ? `every ${p.frequency_days}d` : ''}{p.last_completed_date ? ` · last ${p.last_completed_date}` : ' · never done'}</span>
                    </div>
                  ))}
                </div>
              )}
              {popupRoom.notes && <div className="text-[10px] text-gray-400 mt-2">Notes: {popupRoom.notes}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}