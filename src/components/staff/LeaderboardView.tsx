'use client';
/* eslint-disable */

import { useState, useEffect } from 'react';
import { Trophy, Star, Gift, Crown, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Period = 'week' | 'month' | 'all';

interface StaffEntry {
  staff_name: string;
  total: number;
}

interface Incentive {
  id: string;
  title: string;
  emoji: string;
  description: string;
  points_required: number;
  quantity_available: number | null;
  is_active: boolean;
}

interface Redemption {
  id: string;
  incentive_id: string;
  status: string;
}

function getPeriodStart(period: Period): string | null {
  if (period === 'all') return null;
  const now = new Date();
  if (period === 'week') {
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  return null;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function LeaderboardView({
  hotelId,
  staffName,
  isAdmin,
}: {
  hotelId: string;
  staffName: string;
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<'leaderboard' | 'rewards' | 'manage'>('leaderboard');
  const [period, setPeriod] = useState<Period>('week');
  const [entries, setEntries] = useState<StaffEntry[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  // Manage tab state
  const [shoutoutName, setShoutoutName] = useState('');
  const [shoutoutMsg, setShoutoutMsg] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPoints, setCustomPoints] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [awarding, setAwarding] = useState(false);

  // Add incentive form
  const [incForm, setIncForm] = useState({ emoji: '🎁', title: '', description: '', points_required: '', quantity_available: '' });
  const [addingInc, setAddingInc] = useState(false);

  useEffect(() => {
    if (!hotelId) return;
    loadLeaderboard();
  }, [hotelId, period]);

  useEffect(() => {
    if (!hotelId) return;
    loadIncentivesAndRedemptions();
  }, [hotelId]);

  async function loadLeaderboard() {
    setLoading(true);
    const periodStart = getPeriodStart(period);
    let query = supabase
      .from('staff_points')
      .select('staff_name, points')
      .eq('hotel_id', hotelId);
    if (periodStart) query = query.gte('created_at', periodStart);

    const { data } = await query;
    const map = new Map<string, number>();
    for (const row of data || []) {
      map.set(row.staff_name, (map.get(row.staff_name) || 0) + (row.points || 0));
    }
    const sorted: StaffEntry[] = Array.from(map.entries())
      .map(([staff_name, total]) => ({ staff_name, total }))
      .sort((a, b) => b.total - a.total);
    setEntries(sorted);
    setLoading(false);
  }

  async function loadIncentivesAndRedemptions() {
    const [{ data: inc }, { data: red }] = await Promise.all([
      supabase.from('staff_incentives').select('*').eq('hotel_id', hotelId).order('points_required'),
      supabase.from('staff_redemptions').select('*').eq('hotel_id', hotelId).eq('staff_name', staffName),
    ]);
    setIncentives(inc || []);
    setRedemptions(red || []);
  }

  async function redeem(incentiveId: string) {
    await supabase.from('staff_redemptions').insert({
      hotel_id: hotelId,
      staff_name: staffName,
      incentive_id: incentiveId,
      status: 'pending',
    });
    loadIncentivesAndRedemptions();
  }

  async function awardShoutout() {
    if (!shoutoutName.trim()) return;
    setAwarding(true);
    try {
      await supabase.from('staff_points').insert({
        hotel_id: hotelId,
        staff_name: shoutoutName.trim(),
        points: 50,
        reason: 'shoutout',
        description: shoutoutMsg.trim() || 'Shoutout!',
      });
      setShoutoutName('');
      setShoutoutMsg('');
      loadLeaderboard();
    } finally {
      setAwarding(false);
    }
  }

  async function awardCustom() {
    if (!customName.trim() || !customPoints) return;
    setAwarding(true);
    try {
      await supabase.from('staff_points').insert({
        hotel_id: hotelId,
        staff_name: customName.trim(),
        points: Number(customPoints),
        reason: 'custom',
        description: customReason.trim() || 'Points awarded',
      });
      setCustomName('');
      setCustomPoints('');
      setCustomReason('');
      loadLeaderboard();
    } finally {
      setAwarding(false);
    }
  }

  async function toggleIncentive(id: string, current: boolean) {
    await supabase.from('staff_incentives').update({ is_active: !current }).eq('id', id);
    loadIncentivesAndRedemptions();
  }

  async function addIncentive() {
    if (!incForm.title.trim() || !incForm.points_required) return;
    setAddingInc(true);
    try {
      await supabase.from('staff_incentives').insert({
        hotel_id: hotelId,
        emoji: incForm.emoji,
        title: incForm.title.trim(),
        description: incForm.description.trim(),
        points_required: Number(incForm.points_required),
        quantity_available: incForm.quantity_available ? Number(incForm.quantity_available) : null,
        is_active: true,
      });
      setIncForm({ emoji: '🎁', title: '', description: '', points_required: '', quantity_available: '' });
      loadIncentivesAndRedemptions();
    } finally {
      setAddingInc(false);
    }
  }

  const myEntry = entries.find(e => e.staff_name === staffName);
  const myRank = myEntry ? entries.indexOf(myEntry) + 1 : null;
  const myPoints = myEntry?.total || 0;

  const activeIncentives = incentives.filter(i => i.is_active);
  const nextIncentive = activeIncentives.find(i => i.points_required > myPoints);
  const progressPct = nextIncentive
    ? Math.min(100, Math.round((myPoints / nextIncentive.points_required) * 100))
    : 100;

  const top3 = entries.slice(0, 3);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={20} className="text-teal-600" />
        <h1 className="text-[18px] font-extrabold text-gray-900">Leaderboard</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
        {(['leaderboard', 'rewards', ...(isAdmin ? ['manage'] : [])] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`flex-1 py-2 rounded-lg text-[12px] font-bold capitalize transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'leaderboard' ? '🏆 Board' : t === 'rewards' ? '🎁 Rewards' : '⚙️ Manage'}
          </button>
        ))}
      </div>

      {/* LEADERBOARD TAB */}
      {tab === 'leaderboard' && (
        <div>
          {/* Period chips */}
          <div className="flex gap-2 mb-6">
            {(['week', 'month', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${period === p ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-[13px]">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-[13px]">No points yet this period.</div>
          ) : (
            <>
              {/* Podium */}
              {top3.length > 0 && (
                <div className="flex items-end justify-center gap-3 mb-6">
                  {/* 2nd place (left) */}
                  {top3[1] && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[14px] font-bold" style={{ backgroundColor: '#9CA3AF' }}>
                        {initials(top3[1].staff_name)}
                      </div>
                      <p className="text-[10px] font-bold text-gray-700 truncate max-w-[64px] text-center">{top3[1].staff_name.split(' ')[0]}</p>
                      <p className="text-[10px] text-gray-500">{top3[1].total} pts</p>
                      <div className="w-14 h-12 rounded-t-lg flex items-center justify-center text-white text-[14px] font-bold" style={{ backgroundColor: '#9CA3AF' }}>2</div>
                    </div>
                  )}
                  {/* 1st place (center, larger) */}
                  {top3[0] && (
                    <div className="flex flex-col items-center gap-1 -mt-4">
                      <Crown size={18} style={{ color: '#F59E0B' }} />
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[16px] font-bold" style={{ backgroundColor: '#F59E0B' }}>
                        {initials(top3[0].staff_name)}
                      </div>
                      <p className="text-[11px] font-bold text-gray-800 truncate max-w-[72px] text-center">{top3[0].staff_name.split(' ')[0]}</p>
                      <p className="text-[10px] text-gray-500 font-semibold">{top3[0].total} pts</p>
                      <div className="w-14 h-16 rounded-t-lg flex items-center justify-center text-white text-[16px] font-bold" style={{ backgroundColor: '#F59E0B' }}>1</div>
                    </div>
                  )}
                  {/* 3rd place (right) */}
                  {top3[2] && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[14px] font-bold" style={{ backgroundColor: '#B45309' }}>
                        {initials(top3[2].staff_name)}
                      </div>
                      <p className="text-[10px] font-bold text-gray-700 truncate max-w-[64px] text-center">{top3[2].staff_name.split(' ')[0]}</p>
                      <p className="text-[10px] text-gray-500">{top3[2].total} pts</p>
                      <div className="w-14 h-10 rounded-t-lg flex items-center justify-center text-white text-[14px] font-bold" style={{ backgroundColor: '#B45309' }}>3</div>
                    </div>
                  )}
                </div>
              )}

              {/* Full list */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
                {entries.map((entry, idx) => {
                  const isMe = entry.staff_name === staffName;
                  return (
                    <div
                      key={entry.staff_name}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 ${isMe ? 'bg-teal-50' : ''}`}
                    >
                      <span className="text-[12px] font-bold text-gray-400 w-5 text-center">{idx + 1}</span>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                        style={{ backgroundColor: idx === 0 ? '#F59E0B' : idx === 1 ? '#9CA3AF' : idx === 2 ? '#B45309' : '#0D9488' }}>
                        {initials(entry.staff_name)}
                      </div>
                      <span className="flex-1 text-[13px] font-semibold text-gray-800">{entry.staff_name}</span>
                      {isMe && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white mr-1">YOU</span>
                      )}
                      <span className="text-[12px] font-bold text-teal-700">{entry.total} pts</span>
                    </div>
                  );
                })}
              </div>

              {/* Your Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-teal-100 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">Your Stats</p>
                <div className="flex gap-4 mb-3">
                  <div className="flex-1 bg-teal-50 rounded-xl p-3 text-center">
                    <p className="text-[22px] font-extrabold text-teal-700">{myPoints}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider">Points</p>
                  </div>
                  <div className="flex-1 bg-teal-50 rounded-xl p-3 text-center">
                    <p className="text-[22px] font-extrabold text-teal-700">{myRank ?? '—'}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider">Rank</p>
                  </div>
                </div>
                {nextIncentive && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-gray-500">Progress to: {nextIncentive.emoji} {nextIncentive.title}</p>
                      <p className="text-[10px] font-bold text-teal-600">{myPoints}/{nextIncentive.points_required}</p>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* REWARDS TAB */}
      {tab === 'rewards' && (
        <div>
          <p className="text-[12px] text-gray-500 mb-4">You have <strong className="text-teal-600">{myPoints} pts</strong></p>
          {activeIncentives.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-[13px]">No incentives available yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeIncentives.map(inc => {
                const redemption = redemptions.find(r => r.incentive_id === inc.id);
                const canAfford = myPoints >= inc.points_required;
                return (
                  <div key={inc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start gap-3">
                    <span className="text-3xl">{inc.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-gray-900">{inc.title}</p>
                      {inc.description && <p className="text-[11px] text-gray-500 mt-0.5">{inc.description}</p>}
                      <p className="text-[11px] font-semibold text-teal-600 mt-1">{inc.points_required} pts required</p>
                    </div>
                    {redemption ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">Pending</span>
                    ) : (
                      <button
                        onClick={() => redeem(inc.id)}
                        disabled={!canAfford}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white shrink-0 disabled:opacity-40 transition-colors"
                        style={{ backgroundColor: canAfford ? '#0D9488' : '#9CA3AF' }}
                      >
                        Redeem
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MANAGE TAB */}
      {tab === 'manage' && isAdmin && (
        <div className="space-y-5">
          {/* Shoutout */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">Add Shoutout (+50 pts)</p>
            <div className="space-y-2">
              <input
                placeholder="Staff name"
                value={shoutoutName}
                onChange={e => setShoutoutName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-teal-300"
              />
              <input
                placeholder="Message (optional)"
                value={shoutoutMsg}
                onChange={e => setShoutoutMsg(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-teal-300"
              />
              <button
                onClick={awardShoutout}
                disabled={awarding || !shoutoutName.trim()}
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white px-4 py-2 rounded-lg text-[12px] font-bold"
              >
                <Star size={12} /> {awarding ? 'Awarding…' : 'Award 50 pts'}
              </button>
            </div>
          </div>

          {/* Custom points */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">Custom Points</p>
            <div className="space-y-2">
              <input
                placeholder="Staff name"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-teal-300"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Points"
                  value={customPoints}
                  onChange={e => setCustomPoints(e.target.value)}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-teal-300"
                />
                <input
                  placeholder="Reason"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>
              <button
                onClick={awardCustom}
                disabled={awarding || !customName.trim() || !customPoints}
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white px-4 py-2 rounded-lg text-[12px] font-bold"
              >
                <Plus size={12} /> {awarding ? 'Awarding…' : 'Award Points'}
              </button>
            </div>
          </div>

          {/* Incentives list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">Incentives</p>
            {incentives.length === 0 ? (
              <p className="text-[12px] text-gray-400">No incentives yet.</p>
            ) : (
              <div className="space-y-2">
                {incentives.map(inc => (
                  <div key={inc.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-b-0">
                    <span className="text-xl">{inc.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800">{inc.title}</p>
                      <p className="text-[10px] text-gray-400">{inc.points_required} pts</p>
                    </div>
                    <button onClick={() => toggleIncentive(inc.id, inc.is_active)} className="text-gray-400 hover:text-teal-600 transition-colors">
                      {inc.is_active ? <ToggleRight size={20} className="text-teal-600" /> : <ToggleLeft size={20} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add incentive */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">Add Incentive</p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  placeholder="Emoji"
                  value={incForm.emoji}
                  onChange={e => setIncForm(f => ({ ...f, emoji: e.target.value }))}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-[14px] outline-none focus:ring-2 focus:ring-teal-300 text-center"
                />
                <input
                  placeholder="Title"
                  value={incForm.title}
                  onChange={e => setIncForm(f => ({ ...f, title: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>
              <input
                placeholder="Description"
                value={incForm.description}
                onChange={e => setIncForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-teal-300"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Points required"
                  value={incForm.points_required}
                  onChange={e => setIncForm(f => ({ ...f, points_required: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-teal-300"
                />
                <input
                  type="number"
                  placeholder="Qty (optional)"
                  value={incForm.quantity_available}
                  onChange={e => setIncForm(f => ({ ...f, quantity_available: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>
              <button
                onClick={addIncentive}
                disabled={addingInc || !incForm.title.trim() || !incForm.points_required}
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white px-4 py-2 rounded-lg text-[12px] font-bold"
              >
                <Gift size={12} /> {addingInc ? 'Adding…' : 'Add Incentive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
