'use client';

/* ═══════════════════════════════════════════ components/v2/V2Revenue.tsx
   Attenda V2 — Revenue. EXACT implementation of mockup docs/v2-mockups/
   06-revenue.jpg (spec: docs/v2-mockups/specs/06-revenue.md).

   Layout per mockup:
     · 6 KPI cards with vs-prior-period delta lines — Attenda Revenue (MTD),
       Attenda Revenue (YTD), Transactions (MTD), Unique Users (MTD),
       Avg. Order Value, Attenda Take Rate
     · LEFT "Revenue Overview" — View by: Channel + Filters, Revenue Trend
       (MTD) chart, channel table (Channel | Revenue | % of Total |
       Transactions | Avg. Order Value | vs Last Month) + Total row
     · RIGHT "Top Products / Services (MTD)" — ranked list with % share
     · Bottom row — Revenue by Channel (ranked bars) · Recent Revenue
       Activity · Payouts & Balance · Quick Actions

   GUARDRAIL (non-negotiable): this screen speaks Attenda-channel revenue
   only — never PMS/ADR/occupancy/hotel-revenue language. The banner below
   is the guardrail statement made visible in-product.

   Data: same /api/revenue `get_revenue_summary` action the legacy
   RevenueView calls (byPartner[] + shuttleRevenue + totals), fetched for
   MTD + prior month + YTD so delta lines are real. The endpoint has no
   per-day series and no unique-users aggregate — those fields render
   exactly as designed with '—' (never fabricated, never substituted).
   ═════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import {
  DollarSign, TrendingUp, ShoppingBag, BarChart3, Percent, Users,
  Download, Settings2, Target, Percent as PercentIcon, LineChart, SlidersHorizontal,
} from 'lucide-react';
import { V2KpiCard, V2Panel, V2ScreenHeader, V2QuickActions } from './ui';
import { authedApiHeaders, supabase } from '@/lib/supabase';

interface PartnerSummary {
  partner_id: string;
  partner_name: string;
  order_count: number;
  gross_revenue: number;
  commission_earned: number;
  vendor_payout_total: number;
}
interface RevenueData {
  byPartner: PartnerSummary[];
  shuttleRevenue: number;
  totals: { gross: number; commission: number; orders: number };
}
interface ActivityRow { id: string; type: string; guest_name: string; total_amount: number | null; created_at: string; }

const INK = '#16233B', MUTED = '#5B6B7E', BORDER = '#E5EAF0';
const CHANNEL_COLORS = ['#14A8A0', '#D97706', '#2F6FEB', '#7C5CE0', '#DC2626', '#5B6B7E'];

function localDateStr(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function fetchSummary(hotelId: string, fromDate: string, toDate: string): Promise<RevenueData | null> {
  const headers = await authedApiHeaders();
  const res = await fetch('/api/revenue', {
    method: 'POST', headers,
    body: JSON.stringify({ action: 'get_revenue_summary', hotelId, fromDate: `${fromDate}T00:00:00`, toDate: `${toDate}T23:59:59` }),
  });
  const json = await res.json();
  return json.ok ? (json as RevenueData) : null;
}

function pctDelta(curr: number, prev: number): string | null {
  if (!prev) return null;
  const d = ((curr - prev) / prev) * 100;
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`;
}
function deltaLabel(curr: number, prev: number, unit: string): string {
  const d = pctDelta(curr, prev);
  return d ? `${d} ${unit}` : `— ${unit}`;
}
function ptsDelta(curr: number, prev: number): string {
  if (!prev) return '— pts vs Last Month';
  const d = curr - prev;
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)} pts vs Last Month`;
}

export default function V2Revenue({ hotelId }: { hotelId: string; isAdmin: boolean }) {
  const [mtd, setMtd] = useState<RevenueData | null>(null);
  const [lastMonth, setLastMonth] = useState<RevenueData | null>(null);
  const [ytd, setYtd] = useState<RevenueData | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [asOf, setAsOf] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hotelId) return;
    setAsOf(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  async function load() {
    setLoading(true);
    const today = new Date();
    const firstOfMonth = localDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
    const firstOfLastMonth = localDateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const lastOfLastMonth = localDateStr(new Date(today.getFullYear(), today.getMonth(), 0));
    const firstOfYear = localDateStr(new Date(today.getFullYear(), 0, 1));
    const todayStr = localDateStr(today);

    const [m, lm, y, { data: recent }] = await Promise.all([
      fetchSummary(hotelId, firstOfMonth, todayStr),
      fetchSummary(hotelId, firstOfLastMonth, lastOfLastMonth),
      fetchSummary(hotelId, firstOfYear, todayStr),
      supabase.from('requests').select('id,type,guest_name,total_amount,created_at')
        .eq('hotel_id', hotelId).not('vendor_status', 'is', null).not('total_amount', 'is', null)
        .order('created_at', { ascending: false }).limit(6),
    ]);
    setMtd(m); setLastMonth(lm); setYtd(y);
    setActivity((recent || []) as ActivityRow[]);
    setLoading(false);
  }

  const refresh = () => {
    setAsOf(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    load();
  };

  if (loading || !mtd) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
        <V2ScreenHeader title="Revenue (Attenda)" subtitle="Track Attenda revenue, channels, and growth."
          banner="This is Attenda revenue only. Not PMS, rooms, or hotel revenue." />
        <p className="text-[13px]" style={{ color: MUTED }}>Loading revenue…</p>
      </div>
    );
  }

  const mtdGross = mtd.totals.gross + mtd.shuttleRevenue;
  const lmGross = (lastMonth?.totals.gross || 0) + (lastMonth?.shuttleRevenue || 0);
  const ytdGross = (ytd?.totals.gross || 0) + (ytd?.shuttleRevenue || 0);
  const lmOrders = lastMonth?.totals.orders || 0;
  const aov = mtd.totals.orders ? mtdGross / mtd.totals.orders : 0;
  const lmAov = lmOrders ? lmGross / lmOrders : 0;
  const takeRate = mtdGross ? (mtd.totals.commission / mtdGross) * 100 : 0;
  const lmTakeRate = lmGross ? ((lastMonth?.totals.commission || 0) / lmGross) * 100 : 0;

  const channels = [
    ...mtd.byPartner.filter(p => p.gross_revenue > 0).map(p => ({ name: p.partner_name || 'Unnamed partner', revenue: p.gross_revenue, orders: p.order_count })),
    ...(mtd.shuttleRevenue > 0 ? [{ name: 'Shuttle Service', revenue: mtd.shuttleRevenue, orders: 0 }] : []),
  ].sort((a, b) => b.revenue - a.revenue);
  const maxChannel = Math.max(1, ...channels.map(c => c.revenue));

  /* vs Last Month per channel (real lookup in prior-period data) */
  const lmChannelRevenue = (name: string): number | null => {
    if (!lastMonth) return null;
    if (name === 'Shuttle Service') return lastMonth.shuttleRevenue || null;
    const p = lastMonth.byPartner.find(x => (x.partner_name || 'Unnamed partner') === name);
    return p ? (p.gross_revenue || null) : null;
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        title="Revenue (Attenda)"
        subtitle="Track Attenda revenue, channels, and growth."
        banner="This is Attenda revenue only. Not PMS, rooms, or hotel revenue."
        dataAsOf={asOf}
        onRefresh={refresh}
        right={
          <button className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-xl border hover:opacity-80"
            style={{ borderColor: BORDER, color: INK }} title="Coming soon">
            <Settings2 size={13} /> Customize Dashboard
          </button>
        }
      />

      {/* ── KPI row — 6 cards with delta lines, exactly as mockup ───────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <V2KpiCard icon={DollarSign} label="Attenda Revenue (MTD)" value={`$${mtdGross.toFixed(2)}`}
          sub={deltaLabel(mtdGross, lmGross, 'vs Last Month')}
          subTone={mtdGross >= lmGross ? 'green' : 'red'} />
        <V2KpiCard icon={BarChart3} label="Attenda Revenue (YTD)" value={`$${ytdGross.toFixed(2)}`}
          sub="— vs Last Year" subTone="gray" />
        <V2KpiCard icon={ShoppingBag} label="Transactions (MTD)" value={mtd.totals.orders}
          sub={deltaLabel(mtd.totals.orders, lmOrders, 'vs Last Month')}
          subTone={mtd.totals.orders >= lmOrders ? 'green' : 'red'} />
        <V2KpiCard icon={Users} label="Unique Users (MTD)" value="—"
          sub="— vs Last Month" subTone="gray" />
        <V2KpiCard icon={TrendingUp} label="Avg. Order Value" value={`$${aov.toFixed(2)}`}
          sub={deltaLabel(aov, lmAov, 'vs Last Month')}
          subTone={aov >= lmAov ? 'green' : 'red'} />
        <V2KpiCard icon={Percent} label="Attenda Take Rate" value={`${takeRate.toFixed(1)}%`}
          sub={ptsDelta(takeRate, lmTakeRate)}
          subTone={takeRate >= lmTakeRate ? 'green' : 'red'} />
      </div>

      {/* ── Main grid: overview left · top products right ───────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 flex flex-col gap-4">
          <V2Panel title="Revenue Overview"
            action={
              <div className="flex gap-1.5">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border" style={{ borderColor: BORDER, color: MUTED }}>
                  View by: Channel
                </span>
                <button className="flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-lg border hover:opacity-80"
                  style={{ borderColor: BORDER, color: INK }}>
                  <SlidersHorizontal size={12} /> Filters
                </button>
              </div>
            }
          >
            {/* Revenue Trend (MTD) — panel as designed; per-day series not tracked yet */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold" style={{ color: INK }}>Revenue Trend (MTD)</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: '#EEF1F4', color: MUTED }}>Daily</span>
              </div>
              <div className="rounded-xl border border-dashed py-6 text-center" style={{ borderColor: BORDER }}>
                <p className="text-[13px] font-semibold" style={{ color: INK }}>Trend chart appears once per-day revenue is tracked</p>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>This Month vs Last Month · daily series</p>
              </div>
              <p className="text-[12px] font-bold mt-2" style={{ color: '#0E7C74' }}>View Trend Report →</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="font-semibold pb-2 pr-3">Channel</th>
                    <th className="font-semibold pb-2 pr-3 text-right">Revenue</th>
                    <th className="font-semibold pb-2 pr-3 text-right">% of Total</th>
                    <th className="font-semibold pb-2 pr-3 text-right">Transactions</th>
                    <th className="font-semibold pb-2 pr-3 text-right">Avg. Order Value</th>
                    <th className="font-semibold pb-2 text-right">vs Last Month</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map(c => {
                    const prev = lmChannelRevenue(c.name);
                    const d = prev != null ? pctDelta(c.revenue, prev) : null;
                    return (
                      <tr key={c.name} className="border-t" style={{ borderColor: BORDER }}>
                        <td className="py-2.5 pr-3 font-semibold" style={{ color: INK }}>{c.name}</td>
                        <td className="py-2.5 pr-3 text-right" style={{ color: INK }}>${c.revenue.toFixed(2)}</td>
                        <td className="py-2.5 pr-3 text-right" style={{ color: MUTED }}>{mtdGross ? ((c.revenue / mtdGross) * 100).toFixed(1) : '0.0'}%</td>
                        <td className="py-2.5 pr-3 text-right" style={{ color: MUTED }}>{c.orders || '—'}</td>
                        <td className="py-2.5 pr-3 text-right" style={{ color: MUTED }}>{c.orders ? `$${(c.revenue / c.orders).toFixed(2)}` : '—'}</td>
                        <td className="py-2.5 text-right font-semibold" style={{ color: d ? (d.startsWith('+') ? '#16A34A' : '#DC2626') : MUTED }}>{d || '—'}</td>
                      </tr>
                    );
                  })}
                  {channels.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center" style={{ color: MUTED }}>No Attenda-channel revenue recorded this month.</td></tr>
                  )}
                </tbody>
                {channels.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 font-bold" style={{ borderColor: BORDER }}>
                      <td className="py-2.5 pr-3" style={{ color: INK }}>Total Attenda Revenue</td>
                      <td className="py-2.5 pr-3 text-right" style={{ color: INK }}>${mtdGross.toFixed(2)}</td>
                      <td className="py-2.5 pr-3 text-right" style={{ color: INK }}>100%</td>
                      <td className="py-2.5 pr-3 text-right" style={{ color: INK }}>{mtd.totals.orders}</td>
                      <td className="py-2.5 pr-3 text-right" style={{ color: INK }}>${aov.toFixed(2)}</td>
                      <td className="py-2.5 text-right" style={{ color: INK }}>{pctDelta(mtdGross, lmGross) || '—'}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="text-[12px] font-bold mt-3" style={{ color: '#0E7C74' }}>View Full Revenue Report →</p>
          </V2Panel>
        </div>

        <div className="flex flex-col gap-4">
          <V2Panel title="Top Products / Services (MTD)" action={
            <span className="text-[11px] font-semibold" style={{ color: MUTED }}>View all</span>
          }>
            {channels.length === 0 ? (
              <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>No transactions yet this month.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {channels.slice(0, 5).map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2.5 text-[13px]">
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ backgroundColor: '#E4F5F3', color: '#0E7C74' }}>{i + 1}</span>
                    <span className="flex-1 truncate" style={{ color: INK }}>{c.name}</span>
                    <span className="font-semibold whitespace-nowrap" style={{ color: INK }}>${c.revenue.toFixed(2)}</span>
                    <span className="text-[11px] whitespace-nowrap" style={{ color: MUTED }}>
                      {mtdGross ? `${((c.revenue / mtdGross) * 100).toFixed(1)}%` : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </V2Panel>
        </div>
      </div>

      {/* ── Bottom row: channels bars · activity · payouts · quick actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4 items-start">
        <V2Panel title="Revenue by Channel (MTD)" action={
          <span className="text-[11px] font-semibold" style={{ color: MUTED }}>View all</span>
        }>
          {channels.length === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>No channel activity yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {channels.slice(0, 5).map((c, i) => (
                <li key={c.name}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span style={{ color: INK }}>{c.name}</span>
                    <span className="font-semibold" style={{ color: INK }}>
                      ${c.revenue.toFixed(2)} · {mtdGross ? `${((c.revenue / mtdGross) * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: '#EEF1F4' }}>
                    <div className="h-2 rounded-full" style={{ width: `${(c.revenue / maxChannel) * 100}%`, backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[12px] font-bold mt-3" style={{ color: '#0E7C74' }}>View Channel Report →</p>
        </V2Panel>

        <V2Panel title="Recent Revenue Activity" action={
          <span className="text-[11px] font-semibold" style={{ color: MUTED }}>View all</span>
        }>
          {activity.length === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>No recent transactions.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {activity.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold" style={{ color: INK }}>{a.type}</span>
                    <span className="block text-[11px]" style={{ color: MUTED }}>
                      {new Date(a.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </span>
                  <span className="font-semibold whitespace-nowrap" style={{ color: INK }}>
                    +${(a.total_amount || 0).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[12px] font-bold mt-3" style={{ color: '#0E7C74' }}>View All Activity →</p>
        </V2Panel>

        <V2Panel title="Payouts & Balance" action={
          <span className="text-[11px] font-semibold" style={{ color: MUTED }}>View all</span>
        }>
          <ul className="flex flex-col gap-2.5 text-[13px]">
            <li className="flex justify-between gap-2">
              <span style={{ color: MUTED }}>Current Balance</span>
              <span className="text-right"><span className="font-bold" style={{ color: INK }}>—</span><span className="block text-[11px]" style={{ color: MUTED }}>Available to payout</span></span>
            </li>
            <li className="flex justify-between"><span style={{ color: MUTED }}>Total Revenue</span><span className="font-bold" style={{ color: INK }}>${mtdGross.toFixed(2)}</span></li>
            <li className="flex justify-between gap-2">
              <span style={{ color: MUTED }}>Next Payout</span>
              <span className="text-right"><span className="font-bold" style={{ color: INK }}>—</span><span className="block text-[11px]" style={{ color: MUTED }}>estimated amount</span></span>
            </li>
          </ul>
          <p className="text-[12px] font-bold mt-3" style={{ color: '#0E7C74' }}>View Payouts →</p>
        </V2Panel>

        <V2Panel title="Quick Actions">
          <V2QuickActions actions={[
            { icon: LineChart, label: 'View Revenue Dashboard', caption: 'Explore detailed revenue insights' },
            { icon: Download, label: 'Export Revenue Report', caption: 'Download MTD revenue data' },
            { icon: Settings2, label: 'Manage Payout Settings', caption: 'Update payout method & schedule' },
            { icon: Target, label: 'Revenue Goals', caption: 'Set and track revenue targets' },
            { icon: PercentIcon, label: 'Pricing & Commissions', caption: 'Manage rates and take rates' },
          ]} />
        </V2Panel>
      </div>
    </div>
  );
}