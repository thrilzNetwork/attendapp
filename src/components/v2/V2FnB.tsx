'use client';

/* ═══════════════════════════════════════════ components/v2/V2FnB.tsx
   Attenda V2 — F&B (module 8). NO MOCKUP EXISTS — this is the §6.1
   concept screen from the V2 build plan, approved by the owner to ship
   now. There is no backing schema yet for par levels / waste logs
   (supabase-schema.sql only has `fnb_inventory` and `meal_covers`), so —
   per plan — this screen is a visual concept only, using representative
   sample data to establish the shape (KPI strip / outlet-tabbed table /
   rail / bottom panels / Quick Actions), exactly like the static mockup
   JPGs the other six screens were traced from. Wiring it to real
   inventory/waste/PO data is a schema pass — explicitly future work, not
   part of this UI-only plan.
   ═════════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import {
  Boxes, Trash2, ClipboardList, DollarSign, PieChart, ShieldCheck,
  PackagePlus, ClipboardCheck, Send, SlidersHorizontal,
} from 'lucide-react';
import { V2KpiCard, V2Panel, V2Pill, V2ScreenHeader, V2QuickActions, v2StatusTone } from './ui';

const OUTLETS = ['Breakfast', 'Restaurant', 'Reception', 'Pantry'] as const;

const SAMPLE_INVENTORY = [
  { item: 'Whole milk (gal)', outlet: 'Breakfast', par: 12, onHand: 4, lastCounted: 'Today, 6:15 AM' },
  { item: 'Coffee beans (lb)', outlet: 'Breakfast', par: 20, onHand: 18, lastCounted: 'Today, 6:15 AM' },
  { item: 'Chicken breast (lb)', outlet: 'Restaurant', par: 40, onHand: 12, lastCounted: 'Yesterday, 4:00 PM' },
  { item: 'Red wine (btl)', outlet: 'Restaurant', par: 24, onHand: 22, lastCounted: 'Yesterday, 4:00 PM' },
  { item: 'Bottled water (case)', outlet: 'Reception', par: 10, onHand: 3, lastCounted: 'Today, 9:00 AM' },
  { item: 'Coffee pods (box)', outlet: 'Pantry', par: 15, onHand: 15, lastCounted: '2 days ago' },
] as const;

const SAMPLE_WASTE = [
  { item: 'Scrambled eggs', outlet: 'Breakfast', amount: '$18.40', reason: 'Overproduction', when: 'Today, 10:05 AM' },
  { item: 'Mixed greens', outlet: 'Restaurant', amount: '$9.20', reason: 'Spoilage', when: 'Yesterday, 5:30 PM' },
  { item: 'Pastries', outlet: 'Breakfast', amount: '$12.00', reason: 'Overproduction', when: 'Yesterday, 9:45 AM' },
] as const;

export default function V2FnB() {
  const [outlet, setOutlet] = useState<string>('All Outlets');
  const rows = outlet === 'All Outlets' ? SAMPLE_INVENTORY : SAMPLE_INVENTORY.filter(r => r.outlet === outlet);
  const belowPar = SAMPLE_INVENTORY.filter(r => r.onHand < r.par).length;
  const wasteTotal = SAMPLE_WASTE.reduce((s, w) => s + Number(w.amount.replace('$', '')), 0);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        title="F&B"
        subtitle="Inventory, par levels, waste, and brand standards across breakfast, restaurant, reception, and pantry."
        banner="This is F&B operations tracking. Purchasing happens through your vendor/purchasing platform — Attenda organizes and hands off, it never becomes the purchasing platform."
      />

      <div className="mb-4 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold" style={{ backgroundColor: '#FEF4E4', color: '#D97706' }}>
        Concept screen — sample data shown. Live inventory/waste tracking requires a schema pass (future work, out of this UI-only plan).
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        <V2KpiCard icon={Boxes} label="Items below par" value={belowPar} sub="Across all outlets" subTone={belowPar ? 'red' : 'green'} />
        <V2KpiCard icon={Trash2} label="Waste logged (MTD)" value={`$${wasteTotal.toFixed(2)}`} sub="Sample data" subTone="amber" />
        <V2KpiCard icon={ClipboardList} label="Open orders" value={2} sub="Pending handoff" />
        <V2KpiCard icon={DollarSign} label="Labor cost %" value="—" sub="No wage data available" />
        <V2KpiCard icon={PieChart} label="Budget utilization" value="—" sub="No budget data available" />
        <V2KpiCard icon={ShieldCheck} label="Brand standard compliance" value="—" sub="No checklist data yet" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 flex flex-col gap-4">
          <V2Panel title="Inventory / Par Levels">
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {(['All Outlets', ...OUTLETS] as const).map(o => (
                <button key={o} onClick={() => setOutlet(o)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={outlet === o ? { backgroundColor: '#14A8A0', color: 'white' } : { backgroundColor: '#EEF1F4', color: '#5B6B7E' }}>
                  {o}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left" style={{ color: '#5B6B7E' }}>
                    <th className="font-semibold pb-2 pr-3">Item</th>
                    <th className="font-semibold pb-2 pr-3">Outlet</th>
                    <th className="font-semibold pb-2 pr-3 text-right">Par</th>
                    <th className="font-semibold pb-2 pr-3 text-right">On hand</th>
                    <th className="font-semibold pb-2 pr-3">Status</th>
                    <th className="font-semibold pb-2">Last counted</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const status = r.onHand < r.par * 0.5 ? 'Below par' : r.onHand < r.par ? 'Watch' : 'At par';
                    return (
                      <tr key={r.item} className="border-t" style={{ borderColor: '#E5EAF0' }}>
                        <td className="py-2.5 pr-3 font-semibold" style={{ color: '#16233B' }}>{r.item}</td>
                        <td className="py-2.5 pr-3" style={{ color: '#5B6B7E' }}>{r.outlet}</td>
                        <td className="py-2.5 pr-3 text-right" style={{ color: '#16233B' }}>{r.par}</td>
                        <td className="py-2.5 pr-3 text-right" style={{ color: '#16233B' }}>{r.onHand}</td>
                        <td className="py-2.5 pr-3"><V2Pill label={status} tone={v2StatusTone(status)} /></td>
                        <td className="py-2.5" style={{ color: '#5B6B7E' }}>{r.lastCounted}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </V2Panel>
        </div>

        <div className="flex flex-col gap-4">
          <V2Panel title="Upcoming Needs">
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {SAMPLE_INVENTORY.filter(r => r.onHand < r.par).map(r => (
                <li key={r.item} className="flex items-center justify-between gap-2">
                  <span className="truncate" style={{ color: '#16233B' }}>{r.item}</span>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-lg whitespace-nowrap" style={{ backgroundColor: '#FEF4E4', color: '#D97706' }}>
                    Reorder {r.par - r.onHand}
                  </span>
                </li>
              ))}
            </ul>
          </V2Panel>

          <V2Panel title="Waste Log">
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {SAMPLE_WASTE.map(w => (
                <li key={w.item} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate" style={{ color: '#16233B' }}>{w.item}</div>
                    <div className="text-[11px]" style={{ color: '#5B6B7E' }}>{w.outlet} · {w.reason}</div>
                  </div>
                  <span className="font-semibold whitespace-nowrap" style={{ color: '#DC2626' }}>{w.amount}</span>
                </li>
              ))}
            </ul>
          </V2Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <V2Panel title="Spend by Outlet">
          <p className="text-[13px] py-6 text-center" style={{ color: '#5B6B7E' }}>
            Spend-by-outlet tracking needs a schema pass (no `fnb_par_levels` / `fnb_waste_log` tables yet).
          </p>
        </V2Panel>

        <V2Panel title="Quick Actions">
          <V2QuickActions actions={[
            { icon: Trash2, label: 'Log Waste', caption: 'Record waste with reason code' },
            { icon: ClipboardCheck, label: 'Count Inventory', caption: 'Update on-hand counts by outlet' },
            { icon: Send, label: 'Request Reorder', caption: 'Hands off to purchasing — never executes a purchase' },
            { icon: PackagePlus, label: 'Update Par Levels', caption: 'Adjust target stock by item' },
            { icon: SlidersHorizontal, label: 'Brand Standards Checklist', caption: 'Coming soon' },
          ]} />
        </V2Panel>
      </div>
    </div>
  );
}
