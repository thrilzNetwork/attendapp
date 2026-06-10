'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBankCounts, createBankCount, type BankCount } from '@/lib/supabase';

const TEAL = '#0D9488';

export default function BankCountView({ hotelId }: { hotelId: string }) {
  const today = new Date().toISOString().split('T')[0];
  const [counts, setCounts] = useState<BankCount[]>([]);
  const [date, setDate] = useState(today);
  const [form, setForm] = useState({ shift: 'AM', counted_by: '', cash_total: 0, card_total: 0, room_charges: 0, discrepancies: '', notes: '' });
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => setCounts(await getBankCounts(hotelId, date)), [hotelId, date]);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.counted_by) return;
    await createBankCount({ hotel_id: hotelId, count_date: date, ...form });
    setForm({ shift: 'AM', counted_by: '', cash_total: 0, card_total: 0, room_charges: 0, discrepancies: '', notes: '' });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white rounded-xl border border-gray-200 px-4 py-2 text-[14px] outline-none" />
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-[13px] font-bold" style={{ backgroundColor: TEAL }}>+ Bank Count</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
          <h3 className="text-[15px] font-bold text-gray-900 mb-3">Bank Count Sheet</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Shift</label>
              <select value={form.shift} onChange={e => setForm({...form, shift: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                <option value="AM">AM Count</option>
                <option value="PM">PM Count</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Counted By *</label>
              <input value={form.counted_by} onChange={e => setForm({...form, counted_by: e.target.value})} placeholder="Your name" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Cash Total ($)</label>
              <input type="number" step="0.01" value={form.cash_total} onChange={e => setForm({...form, cash_total: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Card Total ($)</label>
              <input type="number" step="0.01" value={form.card_total} onChange={e => setForm({...form, card_total: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Room Charges ($)</label>
              <input type="number" step="0.01" value={form.room_charges} onChange={e => setForm({...form, room_charges: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Discrepancies</label>
              <input value={form.discrepancies} onChange={e => setForm({...form, discrepancies: e.target.value})} placeholder="e.g. Cash +$5.00" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none resize-none" />
            </div>
          </div>
          {form.cash_total > 0 || form.card_total > 0 ? (
            <div className="mt-3 bg-teal-50 rounded-xl px-4 py-2 text-[13px] text-teal-700 font-semibold">
              Total: ${(form.cash_total + form.card_total + form.room_charges).toFixed(2)}
            </div>
          ) : null}
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => { setShowForm(false); }} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button>
            <button onClick={handleCreate} disabled={!form.counted_by} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-40" style={{ backgroundColor: TEAL }}>Save Count</button>
          </div>
        </div>
      )}

      {counts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-[13px] text-gray-500">No bank counts for this date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {counts.map(c => {
            const total = c.cash_total + c.card_total + c.room_charges;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{c.shift}</span>
                    <span className="text-[13px] text-gray-500">{c.counted_by}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-400">Cash</p><p className="text-[15px] font-bold text-gray-800">${c.cash_total.toFixed(2)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-400">Card</p><p className="text-[15px] font-bold text-gray-800">${c.card_total.toFixed(2)}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-400">Room Charges</p><p className="text-[15px] font-bold text-gray-800">${c.room_charges.toFixed(2)}</p></div>
                  <div className="bg-teal-50 rounded-lg p-2"><p className="text-[10px] text-teal-600">Total</p><p className="text-[15px] font-bold text-teal-700">${total.toFixed(2)}</p></div>
                </div>
                {c.discrepancies && <p className="mt-2 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">⚠ {c.discrepancies}</p>}
                {c.notes && <p className="mt-1 text-[11px] text-gray-500">{c.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
