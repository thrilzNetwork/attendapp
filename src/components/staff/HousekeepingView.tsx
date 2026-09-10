'use client';

import { useState, useEffect, useCallback } from 'react';
import { BedDouble, Timer, Package, Plus, RefreshCw } from 'lucide-react';
import { getRoomStatuses, updateRoomStatus, getLinenCounts, createLinenCount, getHkLaborLogs, createHkLaborLog } from '@/lib/supabase';

const TEAL = '#158A7C';

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATUSES = ['dirty', 'clean', 'inspected', 'out_of_order'] as const;
const STATUS_STYLE: Record<string, string> = {
  dirty: 'bg-orange-50 text-orange-700 border-orange-200',
  clean: 'bg-blue-50 text-blue-700 border-blue-200',
  inspected: 'bg-teal-50 text-teal-800 border-teal-200',
  out_of_order: 'bg-red-50 text-red-700 border-red-200',
};

export default function HousekeepingView({
  hotelId, hotelName, staffName, isAdmin,
}: { hotelId: string; hotelName: string; staffName: string; isAdmin: boolean }) {
  const [rooms, setRooms] = useState<{ id: string; room_number: string; status: string }[]>([]);
  const [linen, setLinen] = useState<{ item_type: string; count: number; par_level: number }[]>([]);
  const [labor, setLabor] = useState<{ staff_name: string; rooms_cleaned: number; minutes: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinen, setShowLinen] = useState(false);
  const [lnItemType, setLnItemType] = useState('');
  const [lnCount, setLnCount] = useState('');
  const [lnPar, setLnPar] = useState('');
  const [lbRooms, setLbRooms] = useState('');
  const [lbMinutes, setLbMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [r, ln, lb] = await Promise.all([
      getRoomStatuses(hotelId),
      getLinenCounts(hotelId, localDateStr()).catch(() => []),
      getHkLaborLogs(hotelId, localDateStr()),
    ]);
    // sort rooms numerically when possible
    const sorted = ((r || []) as { id: string; room_number: string; status: string }[]).sort((a, b) => {
      const na = parseInt(a.room_number, 10), nb = parseInt(b.room_number, 10);
      return (isNaN(na) || isNaN(nb)) ? a.room_number.localeCompare(b.room_number) : na - nb;
    });
    setRooms(sorted);
    setLinen(ln || []);
    setLabor(lb || []);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const cycleStatus = async (roomId: string, current: string) => {
    const idx = STATUSES.indexOf(current as typeof STATUSES[number]);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    setRooms(prev => prev.map(r => (r.id === roomId ? { ...r, status: next } : r)));
    await updateRoomStatus(roomId, { status: next });
  };

  const minutesToday = labor.reduce((s, l) => s + l.minutes, 0);
  const roomsToday = labor.reduce((s, l) => s + l.rooms_cleaned, 0);
  const minPerRoom = roomsToday > 0 ? Math.round(minutesToday / roomsToday) : null;

  const addLinen = async () => {
    const c = Number(lnCount), p = Number(lnPar);
    if (!lnItemType.trim() || isNaN(c) || isNaN(p)) return;
    setSaving(true);
    await createLinenCount({
      hotel_id: hotelId, count_date: localDateStr(), shift: 'morning',
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
          <h1 className="text-[22px] font-extrabold text-gray-900">Housekeeping</h1>
          <p className="text-[13px] text-gray-500">{hotelName} · rooms, labor & inventory</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-xl px-3 py-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Labor vs rooms */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center gap-1.5 mb-1 text-[13px] font-extrabold text-gray-900"><Timer size={14} style={{ color: TEAL }} /> Labor vs Rooms <span className="text-[11px] font-medium text-gray-400">— today</span></div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{roomsToday}</div><div className="text-[10px] font-bold text-gray-500">ROOMS CLEANED</div></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{minutesToday}</div><div className="text-[10px] font-bold text-gray-500">MINUTES LOGGED</div></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold" style={{ color: TEAL }}>{minPerRoom != null ? minPerRoom : '—'}</div><div className="text-[10px] font-bold text-gray-500">MIN / ROOM</div></div>
        </div>
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

      {/* Room board */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><BedDouble size={14} style={{ color: TEAL }} /> Room Board <span className="text-[11px] font-medium text-gray-400">({rooms.length} rooms — tap to cycle status)</span></div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2">
          {rooms.map(r => (
            <button key={r.id} onClick={() => cycleStatus(r.id, r.status)}
              className={`rounded-xl border px-1 py-2 text-center transition-colors ${STATUS_STYLE[r.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
              <div className="text-[13px] font-extrabold">{r.room_number}</div>
              <div className="text-[9px] font-bold uppercase tracking-wide">{r.status === 'out_of_order' ? 'OOO' : r.status}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Linen inventory */}
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
              const pct = l.par_level > 0 ? Math.round((l.count / l.par_level) * 100) : 0;
              const low = l.count < l.par_level;
              return (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-[13px] font-bold text-gray-800 w-40 truncate">{l.item_type}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: low ? '#EA580C' : TEAL }} />
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
