'use client';

/* ═════════════════════════════════════════════ components/v2/V2Maintenance.tsx
   Attenda V2 — Maintenance. Follows the established V2 screen pattern
   (see V2Vendors.tsx). Data: work_orders via getWorkOrders /
   createWorkOrder / updateWorkOrder. Real rows only — no fabricated KPIs.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import {
  Wrench, AlertTriangle, CheckCircle2, CalendarClock, Timer, Building2,
  Search, Plus, Play, Check, Filter,
} from 'lucide-react';
import {
  V2KpiCard, V2Panel, V2Pill, V2ScreenHeader, V2Table, V2QuickActions,
  v2StatusTone, type V2TableColumn,
} from './ui';
import {
  getWorkOrders, createWorkOrder, updateWorkOrder, fetchVendors,
  type WorkOrder, type Vendor,
} from '@/lib/supabase';

const INK = '#16233B', MUTED = '#5B6B7E', BORDER = '#E5EAF0';
const PAGE_SIZE = 8;

export default function V2Maintenance({ hotelId, userName, isAdmin }: { hotelId: string; userName?: string; isAdmin?: boolean }) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [asOf, setAsOf] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ issue: '', location: '', priority: 'medium', assigned_to: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [w, v] = await Promise.all([getWorkOrders(hotelId), fetchVendors(hotelId).catch(() => [] as Vendor[])]);
      setOrders(w); setVendors(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load work orders');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!hotelId) return;
    setAsOf(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  async function setStatus(o: WorkOrder, status: 'in_progress' | 'resolved') {
    await updateWorkOrder(o.id, { status, resolved_at: status === 'resolved' ? new Date().toISOString() : undefined });
    load();
  }

  async function save() {
    if (!form.issue.trim() || !form.location.trim() || saving) return;
    setSaving(true);
    try {
      await createWorkOrder({ hotel_id: hotelId, location: form.location, issue: form.issue, priority: form.priority, status: 'open', assigned_to: form.assigned_to || undefined, created_by: userName || 'Staff' });
      setForm({ issue: '', location: '', priority: 'medium', assigned_to: '' }); setShowForm(false); load();
    } finally { setSaving(false); }
  }

  /* KPIs — computed from real rows only */
  const open = orders.filter(o => o.status === 'open');
  const openUnresolved = orders.filter(o => o.status !== 'resolved');
  const criticalOpen = openUnresolved.filter(o => o.priority === 'high' || o.priority === 'urgent');
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const completed7d = orders.filter(o => o.status === 'resolved' && o.resolved_at ? new Date(o.resolved_at).getTime() >= sevenDaysAgo : false);
  const resolvedWithDates = orders.filter(o => o.status === 'resolved' && o.resolved_at);
  const avgResolutionDays = resolvedWithDates.length
    ? resolvedWithDates.reduce((s, o) => s + (new Date(o.resolved_at!).getTime() - new Date(o.created_at).getTime()) / 86400000, 0) / resolvedWithDates.length
    : 0;
  const vendorNames = new Set(vendors.map(v => v.name.toLowerCase()));
  const assignedToVendors = openUnresolved.filter(o => o.assigned_to && vendorNames.has(o.assigned_to.toLowerCase())).length;
  const pmDue = openUnresolved.filter(o => /pm|preventive/i.test(o.issue) && o.created_at ? new Date(o.created_at).getTime() <= sevenDaysAgo : false).length;

  /* Critical & Overdue rail: high/urgent open, or unresolved older than 7d */
  const criticalOverdue = openUnresolved.filter(o =>
    o.priority === 'urgent' || o.priority === 'high' || new Date(o.created_at).getTime() <= sevenDaysAgo);
  const recentlyCompleted = orders.filter(o => o.status === 'resolved').slice(0, 5);

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (criticalOnly && !(o.priority === 'high' || o.priority === 'urgent') && o.status === 'resolved') return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return o.issue?.toLowerCase().includes(q) || o.location?.toLowerCase().includes(q) || o.assigned_to?.toLowerCase().includes(q);
  });
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const columns: V2TableColumn<WorkOrder>[] = [
    { key: 'issue', header: 'Issue', render: o => (
      <div className="max-w-[260px]">
        <div className="font-semibold truncate" style={{ color: INK }}>{o.issue}</div>
        <div className="text-[11px]" style={{ color: MUTED }}>{o.location}</div>
      </div>
    ) },
    { key: 'priority', header: 'Priority', render: o => <V2Pill label={o.priority} tone={o.priority === 'urgent' || o.priority === 'high' ? 'red' : o.priority === 'medium' ? 'amber' : 'gray'} /> },
    { key: 'status', header: 'Status', render: o => <V2Pill label={o.status.replace('_', ' ')} tone={v2StatusTone(o.status === 'resolved' ? 'done' : o.status === 'in_progress' ? 'in-progress' : o.status)} /> },
    { key: 'assigned', header: 'Assigned To', render: o => <span style={{ color: o.assigned_to ? INK : MUTED }}>{o.assigned_to || '—'}</span> },
    { key: 'created', header: 'Created', render: o => <span style={{ color: MUTED }}>{fmt(o.created_at)}</span> },
    { key: 'actions', header: '', align: 'right', render: o => (isAdmin && o.status !== 'resolved') ? (
      <div className="flex gap-1.5 justify-end">
        {o.status === 'open' && (
          <button onClick={() => setStatus(o, 'in_progress')} className="text-[11px] font-bold px-2.5 py-1 rounded-lg border hover:bg-gray-50 flex items-center gap-1" style={{ borderColor: BORDER, color: INK }}>
            <Play size={11} /> Start
          </button>
        )}
        <button onClick={() => setStatus(o, 'resolved')} className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white hover:opacity-85 flex items-center gap-1" style={{ backgroundColor: '#14A8A0' }}>
          <Check size={11} /> Done
        </button>
      </div>
    ) : null },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        title="Maintenance"
        banner="Protect the asset — work orders, preventive maintenance, and vendor dependency in one place."
        dataAsOf={asOf}
        onRefresh={load}
        right={isAdmin ? (
          <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-xl text-white hover:opacity-85" style={{ backgroundColor: '#14A8A0' }}>
            <Plus size={14} /> New Work Order
          </button>
        ) : undefined}
      />

      {error && (
        <div className="mb-5 bg-white rounded-2xl border p-5 text-center" style={{ borderColor: BORDER }}>
          <p className="text-[13px] font-semibold mb-3" style={{ color: '#DC2626' }}>⚠ {error}</p>
          <button onClick={load} className="text-[12px] font-bold px-4 py-2 rounded-xl text-white" style={{ backgroundColor: '#14A8A0' }}>Retry</button>
        </div>
      )}

      {!error && (
        <>
          {showForm && isAdmin && (
            <div className="mb-5 bg-white rounded-2xl border p-4" style={{ borderColor: BORDER }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Issue *</label>
                  <input value={form.issue} onChange={e => setForm({ ...form, issue: e.target.value })} placeholder="AC not cooling" className="w-full rounded-xl px-3 py-2 text-[13px] border outline-none" style={{ borderColor: BORDER, color: INK }} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Location *</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Room 204, Pool, etc" className="w-full rounded-xl px-3 py-2 text-[13px] border outline-none" style={{ borderColor: BORDER, color: INK }} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full rounded-xl px-3 py-2 text-[13px] border outline-none" style={{ borderColor: BORDER, color: INK }}>
                    <option value="low">Low</option><option value="medium">Medium</option>
                    <option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Assign To</label>
                  <input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Staff or vendor name" className="w-full rounded-xl px-3 py-2 text-[13px] border outline-none" style={{ borderColor: BORDER, color: INK }} />
                </div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ backgroundColor: '#EEF1F4', color: MUTED }}>Cancel</button>
                <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold hover:opacity-85 disabled:opacity-50" style={{ backgroundColor: '#14A8A0' }}>
                  {saving ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          )}

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
            <V2KpiCard icon={Wrench} label="Open Work Orders" value={open.length} sub={`${orders.length} total`} onClick={() => { setStatusFilter('open'); setPage(1); }} />
            <V2KpiCard icon={AlertTriangle} label="Critical / Emergency" value={criticalOpen.length} sub="high priority, unresolved" subTone={criticalOpen.length ? 'red' : 'green'} onClick={() => { setCriticalOnly(true); setPage(1); }} />
            <V2KpiCard icon={CheckCircle2} label="Completed (7d)" value={completed7d.length} sub="resolved this week" subTone="green" />
            <V2KpiCard icon={CalendarClock} label="PM Due" value={pmDue} sub="preventive, older than 7d" subTone={pmDue ? 'amber' : 'green'} />
            <V2KpiCard icon={Timer} label="Avg Resolution (days)" value={resolvedWithDates.length ? avgResolutionDays.toFixed(1) : '—'} sub="created → resolved" />
            <V2KpiCard icon={Building2} label="Assigned to Vendors" value={assignedToVendors} sub="unresolved, vendor-matched" />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
            <div className="xl:col-span-2 flex flex-col gap-4">
              <V2Panel
                title="Work Orders"
                action={
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                    <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search issues, locations..." className="text-[12px] pl-7 pr-2.5 py-1.5 rounded-lg border outline-none w-44" style={{ borderColor: BORDER, color: INK }} />
                  </div>
                }
              >
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {(['all', 'open', 'in_progress', 'resolved'] as const).map(f => (
                    <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }} className="text-[11px] font-bold px-2.5 py-1 rounded-full capitalize" style={statusFilter === f ? { backgroundColor: '#14A8A0', color: 'white' } : { backgroundColor: '#EEF1F4', color: MUTED }}>
                      {f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                {loading ? (
                  <p className="text-[13px] py-6 text-center" style={{ color: MUTED }}>Loading work orders…</p>
                ) : filtered.length === 0 ? (
                  <p className="text-[13px] py-6 text-center" style={{ color: MUTED }}>
                    {orders.length === 0 ? 'No work orders yet — create the first one.' : 'No work orders match the current filters.'}
                  </p>
                ) : (
                  <V2Table columns={columns} rows={paged} keyField="id" page={page} pageSize={PAGE_SIZE} totalCount={filtered.length} onPageChange={setPage} />
                )}
              </V2Panel>
            </div>

            <div className="flex flex-col gap-4">
              <V2Panel title="Critical & Overdue" action={<span className="text-[11px] font-semibold" style={{ color: MUTED }}>unresolved</span>}>
                {criticalOverdue.length === 0 ? (
                  <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>Nothing critical or overdue.</p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {criticalOverdue.slice(0, 6).map(o => (
                      <li key={o.id} className="flex items-start justify-between gap-2 text-[12px]">
                        <div className="min-w-0">
                          <div className="font-semibold truncate" style={{ color: INK }}>{o.issue}</div>
                          <div className="text-[11px]" style={{ color: MUTED }}>{o.location} · {fmt(o.created_at)}</div>
                        </div>
                        <V2Pill label={o.priority} tone={o.priority === 'urgent' || o.priority === 'high' ? 'red' : 'amber'} />
                      </li>
                    ))}
                  </ul>
                )}
              </V2Panel>

              <V2Panel title="Recently Completed">
                {recentlyCompleted.length === 0 ? (
                  <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>No completed work orders yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {recentlyCompleted.map(o => (
                      <li key={o.id} className="flex items-start justify-between gap-2 text-[12px]">
                        <div className="min-w-0">
                          <div className="font-semibold truncate" style={{ color: INK }}>{o.issue}</div>
                          <div className="text-[11px]" style={{ color: MUTED }}>{o.resolved_at ? `Resolved ${fmt(o.resolved_at)}` : 'Resolved'}</div>
                        </div>
                        <V2Pill label="done" tone="green" />
                      </li>
                    ))}
                  </ul>
                )}
              </V2Panel>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4">
            <V2Panel title="Quick Actions">
              <V2QuickActions actions={[
                ...(isAdmin ? [{ icon: Plus, label: 'New Work Order', caption: 'Open a new maintenance work order', onClick: () => setShowForm(true) }] : []),
                { icon: Filter, label: 'Filter Critical', caption: 'Show high-priority work orders', onClick: () => { setCriticalOnly(true); setStatusFilter('all'); setPage(1); } },
              ]} />
            </V2Panel>
          </div>
        </>
      )}
    </div>
  );
}