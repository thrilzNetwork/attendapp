'use client';

import { useState, useEffect } from 'react';
import { getRoomStatuses, upsertRoomStatus, type RoomStatus } from '@/lib/supabase';

const TEAL = '#0D9488';

export default function RoomStatusView({ hotelId, staffName }: { hotelId: string; staffName?: string }) {
  const [rooms, setRooms] = useState<RoomStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { setRooms(await getRoomStatuses(hotelId)); setLoading(false); };
  useEffect(() => { load(); }, [hotelId]);

  const setStatus = async (room: RoomStatus, status: string) => {
    await upsertRoomStatus(hotelId, room.room_number, status, staffName || 'Staff');
    load();
  };

  const addRoom = async () => {
    const num = prompt('Room number:');
    if (!num) return;
    await upsertRoomStatus(hotelId, num.trim(), 'dirty', staffName || 'Staff');
    load();
  };

  const stats = {
    clean: rooms.filter(r => r.status === 'clean').length,
    dirty: rooms.filter(r => r.status === 'dirty').length,
    inspected: rooms.filter(r => r.status === 'inspected').length,
    ooo: rooms.filter(r => r.status === 'out_of_order').length,
  };

  if (loading) return <div className="p-4 text-gray-400 text-[13px]">Loading rooms…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          {[['clean', 'Clean', 'bg-emerald-100 text-emerald-700'], ['dirty', 'Dirty', 'bg-red-100 text-red-700'], ['inspected', 'Inspected', 'bg-blue-100 text-blue-700'], ['out_of_order', 'OOO', 'bg-gray-200 text-gray-600']].map(([key, label, color]) => (
            <span key={key} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${color}`}>
              {label}: {(stats as Record<string, number>)[key]}
            </span>
          ))}
        </div>
        <button onClick={addRoom} className="text-white px-3 py-1.5 rounded-xl text-[12px] font-bold" style={{ backgroundColor: TEAL }}>+ Room</button>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-[13px] text-gray-500">No rooms yet. Click "+ Room" to add room numbers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {rooms.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] font-bold text-gray-800">Room {r.room_number}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  r.status === 'clean' ? 'bg-emerald-100 text-emerald-700' :
                  r.status === 'dirty' ? 'bg-red-100 text-red-700' :
                  r.status === 'inspected' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-200 text-gray-600'
                }`}>{r.status.toUpperCase()}</span>
              </div>
              {r.cleaned_by && <p className="text-[10px] text-gray-400">Cleaned by {r.cleaned_by}</p>}
              <div className="flex gap-1 mt-2">
                <button onClick={() => setStatus(r, 'clean')} className="flex-1 text-[10px] py-1 rounded-lg bg-emerald-50 text-emerald-600 font-semibold hover:bg-emerald-100">Clean</button>
                <button onClick={() => setStatus(r, 'dirty')} className="flex-1 text-[10px] py-1 rounded-lg bg-red-50 text-red-600 font-semibold hover:bg-red-100">Dirty</button>
                <button onClick={() => setStatus(r, 'inspected')} className="flex-1 text-[10px] py-1 rounded-lg bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100">Inspect</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}