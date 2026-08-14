'use client';
import { useState, useEffect } from 'react';
import { getWorkOrders, createWorkOrder, updateWorkOrder, type WorkOrder } from '@/lib/supabase';
const TEAL = '#0D9488';

export default function WorkOrdersView({ hotelId, staffName }: { hotelId: string; staffName?: string }) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ location: '', issue: '', priority: 'medium', assigned_to: '' });
  const [filter, setFilter] = useState<string>('all');

  const load = async () => setOrders(await getWorkOrders(hotelId));
  useEffect(() => { load(); }, [hotelId]);

  const save = async () => {
    if (!form.location || !form.issue) return;
    await createWorkOrder({ hotel_id: hotelId, ...form, status: 'open', created_by: staffName || 'Staff' });
    setForm({ location: '', issue: '', priority: 'medium', assigned_to: '' }); setShow(false); load();
  };

  const update = async (id: string, status: string) => {
    await updateWorkOrder(id, { status, resolved_at: status === 'resolved' ? new Date().toISOString() : undefined });
    load();
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const stats = {
    open: orders.filter(o => o.status === 'open').length,
    inProgress: orders.filter(o => o.status === 'in_progress').length,
    resolved: orders.filter(o => o.status === 'resolved').length,
    urgent: orders.filter(o => o.priority === 'urgent' && o.status !== 'resolved').length,
  };

  const priorityColor = (p: string) => p === 'urgent' ? 'bg-red-100 text-red-700' : p === 'high' ? 'bg-orange-100 text-orange-700' : p === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600';
  const statusColor = (s: string) => s === 'open' ? 'bg-blue-100 text-blue-700' : s === 'in_progress' ? 'bg-amber-100 text-amber-700' : s === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600';

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-2">
          {([['open', 'Open', stats.open], ['in_progress', 'In Progress', stats.inProgress], ['resolved', 'Resolved', stats.resolved]] as [string, string, number][]).map(([k, label, n]) => (
            <button key={k} onClick={() => setFilter(filter === k ? 'all' : k)} className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${filter === k ? 'text-white' : ''}`} style={filter === k ? { backgroundColor: TEAL } : {}}><span className={filter !== k ? statusColor(k) + ' px-2 py-0.5 rounded-full' : ''}>{label}: {n}</span></button>
          ))}
        </div>
        {stats.urgent > 0 && <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-red-100 text-red-700">⚠️ {stats.urgent} urgent</span>}
        <button onClick={() => setShow(!show)} className="text-white px-4 py-2 rounded-xl text-[13px] font-bold ml-auto" style={{ backgroundColor: TEAL }}>+ Work Order</button>
      </div>
      {show && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-[11px] text-gray-400 mb-1 block">Location *</label><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Room 204, Pool, etc" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Issue *</label><input value={form.issue} onChange={e => setForm({...form, issue: e.target.value})} placeholder="AC not cooling" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Priority</label><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
            <div><label className="text-[11px] text-gray-400 mb-1 block">Assign To</label><input value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} placeholder="Staff name" className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200" /></div>
          </div>
          <div className="flex gap-2 mt-4 justify-end"><button onClick={() => setShow(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button><button onClick={save} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold" style={{ backgroundColor: TEAL }}>Create</button></div>
        </div>
      )}
      {filtered.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><p className="text-[13px] text-gray-500">No work orders.</p></div> : (
        <div className="space-y-2">
          {filtered.map(o => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${priorityColor(o.priority)}`}>{o.priority.toUpperCase()}</span><span className="text-[13px] font-semibold">{o.location}</span></div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>{o.status.toUpperCase().replace('_',' ')}</span>
              </div>
              <p className="text-[12px] text-gray-600">{o.issue}</p>
              {o.assigned_to && <p className="text-[10px] text-gray-400 mt-1">Assigned: {o.assigned_to}</p>}
              {o.status !== 'resolved' && <div className="flex gap-1 mt-2">
                {o.status === 'open' && <button onClick={() => update(o.id, 'in_progress')} className="text-[10px] py-1 px-3 rounded-lg bg-amber-50 text-amber-600 font-semibold">Start</button>}
                <button onClick={() => update(o.id, 'resolved')} className="text-[10px] py-1 px-3 rounded-lg bg-emerald-50 text-emerald-600 font-semibold">Resolve</button>
              </div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}