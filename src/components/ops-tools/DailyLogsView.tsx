'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDailyLogs, createDailyLog, type DailyLogEntry } from '@/lib/supabase';

const TEAL = '#0D9488';
const CATEGORIES = ['General', 'Maintenance', 'Incident', 'Guest Feedback', 'Housekeeping', 'Front Desk', 'Other'];
const SHIFTS = ['AM', 'PM', 'Overnight'];

export default function DailyLogsView({ hotelId }: { hotelId: string }) {
  const today = new Date().toISOString().split('T')[0];
  const [logs, setLogs] = useState<DailyLogEntry[]>([]);
  const [date, setDate] = useState(today);
  const [form, setForm] = useState({ author: '', shift: 'AM', category: 'General', content: '' });
  const [showForm, setShowForm] = useState(false);

  const load = async () => setLogs(await getDailyLogs(hotelId, date));
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleCreate = async () => {
    if (!form.author || !form.content) return;
    await createDailyLog({ hotel_id: hotelId, log_date: date, ...form });
    setForm({ author: '', shift: 'AM', category: 'General', content: '' });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white rounded-xl border border-gray-200 px-4 py-2 text-[14px] outline-none" />
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-[13px] font-bold" style={{ backgroundColor: TEAL }}>+ New Log Entry</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
          <h3 className="text-[15px] font-bold text-gray-900 mb-3">New Log Entry</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Author</label>
              <input value={form.author} onChange={e => setForm({...form, author: e.target.value})} placeholder="Your name" className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Shift</label>
              <select value={form.shift} onChange={e => setForm({...form, shift: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none">
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block font-medium">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={4} placeholder="What happened this shift?" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 outline-none resize-none" />
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => { setShowForm(false); setForm({ author: '', shift: 'AM', category: 'General', content: '' }); }} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button>
            <button onClick={handleCreate} disabled={!form.author || !form.content} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-40" style={{ backgroundColor: TEAL }}>Save Entry</button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-[13px] text-gray-500">No log entries for this date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.filter(l => l.content).map(log => (
            <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{log.category}</span>
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{log.shift}</span>
                  <span className="text-[12px] text-gray-500">{log.author}</span>
                </div>
                <span className="text-[11px] text-gray-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{log.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
