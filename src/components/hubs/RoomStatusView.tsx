'use client';

import { useState, useEffect, useCallback } from 'react';
import { authedApiHeaders, type RoomStatus } from '@/lib/supabase';

const TEAL = '#158A7C';

export default function RoomStatusView({ hotelId, staffName }: { hotelId: string; staffName?: string }) {
  const [rooms, setRooms] = useState<RoomStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const res = await fetch(`/api/room-status?hotelId=${hotelId}`, { headers: await authedApiHeaders(), signal });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load rooms');
      setRooms(json.rooms || []);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    setLoading(true);
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const post = async (roomNumber: string, status: string) => {
    if (pending) return; // one write in flight — kills double-tap races
    setPending(roomNumber);
    try {
      const res = await fetch('/api/room-status', {
        method: 'POST',
        headers: await authedApiHeaders(),
        body: JSON.stringify({ room_number: roomNumber, status, staffName, hotelId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setPending(null);
    }
  };

  const addRoom = async () => {
    const num = prompt('Room number:');
    if (!num?.trim()) return;
    await post(num.trim(), 'dirty');
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
      {error && (
        <div className="mb-3 flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-[12px] px-3 py-2 rounded-xl">
          <span>{error}</span>
          <button onClick={() => load()} className="font-bold underline">Retry</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          {[['clean', 'Clean', 'bg-emerald-100 text-emerald-700'], ['dirty', 'Dirty', 'bg-red-100 text-red-700'], ['inspected', 'Inspected', 'bg-blue-100 text-blue-700'], ['out_of_order', 'OOO', 'bg-gray-200 text-gray-600']].map(([key, label, color]) => (
            <span key={key} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${color}`}>
              {label}: {(stats as Record<string, number>)[key]}
            </span>
          ))}
        </div>
        <button onClick={addRoom} disabled={!!pending} className="text-white px-3 py-1.5 rounded-xl text-[12px] font-bold disabled:opacity-50" style={{ backgroundColor: TEAL }}>+ Room</button>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-[13px] text-gray-500">No rooms yet. Click &quot;+ Room&quot; to add room numbers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {rooms.map(r => (
            <div key={r.id} className={`bg-white rounded-xl border border-gray-200 p-3 shadow-sm ${pending === r.room_number ? 'opacity-60' : ''}`}>
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
                <button disabled={!!pending} onClick={() => post(r.room_number, 'clean')} className="flex-1 text-[10px] py-1 rounded-lg bg-emerald-50 text-emerald-600 font-semibold hover:bg-emerald-100 disabled:opacity-50">Clean</button>
                <button disabled={!!pending} onClick={() => post(r.room_number, 'dirty')} className="flex-1 text-[10px] py-1 rounded-lg bg-red-50 text-red-600 font-semibold hover:bg-red-100 disabled:opacity-50">Dirty</button>
                <button disabled={!!pending} onClick={() => post(r.room_number, 'inspected')} className="flex-1 text-[10px] py-1 rounded-lg bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100 disabled:opacity-50">Inspect</button>
                {r.status === 'out_of_order'
                  ? <button disabled={!!pending} onClick={() => post(r.room_number, 'dirty')} className="flex-1 text-[10px] py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 disabled:opacity-50">Back in Service</button>
                  : <button disabled={!!pending} onClick={() => post(r.room_number, 'out_of_order')} className="flex-1 text-[10px] py-1 rounded-lg bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 disabled:opacity-50">OOO</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
