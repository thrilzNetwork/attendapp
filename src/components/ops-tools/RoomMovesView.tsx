'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRoomMoves, createRoomMove, deleteRoomMove, type RoomMove } from '@/lib/supabase';
import { Trash2, ArrowRight } from 'lucide-react';

const TEAL = '#0D9488';

export default function RoomMovesView({ hotelId }: { hotelId: string }) {
  const today = new Date().toISOString().split('T')[0];
  const [moves, setMoves] = useState<RoomMove[]>([]);
  const [date, setDate] = useState(today);
  const [form, setForm] = useState({ guest_name: '', from_room: '', to_room: '', reason: '', initiated_by: '', notes: '' });
  const [showForm, setShowForm] = useState(false);

  const load = async () => setMoves(await getRoomMoves(hotelId, date));
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleCreate = async () => {
    if (!form.guest_name || !form.from_room || !form.to_room) return;
    await createRoomMove({ hotel_id: hotelId, move_date: date, ...form });
    setForm({ guest_name: '', from_room: '', to_room: '', reason: '', initiated_by: '', notes: '' });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white rounded-xl border border-gray-200 px-4 py-2 text-[14px] outline-none" />
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-[13px] font-bold" style={{ backgroundColor: TEAL }}>+ Room Move</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Guest Name *</label>
              <input value={form.guest_name} onChange={e => setForm({...form, guest_name: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Initiated By</label>
              <input value={form.initiated_by} onChange={e => setForm({...form, initiated_by: e.target.value})} placeholder="Staff name" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">From Room *</label>
              <input value={form.from_room} onChange={e => setForm({...form, from_room: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">To Room *</label>
              <input value={form.to_room} onChange={e => setForm({...form, to_room: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Reason</label>
              <input value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g. Maintenance, Guest request, Upgrade" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => { setShowForm(false); }} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button>
            <button onClick={handleCreate} disabled={!form.guest_name || !form.from_room || !form.to_room} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-40" style={{ backgroundColor: TEAL }}>Save Move</button>
          </div>
        </div>
      )}

      {moves.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-[13px] text-gray-500">No room moves for this date.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {moves.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-gray-900">{m.guest_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-red-50 text-red-600 font-mono text-[12px] font-bold px-2 py-0.5 rounded">{m.from_room}</span>
                  <ArrowRight size={14} className="text-gray-400" />
                  <span className="bg-emerald-50 text-emerald-600 font-mono text-[12px] font-bold px-2 py-0.5 rounded">{m.to_room}</span>
                  {m.reason && <span className="text-[11px] text-gray-500 ml-2">· {m.reason}</span>}
                </div>
                {m.notes && <p className="text-[11px] text-gray-400 mt-1">{m.notes}</p>}
              </div>
              <button onClick={async () => { await deleteRoomMove(m.id); load(); }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
