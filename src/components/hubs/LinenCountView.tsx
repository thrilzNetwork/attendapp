'use client';
import { useState, useEffect } from 'react';
import { getLinenCounts, createLinenCount, type LinenCount } from '@/lib/supabase';
const TEAL = '#0D9488';

export default function LinenCountView({ hotelId, staffName }: { hotelId: string; staffName?: string }) {
  const [counts, setCounts] = useState<LinenCount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ shift: 'AM', item_type: 'Towels', count: 0, par_level: 0, notes: '' });

  const load = async () => setCounts(await getLinenCounts(hotelId));
  useEffect(() => { load(); }, [hotelId]);

  const save = async () => {
    if (!form.item_type) return;
    await createLinenCount({ hotel_id: hotelId, ...form, counted_by: staffName || 'Staff' });
    setForm({ shift: 'AM', item_type: 'Towels', count: 0, par_level: 0, notes: '' });
    setShowForm(false); load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setShowForm(!showForm)} className="text-white px-4 py-2 rounded-xl text-[13px] font-bold" style={{ backgroundColor: TEAL }}>+ Linen Count</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-[11px] text-gray-400 mb-1 block">Shift</label>
              <select value={form.shift} onChange={e => setForm({...form, shift: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 text-[13px]"><option>AM</option><option>PM</option></select></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Item</label>
              <input value={form.item_type} onChange={e => setForm({...form, item_type: e.target.value})} placeholder="Towels, Sheets, etc" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Count</label>
              <input type="number" value={form.count} onChange={e => setForm({...form, count: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Par Level</label>
              <input type="number" value={form.par_level} onChange={e => setForm({...form, par_level: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div className="col-span-2 md:col-span-3"><label className="text-[11px] text-gray-400 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button>
            <button onClick={save} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold" style={{ backgroundColor: TEAL }}>Save</button>
          </div>
        </div>
      )}
      {counts.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><p className="text-[13px] text-gray-500">No linen counts today.</p></div> : (
        <div className="space-y-2">
          {counts.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex items-center justify-between">
              <div><span className="text-[13px] font-semibold text-gray-800">{c.item_type}</span><span className="text-[11px] text-gray-400 ml-2">{c.shift} · {c.counted_by}</span></div>
              <div className="flex gap-3 text-[13px]"><span className={c.count < c.par_level ? 'text-red-600 font-bold' : 'text-gray-700'}>{c.count} / {c.par_level} par</span>{c.count < c.par_level && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">LOW</span>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}