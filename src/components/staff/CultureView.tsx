'use client';
/* eslint-disable */

import { useState, useEffect } from 'react';
import { Trophy, Gift, Star, Plus, X, Calendar, Cake, PartyPopper, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const TEAL = '#0D9488';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PointRow { staff_name: string; total: number; }
interface Incentive { id: string; title: string; description: string; points_required: number; emoji: string; is_active: boolean; }
interface Redemption { id: string; incentive_title: string; points_spent: number; status: string; requested_at: string; }
interface BirthdayEntry { id: string; name: string; birthday: string; department?: string; }
interface CalEvent { id: string; title: string; event_date: string; description?: string; emoji?: string; }

type Period = 'week' | 'month' | 'all';
type SubTab = 'board' | 'rewards' | 'birthdays' | 'events' | 'manage';

const MEDAL = ['🥇','🥈','🥉'];
const PODIUM_COLORS = [
  { bg: '#FEF9C3', border: '#F59E0B', text: '#92400E' },
  { bg: '#F1F5F9', border: '#94A3B8', text: '#475569' },
  { bg: '#FEF3E2', border: '#B45309', text: '#92400E' },
];

function periodStart(p: Period): string | null {
  const now = new Date();
  if (p === 'week') {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0,0,0,0);
    return mon.toISOString();
  }
  if (p === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  return null;
}

function daysUntilBirthday(bdStr: string): number {
  const now = new Date();
  const bd = new Date(bdStr + 'T00:00:00');
  const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return Math.round((next.getTime() - now.getTime()) / 86400000);
}

function monthDay(bdStr: string): string {
  return new Date(bdStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CultureView({
  hotelId,
  staffName,
  isAdmin,
}: {
  hotelId: string;
  staffName: string;
  isAdmin: boolean;
}) {
  const [sub, setSub] = useState<SubTab>('board');
  const [period, setPeriod] = useState<Period>('month');
  const [board, setBoard] = useState<PointRow[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<Redemption[]>([]);
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  // Admin forms
  const [shoutoutName, setShoutoutName] = useState('');
  const [shoutoutMsg, setShoutoutMsg] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPts, setCustomPts] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [newIncentive, setNewIncentive] = useState({ title: '', description: '', points_required: '', emoji: '🎁', quantity_available: '' });
  const [newBirthday, setNewBirthday] = useState({ name: '', birthday: '', department: '' });
  const [newEvent, setNewEvent] = useState({ title: '', event_date: '', description: '', emoji: '🎉' });
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const ps = periodStart(period);
      let q = supabase.from('staff_points').select('staff_name, points').eq('hotel_id', hotelId);
      if (ps) q = q.gte('created_at', ps);
      const { data: pts } = await q;

      // Aggregate
      const map: Record<string, number> = {};
      for (const r of pts || []) {
        map[r.staff_name] = (map[r.staff_name] || 0) + r.points;
      }
      const sorted = Object.entries(map).map(([staff_name, total]) => ({ staff_name, total })).sort((a,b) => b.total - a.total);
      setBoard(sorted);

      const [{ data: inc }, { data: red }, { data: bds }, { data: evs }] = await Promise.all([
        supabase.from('staff_incentives').select('*').eq('hotel_id', hotelId).eq('is_active', true).order('points_required'),
        supabase.from('staff_redemptions').select('*').eq('hotel_id', hotelId).eq('staff_name', staffName).order('requested_at', { ascending: false }),
        supabase.from('staff_birthdays').select('*').eq('hotel_id', hotelId).order('birthday'),
        supabase.from('staff_events').select('*').eq('hotel_id', hotelId).gte('event_date', new Date().toISOString().split('T')[0]).order('event_date').limit(20),
      ]);
      setIncentives(inc || []);
      setMyRedemptions(red || []);
      setBirthdays(bds || []);
      setEvents(evs || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (hotelId) loadAll(); }, [hotelId, period]);

  const myPoints = board.find(r => r.staff_name === staffName)?.total || 0;
  const myRank = board.findIndex(r => r.staff_name === staffName) + 1;
  const nextReward = incentives.find(i => i.points_required > myPoints);
  const podium = [board[1], board[0], board[2]].filter(Boolean); // silver, gold, bronze order
  const podiumOrder = board.slice(0, 3);

  async function redeem(incentive: Incentive) {
    if (myPoints < incentive.points_required) return;
    const already = myRedemptions.find(r => r.incentive_title === incentive.title && r.status === 'pending');
    if (already) return;
    setRedeeming(incentive.id);
    try {
      await supabase.from('staff_redemptions').insert({
        hotel_id: hotelId, incentive_id: incentive.id, incentive_title: incentive.title,
        staff_name: staffName, points_spent: incentive.points_required, status: 'pending',
      });
      await loadAll();
    } finally { setRedeeming(null); }
  }

  async function giveShoutout() {
    if (!shoutoutName) return;
    setSaving(true);
    await supabase.from('staff_points').insert({ hotel_id: hotelId, staff_name: shoutoutName, points: 50, reason: 'shoutout', description: shoutoutMsg || `Shoutout from ${staffName}`, awarded_by: staffName });
    setShoutoutName(''); setShoutoutMsg('');
    setSaving(false); await loadAll();
  }

  async function giveCustom() {
    if (!customName || !customPts) return;
    setSaving(true);
    await supabase.from('staff_points').insert({ hotel_id: hotelId, staff_name: customName, points: parseInt(customPts), reason: 'manual', description: customReason || 'Admin award', awarded_by: staffName });
    setCustomName(''); setCustomPts(''); setCustomReason('');
    setSaving(false); await loadAll();
  }

  async function addIncentive() {
    if (!newIncentive.title || !newIncentive.points_required) return;
    setSaving(true);
    await supabase.from('staff_incentives').insert({ hotel_id: hotelId, ...newIncentive, points_required: parseInt(newIncentive.points_required), quantity_available: parseInt(newIncentive.quantity_available) || null });
    setNewIncentive({ title: '', description: '', points_required: '', emoji: '🎁', quantity_available: '' });
    setSaving(false); await loadAll();
  }

  async function addBirthday() {
    if (!newBirthday.name || !newBirthday.birthday) return;
    setSaving(true);
    await supabase.from('staff_birthdays').insert({ hotel_id: hotelId, ...newBirthday });
    setNewBirthday({ name: '', birthday: '', department: '' });
    setSaving(false); await loadAll();
  }

  async function deleteBirthday(id: string) {
    await supabase.from('staff_birthdays').delete().eq('id', id);
    await loadAll();
  }

  async function addEvent() {
    if (!newEvent.title || !newEvent.event_date) return;
    setSaving(true);
    await supabase.from('staff_events').insert({ hotel_id: hotelId, ...newEvent });
    setNewEvent({ title: '', event_date: '', description: '', emoji: '🎉' });
    setSaving(false); await loadAll();
  }

  async function deleteEvent(id: string) {
    await supabase.from('staff_events').delete().eq('id', id);
    await loadAll();
  }

  // Birthdays within 30 days
  const upcomingBirthdays = birthdays
    .map(b => ({ ...b, daysUntil: daysUntilBirthday(b.birthday) }))
    .filter(b => b.daysUntil <= 30)
    .sort((a,b) => a.daysUntil - b.daysUntil);

  const todayBirthdays = birthdays.filter(b => daysUntilBirthday(b.birthday) === 0);

  const TABS: { key: SubTab; label: string; icon: any }[] = [
    { key: 'board', label: 'Board', icon: Trophy },
    { key: 'rewards', label: 'Rewards', icon: Gift },
    { key: 'birthdays', label: 'Birthdays', icon: Cake },
    { key: 'events', label: 'Events', icon: Calendar },
    ...(isAdmin ? [{ key: 'manage' as SubTab, label: 'Manage', icon: Star }] : []),
  ];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F9FAFB', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)', padding: '20px 16px 0', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Heart size={22} fill="#fff" color="#fff" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>Culture Hub</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Your team, your vibe, your wins</div>
          </div>
        </div>

        {/* My stats bar */}
        <div style={{ display: 'flex', gap: 12, marginTop: 14, marginBottom: 0 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(4px)' }}>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>Your Points</div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>{myPoints.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(4px)' }}>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>Your Rank</div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>#{myRank || '—'}</div>
          </div>
          {nextReward && (
            <div style={{ flex: 2, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(4px)' }}>
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>Next: {nextReward.emoji} {nextReward.title}</div>
              <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#fff', borderRadius: 99, width: `${Math.min(100, Math.round((myPoints / nextReward.points_required) * 100))}%`, transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: 10, opacity: 0.75, marginTop: 3 }}>{myPoints} / {nextReward.points_required} pts</div>
            </div>
          )}
        </div>

        {/* Birthday alert */}
        {todayBirthdays.length > 0 && (
          <div style={{ margin: '12px 0 0', background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🎂</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Happy Birthday!</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>{todayBirthdays.map(b => b.name).join(', ')} 🎉</div>
            </div>
          </div>
        )}

        {/* Sub tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 16, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setSub(t.key)} style={{
              flex: 'none', padding: '10px 16px', fontWeight: 600, fontSize: 13, border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: sub === t.key ? '2px solid #fff' : '2px solid transparent',
              color: sub === t.key ? '#fff' : 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>

        {/* ── LEADERBOARD ── */}
        {sub === 'board' && (
          <>
            {/* Period selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['week','month','all'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: period === p ? TEAL : '#F3F4F6', color: period === p ? '#fff' : '#6B7280',
                }}>
                  {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading…</div>
            ) : board.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                <div style={{ fontWeight: 600 }}>No points yet</div>
                <div style={{ fontSize: 13 }}>Complete checklists and hit KPI targets to earn points</div>
              </div>
            ) : (
              <>
                {/* Podium */}
                {podiumOrder.length >= 2 && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 20, padding: '0 16px' }}>
                    {/* Silver (#2) */}
                    {podiumOrder[1] && (
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 28, marginBottom: 4 }}>🥈</div>
                        <div style={{ background: PODIUM_COLORS[1].bg, border: `2px solid ${PODIUM_COLORS[1].border}`, borderRadius: '12px 12px 0 0', padding: '12px 8px', borderBottom: 'none' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: PODIUM_COLORS[1].border, color: '#fff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                            {podiumOrder[1].staff_name[0]?.toUpperCase()}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 12, color: PODIUM_COLORS[1].text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{podiumOrder[1].staff_name}</div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: PODIUM_COLORS[1].text }}>{podiumOrder[1].total.toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8' }}>pts</div>
                        </div>
                        <div style={{ height: 50, background: '#E2E8F0', borderRadius: '0 0 4px 4px' }} />
                      </div>
                    )}
                    {/* Gold (#1) */}
                    {podiumOrder[0] && (
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 32, marginBottom: 4 }}>🥇</div>
                        <div style={{ background: PODIUM_COLORS[0].bg, border: `2px solid ${PODIUM_COLORS[0].border}`, borderRadius: '12px 12px 0 0', padding: '14px 8px', borderBottom: 'none' }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: PODIUM_COLORS[0].border, color: '#fff', fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                            {podiumOrder[0].staff_name[0]?.toUpperCase()}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: PODIUM_COLORS[0].text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{podiumOrder[0].staff_name}</div>
                          <div style={{ fontWeight: 800, fontSize: 16, color: PODIUM_COLORS[0].text }}>{podiumOrder[0].total.toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: '#92400E' }}>pts</div>
                        </div>
                        <div style={{ height: 70, background: '#FDE68A', borderRadius: '0 0 4px 4px' }} />
                      </div>
                    )}
                    {/* Bronze (#3) */}
                    {podiumOrder[2] && (
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 28, marginBottom: 4 }}>🥉</div>
                        <div style={{ background: PODIUM_COLORS[2].bg, border: `2px solid ${PODIUM_COLORS[2].border}`, borderRadius: '12px 12px 0 0', padding: '12px 8px', borderBottom: 'none' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: PODIUM_COLORS[2].border, color: '#fff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                            {podiumOrder[2].staff_name[0]?.toUpperCase()}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 12, color: PODIUM_COLORS[2].text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{podiumOrder[2].staff_name}</div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: PODIUM_COLORS[2].text }}>{podiumOrder[2].total.toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: '#B45309' }}>pts</div>
                        </div>
                        <div style={{ height: 35, background: '#FCD9A0', borderRadius: '0 0 4px 4px' }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Full list */}
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                  {board.map((row, idx) => {
                    const isMe = row.staff_name === staffName;
                    return (
                      <div key={row.staff_name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: idx < board.length - 1 ? '1px solid #F9FAFB' : 'none', background: isMe ? '#F0FDFA' : '#fff' }}>
                        <div style={{ width: 28, fontWeight: 800, fontSize: 14, color: idx < 3 ? TEAL : '#9CA3AF', textAlign: 'center' }}>
                          {idx < 3 ? MEDAL[idx] : `#${idx+1}`}
                        </div>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: isMe ? TEAL : '#E5E7EB', color: isMe ? '#fff' : '#6B7280', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {row.staff_name[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                            {row.staff_name} {isMe && <span style={{ fontSize: 11, background: TEAL, color: '#fff', padding: '1px 6px', borderRadius: 10, marginLeft: 4 }}>YOU</span>}
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: idx === 0 ? '#F59E0B' : '#111827' }}>
                          {row.total.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ── REWARDS ── */}
        {sub === 'rewards' && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 4 }}>Your Rewards</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>You have <strong>{myPoints.toLocaleString()} pts</strong>. Redeem them below.</div>

            {incentives.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                <div style={{ fontSize: 32 }}>🎁</div>
                <div style={{ fontWeight: 600, marginTop: 8 }}>No rewards yet</div>
                <div style={{ fontSize: 13 }}>Ask your admin to add incentives</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {incentives.map(inc => {
                  const canRedeem = myPoints >= inc.points_required;
                  const pending = myRedemptions.find(r => r.incentive_title === inc.title && r.status === 'pending');
                  const pct = Math.min(100, Math.round((myPoints / inc.points_required) * 100));
                  return (
                    <div key={inc.id} style={{ background: '#fff', borderRadius: 16, border: canRedeem ? `1.5px solid ${TEAL}` : '1px solid #E5E7EB', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div style={{ fontSize: 32 }}>{inc.emoji}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{inc.title}</div>
                          {inc.description && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{inc.description}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: 16, color: TEAL }}>{inc.points_required.toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: '#9CA3AF' }}>pts</div>
                        </div>
                      </div>
                      {!canRedeem && (
                        <>
                          <div style={{ background: '#F3F4F6', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 6 }}>
                            <div style={{ height: '100%', background: TEAL, borderRadius: 99, width: `${pct}%`, transition: 'width 0.4s' }} />
                          </div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 10 }}>{myPoints} / {inc.points_required} pts ({pct}%)</div>
                        </>
                      )}
                      <button
                        onClick={() => !pending && canRedeem && redeem(inc)}
                        disabled={!canRedeem || !!pending || redeeming === inc.id}
                        style={{
                          width: '100%', padding: '10px', borderRadius: 10, border: 'none', cursor: canRedeem && !pending ? 'pointer' : 'default',
                          fontWeight: 700, fontSize: 13,
                          background: pending ? '#D1FAE5' : canRedeem ? TEAL : '#F3F4F6',
                          color: pending ? '#065F46' : canRedeem ? '#fff' : '#9CA3AF',
                        }}
                      >
                        {pending ? '✓ Request Pending' : canRedeem ? '🎁 Redeem Now' : `Need ${(inc.points_required - myPoints).toLocaleString()} more pts`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── BIRTHDAYS ── */}
        {sub === 'birthdays' && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 4 }}>🎂 Birthdays</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Upcoming in the next 30 days</div>

            {upcomingBirthdays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
                <div style={{ fontSize: 32 }}>🎂</div>
                <div style={{ fontWeight: 600, marginTop: 8 }}>No upcoming birthdays</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingBirthdays.map(b => (
                  <div key={b.id} style={{ background: '#fff', borderRadius: 14, border: b.daysUntil === 0 ? '1.5px solid #F59E0B' : '1px solid #E5E7EB', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: b.daysUntil === 0 ? '#FEF3C7' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      🎂
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{b.department || 'Staff'} · {monthDay(b.birthday)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {b.daysUntil === 0 ? (
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#F59E0B' }}>🎉 Today!</div>
                      ) : b.daysUntil === 1 ? (
                        <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>Tomorrow</div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>in {b.daysUntil} days</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All birthdays list */}
            {birthdays.length > upcomingBirthdays.length && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>All Team Birthdays</div>
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                  {birthdays.filter(b => daysUntilBirthday(b.birthday) > 30).map((b, idx, arr) => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: idx < arr.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#374151' }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{monthDay(b.birthday)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && (
              <div style={{ marginTop: 20, background: '#F9FAFB', borderRadius: 14, padding: 16, border: '1px solid #E5E7EB' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>+ Add Birthday</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={newBirthday.name} onChange={e => setNewBirthday(f => ({ ...f, name: e.target.value }))} placeholder="Staff name *" style={inp} />
                  <input value={newBirthday.birthday} onChange={e => setNewBirthday(f => ({ ...f, birthday: e.target.value }))} type="date" style={inp} />
                  <input value={newBirthday.department} onChange={e => setNewBirthday(f => ({ ...f, department: e.target.value }))} placeholder="Department" style={inp} />
                  <button onClick={addBirthday} disabled={saving || !newBirthday.name || !newBirthday.birthday} style={saveBtnStyle}>Add Birthday</button>
                </div>
                {birthdays.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6 }}>Manage</div>
                    {birthdays.map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ flex: 1, fontSize: 13, color: '#374151' }}>{b.name} · {monthDay(b.birthday)}</div>
                        <button onClick={() => deleteBirthday(b.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── EVENTS ── */}
        {sub === 'events' && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 4 }}>📅 Events & Activities</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Upcoming team activities</div>

            {events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
                <div style={{ fontSize: 32 }}>📅</div>
                <div style={{ fontWeight: 600, marginTop: 8 }}>No upcoming events</div>
                {isAdmin && <div style={{ fontSize: 13 }}>Add team activities below</div>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {events.map(ev => {
                  const evDate = new Date(ev.event_date + 'T00:00:00');
                  const isToday = ev.event_date === new Date().toISOString().split('T')[0];
                  return (
                    <div key={ev.id} style={{ background: '#fff', borderRadius: 14, border: isToday ? `1.5px solid ${TEAL}` : '1px solid #E5E7EB', padding: '14px 16px', display: 'flex', gap: 12 }}>
                      <div style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
                        <div style={{ fontSize: 22 }}>{ev.emoji || '🎉'}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: TEAL, marginTop: 2 }}>
                          {evDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{evDate.getDate()}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{ev.title}</div>
                        {ev.description && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 1.4 }}>{ev.description}</div>}
                        {isToday && <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, marginTop: 4 }}>📍 Today!</div>}
                      </div>
                      {isAdmin && (
                        <button onClick={() => deleteEvent(ev.id)} style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', padding: 4, alignSelf: 'flex-start' }}><X size={14} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isAdmin && (
              <div style={{ marginTop: 20, background: '#F9FAFB', borderRadius: 14, padding: 16, border: '1px solid #E5E7EB' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>+ Add Event</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={newEvent.emoji} onChange={e => setNewEvent(f => ({ ...f, emoji: e.target.value }))} style={{ ...inp, width: 60, textAlign: 'center', fontSize: 20 }} />
                    <input value={newEvent.title} onChange={e => setNewEvent(f => ({ ...f, title: e.target.value }))} placeholder="Event title *" style={{ ...inp, flex: 1 }} />
                  </div>
                  <input value={newEvent.event_date} onChange={e => setNewEvent(f => ({ ...f, event_date: e.target.value }))} type="date" style={inp} />
                  <textarea value={newEvent.description} onChange={e => setNewEvent(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2} style={{ ...inp, resize: 'none' }} />
                  <button onClick={addEvent} disabled={saving || !newEvent.title || !newEvent.event_date} style={saveBtnStyle}>Add Event</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MANAGE (admin) ── */}
        {sub === 'manage' && isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Shoutout */}
            <Section title="🎤 Give a Shoutout" subtitle="+50 pts">
              <input value={shoutoutName} onChange={e => setShoutoutName(e.target.value)} placeholder="Staff name *" style={inp} />
              <textarea value={shoutoutMsg} onChange={e => setShoutoutMsg(e.target.value)} placeholder="What did they do? (optional)" rows={2} style={{ ...inp, resize: 'none', marginTop: 8 }} />
              <button onClick={giveShoutout} disabled={saving || !shoutoutName} style={{ ...saveBtnStyle, marginTop: 8 }}>🎤 Award Shoutout (+50 pts)</button>
            </Section>

            {/* Custom points */}
            <Section title="⭐ Award Custom Points">
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Staff name *" style={inp} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={customPts} onChange={e => setCustomPts(e.target.value)} placeholder="Points *" type="number" style={{ ...inp, width: 100 }} />
                <input value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="Reason" style={{ ...inp, flex: 1 }} />
              </div>
              <button onClick={giveCustom} disabled={saving || !customName || !customPts} style={{ ...saveBtnStyle, marginTop: 8 }}>Award Points</button>
            </Section>

            {/* Redemption requests */}
            <Section title="📋 Redemption Requests">
              <PendingRedemptions hotelId={hotelId} />
            </Section>

            {/* Add incentive */}
            <Section title="🎁 Add Reward">
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newIncentive.emoji} onChange={e => setNewIncentive(f => ({ ...f, emoji: e.target.value }))} style={{ ...inp, width: 60, textAlign: 'center', fontSize: 20 }} />
                <input value={newIncentive.title} onChange={e => setNewIncentive(f => ({ ...f, title: e.target.value }))} placeholder="Reward title *" style={{ ...inp, flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={newIncentive.points_required} onChange={e => setNewIncentive(f => ({ ...f, points_required: e.target.value }))} placeholder="Points needed *" type="number" style={{ ...inp, flex: 1 }} />
                <input value={newIncentive.quantity_available} onChange={e => setNewIncentive(f => ({ ...f, quantity_available: e.target.value }))} placeholder="Qty (blank=∞)" type="number" style={{ ...inp, flex: 1 }} />
              </div>
              <textarea value={newIncentive.description} onChange={e => setNewIncentive(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} style={{ ...inp, resize: 'none', marginTop: 8 }} />
              <button onClick={addIncentive} disabled={saving || !newIncentive.title || !newIncentive.points_required} style={{ ...saveBtnStyle, marginTop: 8 }}>+ Add Reward</button>
            </Section>

            {/* Current incentives */}
            {incentives.length > 0 && (
              <Section title="Current Rewards">
                {incentives.map(i => (
                  <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: 20 }}>{i.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{i.title}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{i.points_required} pts</div>
                    </div>
                    <button onClick={async () => { await supabase.from('staff_incentives').update({ is_active: !i.is_active }).eq('id', i.id); await loadAll(); }} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: i.is_active ? '#D1FAE5' : '#F3F4F6', color: i.is_active ? '#065F46' : '#9CA3AF' }}>
                      {i.is_active ? 'Active' : 'Off'}
                    </button>
                  </div>
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#9CA3AF' }}>{subtitle}</div>}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function PendingRedemptions({ hotelId }: { hotelId: string }) {
  const [reqs, setReqs] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('staff_redemptions').select('*').eq('hotel_id', hotelId).eq('status', 'pending').order('requested_at').then(({ data }) => setReqs(data || []));
  }, [hotelId]);

  if (reqs.length === 0) return <div style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>No pending requests</div>;

  return (
    <div>
      {reqs.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{r.staff_name}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{r.incentive_title} · {r.points_spent} pts</div>
          </div>
          <button onClick={async () => { await supabase.from('staff_redemptions').update({ status: 'approved' }).eq('id', r.id); setReqs(p => p.filter(x => x.id !== r.id)); }} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#D1FAE5', color: '#065F46' }}>Approve</button>
          <button onClick={async () => { await supabase.from('staff_redemptions').update({ status: 'rejected' }).eq('id', r.id); setReqs(p => p.filter(x => x.id !== r.id)); }} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#991B1B' }}>Decline</button>
        </div>
      ))}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E5E7EB',
  borderRadius: 10, fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
};

const saveBtnStyle: React.CSSProperties = {
  width: '100%', padding: '10px', background: TEAL, color: '#fff', border: 'none',
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
};
