'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wrench, CalendarClock, Timer, Plus, RefreshCw, Check } from 'lucide-react';
import { getWorkOrders, createWorkOrder, updateWorkOrder, getMaintenancePms, createMaintenancePm, completeMaintenancePm, getMaintenanceLaborLogs, createMaintenanceLaborLog } from '@/lib/supabase';

const TEAL = '#158A7C';

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Wo { id: string; location: string; issue: string; priority: string; status: string; assigned_to?: string; created_at?: string }

export default function MaintenanceView({
  hotelId, hotelName, staffName, isAdmin,
}: { hotelId: string; hotelName: string; staffName: string; isAdmin: boolean }) {
  const [wos, setWos] = useState<Wo[]>([]);
  const [pms, setPms] = useState<{ id: string; title: string; frequency_days: number; last_completed_date?: string | null; assigned_to?: string }[]>([]);
  const [labor, setLabor] = useState<{ staff_name: string; task: string; minutes: number }[]>([]);
  const [loading, setLoading] = useState(true);
  // work order form
  const [woLoc, setWoLoc] = useState('');
  const [woIssue, setWoIssue] = useState('');
  const [woPri, setWoPri] = useState('medium');
  // PM form
  const [pmTitle, setPmTitle] = useState('');
  const [pmFreq, setPmFreq] = useState('30');
  // labor form
  const [lbTask, setLbTask] = useState('');
  const [lbMinutes, setLbMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [w, p, l] = await Promise.all([
      getWorkOrders(hotelId),
      getMaintenancePms(hotelId),
      getMaintenanceLaborLogs(hotelId, localDateStr()),
    ]);
    const sorted = ((w || []) as Wo[]).sort((a, b) => (a.status === 'resolved' ? 1 : 0) - (b.status === 'resolved' ? 1 : 0));
    setWos(sorted);
    setPms(p || []);
    setLabor(l || []);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const open = wos.filter(w => w.status !== 'resolved');
  const minutesToday = labor.reduce((s, l) => s + l.minutes, 0);

  const addWo = async () => {
    if (!woIssue.trim()) return;
    setSaving(true);
    await createWorkOrder({
      hotel_id: hotelId, location: woLoc.trim() || 'General',
      issue: woIssue.trim(), priority: woPri, status: 'open', created_by: staffName || undefined,
    });
    setWoLoc(''); setWoIssue(''); setWoPri('medium');
    setSaving(false);
    load();
  };

  const resolveWo = async (id: string) => {
    setWos(prev => prev.map(w => (w.id === id ? { ...w, status: 'resolved' } : w)));
    await updateWorkOrder(id, { status: 'resolved', resolved_at: new Date().toISOString() });
    load();
  };

  const addPm = async () => {
    if (!pmTitle.trim()) return;
    setSaving(true);
    await createMaintenancePm(hotelId, pmTitle.trim(), Number(pmFreq) || 30);
    setPmTitle('');
    setSaving(false);
    load();
  };

  const completePm = async (id: string) => {
    await completeMaintenancePm(id);
    load();
  };

  const daysSince = (d?: string | null): number | null => {
    if (!d) return null;
    const diff = Math.floor((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000);
    return diff;
  };

  const addLabor = async () => {
    const mm = Number(lbMinutes);
    if (!lbTask.trim() || isNaN(mm)) return;
    setSaving(true);
    await createMaintenanceLaborLog(hotelId, staffName || 'Staff', lbTask.trim(), mm);
    setLbTask(''); setLbMinutes('');
    setSaving(false);
    load();
  };

  const sec = 'bg-white border border-gray-200 rounded-2xl p-4';
  const priStyle: Record<string, string> = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-orange-50 text-orange-700 border-orange-200',
    low: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Maintenance</h1>
          <p className="text-[13px] text-gray-500">{hotelName} · work orders, PMs & labor</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-xl px-3 py-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Labor + open count strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className={sec}><div className="text-[20px] font-extrabold text-gray-900">{open.length}</div><div className="text-[10px] font-bold text-gray-500">OPEN WORK ORDERS</div></div>
        <div className={sec}><div className="text-[20px] font-extrabold text-gray-900">{pms.length}</div><div className="text-[10px] font-bold text-gray-500">ACTIVE PMs</div></div>
        <div className={sec}><div className="text-[20px] font-extrabold text-gray-900">{pms.filter(p => daysSince(p.last_completed_date) !== null && daysSince(p.last_completed_date)! >= p.frequency_days).length + pms.filter(p => p.last_completed_date == null).length}</div><div className="text-[10px] font-bold text-gray-500">PMs DUE</div></div>
        <div className={sec}><div className="text-[20px] font-extrabold" style={{ color: TEAL }}>{minutesToday}</div><div className="text-[10px] font-bold text-gray-500">MAINT MINUTES TODAY</div></div>
      </div>

      {/* Work orders */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center gap-1.5 mb-3 text-[13px] font-extrabold text-gray-900"><Wrench size={14} style={{ color: TEAL }} /> Work Orders</div>
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-2 mb-3 bg-gray-50 rounded-xl p-3">
            <label className="text-[12px] font-medium text-gray-600">Location
              <input value={woLoc} onChange={e => setWoLoc(e.target.value)} placeholder="Room 204" className="block w-28 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Issue
              <input value={woIssue} onChange={e => setWoIssue(e.target.value)} placeholder="AC not cooling" onKeyDown={e => { if (e.key === 'Enter') addWo(); }} className="block w-56 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Priority
              <select value={woPri} onChange={e => setWoPri(e.target.value)} className="block mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold bg-white focus:outline-none focus:ring-teal-500">
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </label>
            <button onClick={addWo} disabled={saving} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
              <span className="flex items-center gap-1"><Plus size={13} /> Add</span>
            </button>
          </div>
        )}
        {wos.length === 0 ? (
          <p className="text-[13px] text-gray-400 font-medium py-1">No work orders</p>
        ) : (
          <div className="space-y-1">
            {wos.map(w => (
              <div key={w.id} className={`flex items-center justify-between rounded-xl px-3 py-2 border ${w.status === 'resolved' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-gray-900 truncate">{w.location} — {w.issue}</div>
                  <div className="text-[11px] text-gray-400 font-medium">{w.assigned_to ? `Assigned: ${w.assigned_to} · ` : ''}{new Date(w.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold uppercase rounded-lg px-1.5 py-0.5 border ${priStyle[w.priority] || priStyle.low}`}>{w.priority}</span>
                  {w.status === 'resolved' ? (
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 rounded-lg px-1.5 py-0.5">RESOLVED</span>
                  ) : (
                    <button onClick={() => resolveWo(w.id)} className="flex items-center gap-1 text-[11px] font-bold text-white rounded-lg px-2 py-1" style={{ background: TEAL }}><Check size={12} /> Resolve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PMs */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center gap-1.5 mb-3 text-[13px] font-extrabold text-gray-900"><CalendarClock size={14} style={{ color: TEAL }} /> Preventive Maintenance</div>
        {isAdmin && (
          <div className="flex flex-wrap items-end gap-2 mb-3 bg-gray-50 rounded-xl p-3">
            <label className="text-[12px] font-medium text-gray-600">PM task
              <input value={pmTitle} onChange={e => setPmTitle(e.target.value)} placeholder="HVAC filter change" onKeyDown={e => { if (e.key === 'Enter') addPm(); }} className="block w-56 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Every (days)
              <input value={pmFreq} onChange={e => setPmFreq(e.target.value)} inputMode="numeric" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <button onClick={addPm} disabled={saving} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
              <span className="flex items-center gap-1"><Plus size={13} /> Add PM</span>
            </button>
          </div>
        )}
        {pms.length === 0 ? (
          <p className="text-[13px] text-gray-400 font-medium py-1">No PM schedules yet — add recurring tasks above</p>
        ) : (
          <div className="space-y-1">
            {pms.map(p => {
              const ds = daysSince(p.last_completed_date);
              const due = ds === null || ds >= p.frequency_days;
              return (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-gray-900 truncate">{p.title}</div>
                    <div className="text-[11px] text-gray-400 font-medium">Every {p.frequency_days} days{p.last_completed_date ? ` · last ${p.last_completed_date}` : ' · never completed'}{ds !== null ? ` (${ds}d ago)` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold uppercase rounded-lg px-1.5 py-0.5 ${due ? 'text-orange-600 bg-orange-50' : 'text-teal-700 bg-teal-50'}`}>{due ? 'DUE' : 'OK'}</span>
                    {due && <button onClick={() => completePm(p.id)} className="text-[11px] font-bold text-white rounded-lg px-2 py-1" style={{ background: TEAL }}><span className="flex items-center gap-1"><Check size={12} /> Done</span></button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Labor */}
      <div className={sec}>
        <div className="flex items-center gap-1.5 mb-3 text-[13px] font-extrabold text-gray-900"><Timer size={14} style={{ color: TEAL }} /> Maintenance Labor <span className="text-[11px] font-medium text-gray-400">— today ({minutesToday} min)</span></div>
        <div className="flex flex-wrap items-end gap-2 mb-2">
          <label className="text-[12px] font-medium text-gray-600">Task
            <input value={lbTask} onChange={e => setLbTask(e.target.value)} placeholder="Replaced AC filter R204" className="block w-56 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
          </label>
          <label className="text-[12px] font-medium text-gray-600">Minutes
            <input value={lbMinutes} onChange={e => setLbMinutes(e.target.value)} inputMode="numeric" placeholder="30" className="block w-20 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
          </label>
          <button onClick={addLabor} disabled={saving} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
            <span className="flex items-center gap-1"><Plus size={13} /> Log</span>
          </button>
        </div>
        {labor.length > 0 && (
          <div className="space-y-1">
            {labor.map((l, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 text-[13px]">
                <span className="font-bold text-gray-800 truncate">{l.task}</span>
                <span className="text-[11px] text-gray-400 font-medium">{l.staff_name} · {l.minutes} min</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
