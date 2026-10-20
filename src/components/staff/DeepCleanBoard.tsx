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
import RoomGridFloors from './RoomGridFloors';

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
        (() => {
          // Shared floor-grouped grid (same as Room Safety + Maint): orange = deep clean logged, teal = done today, badge = open deep cleans.
          const dcTiles: Record<string, { state?: 'done' | 'due' | 'open' | 'idle'; label?: string; badge?: number; dot?: boolean; title?: string }> = {};
          for (const room of sortedRooms) {
            const open = roomWos(room).filter(w => w.status !== 'resolved').length;
            const dcToday = roomWos(room).some(w => w.status === 'resolved' && (w.resolved_at || '').slice(0, 10) === today);
            dcTiles[room] = {
              state: open > 0 ? 'due' : dcToday ? 'done' : 'idle',
              label: open > 0 ? 'DC logged' : dcToday ? 'DC done' : 'OK',
              badge: open,
              dot: dcToday && open === 0,
              title: `Room ${room} — ${open} deep clean(s) logged${dcToday ? ' · deep cleaned today' : ''}`,
            };
          }
          const baseRooms = rooms.length > 0
            ? rooms.map(r => ({ room_number: r.room_number }))
            : sortedRooms.map(room => ({ room_number: room }));
          return <div className="mt-2"><RoomGridFloors rooms={baseRooms} onPick={room => setSelRoom(room)} tileStates={dcTiles} /></div>;
        })()
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