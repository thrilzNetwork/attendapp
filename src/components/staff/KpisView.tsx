'use client';
/* eslint-disable */

import { useState, useEffect } from 'react';
import { TrendingUp, Plus, Trash2, ChevronLeft, ChevronRight, Info, Save, X as XIcon } from 'lucide-react';
import {
  listKpiDefinitions, createKpiDefinition,
  listKpiSubmissions, createKpiSubmission,
  deleteOps,
  localDateStr,
  type OpRecord,
} from '@/lib/opsStore';

function getDateRange(endDate: string, days = 7): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate + 'T12:00:00');
    d.setDate(d.getDate() - i);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return result;
}

function shortDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString([], { weekday: 'short' });
}

function isMoney(unit: string) {
  return ['$', 'dollar', 'usd', 'money'].includes(unit.toLowerCase().trim());
}

function fmt(value: number, unit: string): string {
  if (isMoney(unit)) return `$${value % 1 === 0 ? value : value.toFixed(2)}`;
  if (unit === '%') return `${value}%`;
  return `${value}${unit ? ` ${unit}` : ''}`;
}

const CATEGORIES = ['Revenue', 'Operations', 'Guest Experience', 'Quality', 'Housekeeping', 'Front Desk'];

export default function KpisView({ hotelId, isAdmin, userName }: { hotelId: string; isAdmin: boolean; userId: string; userName: string }) {
  const [kpis, setKpis] = useState<OpRecord[]>([]);
  const [logs, setLogs] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManage, setShowManage] = useState(false);
  const [form, setForm] = useState({ kpi_name: '', unit: '$', target: 0, frequency: 'daily' as 'daily' | 'weekly' | 'monthly', category: 'Revenue', why: '' });
  const [saving, setSaving] = useState(false);
  // Pending edits: { [kpiId+date]: value }
  const [edits, setEdits] = useState<Record<string, number | ''>>({});
  const [submitting, setSubmitting] = useState(false);
  const [todayStr, setTodayStr] = useState(localDateStr());
  const [whyOpen, setWhyOpen] = useState<string | null>(null);

  useEffect(() => {
    setTodayStr(localDateStr());
    if (!hotelId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const [defs, lg] = await Promise.all([listKpiDefinitions(hotelId), listKpiSubmissions(hotelId)]);
      setKpis(defs || []);
      setLogs(lg || []);
      setLoading(false);
    })();
  }, [hotelId]);

  const dates = getDateRange(todayStr, 7);
  const today = todayStr;

  // Build lookup: logs keyed by `${kpiId}|${date}`
  const logMap = new Map<string, number>();
  for (const l of logs) {
    const d = l.details as any;
    if (d?.definition_id && d?.shift_date) {
      const key = `${d.definition_id}|${d.shift_date}`;
      if (!logMap.has(key)) logMap.set(key, Number(d.value));
    }
  }

  const getLoggedValue = (kpiId: string, date: string): number | null => {
    const k = `${kpiId}|${date}`;
    return logMap.has(k) ? logMap.get(k)! : null;
  };

  const editKey = (kpiId: string, date: string) => `${kpiId}|${date}`;

  const handleSaveAll = async () => {
    const entries = Object.entries(edits).filter(([, v]) => v !== '' && v !== undefined);
    if (entries.length === 0) return;
    setSubmitting(true);
    try {
      for (const [key, value] of entries) {
        const [kpiId, date] = key.split('|');
        const kpi = kpis.find(k => k.id === kpiId);
        if (!kpi) continue;
        const def = kpi.details as any;
        await createKpiSubmission(hotelId, {
          definition_id: kpiId,
          kpi_name: def.kpi_name,
          value: Number(value),
          shift_date: date,
          submitted_by: userName,
        });
      }
      const lg = await listKpiSubmissions(hotelId);
      setLogs(lg || []);
      setEdits({});
    } finally {
      setSubmitting(false);
    }
  };

  const addKpi = async () => {
    if (!form.kpi_name) return;
    setSaving(true);
    try {
      await createKpiDefinition(hotelId, form);
      const defs = await listKpiDefinitions(hotelId);
      setKpis(defs || []);
      setForm({ kpi_name: '', unit: '$', target: 0, frequency: 'daily', category: 'Revenue', why: '' });
    } finally {
      setSaving(false);
    }
  };

  const deleteKpi = async (id: string) => {
    if (!confirm('Delete this KPI?')) return;
    await deleteOps(id);
    setKpis(kpis.filter(k => k.id !== id));
  };

  const hasPendingEdits = Object.values(edits).some(v => v !== '');
  const loggedToday = kpis.filter(k => getLoggedValue(k.id, today) !== null).length;

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading…</div>;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-teal-600 shrink-0" />
          <h1 className="text-[18px] font-extrabold text-gray-900">KPIs</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowManage(v => !v)}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${showManage ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {showManage ? 'Done' : '+ Manage'}
            </button>
          )}
          {hasPendingEdits && (
            <button
              onClick={handleSaveAll}
              disabled={submitting}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            >
              <Save size={12} /> {submitting ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>
      <p className="text-[12px] text-gray-400 mb-4">
        {loggedToday} of {kpis.length} logged today
      </p>

      {/* Admin: add KPI form */}
      {isAdmin && showManage && (
        <div className="bg-white border border-teal-200 rounded-xl p-4 mb-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">Add Custom KPI</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              placeholder="KPI name"
              value={form.kpi_name}
              onChange={e => setForm(f => ({ ...f, kpi_name: e.target.value }))}
              className="col-span-2 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-teal-300"
            />
            <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-teal-300">
              {['$', '%', 'count', 'minutes', 'hours', 'rooms', 'guests'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Target"
              value={form.target || ''}
              onChange={e => setForm(f => ({ ...f, target: Number(e.target.value) }))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-teal-300"
            />
            <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as any }))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-teal-300">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-teal-300">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input
            placeholder="Why we track this (coaching context for staff)"
            value={form.why}
            onChange={e => setForm(f => ({ ...f, why: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-teal-300 mb-3"
          />
          <button
            onClick={addKpi}
            disabled={saving || !form.kpi_name}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold"
          >
            <Plus size={12} /> {saving ? 'Adding…' : 'Add KPI'}
          </button>
        </div>
      )}

      {kpis.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-200">
          <TrendingUp size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">No KPIs yet</p>
          <p className="text-[12px] text-gray-400 mt-1">
            {isAdmin
              ? 'Install a pack from the Marketplace or tap "+ Manage" to add a custom KPI'
              : 'Your manager will install KPIs for your property'}
          </p>
        </div>
      ) : (
        <>
          {/* Main table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 sticky left-0 bg-gray-50 z-10 w-36">
                      KPI
                    </th>
                    {dates.map(d => (
                      <th key={d} className={`px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider min-w-[56px] ${d === today ? 'text-teal-700' : 'text-gray-400'}`}>
                        <span className="block">{dayLabel(d)}</span>
                        <span className={`block text-[9px] font-normal mt-0.5 ${d === today ? 'text-teal-500' : 'text-gray-300'}`}>
                          {shortDate(d)}
                        </span>
                        {d === today && (
                          <span className="inline-block mt-0.5 text-[8px] font-bold px-1 py-0.5 rounded-full bg-teal-100 text-teal-700">Today</span>
                        )}
                      </th>
                    ))}
                    <th className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-300 w-14">
                      Target
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {kpis.map(kpi => {
                    const def = kpi.details as any;
                    const todayVal = getLoggedValue(kpi.id, today);
                    const atTarget = todayVal !== null && def.target > 0 && todayVal >= def.target;
                    const hasWhy = !!def.why;

                    return (
                      <tr key={kpi.id} className="hover:bg-gray-50/50">
                        {/* KPI name cell */}
                        <td className="px-3 py-3 sticky left-0 bg-white hover:bg-gray-50/50 z-10">
                          <div className="flex items-start gap-1.5">
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-semibold text-gray-700 block leading-tight truncate">{def.kpi_name}</span>
                              <span className="text-[9px] text-gray-400 capitalize">{def.frequency}</span>
                            </div>
                            {hasWhy && (
                              <button
                                onClick={() => setWhyOpen(whyOpen === kpi.id ? null : kpi.id)}
                                className="shrink-0 mt-0.5 text-gray-300 hover:text-teal-500"
                              >
                                <Info size={12} />
                              </button>
                            )}
                            {isAdmin && showManage && (
                              <button onClick={() => deleteKpi(kpi.id)} className="shrink-0 text-gray-200 hover:text-red-400">
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                          {/* Why tooltip */}
                          {whyOpen === kpi.id && def.why && (
                            <div className="mt-2 p-2 bg-teal-50 border border-teal-100 rounded-lg">
                              <p className="text-[10px] text-teal-700 leading-relaxed italic">{def.why}</p>
                              <button onClick={() => setWhyOpen(null)} className="text-[9px] text-teal-500 font-bold mt-1">Close</button>
                            </div>
                          )}
                        </td>

                        {/* Date columns */}
                        {dates.map(date => {
                          const logged = getLoggedValue(kpi.id, date);
                          const editVal = edits[editKey(kpi.id, date)];
                          const isToday = date === today;
                          const overTarget = logged !== null && def.target > 0 && logged >= def.target;
                          const underTarget = logged !== null && def.target > 0 && logged < def.target;

                          return (
                            <td key={date} className={`px-1.5 py-2 text-center ${isToday ? 'bg-teal-50/40' : ''}`}>
                              {isToday ? (
                                // Editable input for today
                                logged !== null && editVal === undefined ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`text-[12px] font-extrabold ${overTarget ? 'text-emerald-600' : underTarget ? 'text-amber-600' : 'text-gray-700'}`}>
                                      {fmt(logged, def.unit)}
                                    </span>
                                    <button
                                      onClick={() => setEdits(p => ({ ...p, [editKey(kpi.id, date)]: logged }))}
                                      className="text-[8px] text-gray-400 hover:text-teal-600"
                                    >
                                      edit
                                    </button>
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    step={isMoney(def.unit) ? '0.01' : '1'}
                                    value={editVal !== undefined ? editVal : ''}
                                    onChange={e => setEdits(p => ({ ...p, [editKey(kpi.id, date)]: e.target.value === '' ? '' : Number(e.target.value) }))}
                                    placeholder="—"
                                    className="w-12 text-center px-1 py-1 border border-teal-200 rounded text-[11px] font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                                  />
                                )
                              ) : (
                                // Read-only historical
                                logged !== null ? (
                                  <span className={`text-[11px] font-bold ${overTarget ? 'text-emerald-600' : underTarget ? 'text-amber-600' : 'text-gray-600'}`}>
                                    {fmt(logged, def.unit)}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-200">—</span>
                                )
                              )}
                            </td>
                          );
                        })}

                        {/* Target column */}
                        <td className="px-2 py-2 text-center">
                          <span className={`text-[11px] font-bold ${atTarget ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {def.target > 0 ? fmt(def.target, def.unit) : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary chips */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Logged Today</p>
              <p className="text-[20px] font-extrabold text-teal-700">{loggedToday}/{kpis.length}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">On Target</p>
              <p className="text-[20px] font-extrabold text-emerald-700">
                {kpis.filter(k => {
                  const d = k.details as any;
                  const v = getLoggedValue(k.id, today);
                  return v !== null && d.target > 0 && v >= d.target;
                }).length}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Below Target</p>
              <p className="text-[20px] font-extrabold text-amber-700">
                {kpis.filter(k => {
                  const d = k.details as any;
                  const v = getLoggedValue(k.id, today);
                  return v !== null && d.target > 0 && v < d.target;
                }).length}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
