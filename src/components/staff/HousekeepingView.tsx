'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sunrise, Moon, Plus, RefreshCw, Sparkles, Wrench, Check, Timer, Clock, CheckCircle2, Users, MoonStar, Sparkle, Droplets, Ban } from 'lucide-react';
import { listOps, createOps, type OpRecord } from '@/lib/opsStore';
import { getWorkOrders, createWorkOrder, updateWorkOrder, getRoomStatuses, getStaffSchedulesRange, updateStaffSchedule, getAllHotelRooms, setRoomServiceFlag, getRoomServiceFlags, type RoomStatus, type StaffSchedule, type HotelRoom } from '@/lib/supabase';
import PmRoomBoard from './DeepCleanBoard';

const TEAL = '#158A7C';
/** Productivity model (locked): checkout = 30 min, stayover = 15 min, 8h shifts (480 min). */
const MIN_CHECKOUT = 30;
const MIN_STAYOVER = 15;
const SHIFT_MIN = 480;

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface SodPlan {
  plan_date: string;
  checkouts: number;
  stayovers: number;
  dnd_start?: number;
  workload_min: number;
  maids_needed: number;
  est_end?: string | null;
  created_by: string;
}

interface EodActual {
  plan_date: string;
  checkouts_end?: number;
  stayovers_end: number;
  dnd_end: number;
  created_by: string;
}

/** Housekeeping = daily numbers only (not a PMS). Start-of-day plan vs end-of-day
    actuals: checkouts, stayovers, DND. On track = all checkouts done and no more
    unresolved DNDs than the morning count. */
