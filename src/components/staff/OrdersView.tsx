'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Check, X, UserCheck, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface Request {
  id: string;
  guest_name: string;
  room: string;
  type: string;
  details: string;
  status: 'pending' | 'in-progress' | 'completed' | 'closed';
  created_at: string;
  assigned_to?: string;
}

interface OrdersViewProps {
  requests: Request[];
  messages: unknown[];
  onStatusChange: (id: string, status: string, assigned_to?: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  staffName: string;
}

const STATUS_PALETTE: Record<string, { bg: string; border: string; badge: string; badgeText: string; label: string }> = {
  'pending': {
    bg: 'from-orange-50 to-orange-100/60',
    border: 'border-orange-300',
    badge: 'bg-orange-200',
    badgeText: 'text-orange-800',
    label: 'Pending',
  },
  'in-progress': {
    bg: 'from-blue-50 to-blue-100/60',
    border: 'border-blue-300',
    badge: 'bg-blue-200',
    badgeText: 'text-blue-800',
    label: 'In Progress',
  },
  'completed': {
    bg: 'from-emerald-50 to-emerald-100/60',
    border: 'border-emerald-300',
    badge: 'bg-emerald-200',
    badgeText: 'text-emerald-800',
    label: 'Completed',
  },
  'closed': {
    bg: 'from-gray-50 to-gray-100/60',
    border: 'border-gray-300',
    badge: 'bg-gray-200',
    badgeText: 'text-gray-700',
    label: 'Closed',
  },
};

function OrdersView({
  requests: initialRequests, onStatusChange, onRefresh, staffName,
}: OrdersViewProps) {
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  const [selected, setSelected] = useState<Request | null>(null);
  const [showAllOpen, setShowAllOpen] = useState(false);

  useEffect(() => { setRequests(initialRequests); }, [initialRequests]);

  const pending = requests.filter(r => r.status === 'pending');
  const inProgress = requests.filter(r => r.status === 'in-progress');
  const completed = requests.filter(r => r.status === 'completed');
  const closed = requests.filter(r => r.status === 'closed');
  const open = [...pending, ...inProgress];

  const handleAccept = async (req: Request) => {
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'in-progress', assigned_to: staffName } : r));
    await onStatusChange(req.id, 'in-progress', staffName);
    setSelected(null);
  };

  const handleComplete = async (req: Request) => {
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'completed' } : r));
    await onStatusChange(req.id, 'completed');
    setSelected(null);
  };

  const handleClose = async (req: Request) => {
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'closed' } : r));
    await onStatusChange(req.id, 'closed');
    setSelected(null);
  };

  const handleTap = (req: Request) => setSelected(req);

  const isAssignedToMe = (req: Request) => req.assigned_to === staffName;

  /* ── Detail Modal ── */
  if (selected) {
    const req = selected;
    const palette = STATUS_PALETTE[req.status] || STATUS_PALETTE.pending;
    const canAccept = req.status === 'pending';
    const canComplete = req.status === 'in-progress' && isAssignedToMe(req);
    const canClose = req.status === 'pending' || req.status === 'in-progress';

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setSelected(null)}>
        <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className={`px-5 pt-5 pb-4 border-b border-gray-100 ${req.status === 'pending' ? 'bg-orange-50' : req.status === 'in-progress' ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-[20px] font-extrabold text-gray-900">{req.guest_name}</p>
                <p className="text-[13px] text-gray-500">Room {req.room}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${palette.badge} ${palette.badgeText}`}>
                {palette.label}
              </span>
            </div>
            <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${palette.badge} ${palette.badgeText}`}>
              {req.type}
            </span>
          </div>

          {/* Details */}
          <div className="px-5 py-4 space-y-3">
            {req.details && req.details !== req.type && (
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">Details</p>
                <p className="text-[14px] text-gray-800 leading-relaxed">{req.details}</p>
              </div>
            )}

            <div className="flex items-center gap-3 text-[12px] text-gray-500">
              <div className="flex items-center gap-1">
                <Clock size={13} />
                {new Date(req.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {req.assigned_to && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
                <UserCheck size={14} className="text-blue-600" />
                <span className="text-[12px] font-semibold text-blue-800">Assigned to {req.assigned_to}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 pt-2 border-t border-gray-100 space-y-2">
            {canAccept && (
              <button
                onClick={() => handleAccept(req)}
                className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[14px] font-bold transition-all active:scale-[0.97] shadow-sm flex items-center justify-center gap-2"
              >
                <Check size={18} /> Accept & Claim
              </button>
            )}

            {canComplete && (
              <button
                onClick={() => handleComplete(req)}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[14px] font-bold transition-all active:scale-[0.97] shadow-sm flex items-center justify-center gap-2"
              >
                <Check size={18} /> Mark Complete
              </button>
            )}

            {canClose && (
              <button
                onClick={() => handleClose(req)}
                className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-2"
              >
                <X size={16} /> Close / Decline
              </button>
            )}

            <button
              onClick={() => setSelected(null)}
              className="w-full py-2.5 text-[12px] text-gray-400 font-semibold hover:text-gray-600 transition-colors"
            >
              ← Back to list
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main View ── */
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">
            Requests
            {pending.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 animate-pulse">
                {pending.length} new
              </span>
            )}
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {open.length} open · {completed.length} fulfilled · {closed.length} closed
          </p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <p className="text-[15px] text-gray-400">No requests yet. Guest interactions will show here only when they request something.</p>
        </div>
      ) : (
        <>
          {/* ── Open Tickets (pending + in-progress) ── */}
          {open.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <h2 className="text-[12px] font-bold uppercase tracking-wider text-orange-600">
                    Open ({open.length})
                  </h2>
                </div>
                <button
                  onClick={() => setShowAllOpen(!showAllOpen)}
                  className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 ml-auto"
                >
                  {showAllOpen ? 'Show less' : 'Show all'}
                  {showAllOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {open.slice(0, showAllOpen ? open.length : 10).map(req => {
                  const isInProgress = req.status === 'in-progress';
                  const palette = STATUS_PALETTE[req.status] || STATUS_PALETTE.pending;
                  return (
                    <div
                      key={req.id}
                      onClick={() => handleTap(req)}
                      className={`bg-gradient-to-br ${palette.bg} border-2 ${palette.border} rounded-2xl p-4 shadow-sm relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform`}
                    >
                      {isInProgress ? null : (
                        <div className="absolute inset-0 rounded-2xl border-2 border-orange-400 animate-pulse opacity-30 pointer-events-none" />
                      )}

                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-[16px] font-extrabold text-gray-900">{req.guest_name}</p>
                          <p className="text-[12px] font-semibold text-gray-600">Room {req.room}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${palette.badge} ${palette.badgeText}`}>
                            {req.type}
                          </span>
                          {isInProgress && (
                            <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-blue-200 text-blue-800 flex items-center gap-1">
                              <UserCheck size={10} /> {req.assigned_to?.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      {req.details && req.details !== req.type && (
                        <p className="text-[12px] text-gray-700 mb-2 line-clamp-2">{req.details}</p>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-400">
                          {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isInProgress ? (
                          <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                            <UserCheck size={11} /> Assigned
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-teal-600">Tap to accept →</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Completed ── */}
          {completed.length > 0 && (
            <div className="mb-4">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-2">
                <Check size={14} /> Fulfilled ({completed.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {completed.slice(0, 12).map(req => (
                  <div
                    key={req.id}
                    onClick={() => handleTap(req)}
                    className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-start gap-2 cursor-pointer hover:border-gray-300 transition-colors"
                  >
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Check size={10} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-gray-900 truncate">{req.guest_name} · R{req.room}</p>
                      <p className="text-[10px] text-gray-500 truncate">{req.details || req.type}</p>
                      {req.assigned_to && (
                        <p className="text-[9px] text-gray-400 mt-0.5">by {req.assigned_to}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Closed ── */}
          {closed.length > 0 && (
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <X size={14} /> Closed ({closed.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {closed.slice(0, 6).map(req => (
                  <div
                    key={req.id}
                    onClick={() => handleTap(req)}
                    className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-start gap-2 cursor-pointer hover:border-gray-300 transition-colors opacity-60"
                  >
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <X size={10} className="text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-gray-600 truncate">{req.guest_name} · R{req.room}</p>
                      <p className="text-[10px] text-gray-400 truncate">{req.details || req.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default OrdersView;
