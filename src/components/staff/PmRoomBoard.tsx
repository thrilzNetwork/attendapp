'use client';

/**
 * PM Room Board — shared room-status grid + per-room PM snapshot modal.
 * Mirrors the board in MaintenanceView (PMs due, open tickets, service stamps)
 * so Housekeeping gets the identical view. Loads its own data.
 */
import { useState, useEffect, useCallback } from 'react';
import { CalendarClock, DoorOpen, X as XIcon, Check } from 'lucide-react';
import {
  getRoomStatuses, getMaintenancePms, getWorkOrders,
  completeMaintenancePm, updateWorkOrder,
  type RoomStatus, type MaintenancePm, type WorkOrder,
} from '@/lib/supabase';

const TEAL = '#158A7C';

export default function PmRoomBoard({ hotelId, today }: { hotelId: string; today: string }) {
  const [rooms, setRooms] = useState<RoomStatus[]>([]);
  const [pms, setPms] = useState<MaintenancePm[]>([]);
  const [wos, setWos] = useState<WorkOrder[]>([]);
  const [selRoom, setSelRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [r, p, w] = await Promise.all([
      getRoomStatuses(hotelId).catch(() => [] as RoomStatus[]),
      getMaintenancePms(hotelId).catch(() => [] as MaintenancePm[]),
      getWorkOrders(hotelId).catch(() => [] as WorkOrder[]),
    ]);
    setRooms(r); setPms(p); setWos(w);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const daysSince = (d?: string | null): number | null =>
    d ? Math.floor((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000) : null;

  const norm = (s: string) => s.replace(/^0+/, '').trim().toLowerCase();
  const roomPms = (room: string) => pms.filter(p => p.title.toLowerCase().startsWith(`room ${norm(room)} `) || p.title.toLowerCase().includes(`room ${norm(room)} —`));
  const roomWos = (room: string) => wos.filter(w => norm(w.location) === norm(`room ${room}`) || w.location.toLowerCase() === `room ${norm(room)}`);

  const pmsDue = pms.filter(p => { const ds = daysSince(p.last_completed_date); return ds === null || ds >= p.frequency_days; });
  const sortedRooms = [...rooms].sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true, sensitivity: 'base' }));

  const completePm = async (id: string) => {
    await completeMaintenancePm(id).catch(() => {});
    load();
    setSelRoom(null);
  };
  const resolveWo = async (id: string) => {
    await updateWorkOrder(id, { status: 'resolved', resolved_at: new Date().toISOString() }).catch(() => {});
    load();
    setSelRoom(null);
  };

  const sel = selRoom ? rooms.find(r => r.room_number === selRoom) : null;

  const sec = 'bg-white border border-gray-200 rounded-2xl p-4';

  return (
    <div className={sec + ' mb-4'}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900">
          <CalendarClock size={14} style={{ color: TEAL }} /> PM Room Breakdown
          <span className="text-[11px] font-medium text-gray-400">({sortedRooms.length} rooms · tap a room for its PM history)</span>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-lg px-2 py-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={loading ? 'animate-spin' : ''}><path d="M21 12a9 9 0 11-9-9" /><path d="M21 3v9h-9" /></svg>
          Sync
        </button>
      </div>
      <span className="text-[11px] font-bold text-gray-500">{pmsDue.length} PM due · {wos.filter(w => w.status !== 'resolved').length} tickets open</span>
      {sortedRooms.length === 0 ? (
        <p className="text-[13px] text-gray-400 font-medium py-2">No rooms on the board yet — rooms appear as housekeeping logs them.</p>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mt-2">
          {sortedRooms.map(r => {
            const due = roomPms(r.room_number).filter(p => { const ds = daysSince(p.last_completed_date); return ds === null || ds >= p.frequency_days; }).length;
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

      {/* ── Per-room PM snapshot modal ── */}
      {selRoom && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setSelRoom(null)}>
          <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2"><DoorOpen size={16} style={{ color: TEAL }} /> Room {selRoom} — PM Snapshot</h2>
              <button onClick={() => setSelRoom(null)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-3 text-[12px] text-gray-600">
              {sel ? (
                <>
                  <div className="font-bold text-gray-800 mb-1">Last service</div>
                  Cleaned: {sel.cleaned_by ? `${sel.cleaned_by} · ${new Date(sel.cleaned_at || '').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : '—'}
                  <br />
                  Inspected: {sel.inspected_by ? `${sel.inspected_by} · ${new Date(sel.inspected_at || '').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : '—'}
                  {sel.notes && <><br /><span className="text-gray-500">Notes: {sel.notes}</span></>}
                </>
              ) : (
                <span className="text-gray-400">No service stamps logged for this room yet.</span>
              )}
            </div>

            <div className="mb-3">
              <div className="text-[12px] font-extrabold text-gray-800 mb-1.5">PM HISTORY ({roomPms(selRoom).length})</div>
              {roomPms(selRoom).length === 0 ? (
                <p className="text-[12px] text-gray-400 py-1">No PM tasks logged for this room yet.</p>
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
          </div>
        </div>
      )}
    </div>
  );
}