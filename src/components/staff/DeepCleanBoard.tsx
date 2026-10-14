'use client';

/**
 * Deep Clean Rooms board — housekeeping-only room grid tracking DEEP CLEANS.
 * Orange = deep clean logged for that room (open) · teal = deep cleaned today
 * · gray = OK. Tap a room for its deep-clean log; Done stamps straight into
 * the same tracker that feeds Maint. Mirrors the Maint room-board look.
 */
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, X as XIcon, Check } from 'lucide-react';
import { getRoomStatuses, getWorkOrders, updateWorkOrder, type RoomStatus, type WorkOrder } from '@/lib/supabase';

const TEAL = '#158A7C';

export default function DeepCleanBoard({ hotelId, today }: { hotelId: string; today: string }) {
  const [rooms, setRooms] = useState<RoomStatus[]>([]);
  const [wos, setWos] = useState<WorkOrder[]>([]);
  const [selRoom, setSelRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [r, w] = await Promise.all([
      getRoomStatuses(hotelId).catch(() => [] as RoomStatus[]),
      getWorkOrders(hotelId).catch(() => [] as WorkOrder[]),
    ]);
    setRooms(r); setWos(w);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const norm = (s: string) => s.replace(/^0+/, '').trim().toLowerCase();
  const roomWos = (room: string) => wos.filter(w => norm(w.location) === norm(`Room ${room}`));

  const allNames = useMemoSet(new Set<string>([
    ...rooms.map(r => r.room_number),
    ...wos.map(w => norm(w.location).startsWith('room ') ? w.location.replace(/^\s*room\s*/i, '').trim() : '').filter(Boolean),
  ]));
  const sortedRooms = [...allNames].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const stampDeepClean = async (id: string) => {
    await updateWorkOrder(id, { status: 'resolved', resolved_at: new Date().toISOString() }).catch(() => {});
    await load();
    setSelRoom(null);
  };

  const openForRoom = selRoom ? roomWos(selRoom).filter(w => w.status !== 'resolved') : [];
  const openCount = wos.filter(w => w.status !== 'resolved').length;
  const doneTodayCount = wos.filter(w => w.status === 'resolved' && (w.resolved_at || '').slice(0, 10) === today).length;

  const sec = 'bg-white border border-gray-200 rounded-2xl p-4';

  return (
    <div className={sec + ' mb-4'}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900">
          <Sparkles size={14} style={{ color: TEAL }} /> Deep Clean Rooms
          <span className="text-[11px] font-medium text-gray-400">({sortedRooms.length} rooms · tap a room for its deep clean log)</span>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-lg px-2 py-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={loading ? 'animate-spin' : ''}><path d="M21 12a9 9 0 11-9-9" /><path d="M21 3v9h-9" /></svg>
          Sync
        </button>
      </div>
      <span className="text-[11px] font-bold text-gray-500">{openCount} deep clean(s) to do · {doneTodayCount} done today</span>
      {sortedRooms.length === 0 ? (
        <p className="text-[13px] text-gray-400 font-medium py-2">No rooms on the board yet — rooms appear as housekeeping logs them.</p>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mt-2">
          {sortedRooms.map(room => {
            const open = roomWos(room).filter(w => w.status !== 'resolved').length;
            const dcToday = roomWos(room).some(w => w.status === 'resolved' && (w.resolved_at || '').slice(0, 10) === today);
            return (
              <button key={room} onClick={() => setSelRoom(room)}
                title={`Room ${room} — ${open} deep clean(s) logged${dcToday ? ' · deep cleaned today' : ''}`}
                className={`relative rounded-xl border px-1 py-2 text-center transition-colors ${open > 0 ? 'bg-orange-50 border-orange-200 text-orange-700' : dcToday ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-gray-50 border-gray-200 text-gray-600'} hover:ring-2 hover:ring-teal-300`}>
                <div className="text-[13px] font-extrabold">{room}</div>
                <div className="text-[8px] font-bold uppercase tracking-wide">{open > 0 ? 'DEEP CLEAN' : dcToday ? 'DC DONE' : 'OK'}</div>
                {open > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-extrabold flex items-center justify-center">{open}</div>}
                {dcToday && open === 0 && <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-teal-500" />}
              </button>
            );
          })}
        </div>
      )}
      <div className="text-[11px] text-gray-400 mt-2">
        Orange = deep clean logged · teal = deep cleaned today · tap any room for its log. Log a deep clean in End of Day below.
      </div>

      {/* ── Per-room deep clean log modal ── */}
      {selRoom && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setSelRoom(null)}>
          <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-2"><Sparkles size={16} style={{ color: TEAL }} /> Room {selRoom} — Deep Clean Log</h2>
              <button onClick={() => setSelRoom(null)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>

            <div className="text-[12px] font-extrabold text-gray-800 mb-1.5">DEEP CLEANS ({openForRoom.length} open / {roomWos(selRoom).length} total)</div>
            {roomWos(selRoom).length === 0 ? (
              <p className="text-[12px] text-gray-400 py-1">No deep cleans logged for this room yet.</p>
            ) : (
              <div className="space-y-1">
                {roomWos(selRoom).map(w => (
                  <div key={w.id} className={`flex items-center justify-between rounded-xl px-3 py-2 border ${w.status === 'resolved' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-gray-900 truncate">{w.issue}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{w.status === 'resolved' ? `Done ${new Date(w.resolved_at || '').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : `Logged ${new Date(w.created_at || '').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}</div>
                    </div>
                    {w.status === 'resolved' ? (
                      <span className="text-[9px] font-bold text-teal-700 bg-teal-50 rounded-lg px-1.5 py-0.5 shrink-0">DONE</span>
                    ) : (
                      <button onClick={() => stampDeepClean(w.id)} className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-white rounded-lg px-2 py-1" style={{ background: TEAL }}><Check size={11} /> Done</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// tiny identity-preserving set helper for room names
function useMemoSet(set: Set<string>): Set<string> {
  return set;
}