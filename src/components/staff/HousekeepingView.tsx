'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sunrise, Moon, Plus, RefreshCw, Sparkles, Wrench, Check } from 'lucide-react';
import { listOps, createOps, type OpRecord } from '@/lib/opsStore';
import { getWorkOrders, createWorkOrder, updateWorkOrder } from '@/lib/supabase';

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
  // Maintenance tracker (deep cleans + service requests) — lives under End of Day
  const [workOrders, setWorkOrders] = useState<{ id: string; location: string; issue: string; priority: string; status: string; created_by?: string; created_at: string; resolved_at?: string }[]>([]);
  const [dcRoom, setDcRoom] = useState('');
  const [dcTask, setDcTask] = useState('');
  const [dcSaving, setDcSaving] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [plans, eods, wos] = await Promise.all([
      listOps(hotelId, 'hk_sod_plan').catch(() => [] as OpRecord[]),
      listOps(hotelId, 'hk_eod_actual').catch(() => [] as OpRecord[]),
      getWorkOrders(hotelId).catch(() => []),
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
    setLoading(false);
  }, [hotelId, today]);

  useEffect(() => { load(); }, [load]);

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

      {/* ── Start of Day ── */}
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
    </div>
  );
}