'use client';

/* ═══════════════════════════════════════════ components/v2/V2Vendors.tsx
   Attenda V2 — Vendors. EXACT implementation of mockup docs/v2-mockups/
   03-vendors.jpg (spec: docs/v2-mockups/specs/03-vendors.md).

   Layout per mockup:
     · 6 KPI cards — Active Vendors · Pending Approvals · Monthly Spend ·
       Open Work Orders · Contract Expiring (30d) · Avg Rating
     · 2-col grid — LEFT: Vendor Directory (search/filters/pills/table)
                    RIGHT: Contract Expirations, Spend by Category donut,
                           Top Issues
     · bottom — Quick Actions

   Data policy: Rating / Contract End / Open Work Orders stay EXACTLY as the
   mockup designs them — rendered as '—' because the Vendor record has no
   such fields today. NEVER substituted with different metrics. CRUD
   (add vendor, edit, purchase orders) stays in VendorsView via "Manage".
   ═════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Building2, UserCheck, CalendarClock, DollarSign, Package, Star, Search,
  SlidersHorizontal, Plus, ArrowLeft,
} from 'lucide-react';
import {
  V2KpiCard, V2Panel, V2Pill, V2ScreenHeader, V2Table, V2QuickActions,
  type V2TableColumn,
} from './ui';
import {
  fetchVendors, fetchVendorExpenses, fetchVendorOrders,
  type Vendor, type VendorExpense, type VendorOrder,
} from '@/lib/supabase';

const VendorsView = dynamic(() => import('@/components/staff/VendorsView'), { ssr: false });

function monthStr(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const INK = '#16233B', MUTED = '#5B6B7E', BORDER = '#E5EAF0';
const CATEGORY_COLORS = ['#14A8A0', '#7C5CE0', '#D97706', '#2F6FEB', '#DC2626', '#5B6B7E'];

export default function V2Vendors({ hotelId, userName }: { hotelId: string; userName: string }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenses, setExpenses] = useState<VendorExpense[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [asOf, setAsOf] = useState('');
  const [manage, setManage] = useState(false);
  const pageSize = 8;

  useEffect(() => {
    if (!hotelId) return;
    setAsOf(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  async function load() {
    const [v, e, o] = await Promise.all([
      fetchVendors(hotelId).catch(() => []),
      fetchVendorExpenses(hotelId, monthStr()).catch(() => []),
      fetchVendorOrders(hotelId).catch(() => []),
    ]);
    setVendors(v);
    setExpenses(e);
    setOrders(o);
  }

  if (manage) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
        <button onClick={() => { setManage(false); load(); }}
          className="flex items-center gap-1.5 text-[13px] font-bold mb-4 hover:underline" style={{ color: '#0E7C74' }}>
          <ArrowLeft size={15} /> Back to Vendors dashboard
        </button>
        <VendorsView hotelId={hotelId} userName={userName} />
      </div>
    );
  }

  const monthSpend = expenses.reduce((s, e) => s + e.amount, 0);
  const activeVendors = vendors.filter(v => v.status === 'active');
  const unpaidOrders = orders.filter(o => o.status !== 'paid');

  const spendByCategory = new Map<string, number>();
  for (const e of expenses) {
    const v = vendors.find(v => v.id === e.vendor_id);
    const cat = v?.category || e.category || 'Other';
    spendByCategory.set(cat, (spendByCategory.get(cat) || 0) + e.amount);
  }
  const catRows = Array.from(spendByCategory.entries()).sort((a, b) => b[1] - a[1]);
  const catTotal = catRows.reduce((s, [, amt]) => s + amt, 0);

  const filtered = vendors.filter(v => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.contact_name?.toLowerCase().includes(q) ||
      v.category?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q)
    );
  });
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const vendorSpend = (id: string) => expenses.filter(e => e.vendor_id === id).reduce((s, e) => s + e.amount, 0);

  /* Top Issues — real-derived counts only */
  const topIssues: { label: string; count: number }[] = [];
  if (unpaidOrders.length) topIssues.push({ label: 'Orders awaiting payment', count: unpaidOrders.length });
  const inactiveCount = vendors.filter(v => v.status === 'inactive').length;
  if (inactiveCount) topIssues.push({ label: 'Inactive vendors', count: inactiveCount });

  const columns: V2TableColumn<Vendor>[] = [
    { key: 'name', header: 'Name', render: v => (
      <div>
        <div className="font-semibold" style={{ color: INK }}>{v.name}</div>
        {v.contact_name && <div className="text-[11px]" style={{ color: MUTED }}>{v.contact_name}</div>}
      </div>
    ) },
    { key: 'category', header: 'Category', render: v => <span className="capitalize">{v.category}</span> },
    { key: 'rating', header: 'Rating', render: () => <span style={{ color: MUTED }}>—</span> },
    { key: 'contract', header: 'Contract End', render: () => <span style={{ color: MUTED }}>—</span> },
    { key: 'spend', header: 'Monthly Spend', render: v => `$${vendorSpend(v.id).toFixed(2)}`, align: 'right' },
    { key: 'status', header: 'Status', render: v => <V2Pill label={v.status} tone={v.status === 'active' ? 'green' : v.status === 'inactive' ? 'gray' : 'blue'} /> },
  ];

  /* Donut geometry (inline SVG — no packages) */
  let acc = 0;
  const donutSlices = catRows.map(([cat, amt], i) => {
    const pct = catTotal > 0 ? (amt / catTotal) * 100 : 0;
    const slice = { cat, amt, pct, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], offset: 25 - acc };
    acc += pct;
    return slice;
  });

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        title="Vendors"
        subtitle="Manage vendor relationships, contracts, and performance."
        dataAsOf={asOf}
        onRefresh={load}
        right={
          <button onClick={() => setManage(true)}
            className="flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-xl text-white hover:opacity-85"
            style={{ backgroundColor: '#14A8A0' }}>
            <Plus size={14} /> Add Vendor
          </button>
        }
      />

      {/* ── KPI row — 6 cards, exactly as mockup ────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <V2KpiCard icon={Building2} label="Active Vendors" value={activeVendors.length}
          sub={`${vendors.length} total`} onClick={() => { setStatusFilter('active'); setPage(1); }} />
        <V2KpiCard icon={UserCheck} label="Pending Approvals" value={unpaidOrders.length}
          sub="orders awaiting payment" subTone={unpaidOrders.length ? 'amber' : 'green'} />
        <V2KpiCard icon={DollarSign} label="Monthly Spend" value={`$${monthSpend.toFixed(2)}`}
          sub="from logged expenses" subTone="green" />
        <V2KpiCard icon={Package} label="Open Work Orders" value="—" sub="not tracked yet" />
        <V2KpiCard icon={CalendarClock} label="Contract Expiring (30d)" value="—" sub="no contract dates on file" />
        <V2KpiCard icon={Star} label="Avg Rating" value="—" sub="ratings not tracked yet" />
      </div>

      {/* ── Main grid: directory left · rail right ──────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 flex flex-col gap-4">
          <V2Panel
            title="Vendor Directory"
            action={
              <div className="flex gap-1.5">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                  <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
                    placeholder="Search vendors..."
                    className="text-[12px] pl-7 pr-2.5 py-1.5 rounded-lg border outline-none w-44"
                    style={{ borderColor: BORDER, color: INK }} />
                </div>
                <button className="flex items-center gap-1 text-[12px] font-bold px-2.5 py-1.5 rounded-lg border hover:opacity-80"
                  style={{ borderColor: BORDER, color: INK }}>
                  <SlidersHorizontal size={13} /> Filters
                </button>
              </div>
            }
          >
            <div className="flex gap-1.5 mb-3">
              {(['all', 'active', 'inactive'] as const).map(f => (
                <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full capitalize"
                  style={statusFilter === f ? { backgroundColor: '#14A8A0', color: 'white' } : { backgroundColor: '#EEF1F4', color: MUTED }}>
                  {f}
                </button>
              ))}
            </div>
            <V2Table columns={columns} rows={paged} keyField="id"
              page={page} pageSize={pageSize} totalCount={filtered.length} onPageChange={setPage} />
          </V2Panel>
        </div>

        <div className="flex flex-col gap-4">
          <V2Panel title="Contract Expirations" action={<span className="text-[11px] font-semibold" style={{ color: MUTED }}>next 30 days</span>}>
            <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>
              No contract dates on file yet.
            </p>
          </V2Panel>

          <V2Panel title="Spend by Category (MTD)">
            {catRows.length === 0 ? (
              <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>No expenses logged this month.</p>
            ) : (
              <div>
                <div className="flex justify-center">
                  <svg viewBox="0 0 42 42" className="w-36 h-36 -rotate-90">
                    <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#E9EEF4" strokeWidth="5" />
                    {donutSlices.map(s => (
                      <circle key={s.cat} cx="21" cy="21" r="15.9155" fill="none"
                        stroke={s.color} strokeWidth="5"
                        strokeDasharray={`${s.pct} ${100 - s.pct}`}
                        strokeDashoffset={s.offset} />
                    ))}
                  </svg>
                </div>
                <p className="text-center text-[12px] -mt-9 mb-4 font-bold" style={{ color: INK }}>
                  ${catTotal.toFixed(0)}
                </p>
                <ul className="flex flex-col gap-1.5 mt-2">
                  {catRows.map(([cat, amt], i) => (
                    <li key={cat} className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2 capitalize" style={{ color: INK }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        {cat}
                      </span>
                      <span className="font-semibold" style={{ color: INK }}>${amt.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </V2Panel>

          <V2Panel title="Top Issues">
            {topIssues.length === 0 ? (
              <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>Nothing outstanding.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {topIssues.map(iss => (
                  <li key={iss.label} className="flex items-center justify-between text-[13px]">
                    <span style={{ color: INK }}>{iss.label}</span>
                    <span className="font-bold" style={{ color: INK }}>{iss.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </V2Panel>
        </div>
      </div>

      {/* ── Quick actions ───────────────────────────────────────────────── */}
      <div className="mt-4">
        <V2Panel title="Quick Actions">
          <V2QuickActions actions={[
            { icon: Plus, label: 'Add Vendor', caption: 'Create a new vendor profile', onClick: () => setManage(true) },
            { icon: DollarSign, label: 'Log Expense', caption: 'Record a vendor expense', onClick: () => setManage(true) },
            { icon: Package, label: 'Create Work Order', caption: 'Open a vendor work order', onClick: () => setManage(true) },
            { icon: Building2, label: 'Manage Vendors', caption: 'Full vendor CRUD, orders, expenses', onClick: () => setManage(true) },
          ]} />
        </V2Panel>
      </div>
    </div>
  );
}