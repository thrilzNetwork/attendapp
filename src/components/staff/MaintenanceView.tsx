'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wrench, CalendarClock, Timer, Plus, RefreshCw, Check, Clock, CheckCircle2, X as XIcon, DoorOpen } from 'lucide-react';
import {
  getWorkOrders, createWorkOrder, updateWorkOrder,
  getMaintenancePms, createMaintenancePm, completeMaintenancePm,
  getStaffSchedulesRange, updateStaffSchedule, getRoomStatuses,
  type StaffSchedule, type RoomStatus,
} from '@/lib/supabase';

const TEAL = '#158A7C';

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

interface Wo { id: string; location: string; issue: string; priority: string; status: string; assigned_to?: string; created_at?: string }
interface Pm { id: string; title: string; frequency_days: number; last_completed_date?: string | null; assigned_to?: string }

/** Does a PM title reference this room? e.g. "Room 204 — HVAC filter" */
function pmForRoom(p: Pm, room: string): boolean {
  const rn = room.replace(/^0+/, '');
  const t = p.title.replace(/^0+(?=\d)/, '');
  return new RegExp(`\\b${rn}\\b`).test(t);
}
function woForRoom(w: Wo, room: string): boolean {
  const rn = room.replace(/^0+/, '');
  const loc = (w.location || '').replace(/^0+(?=\d)/, '');
  return new RegExp(`\\b${rn}\\b`).test(loc);
}

