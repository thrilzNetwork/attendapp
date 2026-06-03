'use client';

import { useState, useEffect } from 'react';
import { getNoShows, createNoShow, deleteNoShow, type NoShow } from '@/lib/supabase';
import { Trash2 } from 'lucide-react';

const TEAL = '#0D9488';

export default function NoShowsView({ hotelId }: { hotelId: string }) {
  const today = new Date().toISOString().split('T')[0];
  const [items, setItems] = useState<NoShow[]>([]);
  const [date, setDate] = useState(today);
  const [form, setForm] = useState({ guest_name: '', room: '', reservation_ref: '', reason: '', notes: '' });
  const [showForm, setShowForm] = useState(false);

  const load = async () => setItems(await getNoShows(hotelId, date));
  useEffect(() => { load(); }, [date]);

  const handleCreate = async () => {
    if (!form.guest_name || !form.room) return;
    await createNoShow({ hotel_id: hotelId, no_show_date: date, ...form });
    setForm({ guest_name: '', room: '', reservation_ref: '', reason: '', notes: '' });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white rounded-xl border border-gray-200 px-4 py-2 text-[14px] outline-none" />
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-[13px] font-bold" style={{ backgroundColor: TEAL }}>+ No Show</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Guest Name *</label>
              <input value={form.guest_name} onChange={e => setForm({...form, guest_name: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Room *</label>
              <input value={form.room} onChange={e => setForm({...form, room: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Reservation Ref</label>
              <input value={form.reservation_ref} onChange={e => setForm({...form, reservation_ref: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Reason</label>
              <input value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g. Late arrival, cancelled" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => { setShowForm(false); setForm({ guest_name: '', room: '', reservation_ref: '', reason: '', notes: '' }); }} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button>
            <button onClick={handleCreate} disabled={!form.guest_name || !form.room} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-40" style={{ backgroundColor: TEAL }}>Save</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-[13px] text-gray-500">No no-shows recorded for this date.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-gray-900">{item.guest_name} — <span className="text-gray-500 font-mono">#{item.room}</span></p>
                {item.reservation_ref && <p className="text-[11px] text-gray-400">Ref: {item.reservation_ref}</p>}
                <div className="flex gap-2 mt-1">
                  {item.reason && <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{item.reason}</span>}
                  {item.notes && <span className="text-[11px] text-gray-500">{item.notes}</span>}
                </div>
              </div>
              <button onClick={async () => { await deleteNoShow(item.id); load(); }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
