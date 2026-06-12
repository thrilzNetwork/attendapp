'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCallAroundLogs, createCallAroundLog, type CallAroundLog } from '@/lib/supabase';

const TEAL = '#0D9488';

export default function CallAroundView({ hotelId }: { hotelId: string }) {
  const today = new Date().toISOString().split('T')[0];
  const [logs, setLogs] = useState<CallAroundLog[]>([]);
  const [date, setDate] = useState(today);
  const [form, setForm] = useState({ shift: 'AM', handed_off_by: '', received_by: '', occupancy: 0, arrivals: 0, departures: 0, notes: '' });
  const [showForm, setShowForm] = useState(false);

  const load = async () => setLogs(await getCallAroundLogs(hotelId, date));
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleCreate = async () => {
    if (!form.handed_off_by || !form.received_by) return;
    await createCallAroundLog({ hotel_id: hotelId, shift_date: date, ...form });
    setForm({ shift: 'AM', handed_off_by: '', received_by: '', occupancy: 0, arrivals: 0, departures: 0, notes: '' });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white rounded-xl border border-gray-200 px-4 py-2 text-[14px] outline-none" />
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-[13px] font-bold" style={{ backgroundColor: TEAL }}>+ Handoff Log</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
          <h3 className="text-[15px] font-bold text-gray-900 mb-3">Shift Handoff</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Shift</label>
              <select value={form.shift} onChange={e => setForm({...form, shift: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                <option value="AM">AM</option>
                <option value="PM">PM</option>
                <option value="Overnight">Overnight</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Handed Off By</label>
              <input value={form.handed_off_by} onChange={e => setForm({...form, handed_off_by: e.target.value})} placeholder="Your name" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Received By</label>
              <input value={form.received_by} onChange={e => setForm({...form, received_by: e.target.value})} placeholder="Next shift name" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block font-medium">Occupancy</label>
                <input type="number" value={form.occupancy} onChange={e => setForm({...form, occupancy: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block font-medium">Arrivals</label>
                <input type="number" value={form.arrivals} onChange={e => setForm({...form, arrivals: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block font-medium">Departures</label>
                <input type="number" value={form.departures} onChange={e => setForm({...form, departures: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} placeholder="Key updates, issues, VIP arrivals, etc." className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button>
            <button onClick={handleCreate} disabled={!form.handed_off_by || !form.received_by} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-40" style={{ backgroundColor: TEAL }}>Save Handoff</button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-[13px] text-gray-500">No handoff logs for this date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{log.shift}</span>
                  <span className="text-[13px] text-gray-500">{log.shift_date}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[13px] mb-2">
                <p><span className="text-gray-400">From:</span> <span className="font-semibold">{log.handed_off_by}</span></p>
                <p><span className="text-gray-400">To:</span> <span className="font-semibold">{log.received_by}</span></p>
                <p><span className="text-gray-400">Occupancy:</span> {log.occupancy}</p>
                <p><span className="text-gray-400">Arrivals/Deps:</span> {log.arrivals} / {log.departures}</p>
              </div>
              {log.notes && <p className="text-[12px] text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{log.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
