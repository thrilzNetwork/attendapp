'use client';
/* eslint-disable */

import { useState, useEffect } from 'react';
import {
  TrendingUp, Plus, X as XIcon, Trash2, BookOpen, Copy, Search,
} from 'lucide-react';
import {
  listKpiDefinitions, createKpiDefinition,
  listKpiSubmissions, createKpiSubmission,
  deleteOps,
  listKbSuggestionsByStatus, createKbSuggestionPending,
  approveKbSuggestion, rejectKbSuggestion, deleteKbSuggestion,
  suggestResponse,
  localDateStr,
  type OpRecord,
} from '@/lib/opsStore';

const TEAL = '#0D9488';

function getWeekStart(date: string, weekStartsOn?: string): string {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  if (weekStartsOn === 'Monday') {
    const monOffset = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - monOffset);
  } else {
    d.setDate(d.getDate() - day);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================================
// KPI TRACKING VIEW
// ============================================================
export default function KpisView({ hotelId, isAdmin, userName }: { hotelId: string; isAdmin: boolean; userId: string; userName: string }) {
  const [kpis, setKpis] = useState<OpRecord[]>([]);
  const [logs, setLogs] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ kpi_name: '', unit: '', target: 0, frequency: 'daily' as 'daily' | 'weekly' | 'monthly', category: 'Revenue' });
  const [logValues, setLogValues] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(localDateStr());
  const [viewingKpi, setViewingKpi] = useState<string | null>(null);

  const CATEGORIES = ['Revenue', 'Operations', 'Guest Experience', 'Quality', 'Housekeeping', 'Front Desk'];

  // Clear stale detail-view selection when the KPI no longer exists (avoids setState-during-render crash)
  useEffect(() => {
    if (viewingKpi && !kpis.some(k => k.id === viewingKpi)) setViewingKpi(null);
  }, [viewingKpi, kpis]);

  useEffect(() => {
    if (!hotelId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const [defs, lg] = await Promise.all([listKpiDefinitions(hotelId), listKpiSubmissions(hotelId)]);
      setKpis(defs || []);
      setLogs(lg || []);
      setLoading(false);
    })();
  }, [hotelId]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const today = localDateStr();
  const isInWindow = (kpiId: string, freq: string, date?: string): boolean => {
    const d = date || selectedDate;
    if (freq === 'daily') return !logs.some(l => (l.details as any).definition_id === kpiId && (l.details as any).shift_date === d);
    if (freq === 'weekly') {
      const ws = getWeekStart(d);
      return !logs.some(l => (l.details as any).definition_id === kpiId && getWeekStart((l.details as any).shift_date) === ws);
    }
    if (freq === 'monthly') {
      const m = d.substring(0, 7);
      return !logs.some(l => (l.details as any).definition_id === kpiId && (l.details as any).shift_date?.startsWith(m));
    }
    return true;
  };

  const getLogsForKpi = (kpiId: string, limit = 30) => {
    return logs
      .filter(l => (l.details as any).definition_id === kpiId)
      .sort((a, b) => (b.details as any).shift_date?.localeCompare((a.details as any).shift_date || ''))
      .slice(0, limit);
  };

  const isMoney = (unit: string) => ['$', 'dollar', 'usd', 'money'].includes(unit.toLowerCase().trim());

  const saveKpi = async () => {
    if (!form.kpi_name) return;
    setSubmitting(true);
    try {
      await createKpiDefinition(hotelId, form);
      const defs = await listKpiDefinitions(hotelId);
      setKpis(defs || []);
      setShowAdd(false);
      setForm({ kpi_name: '', unit: '', target: 0, frequency: 'daily', category: 'Revenue' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitLog = async (kpi: OpRecord) => {
    const def = kpi.details as any;
    const v = logValues[kpi.id];
    if (v === undefined) return;
    setSubmitting(true);
    try {
      await createKpiSubmission(hotelId, { definition_id: kpi.id, kpi_name: def.kpi_name, value: v, shift_date: selectedDate, submitted_by: userName });
      const lg = await listKpiSubmissions(hotelId);
      setLogs(lg || []);
      setLogValues(p => { const n = { ...p }; delete n[kpi.id]; return n; });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteKpi = async (id: string) => {
    if (!confirm('Delete this KPI?')) return;
    await deleteOps(id);
    setKpis(kpis.filter(k => k.id !== id));
  };

  /** Compute the single "current" value: most recent log for the window */
  const getCurrentValue = (kpiId: string, def: any): { value: number; date: string } | null => {
    const kpiLogs = getLogsForKpi(kpiId, 1);
    if (kpiLogs.length === 0) return null;
    const last = kpiLogs[0].details as any;
    return { value: Number(last.value), date: last.shift_date };
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  // Detail view for a single KPI
  if (viewingKpi) {
    const kpi = kpis.find(k => k.id === viewingKpi);
    if (!kpi) return null;
    const def = kpi.details as any;
    const allLogs = getLogsForKpi(kpi.id, 100);
    const is$ = isMoney(def.unit);
    const fmt = (v: number) => is$ ? `$${v.toFixed(2)}` : `${v}${def.unit ? ` ${def.unit}` : ''}`;

    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <button onClick={() => setViewingKpi(null)} className="flex items-center gap-1 text-[12px] text-teal-600 font-bold mb-4">&larr; All KPIs</button>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-extrabold text-gray-900">{def.kpi_name}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold capitalize">{def.frequency}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold">{def.category}</span>
            </div>
          </div>
          <p className="text-[12px] text-gray-500">Target: <strong>{fmt(def.target)}</strong> per {def.frequency}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-bold text-[14px] text-gray-900 mb-3">History ({allLogs.length} entries)</h3>
          {allLogs.length === 0 ? (
            <p className="text-[12px] text-gray-400 text-center py-6">No entries yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {allLogs.map(l => {
                const ld = l.details as any;
                const pct = def.target > 0 ? Math.min(Math.round((Number(ld.value) / def.target) * 100), 999) : 0;
                return (
                  <div key={l.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-gray-500 font-mono w-24">{ld.shift_date}</span>
                      <span className="text-[13px] font-extrabold text-gray-900">{fmt(Number(ld.value))}</span>
                      {def.target > 0 && (
                        <span className={`text-[11px] font-bold ${Number(ld.value) >= def.target ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {pct}% of target
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{ld.submitted_by}</span>
                      {isAdmin && (
                        <button onClick={async () => { await deleteOps(l.id); const lg = await listKpiSubmissions(hotelId); setLogs(lg || []); }} className="text-red-400"><XIcon size={12} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Group KPIs by category
  const grouped = kpis.reduce((acc, k) => {
    const cat = (k.details as any).category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(k);
    return acc;
  }, {} as Record<string, OpRecord[]>);

  const categoryIcons: Record<string, string> = {
    Revenue: '💰',
    Operations: '⚙️',
    'Guest Experience': '🌟',
    Quality: '✅',
    Housekeeping: '🧹',
    'Front Desk': '🛎️',
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-[20px] font-extrabold text-gray-900">KPIs</h1>
          <p className="text-[12px] text-gray-500">Performance metrics · {selectedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="bg-gray-50 rounded-xl px-3 py-2 text-[12px] border border-gray-200 outline-none w-[140px]" />
          {isAdmin && (
            <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-xl text-white font-bold text-[12px] flex items-center gap-1" style={{ backgroundColor: TEAL }}>
              <Plus size={14} /> New KPI
            </button>
          )}
        </div>
      </div>

      {kpis.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <TrendingUp size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">No KPIs yet</p>
          <p className="text-[12px] text-gray-400 mt-1">{isAdmin ? 'Tap "New KPI" to add metrics like ADR, parking charges, early check-in fees' : 'Your manager will add KPIs'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catKpis]) => (
            <div key={cat}>
              <h2 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                {categoryIcons[cat] || '📊'} {cat}
              </h2>
              <div className="space-y-3">
                {catKpis.map(k => {
                  const def = k.details as any;
                  const is$ = isMoney(def.unit);
                  const fmt = (v: number) => is$ ? `$${v.toFixed(2)}` : `${v}${def.unit ? ` ${def.unit}` : ''}`;
                  const current = getCurrentValue(k.id, def);
                  const due = !isAdmin && isInWindow(k.id, def.frequency);
                  const recent = getLogsForKpi(k.id, 5);

                  return (
                    <div key={k.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewingKpi(k.id)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-[14px] font-bold text-gray-900">{def.kpi_name}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold capitalize">{def.frequency}</span>
                          </div>
                          <p className="text-[11px] text-gray-400">Target: <strong>{fmt(def.target)}</strong></p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {current && (
                            <div className="text-right">
                              <p className="text-[16px] font-extrabold" style={{ color: current.value >= def.target ? '#059669' : '#D97706' }}>
                                {fmt(current.value)}
                              </p>
                              <p className="text-[9px] text-gray-400">{current.date}</p>
                            </div>
                          )}
                          {!current && <p className="text-[11px] text-gray-300">No data</p>}
                          {isAdmin && (
                            <button onClick={e => { e.stopPropagation(); deleteKpi(k.id); }} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      {def.target > 0 && current && (
                        <div className="mt-3">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((current.value / def.target) * 100, 100)}%`, backgroundColor: current.value >= def.target ? '#059669' : '#D97706' }} />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">{Math.round((current.value / def.target) * 100)}% of {def.frequency} target</p>
                        </div>
                      )}

                      {/* Staff: log entry form */}
                      {!isAdmin && due && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <input type="number" step={is$ ? '0.01' : '1'} value={logValues[k.id] ?? ''}
                            onChange={e => setLogValues(p => ({ ...p, [k.id]: Number(e.target.value) }))}
                            placeholder={`Enter ${def.unit || 'value'}...`}
                            className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-100 outline-none" />
                          <button onClick={() => submitLog(k)} disabled={submitting || logValues[k.id] === undefined}
                            className="px-4 py-2 rounded-lg text-white font-bold text-[12px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                            {submitting ? '...' : 'Log'}
                          </button>
                        </div>
                      )}
                      {!isAdmin && !due && current && (
                        <p className="text-[11px] text-emerald-600 font-semibold mt-2" onClick={e => e.stopPropagation()}>✓ Logged ({current.value}) this {def.frequency.replace('ly', '')}</p>
                      )}

                      {/* Recent entries (any role can see) */}
                      {recent.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Recent</p>
                          <div className="space-y-1">
                            {recent.slice(0, 3).map(l => {
                              const ld = l.details as any;
                              return (
                                <div key={l.id} className="flex items-center justify-between text-[11px]">
                                  <span className="text-gray-500">{ld.shift_date} · {ld.submitted_by}</span>
                                  <span className="font-bold text-gray-800">{fmt(Number(ld.value))}</span>
                                </div>
                              );
                            })}
                            {recent.length > 3 && <p className="text-[10px] text-teal-600 font-bold">+{recent.length - 3} more →</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New KPI modal */}
      {showAdd && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold mb-4">New KPI</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Name</label>
                <input value={form.kpi_name} onChange={e => setForm(p => ({ ...p, kpi_name: e.target.value }))} placeholder="e.g. ADR, Parking Charges, Early Check-in Fee"
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Target</label>
                  <input type="number" step="0.01" value={form.target} onChange={e => setForm(p => ({ ...p, target: Number(e.target.value) }))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Unit</label>
                  <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none">
                    <option value="$">$ (dollars)</option>
                    <option value="%">% (percent)</option>
                    <option value="count">Count</option>
                    <option value="minutes">Minutes</option>
                    <option value="score">Score</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Frequency</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map(f => (
                    <button key={f} onClick={() => setForm(p => ({ ...p, frequency: f }))}
                      className={`py-2.5 rounded-xl text-[12px] font-bold border capitalize ${form.frequency === f ? 'border-gray-900 text-gray-900 bg-gray-100' : 'bg-white border-gray-200 text-gray-600'}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setForm(p => ({ ...p, category: c }))}
                      className={`py-2.5 rounded-xl text-[11px] font-bold border ${form.category === c ? 'border-gray-900 text-gray-900 bg-gray-100' : 'bg-white border-gray-200 text-gray-600'}`}>{categoryIcons[c] || ''} {c}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveKpi} disabled={submitting || !form.kpi_name}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                  {submitting ? 'Saving…' : 'Save KPI'}
                </button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// INCIDENT / KNOWLEDGE BASE VIEW (paste incident → AI suggestion → save)
// ============================================================
function IncidentKBView({ hotelId, isAdmin, userName }: { hotelId: string; isAdmin: boolean; userName: string }) {
  const [approved, setApproved] = useState<OpRecord[]>([]);
  const [pending, setPending] = useState<OpRecord[]>([]);
  const [rejected, setRejected] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState('');
  const [category, setCategory] = useState<string>('Complaint');
  const [suggestion, setSuggestion] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'approved' | 'pending' | 'rejected' | 'all'>('approved');
  const [ask, setAsk] = useState('');
  const [askResult, setAskResult] = useState<{ id: string; title: string; category: string; situation: string; response: string; score: number } | null>(null);
  const [askNotFound, setAskNotFound] = useState(false);
  const [askCopied, setAskCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const [a, p, r] = await Promise.all([
      listKbSuggestionsByStatus(hotelId, 'active'),
      listKbSuggestionsByStatus(hotelId, 'pending'),
      listKbSuggestionsByStatus(hotelId, 'rejected'),
    ]);
    setApproved(a || []);
    setPending(p || []);
    setRejected(r || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hotelId]);

  const generateSuggestion = () => {
    if (!incident) return;
    const result = suggestResponse(incident, category as any);
    setSuggestion(result.response);
  };

  const save = async () => {
    if (!incident || !suggestion) return;
    setSaving(true);
    try {
      // New flow: staff submissions start in 'pending' for admin review
      await createKbSuggestionPending(hotelId, {
        title: category + ' response',
        category,
        situation: incident,
        response: suggestion,
        added_by: userName,
      });
      await load();
      setIncident('');
      setSuggestion('');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id: string) => {
    await approveKbSuggestion(id);
    await load();
  };

  const reject = async (id: string) => {
    if (!confirm('Reject this entry? It will be moved to Rejected and not appear in search.')) return;
    await rejectKbSuggestion(id);
    await load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this KB entry?')) return;
    await deleteKbSuggestion(id);
    await load();
  };

  const askKb = () => {
    if (!ask.trim()) { setAskResult(null); setAskNotFound(false); return; }
    const q = ask.toLowerCase().trim();
    // Score each approved entry by keyword overlap on situation + response + category
    const scored = approved.map(e => {
      const d = e.details as any;
      const haystack = [d.situation || '', d.response || '', d.category || '', d.title || ''].join(' ').toLowerCase();
      const qWords = q.split(/\s+/).filter(w => w.length > 1);
      let score = 0;
      for (const w of qWords) {
        if (haystack.includes(w)) score += 2;
        // Whole phrase bonus
        if (haystack.includes(q)) score += 3;
      }
      // Exact phrase match big bonus
      if (haystack.includes(q)) score += 5;
      return { id: e.id, title: d.title, category: d.category, situation: d.situation, response: d.response, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    if (scored.length === 0) {
      setAskResult(null);
      setAskNotFound(true);
    } else {
      setAskResult(scored[0]);
      setAskNotFound(false);
      setAskCopied(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  const categories = [
    { key: 'SOP', label: 'SOP', icon: '📋' },
    { key: 'Best Practice', label: 'Best Practice', icon: '✅' },
    { key: 'GM Guidance', label: 'GM Guidance', icon: '🎯' },
    { key: 'Complaint', label: 'Complaint', icon: '⚠️' },
    { key: 'Service', label: 'Service', icon: '💬' },
    { key: 'Procedures', label: 'Procedures', icon: '⚙️' },
    { key: 'Safety', label: 'Safety', icon: '🚨' },
    { key: 'General', label: 'General', icon: '📌' },
  ];

  const visible = filter === 'all'
    ? [...pending, ...approved, ...rejected]
    : filter === 'pending' ? pending
    : filter === 'rejected' ? rejected
    : approved;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-[20px] font-extrabold text-gray-900">Write Answers</h1>
        <p className="text-[12px] text-gray-500">Knowledge base · best practices · SOPs · GM guidance · what to do in any situation</p>
      </div>

      {/* Ask the KB — chatbot-style search bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
          <Search size={11} /> Search answers
        </label>
        <div className="flex gap-2 mt-1.5">
          <input
            type="text"
            value={ask}
            onChange={e => { setAsk(e.target.value); if (!e.target.value) { setAskResult(null); setAskNotFound(false); } }}
            onKeyDown={e => { if (e.key === 'Enter') askKb(); }}
            placeholder="Search: check-in, breakfast, noise complaint, late checkout..."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100"
          />
          <button onClick={askKb} disabled={!ask.trim()} className="px-4 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
            Ask
          </button>
        </div>

        {askResult && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 font-semibold capitalize">{askResult.category}</span>
              <span className="text-[10px] text-gray-500">{askResult.title}</span>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 mb-0.5">Situation</p>
            <p className="text-[12px] text-gray-700">{askResult.situation}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 mb-0.5">Suggested response</p>
            <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{askResult.response}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { navigator.clipboard.writeText(askResult.response); setAskCopied(true); setTimeout(() => setAskCopied(false), 1500); }} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                <Copy size={11} /> {askCopied ? 'Copied' : 'Copy response'}
              </button>
            </div>
          </div>
        )}

        {askNotFound && ask.trim() && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3 text-[12px] text-gray-600">
            No match found for &ldquo;{ask}&rdquo;. {isAdmin ? 'Check the Pending tab below.' : 'Let your manager know or log a new entry below for admin review.'}
          </div>
        )}
      </div>

      {/* Submit a new entry */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Plus size={14} className="text-gray-700" />
          <p className="text-[14px] font-bold text-gray-900">Add a new answer</p>
        </div>
        <p className="text-[11px] text-gray-500 mb-3">SOPs, best practices, procedures, and GM guidance. Staff submissions go to <span className="font-semibold">Pending</span> for admin review. Admins can publish directly.</p>
        <label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
        <div className="flex flex-wrap gap-1 mt-1 mb-3">
          {categories.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${category === c.key ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`} style={category === c.key ? { backgroundColor: TEAL } : {}}>
              <span className="mr-1">{c.icon}</span>{c.label}
            </button>
          ))}
        </div>
        <label className="text-[10px] font-bold text-gray-500 uppercase">Situation / Topic</label>
        <textarea value={incident} onChange={e => setIncident(e.target.value)} rows={3} placeholder="e.g. How to handle a late checkout, breakfast hours, noise complaint procedure..." className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
        <button onClick={generateSuggestion} disabled={!incident} className="mt-3 w-full py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
          ✨ Suggest Response
        </button>
        {suggestion && (
          <>
            <label className="text-[10px] font-bold text-gray-500 uppercase mt-3 block">Suggested response (edit if needed)</label>
            <textarea value={suggestion} onChange={e => setSuggestion(e.target.value)} rows={5} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
            <div className="flex gap-2 mt-3">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>{saving ? 'Submitting…' : 'Submit for Review'}</button>
              <button onClick={() => { setIncident(''); setSuggestion(''); }} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Clear</button>
            </div>
          </>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {([
          { key: 'approved', label: `✓ Approved (${approved.length})` },
          ...(isAdmin ? [{ key: 'pending', label: `⏳ Pending (${pending.length})` }] : []),
          ...(isAdmin ? [{ key: 'rejected', label: `✗ Rejected (${rejected.length})` }] : []),
          ...(isAdmin ? [{ key: 'all', label: `All (${approved.length + pending.length + rejected.length})` }] : []),
        ] as { key: 'approved' | 'pending' | 'rejected' | 'all'; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap ${filter === t.key ? 'text-white' : 'bg-white border border-gray-200 text-gray-600'}`} style={filter === t.key ? { backgroundColor: TEAL } : {}}>{t.label}</button>
        ))}
      </div>

      {/* KB entries */}
      {visible.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">
            {filter === 'pending' ? 'No pending entries' : filter === 'rejected' ? 'No rejected entries' : 'No answers yet'}
          </p>
          <p className="text-[12px] text-gray-400 mt-1">
            {filter === 'pending' ? 'New staff submissions will appear here for your review.' : 'Share what you know below to start adding answers.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(e => {
            const d = e.details as any;
            const isPending = e.status === 'pending';
            const isRejected = e.status === 'rejected';
            return (
              <details key={e.id} className={`bg-white rounded-2xl border shadow-sm group ${isPending ? 'border-amber-200' : isRejected ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
                <summary className="p-4 cursor-pointer list-none flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold capitalize">{d.category}</span>
                      {isPending && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">⏳ Pending</span>}
                      {isRejected && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-semibold">✗ Rejected</span>}
                      <span className="text-[10px] text-gray-400">{e.created_at?.split('T')[0]}</span>
                      <span className="text-[10px] text-gray-400">by {d.added_by}</span>
                    </div>
                    <p className="text-[13px] text-gray-700 line-clamp-2">{d.situation}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={ev => { ev.preventDefault(); del(e.id); }} className="p-1 text-gray-400 hover:text-gray-700 ml-2" title="Delete"><Trash2 size={14} /></button>
                  )}
                </summary>
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-3 mb-1">Suggested response</p>
                  <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{d.response}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => { navigator.clipboard.writeText(d.response); }} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                      <Copy size={11} /> Copy
                    </button>
                    {isAdmin && isPending && (
                      <>
                        <button onClick={() => approve(e.id)} className="ml-auto px-3 py-1.5 rounded-lg text-white font-bold text-[11px]" style={{ backgroundColor: TEAL }}>
                          ✓ Approve
                        </button>
                        <button onClick={() => reject(e.id)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {isAdmin && isRejected && (
                      <button onClick={() => approve(e.id)} className="ml-auto px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { IncidentKBView };