'use client';

import { useState, useEffect, useCallback } from 'react';
import { listOps, createOps, updateOps, type OpRecord } from '@/lib/opsStore';
import { AlertTriangle, CheckCircle, XCircle, ChevronUp, Phone } from 'lucide-react';

const TEAL = '#0D9488';

interface CalloutsViewProps {
  hotelId: string;
  isAdmin: boolean;
  staffName: string;
}

type CalloutFilter = 'all' | 'pending' | 'resolved';

interface CalloutDetails {
  reason: string;
  shift_date: string;
  shift_start: string;
  shift_end: string;
  notes?: string;
  staff_name: string;
}

function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatShiftDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

const REASON_STYLES: Record<string, string> = {
  Sick: 'bg-red-100 text-red-700 border border-red-200',
  'Family Emergency': 'bg-orange-100 text-orange-700 border border-orange-200',
  Personal: 'bg-amber-100 text-amber-700 border border-amber-200',
  Other: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  completed: 'bg-green-100 text-green-700 border border-green-200',
  closed: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  completed: 'Acknowledged',
  closed: 'Denied',
};

function ReasonBadge({ reason }: { reason: string }) {
  const cls = REASON_STYLES[reason] || REASON_STYLES['Other'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {reason || 'Other'}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES['pending'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ─── Staff view ────────────────────────────────────────────────

function StaffCalloutView({ hotelId, staffName }: { hotelId: string; staffName: string }) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myCallouts, setMyCallouts] = useState<OpRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [shiftDate, setShiftDate] = useState(getLocalToday());
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [reason, setReason] = useState('Sick');
  const [notes, setNotes] = useState('');

  const loadMyCallouts = useCallback(async () => {
    setLoadingList(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await listOps(hotelId, 'staff_callout' as any);
    const mine = all.filter((r) => {
      const d = r.details as CalloutDetails;
      return d?.staff_name === staffName;
    });
    mine.sort((a, b) => {
      const da = (a.details as CalloutDetails).shift_date || '';
      const db = (b.details as CalloutDetails).shift_date || '';
      return db.localeCompare(da);
    });
    setMyCallouts(mine);
    setLoadingList(false);
  }, [hotelId, staffName]);

  useEffect(() => { loadMyCallouts(); }, [loadMyCallouts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await createOps(
      hotelId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'staff_callout' as any,
      { reason, shift_date: shiftDate, shift_start: shiftStart, shift_end: shiftEnd, notes, staff_name: staffName },
      'pending',
      { guest_name: staffName, room: 'STAFF' }
    );
    setSubmitted(true);
    setShowForm(false);
    setShiftDate(getLocalToday());
    setShiftStart('');
    setShiftEnd('');
    setReason('Sick');
    setNotes('');
    setSubmitting(false);
    await loadMyCallouts();
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-extrabold text-gray-900">My Callouts</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Report a missed or upcoming shift</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setSubmitted(false); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[13px] font-semibold shadow-sm transition-all"
          style={{ backgroundColor: TEAL }}
        >
          {showForm ? (
            <><ChevronUp size={14} /> Cancel</>
          ) : (
            <><Phone size={14} /> Report a Callout</>
          )}
        </button>
      </div>

      {/* Success banner */}
      {submitted && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <p className="text-[13px] font-semibold text-green-800">
            Callout reported. Your manager has been notified.
          </p>
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-[13px] font-bold text-gray-700">Callout Details</p>
          </div>
          <div className="p-4 space-y-3">
            {/* Shift date */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Shift Date
              </label>
              <input
                type="date"
                required
                value={shiftDate}
                onChange={e => setShiftDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 bg-white"
              />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Shift Start
                </label>
                <input
                  type="time"
                  value={shiftStart}
                  onChange={e => setShiftStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Shift End
                </label>
                <input
                  type="time"
                  value={shiftEnd}
                  onChange={e => setShiftEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 bg-white"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Reason
              </label>
              <select
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 bg-white"
              >
                <option value="Sick">Sick</option>
                <option value="Family Emergency">Family Emergency</option>
                <option value="Personal">Personal</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Notes <span className="text-gray-400 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional context for your manager..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl text-white text-[14px] font-bold shadow-sm disabled:opacity-60 transition-all"
              style={{ backgroundColor: TEAL }}
            >
              {submitting ? 'Submitting…' : 'Submit Callout'}
            </button>
          </div>
        </form>
      )}

      {/* My callout history */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">My History</p>
        {loadingList ? (
          <div className="text-center py-10 text-gray-400 text-[13px]">Loading…</div>
        ) : myCallouts.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-[13px]">No callouts yet.</div>
        ) : (
          <div className="space-y-2">
            {myCallouts.map(r => {
              const d = r.details as CalloutDetails;
              return (
                <div key={r.id} className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[13px] font-bold text-gray-800">
                      {formatShiftDate(d.shift_date)}
                      {d.shift_start && d.shift_end && (
                        <span className="ml-2 text-gray-400 font-normal text-[12px]">
                          {formatTime(d.shift_start)} – {formatTime(d.shift_end)}
                        </span>
                      )}
                    </p>
                    <StatusBadge status={r.status} />
                  </div>
                  <ReasonBadge reason={d.reason} />
                  {d.notes && (
                    <p className="mt-1.5 text-[12px] text-gray-500 leading-relaxed">{d.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin view ────────────────────────────────────────────────

function AdminCalloutView({ hotelId }: { hotelId: string }) {
  const [callouts, setCallouts] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CalloutFilter>('pending');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const today = getLocalToday();
  const tomorrow = getTomorrow();

  const loadCallouts = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await listOps(hotelId, 'staff_callout' as any, filter === 'pending' ? { status: 'pending' } : {});
    let filtered = all;
    if (filter === 'resolved') {
      filtered = all.filter(r => r.status === 'completed' || r.status === 'closed');
    }
    filtered.sort((a, b) => {
      const da = (a.details as CalloutDetails).shift_date || '';
      const db = (b.details as CalloutDetails).shift_date || '';
      return db.localeCompare(da);
    });
    setCallouts(filtered);
    setLoading(false);
  }, [hotelId, filter]);

  useEffect(() => { loadCallouts(); }, [loadCallouts]);

  const acknowledge = async (id: string) => {
    setActionInProgress(id);
    await updateOps(id, { status: 'completed' });
    await loadCallouts();
    setActionInProgress(null);
  };

  const deny = async (id: string) => {
    setActionInProgress(id);
    await updateOps(id, { status: 'closed' });
    await loadCallouts();
    setActionInProgress(null);
  };

  const pendingCount = callouts.filter(r => r.status === 'pending').length;

  const isCoverageAlert = (shiftDate: string) =>
    shiftDate === today || shiftDate === tomorrow;

  const FILTER_BTNS: { key: CalloutFilter; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'all', label: 'All' },
    { key: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-[18px] font-extrabold text-gray-900">Staff Callouts</h1>
        {pendingCount > 0 && filter !== 'resolved' && (
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
            {pendingCount}
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {FILTER_BTNS.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all border ${
              filter === btn.key
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
            style={filter === btn.key ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">Loading…</div>
      ) : callouts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">
          {filter === 'pending' ? 'No pending callouts. All clear!' : 'No callouts found.'}
        </div>
      ) : (
        <div className="space-y-3">
          {callouts.map(r => {
            const d = r.details as CalloutDetails;
            const name = d?.staff_name || r.guest_name || 'Unknown';
            const coverageAlert = isCoverageAlert(d?.shift_date || '');
            const isPending = r.status === 'pending';
            const busy = actionInProgress === r.id;

            return (
              <div
                key={r.id}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="p-4">
                  {/* Top row: name + badges */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-[15px] font-bold text-gray-900">{name}</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">
                        {formatShiftDate(d?.shift_date)}
                        {d?.shift_start && d?.shift_end && (
                          <> · {formatTime(d.shift_start)} – {formatTime(d.shift_end)}</>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={r.status} />
                      {coverageAlert && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          <AlertTriangle size={9} /> Coverage Alert
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reason + notes */}
                  <div className="mb-3">
                    <ReasonBadge reason={d?.reason || 'Other'} />
                    {d?.notes && (
                      <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">{d.notes}</p>
                    )}
                  </div>

                  {/* Actions for pending */}
                  {isPending && (
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => acknowledge(r.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-xl text-white text-[12px] font-bold shadow-sm disabled:opacity-50 transition-all"
                        style={{ backgroundColor: TEAL }}
                      >
                        <CheckCircle size={13} />
                        {busy ? '…' : 'Acknowledge'}
                      </button>
                      <button
                        onClick={() => deny(r.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-[12px] font-bold disabled:opacity-50 transition-all hover:bg-red-100"
                      >
                        <XCircle size={13} />
                        {busy ? '…' : 'Deny'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────

export default function CalloutsView({ hotelId, isAdmin, staffName }: CalloutsViewProps) {
  if (isAdmin) {
    return <AdminCalloutView hotelId={hotelId} />;
  }
  return <StaffCalloutView hotelId={hotelId} staffName={staffName} />;
}