export default function MaintenanceView({
  hotelId, hotelName, staffName, isAdmin,
}: { hotelId: string; hotelName: string; staffName: string; isAdmin: boolean }) {
  const today = localDateStr();
  const [wos, setWos] = useState<Wo[]>([]);
  const [pms, setPms] = useState<Pm[]>([]);
  const [mtShifts, setMtShifts] = useState<StaffSchedule[]>([]);
  const [rooms, setRooms] = useState<RoomStatus[]>([]);
  const [loading, setLoading] = useState(true);
  // work order form
  const [woLoc, setWoLoc] = useState('');
  const [woIssue, setWoIssue] = useState('');
  const [woPri, setWoPri] = useState('medium');
  // room snapshot modal
  const [selRoom, setSelRoom] = useState<string | null>(null);
  const [pmTask, setPmTask] = useState('');
  const [pmFreq, setPmFreq] = useState('30');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [w, p, scheds, r] = await Promise.all([
      getWorkOrders(hotelId),
      getMaintenancePms(hotelId),
      getStaffSchedulesRange(hotelId, today, today).catch(() => [] as StaffSchedule[]),
      getRoomStatuses(hotelId).catch(() => [] as RoomStatus[]),
    ]);
    const sorted = ((w || []) as Wo[]).sort((a, b) => (a.status === 'resolved' ? 1 : 0) - (b.status === 'resolved' ? 1 : 0));
    setWos(sorted);
    setPms((p || []) as Pm[]);
    setMtShifts((scheds || []).filter(s => {
      const d = `${s.department || ''} ${s.role || ''}`.toLowerCase();
      return d.includes('maint') || d.includes('engineer') || d.includes('mtce') || d.includes('eng');
    }));
    setRooms(r || []);
    setLoading(false);
  }, [hotelId, today]);

  useEffect(() => { load(); }, [load]);

  const open = wos.filter(w => w.status !== 'resolved');
  const daysSince = (d?: string | null): number | null => {
    if (!d) return null;
    return Math.floor((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000);
  };
  const pmsDue = pms.filter(p => { const ds = daysSince(p.last_completed_date); return ds === null || ds >= p.frequency_days; });
  const pmsDoneToday = pms.filter(p => (p.last_completed_date || '') === today);
  const openHigh = open.filter(w => w.priority === 'high').length;
  const reconExpected = pmsDue.length + openHigh;
  const reconActual = pmsDoneToday.length;
  const reconPct = reconExpected > 0 ? Math.min(100, Math.round((reconActual / reconExpected) * 100)) : 100;
  const onPace = reconExpected === 0 ? true : reconActual >= reconExpected;
  const endedOnTime = mtShifts.filter(s => { const exp = expectedEnd(s.start_time); return s.end_time && exp && s.end_time <= exp; }).length;

  const addWo = async () => {
    if (!woIssue.trim()) return;
    setSaving(true);
    await createWorkOrder({
      hotel_id: hotelId, location: woLoc.trim() || 'General',
      issue: woIssue.trim(), priority: woPri, status: 'open', created_by: staffName || undefined,
    });
    setWoLoc(''); setWoIssue(''); setWoPri('medium');
    setSaving(false);
    load();
  };

  const resolveWo = async (id: string) => {
    setWos(prev => prev.map(w => (w.id === id ? { ...w, status: 'resolved' } : w)));
    await updateWorkOrder(id, { status: 'resolved', resolved_at: new Date().toISOString() });
    load();
  };

  const completePm = async (id: string) => {
    await completeMaintenancePm(id);
    load();
  };

  /** Log a completed (or scheduled) PM scoped to a room: title = "Room N — task" */
  const logRoomPm = async (room: string) => {
    if (!pmTask.trim()) return;
    setSaving(true);
    const created = await createMaintenancePm(hotelId, `Room ${room} — ${pmTask.trim()}`, Number(pmFreq) || 30);
    // mark it completed today so the per-room history has a real entry
    if (created?.id) await completeMaintenancePm(created.id);
    setPmTask('');
    setSaving(false);
    load();
  };

  const logShiftEnd = async (s: StaffSchedule, value: string) => {
    if (!value) return;
    setMtShifts(prev => prev.map(row => (row.id === s.id ? { ...row, end_time: value } : row)));
    await updateStaffSchedule(s.id, { end_time: value });
  };

  const sec = 'bg-white border border-gray-200 rounded-2xl p-4';
  const priStyle: Record<string, string> = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-orange-50 text-orange-700 border-orange-200',
    low: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  // ── per-room PM snapshot data ──
  const sortedRooms = [...rooms].sort((a, b) => {
    const na = parseInt(a.room_number, 10), nb = parseInt(b.room_number, 10);
    return (isNaN(na) || isNaN(nb)) ? a.room_number.localeCompare(b.room_number) : na - nb;
  });
  const roomPms = (room: string) => pms.filter(p => pmForRoom(p, room));
  const roomWos = (room: string) => wos.filter(w => woForRoom(w, room));
  const roomDue = (room: string) => roomPms(room).filter(p => { const ds = daysSince(p.last_completed_date); return ds === null || ds >= p.frequency_days; });
  const selRoomData = selRoom ? sortedRooms.find(r => r.room_number === selRoom) : null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Maintenance — Ops Control</h1>
          <p className="text-[13px] text-gray-500">{hotelName} · PM counts, open tickets &amp; per-room PM breakdown</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-xl px-3 py-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── PM counts + open tickets ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Timer size={14} style={{ color: TEAL }} /> Today <span className="text-[11px] font-medium text-gray-400">— PMs due vs done</span></div>
          <span className={`text-[10px] font-extrabold rounded-lg px-2 py-1 ${onPace ? 'bg-teal-50 text-teal-800' : 'bg-orange-50 text-orange-700'}`}>
            {onPace ? 'ON PACE' : 'BEHIND'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-teal-50 rounded-xl p-3 text-center">
            <div className="text-[20px] font-extrabold text-teal-800">{reconExpected}</div>
            <div className="text-[10px] font-bold text-teal-700">DUE TODAY</div>
            <div className="text-[9px] text-teal-600 font-medium mt-0.5">overdue PMs + high-pri tickets</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{reconActual}</div><div className="text-[10px] font-bold text-gray-500">DONE TODAY</div></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold text-gray-900">{open.length}</div><div className="text-[10px] font-bold text-gray-500">OPEN TICKETS</div><div className="text-[9px] text-gray-400 font-medium mt-0.5">{openHigh} high priority</div></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-[20px] font-extrabold" style={{ color: TEAL }}>{pms.length}</div><div className="text-[10px] font-bold text-gray-500">TOTAL PM TASKS</div><div className="text-[9px] text-gray-400 font-medium mt-0.5">{pmsDue.length} currently due</div></div>
        </div>
        {reconExpected > 0 && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
              <span>CLOSED vs DUE</span><span>{reconPct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2.5 rounded-full" style={{ width: `${reconPct}%`, background: onPace ? TEAL : '#EA580C' }} />
            </div>
            <div className="text-[11px] text-gray-400 mt-1">{pmsDue.length} PM(s) due · {pmsDoneToday.length} completed today · {openHigh} high-priority ticket(s) open</div>
          </div>
        )}
      </div>

      {/* ── Maint crew: expected vs actual shift end ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Clock size={14} style={{ color: TEAL }} /> Maint Crew — Expected vs Actual <span className="text-[11px] font-medium text-gray-400">({mtShifts.length} scheduled · 8h shifts)</span></div>
          {mtShifts.length > 0 && (
            <span className="text-[11px] font-bold text-gray-500">{endedOnTime}/{mtShifts.length} ended on time</span>
          )}
        </div>
        {mtShifts.length === 0 ? (
          <p className="text-[13px] text-gray-400 font-medium py-2">No maintenance shifts scheduled today</p>
        ) : (
          <div className="space-y-1">
            {mtShifts.map(s => {
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

      {/* ── Open tickets (work orders) ── */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center gap-1.5 mb-3 text-[13px] font-extrabold text-gray-900"><Wrench size={14} style={{ color: TEAL }} /> Open Tickets <span className="text-[11px] font-medium text-gray-400">({open.length} open)</span></div>
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-2 mb-3 bg-gray-50 rounded-xl p-3">
            <label className="text-[12px] font-medium text-gray-600">Location
              <input value={woLoc} onChange={e => setWoLoc(e.target.value)} placeholder="Room 204" className="block w-28 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Issue
              <input value={woIssue} onChange={e => setWoIssue(e.target.value)} placeholder="AC not cooling" onKeyDown={e => { if (e.key === 'Enter') addWo(); }} className="block w-56 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Priority
              <select value={woPri} onChange={e => setWoPri(e.target.value)} className="block mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold bg-white focus:outline-none focus:ring-teal-500">
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </label>
            <button onClick={addWo} disabled={saving} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
              <span className="flex items-center gap-1"><Plus size={13} /> Add</span>
            </button>
          </div>
        )}
        {wos.length === 0 ? (
          <p className="text-[13px] text-gray-400 font-medium py-1">No tickets</p>
        ) : (
          <div className="space-y-1">
            {wos.map(w => (
              <div key={w.id} className={`flex items-center justify-between rounded-xl px-3 py-2 border ${w.status === 'resolved' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-gray-900 truncate">{w.location} — {w.issue}</div>
                  <div className="text-[11px] text-gray-400 font-medium">{w.assigned_to ? `Assigned: ${w.assigned_to} · ` : ''}{new Date(w.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold uppercase rounded-lg px-1.5 py-0.5 border ${priStyle[w.priority] || priStyle.low}`}>{w.priority}</span>
                  {w.status === 'resolved' ? (
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 rounded-lg px-1.5 py-0.5">RESOLVED</span>
                  ) : (
                    <button onClick={() => resolveWo(w.id)} className="flex items-center gap-1 text-[11px] font-bold text-white rounded-lg px-2 py-1" style={{ background: TEAL }}><Check size={12} /> Resolve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PM breakdown: all rooms ── */}
      <div className={sec}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><CalendarClock size={14} style={{ color: TEAL }} /> PM Room Breakdown <span className="text-[11px] font-medium text-gray-400">({sortedRooms.length} rooms · tap a room for its PM history)</span></div>
          <span className="text-[11px] font-bold text-gray-500">{pmsDue.length} PM due · {open.length} tickets open</span>
        </div>
        {sortedRooms.length === 0 ? (
          <p className="text-[13px] text-gray-400 font-medium py-2">No rooms on the board yet — rooms appear as housekeeping logs them.</p>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {sortedRooms.map(r => {
              const due = roomDue(r.room_number).length;
              const wo = roomWos(r.room_number).filter(w => w.status !== 'resolved').length;
              const doneToday = roomPms(r.room_number).some(p => (p.last_completed_date || '') === today);
              const stamp = (r.cleaned_at || '').slice(0, 10) === today;
              return (
                <button key={r.id} onClick={() => setSelRoom(r.room_number)}
                  title={`Room ${r.room_number} — ${due} PM due · ${wo} open ticket(s)${stamp ? ' · serviced today' : ''}`}
                  className={`relative rounded-xl border px-1 py-2 text-center transition-colors ${due > 0 ? 'bg-orange-50 border-orange-200 text-orange-700' : doneToday ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-gray-50 border-gray-200 text-gray-600'} hover:ring-2 hover:ring-teal-300`}>
                  <div className="text-[13px] font-extrabold">{r.room_number}</div>
                  <div className="text-[8px] font-bold uppercase tracking-wide">
                    {due > 0 ? `${due} PM DUE` : doneToday ? 'PM DONE' : 'OK'}
                  </div>
                  {wo > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-extrabold flex items-center justify-center">{wo}</div>}
                  {stamp && due === 0 && <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-teal-500" />}
                </button>
              );
            })}
          </div>
        )}
        <div className="text-[11px] text-gray-400 mt-2">
          Orange = PM due · teal = PM completed today · red dot = open ticket(s) · teal corner = serviced today. Tap any room for its PM history &amp; snapshot.
        </div>
      </div>

      {/* ── Per-room PM snapshot modal ── */}
      {selRoom && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setSelRoom(null)}>
          <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2"><DoorOpen size={16} style={{ color: TEAL }} /> Room {selRoom} — PM Snapshot</h2>
              <button onClick={() => setSelRoom(null)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>

            {/* room status stamp */}
            <div className="bg-gray-50 rounded-xl p-3 mb-3 text-[12px] text-gray-600">
              {selRoomData ? (
                <>
                  <div className="font-bold text-gray-800 mb-1">Last service</div>
                  Cleaned: {selRoomData.cleaned_by ? `${selRoomData.cleaned_by} · ${new Date(selRoomData.cleaned_at || '').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : '—'}
                  <br />
                  Inspected: {selRoomData.inspected_by ? `${selRoomData.inspected_by} · ${new Date(selRoomData.inspected_at || '').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : '—'}
                  {selRoomData.notes && <><br /><span className="text-gray-500">Notes: {selRoomData.notes}</span></>}
                </>
              ) : (
                <span className="text-gray-400">No service stamps logged for this room yet.</span>
              )}
            </div>

            {/* PM history for room */}
            <div className="mb-3">
              <div className="text-[12px] font-extrabold text-gray-800 mb-1.5">PM HISTORY ({roomPms(selRoom).length})</div>
              {roomPms(selRoom).length === 0 ? (
                <p className="text-[12px] text-gray-400 py-1">No PM tasks logged for this room yet{isAdmin ? ' — log one below' : ''}.</p>
              ) : (
                <div className="space-y-1">
                  {roomPms(selRoom).map(p => {
                    const ds = daysSince(p.last_completed_date);
                    const isDue = ds === null || ds >= p.frequency_days;
                    return (
                      <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-[12px] font-bold text-gray-900 truncate">{p.title.replace(new RegExp(`^Room ${selRoom.replace(/^0+/, '')}\\s*—\\s*`, 'i'), '')}</div>
                          <div className="text-[10px] text-gray-400 font-medium">Every {p.frequency_days}d{p.last_completed_date ? ` · last ${p.last_completed_date}${ds !== null ? ` (${ds}d ago)` : ''}` : ' · never completed'}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-bold uppercase rounded-lg px-1.5 py-0.5 ${(p.last_completed_date || '') === today ? 'text-teal-700 bg-teal-50' : isDue ? 'text-orange-600 bg-orange-50' : 'text-gray-500 bg-gray-100'}`}>{(p.last_completed_date || '') === today ? 'DONE' : isDue ? 'DUE' : 'OK'}</span>
                          {isDue && <button onClick={() => completePm(p.id)} className="text-[10px] font-bold text-white rounded-lg px-2 py-1" style={{ background: TEAL }}><Check size={11} /></button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* tickets for room */}
            {roomWos(selRoom).length > 0 && (
              <div className="mb-3">
                <div className="text-[12px] font-extrabold text-gray-800 mb-1.5">TICKETS ({roomWos(selRoom).filter(w => w.status !== 'resolved').length} open / {roomWos(selRoom).length} total)</div>
                <div className="space-y-1">
                  {roomWos(selRoom).map(w => (
                    <div key={w.id} className={`flex items-center justify-between rounded-xl px-3 py-2 border ${w.status === 'resolved' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
                      <div className="text-[12px] font-bold text-gray-900 truncate">{w.issue}</div>
                      {w.status === 'resolved' ? (
                        <span className="text-[9px] font-bold text-teal-700 bg-teal-50 rounded-lg px-1.5 py-0.5 shrink-0">RESOLVED</span>
                      ) : (
                        <button onClick={() => resolveWo(w.id)} className="text-[10px] font-bold text-white rounded-lg px-2 py-1 shrink-0" style={{ background: TEAL }}>Resolve</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* log PM for room */}
            {isAdmin && (
              <div className="border-t border-gray-100 pt-3">
                <div className="text-[12px] font-extrabold text-gray-800 mb-1.5">LOG PM FOR ROOM {selRoom}</div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-[12px] font-medium text-gray-600">Task
                    <input value={pmTask} onChange={e => setPmTask(e.target.value)} placeholder="HVAC filter change" onKeyDown={e => { if (e.key === 'Enter') logRoomPm(selRoom); }} className="block w-48 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
                  </label>
                  <label className="text-[12px] font-medium text-gray-600">Every (days)
                    <input value={pmFreq} onChange={e => setPmFreq(e.target.value)} inputMode="numeric" className="block w-16 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
                  </label>
                  <button onClick={() => logRoomPm(selRoom)} disabled={saving || !pmTask.trim()} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
                    <span className="flex items-center gap-1"><Plus size={13} /> Log PM</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Logged PMs are marked completed today and recur on the cycle you set.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}