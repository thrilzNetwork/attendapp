'use client';

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';
import { authedApiHeaders } from '@/lib/supabase';

const TEAL = '#0D9488';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'this_week' | 'this_month' | 'last_month' | 'all_time';

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
  totals: {
    gross: number;
    commission: number;
    orders: number;
  };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPeriodDates(period: Period): { fromDate: string; toDate: string } {
  const today = new Date();
  const todayStr = localDateStr(today);

  if (period === 'this_week') {
    // Monday of the current week
    const dow = today.getDay(); // 0=Sun, 1=Mon, ...
    const diff = dow === 0 ? -6 : 1 - dow; // roll back to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return { fromDate: localDateStr(monday), toDate: todayStr };
  }

  if (period === 'this_month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { fromDate: localDateStr(first), toDate: todayStr };
  }

  if (period === 'last_month') {
    const firstOfLast = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastOfLast = new Date(today.getFullYear(), today.getMonth(), 0);
    return { fromDate: localDateStr(firstOfLast), toDate: localDateStr(lastOfLast) };
  }

  // all_time
  return { fromDate: '2020-01-01', toDate: todayStr };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      style={{ borderTop: `3px solid ${color}` }}
      className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RevenueView({
  hotelId,
  isAdmin,
}: {
  hotelId: string;
  isAdmin: boolean;
}) {
  const [period, setPeriod] = useState<Period>('this_month');
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    setError(null);
    try {
      const { fromDate, toDate } = getPeriodDates(period);
      const headers = await authedApiHeaders();
      const res = await fetch('/api/revenue', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'get_revenue_summary',
          hotelId,
          fromDate: `${fromDate}T00:00:00`,
          toDate: `${toDate}T23:59:59`,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to load revenue data');
      setData(json as RevenueData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [hotelId, period]);

  useEffect(() => {
    load();
  }, [load]);

  const periods: { key: Period; label: string }[] = [
    { key: 'this_week', label: 'This Week' },
    { key: 'this_month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'all_time', label: 'All Time' },
  ];

  const hasData = data && (data.byPartner.length > 0 || data.shuttleRevenue > 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue & Commission</h1>
          <p className="text-sm text-gray-500 mt-0.5">Food, drink, and shuttle income by partner</p>
        </div>

        {/* Period picker */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={
                period === p.key
                  ? { backgroundColor: TEAL, color: '#fff' }
                  : { backgroundColor: 'transparent', color: '#6B7280' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{ borderColor: `${TEAL}40`, borderTopColor: TEAL }}
          />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Total Revenue"
              value={fmtMoney(data.totals.gross + data.shuttleRevenue)}
              icon={<DollarSign size={16} />}
              color={TEAL}
            />
            <SummaryCard
              label="Commission Earned"
              value={fmtMoney(data.totals.commission)}
              icon={<TrendingUp size={16} />}
              color="#7C3AED"
            />
            <SummaryCard
              label="Total Orders"
              value={data.totals.orders.toLocaleString()}
              icon={<ShoppingBag size={16} />}
              color="#D97706"
            />
          </div>

          {/* Empty state */}
          {!hasData && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
              <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium">No orders recorded yet for this period</p>
              <p className="text-sm mt-1">Revenue will appear here once guests place food or shuttle orders.</p>
            </div>
          )}

          {/* Partner breakdown table */}
          {data.byPartner.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Partner Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-semibold">Partner</th>
                      <th className="text-right px-5 py-3 font-semibold">Orders</th>
                      <th className="text-right px-5 py-3 font-semibold">Revenue</th>
                      <th className="text-right px-5 py-3 font-semibold">Commission</th>
                      <th className="text-right px-5 py-3 font-semibold">Payout to Vendor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.byPartner.map((row) => (
                      <tr key={row.partner_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {row.partner_name || (
                            <span className="text-gray-400 italic">Unknown Partner</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700">
                          {row.order_count.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                          {fmtMoney(row.gross_revenue)}
                        </td>
                        <td className="px-5 py-3 text-right" style={{ color: '#7C3AED', fontWeight: 600 }}>
                          {fmtMoney(row.commission_earned)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600">
                          {fmtMoney(row.vendor_payout_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                      <td className="px-5 py-3 text-gray-800">Subtotal (Food & Drink)</td>
                      <td className="px-5 py-3 text-right text-gray-800">
                        {data.totals.orders.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-900">
                        {fmtMoney(data.totals.gross)}
                      </td>
                      <td className="px-5 py-3 text-right" style={{ color: '#7C3AED' }}>
                        {fmtMoney(data.totals.commission)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700">
                        {fmtMoney(data.totals.gross - data.totals.commission)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Shuttle revenue row (shown only when > 0) */}
          {data.shuttleRevenue > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3 font-medium text-gray-900">Shuttle Revenue</td>
                      <td className="px-5 py-3 text-right text-gray-500">—</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {fmtMoney(data.shuttleRevenue)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-400">—</td>
                      <td className="px-5 py-3 text-right text-gray-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grand total when there is shuttle revenue alongside food revenue */}
          {hasData && data.shuttleRevenue > 0 && data.byPartner.length > 0 && (
            <div
              className="rounded-xl p-5 flex items-center justify-between"
              style={{ backgroundColor: TEAL + '12', border: `1.5px solid ${TEAL}30` }}
            >
              <span className="font-semibold text-gray-800">Grand Total (All Revenue)</span>
              <span className="text-xl font-bold" style={{ color: TEAL }}>
                {fmtMoney(data.totals.gross + data.shuttleRevenue)}
              </span>
            </div>
          )}
        </>
      )}

      {/* Admin note */}
      {isAdmin && (
        <p className="text-xs text-gray-400 text-center">
          Viewing as admin — hotel scope resolved server-side.
        </p>
      )}
    </div>
  );
}
