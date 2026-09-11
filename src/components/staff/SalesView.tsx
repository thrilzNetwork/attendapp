'use client';

// SalesView — Sales tab: track goals and daily check-ins.
// Data lives in the opsStore (requests table) as 'sales_goal' + 'sales_checkin' records.

import { useState, useEffect, useCallback } from 'react';
import { Target, Plus, RefreshCw, CheckCircle2, Trash2, TrendingUp } from 'lucide-react';
import { listOps, createOps, deleteOps } from '@/lib/opsStore';

const TEAL = '#158A7C';

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface SalesGoal {
  title: string;
  target: number;
  unit: string;          // '', '$', '%', 'rooms'… (legacy) — new goals are '$' only
  period: 'day' | 'week' | 'month' | 'quarter'; // legacy 'day'/'week' still render
  created_by?: string;
}

interface SalesCheckin {
  checkin_date: string;
  goal_title: string;
  value: number;
  note?: string;
  logged_by: string;
}

interface GoalRec { id: string; details: SalesGoal; created_at: string }
interface CheckinRec { id: string; details: SalesCheckin; created_at: string }

export default function SalesView({
  hotelId, hotelName, staffName, isAdmin,
}: { hotelId: string; hotelName: string; staffName: string; isAdmin: boolean }) {
  const [goals, setGoals] = useState<GoalRec[]>([]);
  const [checkins, setCheckins] = useState<CheckinRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // goal form — high-level financial goals only ($ / monthly+quarterly)
  const [gTitle, setGTitle] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [gPeriod, setGPeriod] = useState<SalesGoal['period']>('month');

  // check-in form
  const [cGoal, setCGoal] = useState('');
  const [cValue, setCValue] = useState('');
  const [cNote, setCNote] = useState('');
  const [flash, setFlash] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const [g, c] = await Promise.all([
        listOps(hotelId, 'sales_goal', { status: 'active' }),
        listOps(hotelId, 'sales_checkin', { status: 'active' }),
      ]);
      setGoals((g || []) as unknown as GoalRec[]);
      setCheckins((c || []) as unknown as CheckinRec[]);
    } catch { /* silent */ }
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const today = localDateStr();

  // Progress per goal: sum of today's check-ins (day) or latest value (week+)
  const progressFor = (goal: GoalRec): { value: number; pct: number } => {
    const todays = checkins.filter(c => c.details.checkin_date === today && c.details.goal_title === goal.details.title);
    const value = goal.details.period === 'day'
      ? todays.reduce((s, c) => s + c.details.value, 0)
      : (todays[todays.length - 1]?.details.value ?? 0);
    const pct = goal.details.target > 0 ? Math.round((value / goal.details.target) * 100) : 0;
    return { value, pct: Math.min(999, pct) };
  };

  const addGoal = async () => {
    const target = Number(gTarget);
    if (!gTitle.trim() || isNaN(target) || target <= 0) return;
    setSaving(true);
    await createOps(hotelId, 'sales_goal', {
      title: gTitle.trim(), target, unit: '$', period: gPeriod, created_by: staffName,
    } as unknown as Record<string, unknown>, 'active');
    setGTitle(''); setGTarget('');
    setSaving(false);
    load();
  };

  const removeGoal = async (id: string) => { await deleteOps(id); load(); };

  const addCheckin = async () => {
    const value = Number(cValue);
    if (!cGoal || isNaN(value)) return;
    setSaving(true);
    await createOps(hotelId, 'sales_checkin', {
      checkin_date: today, goal_title: cGoal, value, note: cNote.trim() || undefined, logged_by: staffName || 'Staff',
    } as unknown as Record<string, unknown>, 'active', { guest_name: staffName || 'Staff', room: 'SALES' });
    setCValue(''); setCNote('');
    setSaving(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 1800);
    load();
  };

  const todaysCheckins = checkins.filter(c => c.details.checkin_date === today).sort((a, b) =>
    new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  const sec = 'bg-white border border-gray-200 rounded-2xl p-4';

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Sales</h1>
          <p className="text-[13px] text-gray-500">{hotelName} · financial goals &amp; sales contributions</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-xl px-3 py-2">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Goals */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900"><Target size={14} style={{ color: TEAL }} /> Financial Goals <span className="text-[11px] font-medium text-gray-400">— high level</span></div>
          {flash && <span className="text-[11px] font-bold text-teal-700">✓ Contribution logged</span>}
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-end gap-2 mb-3 bg-gray-50 rounded-xl p-3">
            <label className="text-[12px] font-medium text-gray-600">Goal
              <input value={gTitle} onChange={e => setGTitle(e.target.value)} placeholder="Monthly room revenue"
                className="block w-56 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Target ($)
              <input value={gTarget} onChange={e => setGTarget(e.target.value)} inputMode="decimal" placeholder="250000"
                className="block w-24 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Period
              <select value={gPeriod} onChange={e => setGPeriod(e.target.value as SalesGoal['period'])}
                className="block mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-800 focus:outline-none focus:ring-teal-500 bg-white">
                <option value="month">Monthly</option><option value="quarter">Quarterly</option>
              </select>
            </label>
            <button onClick={addGoal} disabled={saving} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
              <span className="flex items-center gap-1"><Plus size={13} /> Add goal</span>
            </button>
          </div>
        )}

        {goals.length === 0 ? (
          <p className="text-[13px] text-gray-400 font-medium py-1">No financial goals yet{isAdmin ? ' — add one above' : ''}.</p>
        ) : (
          <div className="space-y-2">
            {goals.map(g => {
              const { value, pct } = progressFor(g);
              const onTrack = pct >= 100;
              return (
                <div key={g.id} className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[13px] font-bold text-gray-800 flex-1 truncate">{g.details.title}</span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{g.details.period}</span>
                    {onTrack && <CheckCircle2 size={14} style={{ color: TEAL }} />}
                    {isAdmin && <button onClick={() => removeGoal(g.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: onTrack ? TEAL : '#E8A13C' }} />
                    </div>
                    <span className={`text-[12px] font-extrabold ${onTrack ? 'text-teal-700' : 'text-gray-700'}`}>
                      {g.details.unit}{value.toLocaleString()} / {g.details.unit}{g.details.target.toLocaleString()} · {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sales dept contributions */}
      <div className={sec + ' mb-4'}>
        <div className="flex items-center gap-1.5 mb-3 text-[13px] font-extrabold text-gray-900"><TrendingUp size={14} style={{ color: TEAL }} /> Sales Contributions <span className="text-[11px] font-medium text-gray-400">— {today}</span></div>
        {goals.length === 0 ? (
          <p className="text-[13px] text-gray-400 font-medium py-1">Create a financial goal first, then log contributions against it.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[12px] font-medium text-gray-600">Goal
              <select value={cGoal} onChange={e => setCGoal(e.target.value)}
                className="block w-56 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-800 focus:outline-none focus:ring-teal-500 bg-white">
                <option value="">Select goal…</option>
                {goals.map(g => <option key={g.id} value={g.details.title}>{g.details.title}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-medium text-gray-600">Contribution ($)
              <input value={cValue} onChange={e => setCValue(e.target.value)} inputMode="decimal" placeholder="0"
                className="block w-24 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-bold focus:outline-none focus:ring-teal-500" />
            </label>
            <label className="text-[12px] font-medium text-gray-600">Note
              <input value={cNote} onChange={e => setCNote(e.target.value)} placeholder="Optional — account or source…"
                className="block w-52 mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[13px] font-medium focus:outline-none focus:ring-teal-500" />
            </label>
            <button onClick={addCheckin} disabled={saving || !cGoal} className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>
              <span className="flex items-center gap-1"><CheckCircle2 size={13} /> {saving ? 'Saving…' : 'Log contribution'}</span>
            </button>
          </div>
        )}
        {todaysCheckins.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Today&apos;s contributions</div>
            {todaysCheckins.slice(0, 8).map(c => (
              <div key={c.id} className="flex items-center gap-2 text-[12px] bg-gray-50 rounded-xl px-3 py-2">
                <span className="font-bold text-gray-700">{c.details.goal_title}</span>
                <span className="font-extrabold" style={{ color: TEAL }}>{Number(c.details.value).toLocaleString()}</span>
                <span className="text-gray-400">· {c.details.logged_by}</span>
                {c.details.note && <span className="text-gray-400 truncate flex-1">— {c.details.note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}