export default function HousekeepingView({
  hotelId, hotelName, staffName, isAdmin,
}: { hotelId: string; hotelName: string; staffName: string; isAdmin: boolean }) {
  const today = localDateStr();
  const [loading, setLoading] = useState(true);
  const [sodPlan, setSodPlan] = useState<SodPlan | null>(null);
  const [eodActual, setEodActual] = useState<EodActual | null>(null);
  // SOD inputs
  const [sodCheckouts, setSodCheckouts] = useState('');
  const [sodStayovers, setSodStayovers] = useState('');
  const [sodDnd, setSodDnd] = useState('');
  const [sodSaving, setSodSaving] = useState(false);
  // EOD inputs
  const [eodCheckouts, setEodCheckouts] = useState('');
  const [eodStayovers, setEodStayovers] = useState('');
  const [eodDnd, setEodDnd] = useState('');
  const [eodSaving, setEodSaving] = useState(false);
  const [rooms, setRooms] = useState<RoomStatus[]>([]);
  const [hkShifts, setHkShifts] = useState<StaffSchedule[]>([]);
  // Maintenance tracker (deep cleans + service requests) — lives under End of Day
  const [workOrders, setWorkOrders] = useState<{ id: string; location: string; issue: string; priority: string; status: string; created_by?: string; created_at: string; resolved_at?: string }[]>([]);
  const [dcRoom, setDcRoom] = useState('');
  const [dcTask, setDcTask] = useState('');
  const [dcSaving, setDcSaving] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [plans, eods, wos, roomSts, scheds] = await Promise.all([
      listOps(hotelId, 'hk_sod_plan').catch(() => [] as OpRecord[]),
      listOps(hotelId, 'hk_eod_actual').catch(() => [] as OpRecord[]),
      getWorkOrders(hotelId).catch(() => []),
      getRoomStatuses(hotelId).catch(() => []),
      getStaffSchedulesRange(hotelId, today, today).catch(() => [] as StaffSchedule[]),
    ]);
    // Latest plan saved today wins
    const todaysPlans = ((plans || []) as OpRecord[])
      .filter(p => (p.details as unknown as SodPlan)?.plan_date === today)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    setSodPlan((todaysPlans[0]?.details as unknown as SodPlan) || null);
    const todaysEods = ((eods || []) as OpRecord[])
      .filter(p => (p.details as unknown as EodActual)?.plan_date === today)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    setEodActual((todaysEods[0]?.details as unknown as EodActual) || null);
    setWorkOrders((wos || []) as typeof workOrders);
    setRooms((roomSts || []) as RoomStatus[]);
    setHkShifts(((scheds || []) as StaffSchedule[]).filter(s => {
      const d = `${s.department || ''} ${s.role || ''}`.toLowerCase();
      return d.includes('housekeep') || d.includes('house keeper') || d.includes('hk') || d.includes('maid') || d.includes('room attendant') || d.includes('attendant');
    }));
    setLoading(false);
  }, [hotelId, today]);

  // ── Today-card math (rooms to clean vs cleaned, mirrors Maint's PM counts card) ──
  const hkExpected = sodPlan ? sodPlan.checkouts + sodPlan.stayovers : 0;
  const hkDoneToday = rooms.filter(r => (r.cleaned_at || '').slice(0, 10) === today).length;
  const openWoCount = workOrders.filter(w => w.status !== 'resolved').length;
  const openWoHigh = workOrders.filter(w => w.status !== 'resolved' && w.priority === 'high').length;
  const hkPct = hkExpected > 0 ? Math.min(100, Math.round((hkDoneToday / hkExpected) * 100)) : 100;
  const hkOnPace = hkExpected === 0 ? true : hkDoneToday >= hkExpected;

  useEffect(() => { load(); }, [load]);

  // ── HK crew helpers (same contract as Maint crew board) ──
  /** 12h format like Maint's crew card */
  const fmtTime = (t?: string | null): string => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const H = parseInt(h, 10);
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12 = H % 12 === 0 ? 12 : H % 12;
    return `${h12}:${m} ${ampm}`;
  };
  /** Expected shift end = scheduled start + 8h, capped at 23:59 */
  const expectedEnd = (start?: string | null): string | null => {
    if (!start) return null;
    const [h, m] = start.split(':').map(Number);
    const total = h * 60 + m + SHIFT_MIN;
    const capped = Math.min(total, 23 * 60 + 59);
    return `${String(Math.floor(capped / 60)).padStart(2, '0')}:${String(capped % 60).padStart(2, '0')}`;
  };
  const logHkShiftEnd = async (s: StaffSchedule, value: string) => {
    if (!value) return;
    setHkShifts(prev => prev.map(row => (row.id === s.id ? { ...row, end_time: value } : row)));
    await updateStaffSchedule(s.id, { end_time: value });
  };
  const hkEndedOnTime = hkShifts.filter(s => { const exp = expectedEnd(s.start_time); return s.end_time && exp && s.end_time <= exp; }).length;
  // Labor split: shared workload by minutes; solo maids get stayovers first (quicker), checkouts shared
  const crewSize = Math.max(1, hkShifts.length);
  const sharedCO = sodPlan ? sodPlan.checkouts : 0;
  const roomsPerMaid = Math.round((sharedCO / crewSize) * 10) / 10;
  const soPerMaid = sodPlan ? Math.round((sodPlan.stayovers / crewSize) * 10) / 10 : 0;
  const minPerMaid = sodPlan ? Math.round(sodPlan.workload_min / crewSize) : 0;

  const saveSodPlan = async () => {
    if (!sodCheckouts.trim() || !sodStayovers.trim() || !sodDnd.trim()) return;
    const co = Number(sodCheckouts), so = Number(sodStayovers), dn = Number(sodDnd);
    if (isNaN(co) || isNaN(so) || isNaN(dn)) return;
    setSodSaving(true);
    const workload = co * MIN_CHECKOUT + so * MIN_STAYOVER;
    const plan: SodPlan = {
      plan_date: today, checkouts: co, stayovers: so, dnd_start: dn,
      workload_min: workload,
      maids_needed: Math.max(1, Math.ceil(workload / SHIFT_MIN)),
      est_end: null,
      created_by: staffName || 'Supervisor',
    };
    const saved = await createOps(hotelId, 'hk_sod_plan', plan, 'active', { guest_name: plan.created_by, room: 'HK' });
    if (saved) setSodPlan(plan);
    setSodCheckouts(''); setSodStayovers(''); setSodDnd('');
    setSodSaving(false);
  };

  const addDeepClean = async () => {
    if (!dcTask.trim()) return;
    setDcSaving(true);
    await createWorkOrder({
      hotel_id: hotelId,
      location: dcRoom.trim() ? `Room ${dcRoom.trim()}` : 'General',
      issue: dcTask.trim(),
      priority: 'medium',
      status: 'open',
      created_by: staffName || 'Housekeeping',
    });
    setDcRoom(''); setDcTask(''); setDcSaving(false);
    load();
  };

  const resolveDeepClean = async (id: string) => {
    await updateWorkOrder(id, { status: 'resolved', resolved_at: new Date().toISOString() });
    load();
  };

  const saveEod = async () => {
    if (!eodCheckouts.trim() || !eodStayovers.trim() || !eodDnd.trim()) return;
    const co = Number(eodCheckouts), so = Number(eodStayovers), dn = Number(eodDnd);
    if (isNaN(co) || isNaN(so) || isNaN(dn)) return;
    setEodSaving(true);
    const rec: EodActual = {
      plan_date: today, checkouts_end: co, stayovers_end: so, dnd_end: dn,
      created_by: staffName || 'Supervisor',
    };
    const saved = await createOps(hotelId, 'hk_eod_actual', rec, 'active', { guest_name: rec.created_by, room: 'HK' });
    if (saved) setEodActual(rec);
    setEodCheckouts(''); setEodStayovers(''); setEodDnd('');
    setEodSaving(false);
  };

  // Start vs end numbers
  const coStart = sodPlan?.checkouts ?? null;
  const soStart = sodPlan?.stayovers ?? null;
  const dndStart = sodPlan?.dnd_start ?? null;
  const coEnd = eodActual?.checkouts_end ?? null;
  const soEnd = eodActual?.stayovers_end ?? null;
  const dndEnd = eodActual?.dnd_end ?? null;

  const coDelta = coEnd != null && coStart != null ? coEnd - coStart : null;
  const soDelta = soEnd != null && soStart != null ? soEnd - soStart : null;
  const dndDelta = dndEnd != null && dndStart != null ? dndEnd - dndStart : null;

  // On track = every planned checkout handled and DNDs not worse than morning
  const track = coDelta != null && dndDelta != null ? coDelta >= 0 && dndDelta <= 0 : null;

  const metricCell = (
    label: string, start: number | null, end: number | null, delta: number | null,
    deltaGood: 'gte' | 'lte' | 'neutral',
  ) => (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <div className="text-[10px] font-bold text-gray-500 mb-1">{label}</div>
      <div className="text-[20px] font-extrabold text-gray-900 whitespace-nowrap">
        {start ?? '—'} <span className="text-gray-300">→</span> {end ?? '—'}
      </div>
      <div className={`text-[9px] font-extrabold mt-1 ${
        delta == null ? 'text-gray-400'
        : deltaGood === 'neutral' ? 'text-gray-500'
        : (deltaGood === 'gte' ? delta >= 0 : delta <= 0) ? 'text-teal-600' : 'text-orange-600'
      }`}>
        {delta == null ? 'no end count' : `${delta > 0 ? '+' : ''}${delta} vs start`}
      </div>
    </div>
  );

  const sec = 'bg-white border border-gray-200 rounded-2xl p-4';

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Housekeeping — Daily Numbers</h1>
          <p className="text-[13px] text-gray-500">{hotelName} · checkouts ×30 · stayovers ×15 · 8h shifts</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-xl px-3 py-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Today: rooms to clean vs cleaned (mirrors Maint's Today card) ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Timer size={14} style={{ color: TEAL }} /> Today <span className="text-[11px] font-medium text-gray-400">— rooms to clean vs cleaned</span></div>
          <span className={`text-[10px] font-extrabold rounded-lg px-2 py-1 ${hkOnPace ? 'bg-teal-50 text-teal-800' : 'bg-orange-50 text-orange-700'}`}>
            {hkOnPace ? 'ON PACE' : 'BEHIND'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-teal-50 rounded-xl p-3 text-center">
            <div className="text-[20px] font-extrabold text-teal-800">{hkExpected}</div>
            <div className="text-[10px] font-bold text-teal-700">ROOMS TO CLEAN</div>
            <div className="text-[9px] text-teal-600 font-medium mt-0.5">checkouts + stayovers on the plan</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{hkDoneToday}</div><div className="text-[10px] font-bold text-gray-500">CLEANED TODAY</div></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{openWoCount}</div><div className="text-[10px] font-bold text-gray-500">OPEN TICKETS</div><div className="text-[9px] text-gray-400 font-medium mt-0.5">{openWoHigh} high priority</div></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold" style={{ color: TEAL }}>{rooms.length}</div><div className="text-[10px] font-bold text-gray-500">TOTAL ROOMS</div><div className="text-[9px] text-gray-400 font-medium mt-0.5">{rooms.filter(r => (r.cleaned_at || '').slice(0, 10) === today).length} cleaned today</div></div>
        </div>
        {hkExpected > 0 && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
              <span>CLEANED vs PLANNED</span><span>{hkPct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2.5 rounded-full" style={{ width: `${hkPct}%`, background: hkOnPace ? TEAL : '#EA580C' }} />
            </div>
            <div className="text-[11px] text-gray-400 mt-1">{hkDoneToday} room(s) cleaned · {openWoCount} open ticket(s) · {openWoHigh} high-priority</div>
          </div>
        )}
      </div>

      {/* ── Housekeeping Crew: expected vs actual + labor per maid ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Clock size={14} style={{ color: TEAL }} /> Housekeeping Crew — Expected vs Actual <span className="text-[11px] font-medium text-gray-400">({hkShifts.length} scheduled · 8h shifts)</span></div>
          {hkShifts.length > 0 && (
            <span className="text-[11px] font-bold text-gray-500">{hkEndedOnTime}/{hkShifts.length} ended on time</span>
          )}
        </div>
        {sodPlan && hkShifts.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-teal-50 rounded-xl p-2.5 text-center">
              <div className="text-[16px] font-extrabold text-teal-800">{roomsPerMaid}</div>
              <div className="text-[9px] font-bold text-teal-700">CHECKOUTS / MAID</div>
            </div>
            <div className="bg-teal-50 rounded-xl p-2.5 text-center">
              <div className="text-[16px] font-extrabold text-teal-800">{soPerMaid}</div>
              <div className="text-[9px] font-bold text-teal-700">STAYOVERS / MAID</div>
            </div>
            <div className="bg-teal-50 rounded-xl p-2.5 text-center">
              <div className="text-[16px] font-extrabold text-teal-800">{minPerMaid}</div>
              <div className="text-[9px] font-bold text-teal-700">MIN / MAID ({SHIFT_MIN}m shift)</div>
            </div>
          </div>
        )}
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
                    <span className={`flex items-center gap-1 text-[12px] font-bold ${late ? 'text-orange-600' : 'text-teal-700'}`}>
                      <CheckCircle2 size={12} /> Out {fmtTime(s.end_time)}{late ? ' (over)' : ''}
                    </span>
                  ) : isAdmin ? (
                    <span className="flex items-center gap-1 ml-auto">
                      <input
                        type="time"
                        onChange={e => logHkShiftEnd(s, e.target.value)}
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

      {/* ── Station of the Day ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Sunrise size={14} style={{ color: TEAL }} /> Start of Day</div>
          {sodPlan && <span className="text-[10px] font-extrabold rounded-lg px-2 py-1 bg-teal-50 text-teal-800">SAVED · {sodPlan.created_by}</span>}
        </div>
        {sodPlan ? (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{sodPlan.checkouts}</div><div className="text-[10px] font-bold text-gray-500">CHECKOUTS</div></div>
            <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{sodPlan.stayovers}</div><div className="text-[10px] font-bold text-gray-500">STAYOVERS</div></div>
            <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{sodPlan.dnd_start ?? '—'}</div><div className="text-[10px] font-bold text-gray-500">DND</div></div>
          </div>
        ) : (
          <p className="text-[13px] text-gray-400 font-medium mb-3">No start-of-day numbers yet today{isAdmin ? ' — enter them below' : ' — waiting for the front desk'}.</p>
        )}
        {sodPlan && (
          <div className="text-[11px] font-bold text-teal-700 bg-teal-50 rounded-xl px-3 py-2 mb-3">
            Workload {sodPlan.workload_min} min → {sodPlan.maids_needed} maid{sodPlan.maids_needed === 1 ? '' : 's'} needed (÷ 480 min shift)
          </div>
        )}
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-2 pt-1">
            <label className="text-[12px] font-medium text-gray-600">Checkouts
              <input value={sodCheckouts} onChange={e => setSodCheckouts(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Stayovers
              <input value={sodStayovers} onChange={e => setSodStayovers(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">DND
              <input value={sodDnd} onChange={e => setSodDnd(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <button onClick={saveSodPlan} disabled={sodSaving} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
              <span className="flex items-center gap-1"><Plus size={13} /> {sodPlan ? 'Replan' : 'Save plan'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── End of Day ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Moon size={14} style={{ color: TEAL }} /> End of Day</div>
          {track != null && (
            <span className={`text-[10px] font-extrabold rounded-lg px-2 py-1 ${track ? 'bg-teal-50 text-teal-800' : 'bg-orange-50 text-orange-700'}`}>
              {track ? 'ON TRACK' : 'BEHIND'}
            </span>
          )}
        </div>
        {(sodPlan || eodActual) ? (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {metricCell('CHECKOUTS', coStart, coEnd, coDelta, 'gte')}
            {metricCell('STAYOVERS', soStart, soEnd, soDelta, 'neutral')}
            {metricCell('DND', dndStart, dndEnd, dndDelta, 'lte')}
          </div>
        ) : (
          <p className="text-[13px] text-gray-400 font-medium mb-3">End-of-day numbers reconcile against the start-of-day plan.</p>
        )}
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <label className="text-[12px] font-medium text-gray-600">Checkouts
            <input value={eodCheckouts} onChange={e => setEodCheckouts(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
          </label>
          <label className="text-[12px] font-medium text-gray-600">Stayovers
            <input value={eodStayovers} onChange={e => setEodStayovers(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
          </label>
          <label className="text-[12px] font-medium text-gray-600">DND
            <input value={eodDnd} onChange={e => setEodDnd(e.target.value)} inputMode="numeric" placeholder="0" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
          </label>
          <button onClick={saveEod} disabled={eodSaving} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
            <span className="flex items-center gap-1"><Moon size={13} /> {eodActual ? 'Update end-of-day' : 'Save end-of-day'}</span>
          </button>
        </div>
        {eodActual && !sodPlan && (
          <p className="text-[11px] text-gray-400 mt-2">Saved — deltas show when start-of-day numbers are entered.</p>
        )}

        {/* ── Maintenance tracker: deep cleans + service requests ── */}
        <div className="border-t border-gray-100 mt-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-gray-900"><Wrench size={13} style={{ color: TEAL }} /> Maint — Deep Cleans &amp; Service</div>
            <span className="text-[10px] font-bold text-gray-400">{workOrders.filter(w => w.status !== 'resolved').length} open</span>
          </div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <input value={dcRoom} onChange={e => setDcRoom(e.target.value)} inputMode="numeric" placeholder="Room" className="w-20 px-3 py-1.5 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
              <input value={dcTask} onChange={e => setDcTask(e.target.value)} placeholder="Deep clean / service needed" className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:ring-teal-500" />
            </div>
            <button onClick={addDeepClean} disabled={dcSaving || !dcTask.trim()} className="px-3 py-1.5 rounded-xl text-[12px] font-bold text-white disabled:opacity-40 shrink-0 items-center flex gap-1" style={{ background: TEAL }}><Plus size={12} /> Add</button>
          </div>
          {workOrders.length > 0 && (
            <ul className="space-y-1">
              {workOrders.slice(0, 10).map(w => (
                <li key={w.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-gray-800 truncate">{w.location} — {w.issue}</p>
                    <p className="text-[10px] font-medium text-gray-400">
                      {w.created_by || '—'} · {new Date(w.created_at).toLocaleDateString()} {w.priority === 'high' && <span className="text-red-600 font-extrabold"> · HIGH</span>}
                    </p>
                  </div>
                  {w.status !== 'resolved' && (
                    <button onClick={() => resolveDeepClean(w.id)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold bg-teal-50 text-teal-800"><Check size={12} /> Done</button>
                  )}
                  {w.status === 'resolved' && <span className="shrink-0 text-[10px] font-extrabold text-teal-700">DONE</span>}
                </li>
              ))}
              {workOrders.length > 10 && <li className="text-[10px] font-bold text-gray-400 px-3">+{workOrders.length - 10} older — Maint tab holds the full list</li>}
            </ul>
          )}
        </div>
      </div>

      {/* ── Rooms & Service grid: the real room list — DND / Full / Light per room ── */}
      <ServiceRoomGrid hotelId={hotelId} staffName={staffName} />

      {/* ── Deep Clean Rooms board (housekeeping's room grid, deep-cleaning tracker) ── */}
      <PmRoomBoard hotelId={hotelId} today={today} />
    </div>
  );
}


/* ═══════════ Room Service Grid — real room list × service flags ═══════════
   Every room the property actually has (hotel_rooms). Tap → DND · Full
   Service · Light Service · Clear. Flag rides on room_status so guests'   picks and staff picks land on the same board. */
const SVC_OPTIONS = [
  { key: 'dnd', label: 'DND', icon: MoonStar, color: '#B91C1C', bg: '#FEE2E2' },
  { key: 'full', label: 'Full Service', icon: Sparkle, color: '#158A7C', bg: '#E6F4F3' },
  { key: 'light', label: 'Light Service', icon: Droplets, color: '#7C3AED', bg: '#F3EEFF' },
] as const;

function ServiceRoomGrid({ hotelId, staffName }: { hotelId: string; staffName: string }) {
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [flags, setFlags] = useState<Record<string, { flag: string; by?: string; at?: string }>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [r, f] = await Promise.all([
      getAllHotelRooms(hotelId).catch(() => [] as HotelRoom[]),
      getRoomServiceFlags(hotelId).catch(() => [] as RoomStatus[]),
    ]);
    setRooms(r.filter(x => x.is_active !== false));
    const m: Record<string, { flag: string; by?: string; at?: string }> = {};
    for (const row of f as RoomStatus[]) if (row.service_flag) m[row.room_number] = { flag: row.service_flag, by: row.service_flag_by, at: row.service_flag_at };
    setFlags(m);
    setLoading(false);
  }, [hotelId]);
  useEffect(() => { load(); }, [load]);

  const setFlag = async (roomNumber: string, flag: string | null) => {
    setSaving(true);
    try { await setRoomServiceFlag(hotelId, roomNumber, flag, staffName || 'Staff'); } catch { /* stay silent, reload shows truth */ }
    setSel(null); setSaving(false);
    load();
  };

  const counts = SVC_OPTIONS.map(o => ({ ...o, n: Object.values(flags).filter(f => f.flag === o.key).length }));
  const total = rooms.length;

  if (loading) return <div className="h-32 flex items-center justify-center"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MoonStar size={16} className="text-gray-700" />
          <span className="text-[13px] font-extrabold text-gray-900">Rooms &amp; Service</span>
          <span className="text-[11px] font-medium text-gray-400">({total} rooms total)</span>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-800"><RefreshCw size={12} /> Refresh</button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        {counts.map(c => (
          <div key={c.key} className="rounded-xl p-2.5 text-center" style={{ backgroundColor: c.bg }}>
            <div className="text-[17px] font-extrabold" style={{ color: c.color }}>{c.n}</div>
            <div className="text-[10px] font-bold" style={{ color: c.color }}>{c.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mt-3">
        {rooms.map(room => {
          const f = flags[room.room_number];
          const opt = f ? SVC_OPTIONS.find(o => o.key === f.flag) : null;
          const active = sel === room.room_number;
          return (
            <button key={room.id} onClick={() => setSel(active ? null : room.room_number)}
              className="rounded-lg border px-1 py-2 text-center transition active:scale-[0.97]"
              style={opt ? { backgroundColor: opt.bg, borderColor: opt.color } : { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}>
              <div className="text-[12px] font-extrabold" style={{ color: opt ? opt.color : '#374151' }}>{room.room_number}</div>
              <div className="text-[8px] font-bold uppercase truncate" style={{ color: opt ? opt.color : '#9CA3AF' }}>{opt ? opt.label : (room.room_type || '—')}</div>
            </button>
          );
        })}
      </div>

      {sel && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[12px] font-bold text-gray-700 mb-2">Room {sel} — set service:</p>
          <div className="grid grid-cols-2 gap-2">
            {SVC_OPTIONS.map(o => {
              const cur = flags[sel]?.flag === o.key;
              return (
                <button key={o.key} disabled={saving} onClick={() => setFlag(sel, o.key)}
                  className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: cur ? o.color : '#6B7280' }}>
                  <o.icon size={14} /> {o.label}{cur ? ' ✓' : ''}
                </button>
              );
            })}
            <button disabled={saving} onClick={() => setFlag(sel, null)}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 border border-gray-200 text-[13px] font-bold text-gray-600 disabled:opacity-50">
              <Ban size={14} /> {saving ? 'Saving…' : 'Clear flag'}
            </button>
          </div>
          {flags[sel] && (
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              Set to {SVC_OPTIONS.find(o => o.key === flags[sel]!.flag)?.label} by {flags[sel]!.by || '—'}
              {flags[sel]!.at ? ` · ${new Date(flags[sel]!.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
