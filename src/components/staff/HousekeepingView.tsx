'use client';

import { useState, useEffect, useCallback } from 'react';
import { BedDouble, Timer, Package, Plus, RefreshCw, Clock, CheckCircle2, Pencil } from 'lucide-react';
import {
  getRoomStatuses, updateRoomStatus, getLinenCounts, createLinenCount,
  getHkLaborLogs, createHkLaborLog,
  getStaffSchedulesRange, getWeeklyForecasts, updateStaffSchedule,
  type RoomStatus, type StaffSchedule, type WeeklyForecast, type HkLaborLog,
} from '@/lib/supabase';

const TEAL = '#158A7C';

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
  const total = h * 60 + m + 480;
  const capped = Math.min(total, 23 * 60 + 59);
  return `${String(Math.floor(capped / 60)).padStart(2, '0')}:${String(capped % 60).padStart(2, '0')}`;
}

const STATUS_STYLE: Record<string, string> = {
  dirty: 'bg-orange-50 text-orange-700 border-orange-200',
  clean: 'bg-blue-50 text-blue-700 border-blue-200',
  inspected: 'bg-teal-50 text-teal-800 border-teal-200',
  out_of_order: 'bg-red-50 text-red-700 border-red-200',
};

export default function HousekeepingView({
  hotelId, hotelName, staffName, isAdmin,
}: { hotelId: string; hotelName: string; staffName: string; isAdmin: boolean }) {
  const today = localDateStr();
  const [rooms, setRooms] = useState<RoomStatus[]>([]);
  const [linen, setLinen] = useState<{ item_type: string; count: number; par_level: number }[]>([]);
  const [labor, setLabor] = useState<HkLaborLog[]>([]);
  const [hkShifts, setHkShifts] = useState<StaffSchedule[]>([]);
  const [expectedRooms, setExpectedRooms] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLinen, setShowLinen] = useState(false);
  const [lnItemType, setLnItemType] = useState('');
  const [lnCount, setLnCount] = useState('');
  const [lnPar, setLnPar] = useState('');
  const [lbRooms, setLbRooms] = useState('');
  const [lbMinutes, setLbMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  // Admin edit of an already-logged exit time
  const [editingEndId, setEditingEndId] = useState<string | null>(null);
  const [editEndVal, setEditEndVal] = useState('');

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [r, ln, lb, scheds, fcs] = await Promise.all([
      getRoomStatuses(hotelId),
      getLinenCounts(hotelId, today).catch(() => []),
      getHkLaborLogs(hotelId, today),
      getStaffSchedulesRange(hotelId, today, today).catch(() => [] as StaffSchedule[]),
      getWeeklyForecasts(hotelId, mondayOf(today)).catch(() => [] as WeeklyForecast[]),
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
    setHkShifts((scheds || []).filter(s => (s.department || '').toLowerCase().includes('house') || (s.role || '').toLowerCase().includes('house') || (s.role || '').toLowerCase().includes('hk')));
    const t = (fcs || []).find(f => f.date === today);
    if (t) {
      const stayovers = Math.max(0, (t.rooms_occupied || 0) - (t.departures || 0));
      setExpectedRooms((t.departures || 0) + stayovers);
    } else {
      setExpectedRooms(null);
    }
    setLoading(false);
  }, [hotelId, today]);

  useEffect(() => { load(); }, [load]);

  const markInspected = async (room: RoomStatus) => {
    setRooms(prev => prev.map(r => (r.id === room.id ? { ...r, status: 'inspected', inspected_by: staffName, inspected_at: new Date().toISOString() } : r)));
    await updateRoomStatus(room.id, { status: 'inspected', inspected_by: staffName || undefined });
  };

  const logShiftEnd = async (s: StaffSchedule, value: string) => {
    if (!value) return;
    setHkShifts(prev => prev.map(row => (row.id === s.id ? { ...row, end_time: value } : row)));
    await updateStaffSchedule(s.id, { end_time: value });
  };

  const minutesToday = labor.reduce((s, l) => s + l.minutes, 0);
  const roomsToday = labor.reduce((s, l) => s + l.rooms_cleaned, 0);
  const minPerRoom = roomsToday > 0 ? Math.round(minutesToday / roomsToday) : null;
  const variance = expectedRooms != null ? roomsToday - expectedRooms : null;
  const pct = expectedRooms != null && expectedRooms > 0 ? Math.min(100, Math.round((roomsToday / expectedRooms) * 100)) : null;
  const cleanedToday = rooms.filter(r => (r.cleaned_at || '').slice(0, 10) === today).length;
  const onPace = variance == null ? null : variance >= 0;
  const endedOnTime = hkShifts.filter(s => { const exp = expectedEnd(s.start_time); return s.end_time && exp && s.end_time <= exp; }).length;

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
          <p className="text-[13px] text-gray-500">{hotelName} · expected vs actual, daily reconciliation</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-xl px-3 py-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Daily reconciliation: expected vs actual ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Timer size={14} style={{ color: TEAL }} /> Daily Reconciliation <span className="text-[11px] font-medium text-gray-400">— today</span></div>
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
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{minutesToday}</div><div className="text-[10px] font-bold text-gray-500">MINUTES LOGGED</div></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-[20px] font-extrabold" style={{ color: TEAL }}>{minPerRoom != null ? minPerRoom : '—'}</div>
            <div className="text-[10px] font-bold text-gray-500">MIN / ROOM</div>
            <div className="text-[9px] text-gray-400 font-medium mt-0.5">{minPerRoom != null ? (minPerRoom <= 30 ? 'at target' : 'over 30 target') : 'target 30'}</div>
          </div>
        </div>
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

      {/* ── Room PM history board ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><BedDouble size={14} style={{ color: TEAL }} /> Room PM History <span className="text-[11px] font-medium text-gray-400">({rooms.length} rooms — who cleaned, when)</span></div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2">
          {rooms.map(r => {
            const isToday = (r.cleaned_at || '').slice(0, 10) === today;
            const hh = r.cleaned_at ? new Date(r.cleaned_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
            return (
              <button key={r.id} onClick={() => { if (r.status === 'clean') markInspected(r); }}
                title={r.cleaned_by ? `Cleaned by ${r.cleaned_by}${hh ? ' · ' + hh : ''}${r.inspected_by ? ' · inspected by ' + r.inspected_by : ''}` : 'No PM recorded — tap a CLEAN room to inspect'}
                className={`rounded-xl border px-1 py-2 text-center transition-colors ${STATUS_STYLE[r.status] || 'bg-gray-50 text-gray-600 border-gray-200'} ${r.status === 'clean' ? 'hover:ring-2 hover:ring-teal-300' : ''}`}>
                <div className="text-[13px] font-extrabold">{r.room_number}</div>
                <div className="text-[9px] font-bold uppercase tracking-wide">{r.status === 'out_of_order' ? 'OOO' : r.status}</div>
                {isToday && r.cleaned_by && <div className="text-[8px] font-bold text-gray-500 truncate">{r.cleaned_by.split(' ')[0]}</div>}
                {isToday && hh && <div className="text-[8px] text-gray-400">{hh}</div>}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-gray-400 mt-2">
          Board shows last PM per room: cleaner + time. Tap a CLEAN room to mark it inspected (records you as inspector).
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
    </div>
  );
}