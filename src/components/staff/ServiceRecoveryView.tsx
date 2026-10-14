'use client';

import { useState, useEffect, useCallback } from 'react';
import { LifeBuoy, Plus, RefreshCw, X as XIcon, AlertTriangle, Check, Send, Star } from 'lucide-react';
import {
  listServiceRecovery, createServiceRecovery, updateServiceRecovery,
  type OpRecord, type ServiceRecoveryCase,
} from '@/lib/opsStore';
import { supabase } from '@/lib/supabase';

const TEAL = '#158A7C';

const SEV_COLOR: Record<string, string> = { low: '#6b7280', medium: '#d97706', high: '#dc2626' };
const SEV_BG: Record<string, string> = { low: '#f3f4f6', medium: '#fef3c7', high: '#fee2e2' };
const SOURCE_LABEL: Record<string, string> = { in_house: 'In-House', brand: 'Brand' };

interface ReviewRow { id: string; guest_name: string; room: string; stars: number; feedback: string | null; created_at: string; }

function Stars({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= n ? 'text-amber-400' : 'text-gray-200'} fill={i <= n ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ServiceRecoveryView({
  hotelId, hotelName, staffName, isAdmin,
}: { hotelId: string; hotelName: string; staffName: string; isAdmin: boolean }) {
  const [cases, setCases] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'open' | 'closed' | 'reviews'>('open');
  const [showForm, setShowForm] = useState(false);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [saving, setSaving] = useState(false);

  // log-complaint form
  const [fGuest, setFGuest] = useState('');
  const [fRoom, setFRoom] = useState('');
  const [fSource, setFSource] = useState<'in_house' | 'brand'>('in_house');
  const [fChannel, setFChannel] = useState('Front Desk');
  const [fSev, setFSev] = useState<'low' | 'medium' | 'high'>('low');
  const [fIssue, setFIssue] = useState('');

  // follow-up form (open case id -> note/offer/outcome)
  const [fuId, setFuId] = useState<string | null>(null);
  const [fuNote, setFuNote] = useState('');
  const [fuOffer, setFuOffer] = useState('');
  const [fuOutcome, setFuOutcome] = useState<'recovered' | 'not_recovered' | 'escalated'>('recovered');

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const rows = await listServiceRecovery(hotelId);
    setCases(rows);
    const { data: rev } = await supabase.from('reviews').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false }).limit(50);
    setReviews(rev || []);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const openCases = cases.filter(c => (c.status || '') !== 'completed');
  const closedCases = cases.filter(c => (c.status || '') === 'completed');
  const visibleCases = tab === 'reviews' ? [] : tab === 'open' ? openCases : closedCases;
  const highsOpen = openCases.filter(c => c.details?.severity === 'high').length;

  const logCase = async () => {
    if (!fIssue.trim()) return;
    setSaving(true);
    await createServiceRecovery(hotelId, {
      guestName: fGuest.trim() || 'Guest', room: fRoom.trim(),
      issue: fIssue.trim(), source: fSource, channel: fChannel, severity: fSev,
      loggedBy: staffName || 'Staff', openedAt: new Date().toISOString(),
    });
    setFGuest(''); setFRoom(''); setFIssue(''); setFSev('low'); setFSource('in_house'); setFChannel('Front Desk');
    setShowForm(false); setSaving(false);
    load();
  };

  const closeCase = async (rec: OpRecord) => {
    const d = rec.details as ServiceRecoveryCase;
    setSaving(true);
    await updateServiceRecovery(rec.id, {
      details: { ...d, followUpBy: staffName || 'Manager', followUpAt: new Date().toISOString(), followUpNote: fuNote.trim() || undefined, recoveryOffer: fuOffer.trim() || undefined, outcome: fuOutcome, closedAt: new Date().toISOString() },
      status: 'completed',
    });
    setFuId(null); setFuNote(''); setFuOffer(''); setFuOutcome('recovered');
    setSaving(false);
    load();
  };

  const CaseCard = ({ rec }: { rec: OpRecord }) => {
    const d = rec.details as ServiceRecoveryCase;
    const sev = d.severity || 'low';
    const isFu = fuId === rec.id;
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4" style={sev === 'high' ? { borderColor: '#fecaca' } : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-bold text-gray-900">{d.guestName || 'Guest'}</span>
              {d.room && <span className="text-[12px] text-gray-500">Room {d.room}</span>}
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ color: '#1d4ed8', backgroundColor: '#dbeafe' }}>{SOURCE_LABEL[d.source] || d.source}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ color: SEV_COLOR[sev], backgroundColor: SEV_BG[sev] }}>{sev}</span>
            </div>
            <p className="text-[13px] text-gray-700 mt-1.5 leading-relaxed">{d.issue}</p>
            <p className="text-[11px] text-gray-400 mt-1.5">via {d.channel} · logged by {d.loggedBy || '—'} · {timeAgo(d.openedAt || rec.created_at)}</p>
            {d.followUpNote && (
              <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 text-[12px] text-gray-600">
                <span className="font-semibold">Follow-up{d.followUpBy ? ` (${d.followUpBy})` : ''}:</span> {d.followUpNote}
                {d.recoveryOffer && <span className="block mt-0.5 text-[11px]">Recovery: {d.recoveryOffer}</span>}
              </div>
            )}
            {rec.status === 'completed' && (
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: d.outcome === 'recovered' ? '#15803d' : d.outcome === 'escalated' ? '#b45309' : '#6b7280' }}>
                <Check size={12} /> {d.outcome === 'recovered' ? 'Recovered' : d.outcome === 'escalated' ? 'Escalated' : 'Closed — not recovered'}{d.closedAt ? ` · ${timeAgo(d.closedAt)}` : ''}
              </div>
            )}
          </div>
          {rec.status !== 'completed' && isAdmin && !isFu && (
            <button onClick={() => { setFuId(rec.id); setFuNote(d.followUpNote || ''); setFuOffer(d.recoveryOffer || ''); setFuOutcome('recovered'); }}
              className="shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: TEAL }}>Follow up</button>
          )}
          {rec.status !== 'completed' && !isAdmin && (
            <span className="shrink-0 text-[11px] text-gray-400">Awaiting manager</span>
          )}
        </div>
        {isFu && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <input value={fuNote} onChange={e => setFuNote(e.target.value)} placeholder="What did you do? Guest response?"
              className="w-full text-[13px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2" style={{ ['--tw-ring-color' as string]: TEAL }} />
            <input value={fuOffer} onChange={e => setFuOffer(e.target.value)} placeholder="Recovery offered (points, comp, amenity…)"
              className="w-full text-[13px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2" style={{ ['--tw-ring-color' as string]: TEAL }} />
            <div className="flex items-center gap-2">
              {(['recovered', 'not_recovered', 'escalated'] as const).map(o => (
                <button key={o} onClick={() => setFuOutcome(o)}
                  className="text-[12px] font-bold px-3 py-1.5 rounded-lg border"
                  style={fuOutcome === o ? { backgroundColor: TEAL, borderColor: TEAL, color: '#fff' } : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                  {o === 'recovered' ? 'Recovered' : o === 'not_recovered' ? 'Not recovered' : 'Escalated'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button disabled={saving} onClick={() => closeCase(rec)} className="flex-1 text-[13px] font-bold px-3 py-2 rounded-lg text-white flex items-center justify-center gap-1.5" style={{ backgroundColor: TEAL }}>
                <Send size={13} /> {saving ? 'Saving…' : 'Close case'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <LifeBuoy size={20} style={{ color: TEAL }} />
          <h2 className="text-[18px] font-extrabold text-gray-900">Service Recovery</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100"><RefreshCw size={16} className="text-gray-500" /></button>
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-lg text-white" style={{ backgroundColor: TEAL }}>
            {showForm ? <XIcon size={14} /> : <Plus size={14} />} {showForm ? 'Cancel' : 'Log Complaint'}
          </button>
        </div>
      </div>
      <p className="text-[12px] text-gray-500 mb-4">{hotelName} · log complaints for manager follow-up (in-house or brand) · every guest review lands here automatically</p>

      <div className="flex items-center gap-2 mb-4">
        {([['open', `Open (${openCases.length})`], ['closed', `Closed (${closedCases.length})`], ['reviews', `Reviews (${reviews.length})`]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className="text-[13px] font-bold px-3.5 py-1.5 rounded-lg border"
            style={tab === key ? { backgroundColor: TEAL, borderColor: TEAL, color: '#fff' } : { borderColor: '#e5e7eb', color: '#6b7280' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="text-[22px] font-extrabold text-gray-900">{openCases.length}</div>
          <div className="text-[11px] text-gray-500">Open cases</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3" style={highsOpen > 0 ? { borderColor: '#fecaca' } : undefined}>
          <div className="flex items-center gap-1"><span className="text-[22px] font-extrabold" style={{ color: highsOpen > 0 ? '#dc2626' : '#111827' }}>{highsOpen}</span>{highsOpen > 0 && <AlertTriangle size={14} style={{ color: '#dc2626' }} />}</div>
          <div className="text-[11px] text-gray-500">High severity</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="text-[22px] font-extrabold text-gray-900">{closedCases.length}</div>
          <div className="text-[11px] text-gray-500">Closed</div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <input value={fGuest} onChange={e => setFGuest(e.target.value)} placeholder="Guest name" className="text-[13px] px-3 py-2 border border-gray-200 rounded-lg" />
            <input value={fRoom} onChange={e => setFRoom(e.target.value)} placeholder="Room # (optional)" className="text-[13px] px-3 py-2 border border-gray-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <select value={fSource} onChange={e => setFSource(e.target.value as 'in_house' | 'brand')} className="text-[13px] px-3 py-2 border border-gray-200 rounded-lg bg-white">
              <option value="in_house">Complaint received in-house</option>
              <option value="brand">Complaint from brand</option>
            </select>
            <select value={fChannel} onChange={e => setFChannel(e.target.value)} className="text-[13px] px-3 py-2 border border-gray-200 rounded-lg bg-white">
              {['Front Desk', 'Phone', 'In person', 'Online review', 'Brand survey', 'Email', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-500 font-semibold">Severity:</span>
            {(['low', 'medium', 'high'] as const).map(s => (
              <button key={s} onClick={() => setFSev(s)} className="text-[12px] font-bold px-3 py-1.5 rounded-lg border capitalize"
                style={fSev === s ? { backgroundColor: SEV_COLOR[s], borderColor: SEV_COLOR[s], color: '#fff' } : { borderColor: '#e5e7eb', color: '#6b7280' }}>{s}</button>
            ))}
          </div>
          <textarea value={fIssue} onChange={e => setFIssue(e.target.value)} rows={3} placeholder="What did the guest experience? Be specific — this is what the manager will follow up on."
            className="w-full text-[13px] px-3 py-2 border border-gray-200 rounded-lg" />
          <button disabled={saving || !fIssue.trim()} onClick={logCase} className="w-full text-[13px] font-bold px-3 py-2.5 rounded-lg text-white flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ backgroundColor: TEAL }}>
            <Send size={13} /> {saving ? 'Logging…' : 'Log complaint'}
          </button>
        </div>
      )}

      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center text-[13px] text-gray-400 py-8">Loading…</div>
        ) : cases.length === 0 ? (
          <div className="text-center text-[13px] text-gray-400 py-10">No complaints logged. When a guest is unhappy, log it here so nothing slips.</div>
        ) : (
          <>
            {openCases.length > 0 && tab === 'open' && <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 pt-1">Open — needs follow-up</div>}
            {visibleCases.map(rec => <CaseCard key={rec.id} rec={rec} />)}
            {tab === 'closed' && closedCases.length === 0 && <div className="text-center text-[13px] text-gray-400 py-10">No closed cases yet.</div>}
          </>
        )}
      </div>

      {tab === 'reviews' && (
        <div className="space-y-2.5">
          {reviews.length === 0 ? (
            <div className="text-center text-[13px] text-gray-400 py-10">No reviews yet. When guests rate their stay in the app, every review saves here.</div>
          ) : reviews.map(rv => (
            <div key={rv.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-bold text-gray-900">{rv.guest_name}</span>
                    {rv.room && <span className="text-[12px] text-gray-500">Room {rv.room}</span>}
                    <Stars n={rv.stars} />
                  </div>
                  {rv.feedback && <p className="text-[13px] text-gray-700 mt-1.5 leading-relaxed">{rv.feedback}</p>}
                  <p className="text-[11px] text-gray-400 mt-1.5">{new Date(rv.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ color: rv.stars <= 2 ? '#dc2626' : rv.stars === 3 ? '#d97706' : '#15803d', backgroundColor: rv.stars <= 2 ? '#fee2e2' : rv.stars === 3 ? '#fef3c7' : '#dcfce7' }}>
                  {rv.stars <= 2 ? 'Recovery pending' : rv.stars === 3 ? 'Watch' : 'Great'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}