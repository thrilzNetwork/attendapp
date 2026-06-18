'use client';
/* eslint-disable */

import { useState, useEffect, useCallback } from 'react';
import { Info, Plus, Trash2, Save, ChevronLeft, ChevronRight, Check, Store } from 'lucide-react';
import {
  listKpiDefinitions, createKpiDefinition, listKpiSubmissions, createKpiSubmission, deleteOps,
  type OpRecord,
} from '@/lib/opsStore';
import { supabase } from '@/lib/supabase';

const TEAL = '#0D9488';

// Returns the Monday of the week containing `date`
function weekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toYMD(d: Date): string {
  return d.toISOString().split('T')[0];
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function shortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

export default function KpisView({
  hotelId,
  isAdmin,
  userName,
}: {
  hotelId: string;
  isAdmin: boolean;
  userId?: string;
  userName: string;
}) {
  const [kpis, setKpis] = useState<OpRecord[]>([]);
  const [logs, setLogs] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [dirtyValues, setDirtyValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [expandedInfo, setExpandedInfo] = useState<Set<string>>(new Set());
  const [showManage, setShowManage] = useState(false);
  const [addForm, setAddForm] = useState({ kpi_name: '', unit: '', target: '', frequency: 'daily' as 'daily'|'weekly'|'monthly', category: 'Operations', why: '' });
  const [addingKpi, setAddingKpi] = useState(false);

  const today = new Date();
  const todayYMD = toYMD(today);

  // Compute 7 columns: Mon–Sun of the target week
  const monday = weekMonday(addDays(today, weekOffset * 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekLabel = (() => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === -1) return 'Last Week';
    return `${shortDate(monday)} – ${shortDate(days[6])}`;
  })();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [defs, lg] = await Promise.all([listKpiDefinitions(hotelId), listKpiSubmissions(hotelId)]);
      setKpis(defs || []);
      setLogs(lg || []);
      setLoading(false);
    })();
  }, [hotelId]);

  function getLogForDate(kpiId: string, dateYMD: string): OpRecord | undefined {
    return logs.find(l => {
      const d = l.details as any;
      return d.definition_id === kpiId && d.shift_date === dateYMD;
    });
  }

  function toggleInfo(id: string) {
    setExpandedInfo(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  async function handleSave() {
    if (Object.keys(dirtyValues).length === 0) return;
    setSaving(true);
    try {
      for (const [kpiId, rawVal] of Object.entries(dirtyValues)) {
        const val = parseFloat(rawVal);
        if (isNaN(val)) continue;
        const kpi = kpis.find(k => k.id === kpiId);
        if (!kpi) continue;
        const def = kpi.details as any;
        await createKpiSubmission(hotelId, {
          definition_id: kpiId,
          kpi_name: def.kpi_name,
          value: val,
          shift_date: todayYMD,
          submitted_by: userName,
        });
        // Award 25 pts if on target
        try {
          if (def.target > 0 && val >= Number(def.target)) {
            await supabase.from('staff_points').insert({
              hotel_id: hotelId,
              staff_name: userName || 'Staff',
              points: 25,
              reason: 'kpi_target',
              description: `Hit target: ${def.kpi_name} (${val} ${def.unit || ''})`,
            });
          }
        } catch (_) {}
      }
      const lg = await listKpiSubmissions(hotelId);
      setLogs(lg || []);
      setDirtyValues({});
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddKpi() {
    if (!addForm.kpi_name || !addForm.unit) return;
    setAddingKpi(true);
    try {
      await createKpiDefinition(hotelId, {
        kpi_name: addForm.kpi_name,
        unit: addForm.unit,
        target: parseFloat(addForm.target) || 0,
        frequency: addForm.frequency,
        category: addForm.category,
        why: addForm.why,
      });
      const defs = await listKpiDefinitions(hotelId);
      setKpis(defs || []);
      setAddForm({ kpi_name: '', unit: '', target: '', frequency: 'daily', category: 'Operations', why: '' });
    } finally {
      setAddingKpi(false);
    }
  }

  async function handleDeleteKpi(id: string) {
    if (!confirm('Delete this KPI and all its history?')) return;
    await deleteOps(id);
    setKpis(kpis.filter(k => k.id !== id));
  }

  // Stats for today
  const loggedToday = kpis.filter(k => !!getLogForDate(k.id, todayYMD) || dirtyValues[k.id] !== undefined).length;
  const onTarget = kpis.filter(k => {
    const log = getLogForDate(k.id, todayYMD);
    if (!log) return false;
    const def = k.details as any;
    return def.target > 0 && Number((log.details as any).value) >= Number(def.target);
  }).length;
  const below = kpis.filter(k => {
    const log = getLogForDate(k.id, todayYMD);
    if (!log) return false;
    const def = k.details as any;
    return def.target > 0 && Number((log.details as any).value) < Number(def.target);
  }).length;

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontFamily: 'system-ui' }}>
        Loading KPIs…
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F9FAFB', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>📊 KPIs</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Week nav */}
            <button onClick={() => setWeekOffset(w => w - 1)} style={navBtnStyle}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', minWidth: 90, textAlign: 'center' }}>{weekLabel}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} style={{ ...navBtnStyle, opacity: weekOffset >= 0 ? 0.3 : 1 }}><ChevronRight size={16} /></button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} style={{ fontSize: 11, fontWeight: 700, color: TEAL, background: '#F0FDFA', border: `1px solid ${TEAL}`, borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>
                Today
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin && (
              <button
                onClick={() => setShowManage(s => !s)}
                style={{ fontSize: 12, fontWeight: 700, color: showManage ? TEAL : '#6B7280', background: showManage ? '#F0FDFA' : '#F3F4F6', border: '1px solid ' + (showManage ? TEAL : '#E5E7EB'), borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
              >
                + Manage
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(dirtyValues).length === 0}
              style={{
                fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: savedBanner ? '#D1FAE5' : TEAL,
                color: savedBanner ? '#065F46' : '#fff',
                opacity: Object.keys(dirtyValues).length === 0 && !savedBanner ? 0.4 : 1,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
              }}
            >
              {savedBanner ? <><Check size={14} /> Saved</> : saving ? 'Saving…' : <><Save size={14} /> Save</>}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', padding: '12px 0' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              <th style={{ ...stickyColStyle, textAlign: 'left', fontWeight: 700, fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 16px', borderBottom: '1px solid #E5E7EB' }}>
                KPI
              </th>
              {days.map((d, i) => {
                const ymd = toYMD(d);
                const isToday = ymd === todayYMD;
                return (
                  <th key={i} style={{
                    minWidth: isToday ? 80 : 60, textAlign: 'center', padding: '8px 4px',
                    borderBottom: '1px solid #E5E7EB',
                    background: isToday ? '#F0FDFA' : undefined,
                    borderLeft: isToday ? `2px solid ${TEAL}` : undefined,
                    borderRight: isToday ? `2px solid ${TEAL}` : undefined,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? TEAL : '#9CA3AF', textTransform: 'uppercase' }}>{dayLabel(d)}</div>
                    <div style={{ fontSize: 10, color: isToday ? TEAL : '#D1D5DB', fontWeight: 600 }}>{shortDate(d)}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {kpis.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: '#9CA3AF', fontSize: 13 }}>
                  No KPIs yet. {isAdmin ? 'Use "+ Manage" to add one, or install a pack from the Marketplace.' : 'Ask your admin to set up KPIs.'}
                </td>
              </tr>
            )}
            {kpis.map((kpi, rowIdx) => {
              const def = kpi.details as any;
              const infoOpen = expandedInfo.has(kpi.id);
              const rowBg = rowIdx % 2 === 0 ? '#fff' : '#FAFAFA';
              return [
                <tr key={kpi.id} style={{ background: rowBg }}>
                  {/* KPI name cell */}
                  <td style={{ ...stickyColStyle, background: rowBg, padding: '10px 16px', borderBottom: infoOpen ? 'none' : '1px solid #F3F4F6', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {def.kpi_name}
                        </div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                          {def.unit} · target {def.target}
                        </div>
                      </div>
                      {def.why && (
                        <button
                          onClick={() => toggleInfo(kpi.id)}
                          title="Why we track this"
                          style={{ flexShrink: 0, background: infoOpen ? '#F0FDFA' : 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: infoOpen ? TEAL : '#9CA3AF' }}
                        >
                          <Info size={14} />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Day cells */}
                  {days.map((d, i) => {
                    const ymd = toYMD(d);
                    const isToday = ymd === todayYMD;
                    const log = getLogForDate(kpi.id, ymd);
                    const logVal = log ? Number((log.details as any).value) : null;
                    const target = Number(def.target);
                    const isGood = logVal !== null && target > 0 && logVal >= target;
                    const isBad = logVal !== null && target > 0 && logVal < target;

                    return (
                      <td key={i} style={{
                        textAlign: 'center', padding: isToday ? '8px 6px' : '8px 4px',
                        borderBottom: infoOpen ? 'none' : '1px solid #F3F4F6',
                        background: isToday ? '#F0FDFA' : undefined,
                        borderLeft: isToday ? `2px solid ${TEAL}` : undefined,
                        borderRight: isToday ? `2px solid ${TEAL}` : undefined,
                        verticalAlign: 'middle',
                      }}>
                        {isToday ? (
                          log ? (
                            <div style={{
                              fontWeight: 800, fontSize: 14, color: isGood ? '#059669' : isBad ? '#DC2626' : '#111827',
                            }}>
                              {logVal}
                            </div>
                          ) : (
                            <input
                              type="number"
                              value={dirtyValues[kpi.id] ?? ''}
                              onChange={e => setDirtyValues(p => ({ ...p, [kpi.id]: e.target.value }))}
                              placeholder="—"
                              style={{
                                width: 62, height: 34, textAlign: 'center', border: `1.5px solid ${TEAL}`,
                                borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#111827',
                                background: '#fff', outline: 'none', padding: '0 4px',
                              }}
                            />
                          )
                        ) : (
                          logVal !== null ? (
                            <span style={{
                              fontSize: 13, fontWeight: 700,
                              color: isGood ? '#059669' : isBad ? '#DC2626' : '#374151',
                              display: 'inline-flex', alignItems: 'center', gap: 2,
                            }}>
                              {logVal}
                              {isGood && <span style={{ fontSize: 9, color: '#059669' }}>✓</span>}
                            </span>
                          ) : (
                            <span style={{ color: '#D1D5DB', fontSize: 12 }}>—</span>
                          )
                        )}
                      </td>
                    );
                  })}
                </tr>,

                // Why coaching row (accordion)
                infoOpen && def.why ? (
                  <tr key={`why-${kpi.id}`} style={{ background: rowBg }}>
                    <td colSpan={8} style={{ padding: '0 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
                      <div style={{ background: '#F0FDFA', border: `1px solid ${TEAL}20`, borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10 }}>
                        <div style={{ color: TEAL, marginTop: 1, flexShrink: 0 }}>💡</div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Why we track this</div>
                          <div style={{ fontSize: 13, color: '#0F766E', lineHeight: 1.5 }}>{def.why}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom stat chips */}
      {kpis.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px', flexWrap: 'wrap' }}>
          <Chip label={`${loggedToday} / ${kpis.length} logged today`} color="#6B7280" bg="#F3F4F6" />
          {onTarget > 0 && <Chip label={`${onTarget} on target ✓`} color="#065F46" bg="#D1FAE5" />}
          {below > 0 && <Chip label={`${below} below target`} color="#92400E" bg="#FEF3C7" />}
        </div>
      )}

      {/* Admin Manage Panel */}
      {isAdmin && showManage && (
        <div style={{ margin: '16px', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', fontWeight: 700, fontSize: 14, color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Manage KPIs
            <a
              href="#"
              onClick={e => { e.preventDefault(); }}
              style={{ fontSize: 12, color: TEAL, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
            >
              <Store size={13} /> Browse Marketplace
            </a>
          </div>

          {/* Existing KPIs list */}
          <div style={{ padding: '12px 16px' }}>
            {kpis.map(kpi => {
              const def = kpi.details as any;
              return (
                <div key={kpi.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{def.kpi_name}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{def.unit} · target {def.target} · {def.frequency}</div>
                  </div>
                  <button onClick={() => handleDeleteKpi(kpi.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add KPI form */}
          <div style={{ padding: '12px 16px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Add Custom KPI</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={addForm.kpi_name} onChange={e => setAddForm(f => ({ ...f, kpi_name: e.target.value }))} placeholder="KPI Name *" style={inputStyle} />
              <input value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))} placeholder="Unit (USD, %, rooms…) *" style={inputStyle} />
              <input value={addForm.target} onChange={e => setAddForm(f => ({ ...f, target: e.target.value }))} placeholder="Target" type="number" style={inputStyle} />
              <select value={addForm.frequency} onChange={e => setAddForm(f => ({ ...f, frequency: e.target.value as any }))} style={inputStyle}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                {['Revenue','Operations','Guest Experience','Quality','Housekeeping','Front Desk','Security','Food & Beverage'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <textarea
              value={addForm.why}
              onChange={e => setAddForm(f => ({ ...f, why: e.target.value }))}
              placeholder="Why do we track this? (coaching context shown to staff)"
              rows={2}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginTop: 8, resize: 'none', gridColumn: '1/-1' }}
            />
            <button
              onClick={handleAddKpi}
              disabled={addingKpi || !addForm.kpi_name || !addForm.unit}
              style={{ marginTop: 10, width: '100%', padding: '10px', background: TEAL, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (!addForm.kpi_name || !addForm.unit) ? 0.5 : 1 }}
            >
              {addingKpi ? 'Adding…' : '+ Add KPI'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <div style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color, background: bg }}>
      {label}
    </div>
  );
}

const stickyColStyle: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  minWidth: 160,
  maxWidth: 200,
};

const navBtnStyle: React.CSSProperties = {
  background: '#F3F4F6', border: 'none', borderRadius: 8, width: 30, height: 30,
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#374151',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8,
  fontSize: 13, color: '#111827', background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box',
};
