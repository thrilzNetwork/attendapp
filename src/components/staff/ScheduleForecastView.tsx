'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, Clock, RefreshCw, Plus, Pencil, Trash2, X as XIcon } from 'lucide-react';
import {
  getStaffSchedulesRange, getForecastsRange, upsertForecastDay,
  createStaffSchedule, updateStaffSchedule, deleteStaffSchedule,
  type StaffSchedule,
} from '@/lib/supabase';

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

interface Sched { id: string; staff_name: string; start_time: string | null; end_time: string | null; role: string; shift_date: string }
interface Fc { date: string; occupancy_pct: number; rooms_occupied: number; arrivals: number; departures: number; total_rooms: number; prev_night_occ: number; adr?: number | null }

// ── AM/PM time helpers ───────────────────────────────────────────────────────
function to24(h: number, m: number, ap: 'am' | 'pm'): string {
  const H = ap === 'am' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  return `${String(H).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function parse12(t?: string | null): { h: number; m: number; ap: 'am' | 'pm' } | null {
  if (!t || !t.includes(':')) return null;
  const [H, m] = t.split(':').map(Number);
  if (isNaN(H)) return null;
  return { h: H % 12 === 0 ? 12 : H % 12, m: m || 0, ap: H >= 12 ? 'pm' : 'am' };
}

export default function ScheduleForecastView({
  hotelId, hotelName, isAdmin, staffList = [],
}: {
  hotelId: string; hotelName: string; isAdmin: boolean;
  staffList: { name: string; role?: string; department?: string }[];
}) {
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

  // ── Shift add/edit (admin) ────────────────────────────────────────────────
  const blankShift = () => ({ id: '', staff_name: '', sh: 7, sm: 0, ap: 'am' as 'am' | 'pm', hasEnd: false, endSh: 3, endSm: 0, endAp: 'pm' as 'am' | 'pm', role: '' });
  const [shiftForm, setShiftForm] = useState(blankShift());
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [submittingShift, setSubmittingShift] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);

  const openAddShift = () => {
    setShiftForm(blankShift());
    setShiftError(null);
    setShowShiftForm(true);
  };
  const openEditShift = (s: Sched & { id?: string }) => {
    const st = parse12(s.start_time) || { h: 7, m: 0, ap: 'am' as const };
    const en = s.end_time ? parse12(s.end_time) : null;
    setShiftForm({ id: s.id || '', staff_name: s.staff_name, sh: st.h, sm: st.m, ap: st.ap, hasEnd: !!en, endSh: en?.h ?? 3, endSm: en?.m ?? 0, endAp: en?.ap ?? 'pm', role: s.role || '' });
    setShiftError(null);
    setShowShiftForm(true);
  };
  const saveShift = async () => {
    if (!shiftForm.staff_name) { setShiftError('Pick a person.'); return; }
    setSubmittingShift(true); setShiftError(null);
    try {
      const start_time = to24(shiftForm.sh, shiftForm.sm, shiftForm.ap);
      const end_time = shiftForm.hasEnd ? to24(shiftForm.endSh, shiftForm.endSm, shiftForm.endAp) : undefined;
      if (shiftForm.id) {
        await updateStaffSchedule(shiftForm.id, { start_time, end_time, role: shiftForm.role || undefined });
      } else {
        await createStaffSchedule({ hotel_id: hotelId, staff_name: shiftForm.staff_name, shift_date: selDay, start_time, end_time, role: shiftForm.role || undefined, notes: 'Added from Schedules & Forecast' });
      }
      setShowShiftForm(false);
      await load();
    } catch (e) {
      setShiftError(e instanceof Error ? e.message : 'Failed to save shift');
    }
    setSubmittingShift(false);
  };
  const removeShift = async (id?: string) => {
    if (!id || !confirm('Remove this shift?')) return;
    setSubmittingShift(true); setShiftError(null);
    try {
      await deleteStaffSchedule(id);
      setShowShiftForm(false);
      await load();
    } catch (e) {
      setShiftError(e instanceof Error ? e.message : 'Failed to remove shift');
    }
    setSubmittingShift(false);
  };

  // AM/PM time picker (preset buttons, no keyboard needed)
  const TimePick = ({ label, val, set }: { label: string; val: { h: number; m: number; ap: 'am' | 'pm' }; set: (v: { h: number; m: number; ap: 'am' | 'pm' }) => void }) => (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-bold text-gray-500">{label}</span>
      <select value={val.h} onChange={e => set({ ...val, h: Number(e.target.value) })}
        className="px-2 py-1.5 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-[12px] font-bold text-gray-400">:</span>
      <select value={val.m} onChange={e => set({ ...val, m: Number(e.target.value) })}
        className="px-2 py-1.5 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400">
        {[0, 15, 30, 45].map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
      </select>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        <button type="button" onClick={() => set({ ...val, ap: 'am' })}
          className={`px-2 py-1.5 text-[11px] font-bold transition-colors ${val.ap === 'am' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          style={val.ap === 'am' ? { background: TEAL } : {}}>AM</button>
        <button type="button" onClick={() => set({ ...val, ap: 'pm' })}
          className={`px-2 py-1.5 text-[11px] font-bold transition-colors ${val.ap === 'pm' ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          style={val.ap === 'pm' ? { background: TEAL } : {}}>PM</button>
      </div>
    </div>
  );

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [s, f] = await Promise.all([
      getStaffSchedulesRange(hotelId, weekStart, addDaysStr(weekStart, 6)),
      getForecastsRange(hotelId, weekStart, addDaysStr(weekStart, 6)),
    ]);
    setScheds((s || []) as unknown as Sched[]);
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
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-bold text-gray-400">{schedHours(selDay)}h scheduled</div>
              {isAdmin && (
                <button onClick={openAddShift} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white" style={{ background: TEAL }}>
                  <Plus size={12} /> Add
                </button>
              )}
            </div>
          </div>
          {shiftError && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold flex items-center justify-between">
              <span>{shiftError}</span>
              <button onClick={() => setShiftError(null)}><XIcon size={12} /></button>
            </div>
          )}
          {dayScheds.length === 0 ? (
            <p className="text-[13px] text-gray-400 font-medium py-2">No one scheduled this day</p>
          ) : (
            <div className="space-y-1">
              {dayScheds.map((s, i) => (
                <div key={s.id || i} className="flex items-center justify-between text-[13px] bg-gray-50 rounded-xl px-3 py-2">
                  <span className="font-bold text-gray-800 truncate max-w-[150px]">{s.staff_name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 font-medium truncate max-w-[90px]">{(s.role || '').trim()}</span>
                    <span className="font-extrabold text-gray-700 text-[12px]">{fmtTime(s.start_time)}{s.end_time ? ` – ${fmtTime(s.end_time)}` : ' –'}</span>
                    {isAdmin && (
                      <span className="flex items-center gap-1 ml-0.5">
                        <button onClick={() => openEditShift(s)} title="Edit shift" className="text-gray-400 hover:text-teal-700"><Pencil size={12} /></button>
                        <button onClick={() => removeShift(s.id)} title="Delete shift" className="text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* Admin add/edit shift form */}
          {isAdmin && showShiftForm && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {!shiftForm.id && (
                  <select value={shiftForm.staff_name} onChange={e => setShiftForm(f => ({ ...f, staff_name: e.target.value }))}
                    className="px-2.5 py-2 border border-gray-200 rounded-xl text-[12px] font-bold text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400 min-w-[150px]">
                    <option value="">Person…</option>
                    {staffList.map(p => <option key={p.name} value={p.name}>{p.name}{p.department ? ` · ${p.department.replace('_', ' ')}` : ''}</option>)}
                  </select>
                )}
                {shiftForm.id && <span className="text-[12px] font-bold text-gray-700">{shiftForm.staff_name}</span>}
                <input value={shiftForm.role} onChange={e => setShiftForm(f => ({ ...f, role: e.target.value }))} placeholder="Role (optional)"
                  className="px-2.5 py-2 border border-gray-200 rounded-xl text-[12px] font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-400 w-[130px]" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <TimePick label="In" val={{ h: shiftForm.sh, m: shiftForm.sm, ap: shiftForm.ap }} set={v => setShiftForm(f => ({ ...f, sh: v.h, sm: v.m, ap: v.ap }))} />
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                  <input type="checkbox" checked={shiftForm.hasEnd} onChange={e => setShiftForm(f => ({ ...f, hasEnd: e.target.checked }))} className="accent-teal-600" />
                  Has end time
                </label>
                {shiftForm.hasEnd && <TimePick label="Out" val={{ h: shiftForm.endSh, m: shiftForm.endSm, ap: shiftForm.endAp }} set={v => setShiftForm(f => ({ ...f, endSh: v.h, endSm: v.m, endAp: v.ap }))} />}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveShift} disabled={submittingShift} className="px-4 py-2 rounded-xl text-[12px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
                  {submittingShift ? 'Saving…' : shiftForm.id ? 'Save changes' : 'Add shift'}
                </button>
                <button onClick={() => setShowShiftForm(false)} className="px-3 py-2 rounded-xl text-[12px] font-bold bg-white border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
                {shiftForm.id && (
                  <button onClick={() => removeShift(shiftForm.id)} disabled={submittingShift} className="ml-auto px-3 py-2 rounded-xl text-[12px] font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50">Delete shift</button>
                )}
              </div>
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
