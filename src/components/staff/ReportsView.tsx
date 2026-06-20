'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Users, ClipboardList, DollarSign, Star, TrendingUp, Printer, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { listKpiDefinitions, type KpiSubmission, type KpiDefinition, type OpRecord } from '@/lib/opsStore';

const TEAL = '#0D9488';

function localDateStr(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

function getMondayOf(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return localDateStr(d);
}

type RangePreset = 'today' | 'yesterday' | 'this_week' | 'last_7' | 'this_month' | 'custom';

function getRange(preset: RangePreset, customFrom: string, customTo: string): { from: string; to: string } {
  const today = localDateStr();
  switch (preset) {
    case 'today': return { from: today, to: today };
    case 'yesterday': return { from: addDays(today, -1), to: addDays(today, -1) };
    case 'this_week': return { from: getMondayOf(today), to: today };
    case 'last_7': return { from: addDays(today, -6), to: today };
    case 'this_month': return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'custom': return { from: customFrom, to: customTo };
  }
}

interface StaffPoints { staff_name: string; points: number; reason: string; created_at: string; }
interface BankCount { id: string; shift: string; counted_by: string; cash_total: number; count_date: string; discrepancies: string; }
interface RoomMove { id: string; guest_name: string; from_room: string; to_room: string; move_date: string; initiated_by: string; reason: string; }
interface NoShow { id: string; guest_name: string; room: string; no_show_date: string; reservation_ref: string; reason: string; }
interface RequestRow { id: string; type: string; status: string; guest_name: string; room: string; created_at: string; assigned_to?: string; total_amount?: number; }
interface TodoInstance { id: string; staff_name: string; status: string; shift_date: string; template_id: string; completed_at?: string; }
interface TemplateName { id: string; name: string; }

interface ReportData {
  kpiDefs: (OpRecord & { details: KpiDefinition })[];
  kpiSubs: (OpRecord & { details: KpiSubmission })[];
  points: StaffPoints[];
  bankCounts: BankCount[];
  roomMoves: RoomMove[];
  noShows: NoShow[];
  requests: RequestRow[];
  todos: TodoInstance[];
  templateNames: TemplateName[];
}

export default function ReportsView({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [preset, setPreset] = useState<RangePreset>('today');
  const [customFrom, setCustomFrom] = useState(localDateStr());
  const [customTo, setCustomTo] = useState(localDateStr());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('kpis');

  const range = getRange(preset, customFrom, customTo);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const [kpiDefs, allSubs, pointsRes, bankRes, movesRes, noshowsRes, reqRes, todosRes, tplRes] = await Promise.all([
        listKpiDefinitions(hotelId),
        // Fetch all submissions then filter by range client-side
        supabase.from('requests').select('*').eq('hotel_id', hotelId).eq('type', 'kpi_submission')
          .gte('created_at', `${range.from}T00:00:00`).lte('created_at', `${range.to}T23:59:59`).order('created_at', { ascending: false }),
        supabase.from('staff_points').select('staff_name, points, reason, created_at').eq('hotel_id', hotelId)
          .gte('created_at', `${range.from}T00:00:00`).lte('created_at', `${range.to}T23:59:59`).order('created_at', { ascending: false }),
        supabase.from('bank_counts').select('*').eq('hotel_id', hotelId)
          .gte('count_date', range.from).lte('count_date', range.to).order('count_date', { ascending: false }),
        supabase.from('room_moves').select('*').eq('hotel_id', hotelId)
          .gte('move_date', range.from).lte('move_date', range.to).order('move_date', { ascending: false }),
        supabase.from('no_shows').select('*').eq('hotel_id', hotelId)
          .gte('no_show_date', range.from).lte('no_show_date', range.to).order('no_show_date', { ascending: false }),
        supabase.from('requests').select('id,type,status,guest_name,room,created_at,assigned_to,total_amount').eq('hotel_id', hotelId)
          .not('type', 'in', '(kpi_submission,kpi_definition,checklist_template,checklist_completion,forecast,generated_shift,shift_submission,schedule_change_request,learning_content,hr_document,course,course_module,quiz_question,module_completion,quiz_attempt,shuttle_config,shuttle_slot,shuttle_booking,call_around_log,incident_log,kb_suggestion)')
          .gte('created_at', `${range.from}T00:00:00`).lte('created_at', `${range.to}T23:59:59`).order('created_at', { ascending: false }),
        supabase.from('position_todo_instances').select('id,staff_name,status,shift_date,template_id,completed_at').eq('hotel_id', hotelId)
          .gte('shift_date', range.from).lte('shift_date', range.to).order('shift_date', { ascending: false }),
        supabase.from('position_todo_templates').select('id,name').eq('hotel_id', hotelId).eq('is_active', true),
      ]);

      const parseSub = (row: Record<string, unknown>): OpRecord & { details: KpiSubmission } => {
        let d = row.details;
        if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = {}; } }
        return { ...(row as unknown as OpRecord), details: d as KpiSubmission };
      };

      setData({
        kpiDefs: kpiDefs as (OpRecord & { details: KpiDefinition })[],
        kpiSubs: (allSubs.data || []).map(parseSub),
        points: (pointsRes.data || []) as StaffPoints[],
        bankCounts: (bankRes.data || []) as BankCount[],
        roomMoves: (movesRes.data || []) as RoomMove[],
        noShows: (noshowsRes.data || []) as NoShow[],
        requests: (reqRes.data || []) as RequestRow[],
        todos: (todosRes.data || []) as TodoInstance[],
        templateNames: (tplRes.data || []) as TemplateName[],
      });
    } catch (e) {
      console.error('Reports load error:', e);
    }
    setLoading(false);
  }, [hotelId, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const toggle = (s: string) => setExpandedSection(prev => prev === s ? null : s);

  const awardPoints = async (staffName: string, pts: number, reason: string) => {
    await supabase.from('staff_points').insert({ hotel_id: hotelId, staff_name: staffName, points: pts, reason: 'report_award', description: reason, awarded_by: 'Admin' });
    await load();
  };

  if (!isAdmin) return <div className="p-8 text-center text-gray-400">Admin access required.</div>;

  // ── Derived summaries ────────────────────────────────────────────────────────

  const kpiByStaff: Record<string, { name: string; subs: (OpRecord & { details: KpiSubmission })[] }> = {};
  data?.kpiSubs.forEach(s => {
    const name = s.details.submitted_by || s.guest_name || 'Unknown';
    if (!kpiByStaff[name]) kpiByStaff[name] = { name, subs: [] };
    kpiByStaff[name].subs.push(s);
  });

  const pointsByStaff: Record<string, number> = {};
  data?.points.forEach(p => { pointsByStaff[p.staff_name] = (pointsByStaff[p.staff_name] || 0) + p.points; });
  const leaderboard = Object.entries(pointsByStaff).sort((a, b) => b[1] - a[1]);

  const todosByStaff: Record<string, { completed: number; total: number }> = {};
  data?.todos.forEach(t => {
    if (!todosByStaff[t.staff_name]) todosByStaff[t.staff_name] = { completed: 0, total: 0 };
    todosByStaff[t.staff_name].total++;
    if (t.status === 'completed') todosByStaff[t.staff_name].completed++;
  });

  const guestRequests = data?.requests.filter(r => !['food_order'].includes(r.type)) || [];
  const foodOrders = data?.requests.filter(r => r.type === 'food_order') || [];
  const foodRevenue = foodOrders.reduce((s, r) => s + (r.total_amount || 0), 0);

  const rangeLabel = preset === 'today' ? 'Today' : preset === 'yesterday' ? 'Yesterday'
    : preset === 'this_week' ? 'This Week' : preset === 'last_7' ? 'Last 7 Days'
    : preset === 'this_month' ? 'This Month' : `${range.from} → ${range.to}`;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto" id="reports-print-root">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Reports</h1>
          <p className="text-[13px] text-gray-500">{rangeLabel} · Property performance &amp; team activity</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-[12px] font-bold hover:bg-gray-50 transition-colors print:hidden"
        >
          <Printer size={14} /> Print / Export
        </button>
      </div>

      {/* Date Range Bar */}
      <div className="flex flex-wrap gap-2 mb-6 print:hidden">
        {(['today', 'yesterday', 'this_week', 'last_7', 'this_month', 'custom'] as RangePreset[]).map(p => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${preset === p ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
            style={preset === p ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
          >
            {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === 'this_week' ? 'This Week' : p === 'last_7' ? 'Last 7 Days' : p === 'this_month' ? 'This Month' : 'Custom'}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[12px]" />
            <span className="text-gray-400 text-[12px]">→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[12px]" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-[14px]">Loading report data…</div>
      ) : !data ? null : (
        <div className="space-y-4">

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
            <SummaryCard icon={<ClipboardList size={16} />} label="KPI Entries" value={data.kpiSubs.length} color={TEAL} />
            <SummaryCard icon={<Users size={16} />} label="Guest Requests" value={guestRequests.length} color="#6366f1" />
            <SummaryCard icon={<DollarSign size={16} />} label="Food Revenue" value={`$${foodRevenue.toFixed(2)}`} color="#f59e0b" />
            <SummaryCard icon={<Star size={16} />} label="Points Awarded" value={data.points.reduce((s, p) => s + p.points, 0)} color="#ec4899" />
          </div>

          {/* ── KPI Performance ── */}
          <Section title="KPI Performance" icon={<TrendingUp size={15} />} id="kpis" open={expandedSection === 'kpis'} onToggle={() => toggle('kpis')} count={data.kpiSubs.length}>
            {data.kpiSubs.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">No KPI submissions in this period.</p>
            ) : (
              <div className="space-y-4">
                {Object.values(kpiByStaff).map(({ name, subs }) => (
                  <div key={name}>
                    <p className="text-[12px] font-bold text-gray-700 mb-2">{name}</p>
                    <div className="divide-y divide-gray-100">
                      {subs.map(s => {
                        const def = data.kpiDefs.find(d => d.details.kpi_name === s.details.kpi_name);
                        const target = def?.details.target;
                        const pct = target ? Math.min(100, Math.round((s.details.value / target) * 100)) : null;
                        const hitTarget = pct !== null && pct >= 100;
                        return (
                          <div key={s.id} className="py-2.5 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-[13px] font-semibold text-gray-800">{s.details.kpi_name}</p>
                                {hitTarget && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✅ Target Hit</span>}
                                {pct !== null && !hitTarget && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{pct}% of target</span>}
                              </div>
                              {pct !== null && (
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: hitTarget ? '#10b981' : TEAL }} />
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[15px] font-extrabold text-gray-900">{s.details.value}{def?.details.unit === '$' ? '' : ` ${def?.details.unit || ''}`}</p>
                              {target && <p className="text-[10px] text-gray-400">target: {target}</p>}
                            </div>
                            {isAdmin && hitTarget && (
                              <button
                                onClick={() => awardPoints(name, 100, `Hit KPI target: ${s.details.kpi_name}`)}
                                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-50 text-pink-600 text-[10px] font-bold hover:bg-pink-100 transition-colors"
                                title="Award 100 points"
                              >
                                <Award size={11} /> +100
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── To-Do Completion ── */}
          <Section title="Checklist Completion" icon={<ClipboardList size={15} />} id="todos" open={expandedSection === 'todos'} onToggle={() => toggle('todos')} count={data.todos.length}>
            {data.todos.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">No checklists in this period.</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-gray-400 uppercase text-[10px] border-b border-gray-100">
                    <th className="pb-2 font-bold">Staff</th>
                    <th className="pb-2 font-bold">Checklist</th>
                    <th className="pb-2 font-bold">Date</th>
                    <th className="pb-2 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.todos.map(t => {
                    const tpl = data.templateNames.find(n => n.id === t.template_id);
                    return (
                      <tr key={t.id}>
                        <td className="py-2 font-semibold text-gray-800">{t.staff_name}</td>
                        <td className="py-2 text-gray-600">{tpl?.name || '—'}</td>
                        <td className="py-2 text-gray-400">{t.shift_date}</td>
                        <td className="py-2 text-right">
                          {t.status === 'completed'
                            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✅ Done</span>
                            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⏳ In Progress</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Section>

          {/* ── Guest Requests ── */}
          <Section title="Guest Requests" icon={<Users size={15} />} id="requests" open={expandedSection === 'requests'} onToggle={() => toggle('requests')} count={guestRequests.length}>
            {guestRequests.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">No guest requests in this period.</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-gray-400 uppercase text-[10px] border-b border-gray-100">
                    <th className="pb-2 font-bold">Guest</th>
                    <th className="pb-2 font-bold">Room</th>
                    <th className="pb-2 font-bold">Type</th>
                    <th className="pb-2 font-bold">Assigned</th>
                    <th className="pb-2 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {guestRequests.slice(0, 50).map(r => (
                    <tr key={r.id}>
                      <td className="py-2 font-semibold text-gray-800">{r.guest_name}</td>
                      <td className="py-2 text-gray-600">{r.room}</td>
                      <td className="py-2 text-gray-500">{r.type.replace(/_/g, ' ')}</td>
                      <td className="py-2 text-gray-400">{r.assigned_to || '—'}</td>
                      <td className="py-2 text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* ── Food Orders ── */}
          <Section title="Food Orders" icon={<DollarSign size={15} />} id="food" open={expandedSection === 'food'} onToggle={() => toggle('food')} count={foodOrders.length}>
            {foodOrders.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">No food orders in this period.</p>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-100">
                  <div><p className="text-[11px] text-gray-400">Orders</p><p className="text-[20px] font-extrabold text-gray-900">{foodOrders.length}</p></div>
                  <div><p className="text-[11px] text-gray-400">Revenue</p><p className="text-[20px] font-extrabold" style={{ color: TEAL }}>${foodRevenue.toFixed(2)}</p></div>
                  <div><p className="text-[11px] text-gray-400">Commission (10%)</p><p className="text-[20px] font-extrabold text-pink-600">${(foodRevenue * 0.10).toFixed(2)}</p></div>
                </div>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-gray-400 uppercase text-[10px] border-b border-gray-100">
                      <th className="pb-2 font-bold">Guest</th>
                      <th className="pb-2 font-bold">Room</th>
                      <th className="pb-2 font-bold text-right">Amount</th>
                      <th className="pb-2 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {foodOrders.slice(0, 30).map(r => (
                      <tr key={r.id}>
                        <td className="py-2 font-semibold text-gray-800">{r.guest_name}</td>
                        <td className="py-2 text-gray-600">{r.room}</td>
                        <td className="py-2 text-right font-bold text-gray-900">${(r.total_amount || 0).toFixed(2)}</td>
                        <td className="py-2 text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Section>

          {/* ── Room Moves ── */}
          {data.roomMoves.length > 0 && (
            <Section title="Room Moves" icon={<BarChart2 size={15} />} id="moves" open={expandedSection === 'moves'} onToggle={() => toggle('moves')} count={data.roomMoves.length}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-gray-400 uppercase text-[10px] border-b border-gray-100">
                    <th className="pb-2 font-bold">Guest</th>
                    <th className="pb-2 font-bold">From</th>
                    <th className="pb-2 font-bold">To</th>
                    <th className="pb-2 font-bold">By</th>
                    <th className="pb-2 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.roomMoves.map(m => (
                    <tr key={m.id}>
                      <td className="py-2 font-semibold text-gray-800">{m.guest_name}</td>
                      <td className="py-2 text-gray-600">{m.from_room}</td>
                      <td className="py-2 text-gray-600">{m.to_room}</td>
                      <td className="py-2 text-gray-400">{m.initiated_by}</td>
                      <td className="py-2 text-gray-400">{m.move_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* ── No-Shows ── */}
          {data.noShows.length > 0 && (
            <Section title="No-Shows" icon={<Users size={15} />} id="noshows" open={expandedSection === 'noshows'} onToggle={() => toggle('noshows')} count={data.noShows.length}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-gray-400 uppercase text-[10px] border-b border-gray-100">
                    <th className="pb-2 font-bold">Guest</th>
                    <th className="pb-2 font-bold">Room</th>
                    <th className="pb-2 font-bold">Reservation</th>
                    <th className="pb-2 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.noShows.map(n => (
                    <tr key={n.id}>
                      <td className="py-2 font-semibold text-gray-800">{n.guest_name}</td>
                      <td className="py-2 text-gray-600">{n.room}</td>
                      <td className="py-2 text-gray-400">{n.reservation_ref || '—'}</td>
                      <td className="py-2 text-gray-400">{n.no_show_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* ── Bank Counts ── */}
          {data.bankCounts.length > 0 && (
            <Section title="Bank / Drawer Counts" icon={<DollarSign size={15} />} id="bank" open={expandedSection === 'bank'} onToggle={() => toggle('bank')} count={data.bankCounts.length}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-gray-400 uppercase text-[10px] border-b border-gray-100">
                    <th className="pb-2 font-bold">Date</th>
                    <th className="pb-2 font-bold">Shift</th>
                    <th className="pb-2 font-bold">Counted By</th>
                    <th className="pb-2 font-bold text-right">Cash Total</th>
                    <th className="pb-2 font-bold">Discrepancies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.bankCounts.map(b => (
                    <tr key={b.id}>
                      <td className="py-2 text-gray-600">{b.count_date}</td>
                      <td className="py-2 text-gray-600">{b.shift}</td>
                      <td className="py-2 font-semibold text-gray-800">{b.counted_by}</td>
                      <td className="py-2 text-right font-bold text-gray-900">${b.cash_total.toFixed(2)}</td>
                      <td className="py-2 text-gray-400 text-[11px]">{b.discrepancies || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* ── Points Leaderboard ── */}
          <Section title="Points Awarded" icon={<Star size={15} />} id="points" open={expandedSection === 'points'} onToggle={() => toggle('points')} count={leaderboard.length}>
            {leaderboard.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">No points awarded in this period.</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map(([name, pts], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-[13px] font-extrabold text-gray-300 w-5 text-center">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[13px] font-bold text-gray-800">{name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-extrabold" style={{ color: TEAL }}>{pts} pts</span>
                          {isAdmin && (
                            <button
                              onClick={() => awardPoints(name, 50, 'Manual award from report')}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors"
                            >+ Award</button>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((pts / (leaderboard[0]?.[1] || 1)) * 100))}%`, backgroundColor: TEAL }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #reports-print-root, #reports-print-root * { visibility: visible; }
          #reports-print-root { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
      <div className="flex items-center gap-2 mb-1" style={{ color }}>
        {icon}
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-[22px] font-extrabold text-gray-900">{value}</p>
    </div>
  );
}

function Section({ title, icon, open, onToggle, count, children }: {
  title: string; icon: React.ReactNode; id?: string; open: boolean; onToggle: () => void; count: number; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors print:pointer-events-none">
        <div className="flex items-center gap-2 text-gray-700">
          {icon}
          <p className="text-[14px] font-bold">{title}</p>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{count}</span>
        </div>
        <span className="text-gray-400 print:hidden">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      {(open) && <div className="px-4 pb-4 border-t border-gray-100 pt-3">{children}</div>}
    </div>
  );
}
