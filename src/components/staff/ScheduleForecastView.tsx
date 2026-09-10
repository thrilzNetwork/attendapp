'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, TrendingUp, Users, Clock, RefreshCw } from 'lucide-react';
import { getStaffSchedulesRange, getForecastsRange, upsertForecastDay } from '@/lib/supabase';

const TEAL = '#158A7C';

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
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
function dowShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

interface Sched { staff_name: string; start_time: string | null; end_time: string | null; role: string; shift_date: string }
interface Fc { date: string; occupancy_pct: number; rooms_occupied: number; arrivals: number; departures: number; total_rooms: number; prev_night_occ: number; adr?: number | null }

export default function ScheduleForecastView({
  hotelId, hotelName, isAdmin,
}: { hotelId: string; hotelName: string; isAdmin: boolean }) {
  const today = localDateStr();
  const weekStart = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDaysStr(weekStart, i));
  const [scheds, setScheds] = useState<Sched[]>([]);
  const [fcs, setFcs] = useState<Record<string, Fc>>({});
  const [loading, setLoading] = useState(true);
  const [selDay, setSelDay] = useState(today);
  const [editOcc, setEditOcc] = useState('');
  const [editAdr, setEditAdr] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [s, f] = await Promise.all([
      getStaffSchedulesRange(hotelId, weekStart, addDaysStr(weekStart, 6)),
      getForecastsRange(hotelId, weekStart, addDaysStr(weekStart, 6)),
    ]);
    setScheds((s || []) as Sched[]);
    const map: Record<string, Fc> = {};
    for (const row of (f || []) as Fc[]) map[row.date] = row;
    setFcs(map);
    setLoading(false);
  }, [hotelId, weekStart]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const f = fcs[selDay];
    setEditOcc(f ? String(f.occupancy_pct ?? '') : '');
    setEditAdr(f?.adr != null ? String(f.adr) : '');
  }, [selDay, fcs]);

  const dayScheds = scheds.filter(s => s.shift_date === selDay).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  const selFc = fcs[selDay];
  const hoursFor = (list: Sched[]): number => list.reduce((acc, s) => {
    if (!s.start_time || !s.end_time) return acc;
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(eh2 => parseInt(eh2, 10));
    let h = (eh + em / 60) - (sh + sm / 60);
    if (h < 0) h += 24;
    return acc + h;
  }, 0);

  const saveDay = async () => {
    const occ = Number(editOcc);
    if (isNaN(occ) || occ < 0 || occ > 100) return;
    setSaving(true);
    const rooms_occupied = Math.round((occ / 100) * (selFc?.total_rooms || 54));
    const arr = selFc?.arrivals ?? 0;
    const prev = selFc?.prev_night_occ ?? rooms_occupied;
    await upsertForecastDay(hotelId, weekStart, {
      date: selDay, occupancy_pct: occ, adr: editAdr.trim() === '' ? null : Number(editAdr),
      arrivals: arr, rooms_occupied, departures: Math.max(0, prev + arr - rooms_occupied),
      total_rooms: selFc?.total_rooms || 54, prev_night_occ: prev,
    });
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
    load();
  };

  const schedCount = (d: string) => scheds.filter(s => s.shift_date === d).length;
  const schedHours = (d: string) => Math.round(hoursFor(scheds.filter(s => s.shift_date === d)));
  const totalWeekHours = days.reduce((a, d) => a + schedHours(d), 0);
  const minPerRoom = 30; // editable guidance baseline
  const hkNeed = (d: string) => {
    const f = fcs[d];
    if (!f) return null;
    return Math.ceil((f.rooms_occupied * minPerRoom) / (8 * 60)); // attendants for an 8h shift
  };

  const sec = 'bg-white border border-gray-200 rounded-2xl p-4';

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Schedules &amp; Forecast</h1>
          <p className="text-[13px] text-gray-500">{hotelName} · week of {weekStart} · {totalWeekHours}h scheduled</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-xl px-3 py-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {days.map(d => {
          const sel = d === selDay;
          const f = fcs[d];
          return (
            <button key={d} onClick={() => setSelDay(d)}
              className={`rounded-xl border p-2 text-center transition-colors ${sel ? 'border-transparent text-white' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              style={sel ? { background: TEAL } : {}}>
              <div className={`text-[10px] font-bold uppercase ${sel ? 'text-white/80' : 'text-gray-400'}`}>{dowShort(d)}</div>
              <div className={`text-[13px] font-extrabold ${sel ? '' : 'text-gray-900'}`}>{new Date(d + 'T00:00:00').getDate()}</div>
              <div className={`text-[10px] font-bold ${sel ? 'text-white/90' : 'text-gray-500'}`}>{schedCount(d)} staff</div>
              <div className={`text-[10px] ${sel ? 'text-white/80' : 'text-gray-400'}`}>{f ? `${f.occupancy_pct}%` : '—'}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Day schedule */}
        <div className={sec}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Users size={14} style={{ color: TEAL }} /> {selDay === today ? 'Today' : selDay} · On Schedule <span className="text-[11px] font-medium text-gray-400">({dayScheds.length})</span></div>
            <div className="text-[11px] font-bold text-gray-400">{schedHours(selDay)}h scheduled</div>
          </div>
          {dayScheds.length === 0 ? (
            <p className="text-[13px] text-gray-400 font-medium py-2">No one scheduled this day</p>
          ) : (
            <div className="space-y-1">
              {dayScheds.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-[13px] bg-gray-50 rounded-xl px-3 py-2">
                  <span className="font-bold text-gray-800 truncate max-w-[170px]">{s.staff_name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 font-medium truncate max-w-[110px]">{(s.role || '').trim()}</span>
                    <span className="font-extrabold text-gray-700 text-[12px]">{fmtTime(s.start_time)}{s.end_time ? ` – ${fmtTime(s.end_time)}` : ' –'}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* Staffing guidance */}
          <div className="mt-3 bg-teal-50 rounded-xl p-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-teal-800 mb-1">Staffing guidance</div>
            {(() => {
              const need = hkNeed(selDay);
              const f = fcs[selDay];
              return (
                <div className="text-[12px] text-teal-900 font-medium leading-relaxed">
                  {f ? (
                    <>
                      {f.rooms_occupied} rooms forecast → ~<b>{need ?? '—'}</b> housekeeper{need === 1 ? '' : 's'} for an 8h shift at ~{minPerRoom} min/room.
                      {' '}Scheduled today: <b>{dayScheds.filter(s => (s.role || '').toLowerCase().includes('housekeep')).length}</b> HK staff.
                    </>
                  ) : (
                    <>Enter occupancy for this day to generate guidance.</>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Forecast input for the day */}
        <div className={sec}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><TrendingUp size={14} style={{ color: TEAL }} /> Forecast · {selDay}</div>
            {savedFlash && <span className="text-[11px] font-bold text-teal-700">✓ Saved</span>}
          </div>
          {selFc ? (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-gray-50 rounded-xl p-2.5 text-center"><div className="text-[17px] font-extrabold text-gray-900">{selFc.occupancy_pct}%</div><div className="text-[10px] font-bold text-gray-500">OCCUPANCY</div></div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-center"><div className="text-[17px] font-extrabold text-gray-900">{selFc.rooms_occupied}</div><div className="text-[10px] font-bold text-gray-500">ROOMS SOLD</div></div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-center"><div className="text-[17px] font-extrabold text-gray-900">{selFc.adr != null ? `$${selFc.adr}` : '—'}</div><div className="text-[10px] font-bold text-gray-500">ADR</div></div>
            </div>
          ) : (
            <p className="text-[13px] text-gray-400 font-medium mb-3">No forecast saved for this day yet</p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[12px] font-medium text-gray-600">Occupancy %
              <input value={editOcc} onChange={e => setEditOcc(e.target.value)} inputMode="decimal" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">ADR ($)
              <input value={editAdr} onChange={e => setEditAdr(e.target.value)} inputMode="decimal" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <button onClick={saveDay} disabled={saving} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
              <span className="flex items-center gap-1"><Clock size={13} /> {saving ? 'Saving…' : 'Save day'}</span>
            </button>
          </div>
          <div className="mt-3 text-[11px] text-gray-400 font-medium">
            Forecast drives staffing guidance, housekeeping load and the Dashboard. Saved per day (hotel + date).
          </div>
        </div>
      </div>
    </div>
  );
}
