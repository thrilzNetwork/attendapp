'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getHotelConfig, type HotelConfig } from '@/lib/supabase';
import { QrCode, ArrowLeft, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';

const TEAL = '#0D9488';

// ─── Types ────────────────────────────────────────────────────

interface GuestSession {
  name: string;
  room: string;
}

interface RequestRow {
  id: string;
  type: string;
  status: string;
  vendor_status: string | null;
  total_amount: number | null;
  details: string | null;
  created_at: string;
  partner_id: string | null;
}

type ActiveTab = 'active' | 'food' | 'completed';

// ─── Helpers ──────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function truncate(str: string | null | undefined, n = 80): string {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function isFood(r: RequestRow): boolean {
  return r.vendor_status !== null;
}

function isCompleted(r: RequestRow): boolean {
  return r.status === 'completed' || r.status === 'closed';
}

function isActive(r: RequestRow): boolean {
  return !isFood(r) && !isCompleted(r);
}

// ─── Status badge for food orders ────────────────────────────

const VENDOR_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  new:       { label: 'Received',  cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  received:  { label: 'Received',  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  preparing: { label: 'Preparing', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  ready:     { label: 'Ready',     cls: 'bg-lime-100 text-lime-700 border-lime-200' },
  delivered: { label: 'Delivered', cls: 'bg-teal-100 text-teal-700 border-teal-200' },
};

const SERVICE_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:     { label: 'Pending',     cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'in-progress': { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed:   { label: 'Completed',   cls: 'bg-green-100 text-green-700 border-green-200' },
  closed:      { label: 'Closed',      cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function VendorStatusBadge({ status }: { status: string | null }) {
  const cfg = VENDOR_STATUS_CONFIG[status || 'new'] || VENDOR_STATUS_CONFIG['new'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function ServiceStatusBadge({ status }: { status: string }) {
  const cfg = SERVICE_STATUS_CONFIG[status] || { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Card components ──────────────────────────────────────────

function FoodOrderCard({ r, brandColor }: { r: RequestRow; brandColor: string }) {
  const isDone = r.status === 'completed' || r.vendor_status === 'delivered';
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div>
          <p className="text-[14px] font-bold text-gray-900">
            {r.type || 'Food Order'}
          </p>
          <p className="text-[12px] text-gray-400 mt-0.5">{formatTime(r.created_at)}</p>
        </div>
        <VendorStatusBadge status={r.vendor_status} />
      </div>

      {r.total_amount != null && r.total_amount > 0 && (
        <p className="text-[13px] font-semibold text-gray-700 mb-2">
          ${r.total_amount.toFixed(2)}
        </p>
      )}

      {!isDone && (
        <Link
          href={`/track/${r.id}`}
          className="inline-flex items-center gap-1 text-[12px] font-semibold mt-1"
          style={{ color: brandColor }}
        >
          Track Order <ChevronRight size={13} />
        </Link>
      )}
    </div>
  );
}

function ServiceRequestCard({ r }: { r: RequestRow }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-gray-900">{r.type || 'Request'}</p>
          {r.details && (
            <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
              {truncate(r.details)}
            </p>
          )}
          <p className="text-[11px] text-gray-400 mt-1">{formatTime(r.created_at)}</p>
        </div>
        <div className="shrink-0">
          <ServiceStatusBadge status={r.status} />
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-10 text-gray-400">
      <CheckCircle size={28} className="mx-auto mb-2 text-gray-200" />
      <p className="text-[13px]">{label}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Read session from localStorage
        const rawSession = typeof window !== 'undefined'
          ? localStorage.getItem('guestSession')
          : null;
        const rawSlug = typeof window !== 'undefined'
          ? localStorage.getItem('attenda_hotel_slug')
          : null;

        if (!rawSession) {
          setLoading(false);
          return;
        }

        const sess: GuestSession = JSON.parse(rawSession);
        setSession(sess);

        // Load hotel config
        const cfg = await getHotelConfig(rawSlug || undefined);
        setConfig(cfg);

        if (!cfg?.id) {
          setLoading(false);
          return;
        }

        // Query requests for this guest
        const { data, error } = await supabase
          .from('requests')
          .select('id, type, status, vendor_status, total_amount, details, created_at, partner_id')
          .eq('hotel_id', cfg.id)
          .eq('guest_name', sess.name)
          .eq('room', sess.room)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setRequests(data as RequestRow[]);
        }
      } catch (err) {
        console.error('AccountPage init error:', err);
      }
      setLoading(false);
    };

    init();
  }, []);

  const brandColor = config?.brandColor || TEAL;

  const activeRequests = requests.filter(isActive);
  const foodOrders = requests.filter(isFood);
  const completedRequests = requests.filter(isCompleted);

  const TABS: { key: ActiveTab; label: string; count: number }[] = [
    { key: 'active',    label: 'Active',      count: activeRequests.length },
    { key: 'food',      label: 'Food Orders', count: foodOrders.length },
    { key: 'completed', label: 'Completed',   count: completedRequests.length },
  ];

  // ── No session ──
  if (!loading && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: `${brandColor}20` }}>
          <QrCode size={28} style={{ color: brandColor }} />
        </div>
        <h1 className="text-[20px] font-extrabold text-gray-900 mb-2">Welcome to Attenda</h1>
        <p className="text-[14px] text-gray-500 leading-relaxed max-w-xs">
          Scan your room QR code to get started and access your stay services.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold"
          style={{ color: brandColor }}
        >
          <ArrowLeft size={14} /> Back to Services
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-[17px] font-extrabold text-gray-900 flex-1">My Stay</h1>
          {loading && <Loader2 size={16} className="animate-spin text-gray-400" />}
        </div>
      </div>

      {/* Guest identity card */}
      {session && (
        <div className="mx-4 mt-4 rounded-2xl px-4 py-3 text-white shadow-sm"
          style={{ backgroundColor: brandColor }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold opacity-80 uppercase tracking-wider">Guest</p>
              <p className="text-[17px] font-extrabold">{session.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold opacity-80 uppercase tracking-wider">Room</p>
              <p className="text-[22px] font-extrabold">{session.room}</p>
            </div>
          </div>
          {config?.name && (
            <p className="text-[11px] opacity-60 mt-1">{config.name}</p>
          )}
        </div>
      )}

      {/* Tab navigation */}
      <div className="mx-4 mt-4 flex bg-white border border-gray-200 rounded-2xl p-1 gap-1 shadow-sm">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all ${
              activeTab === tab.key
                ? 'text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
            style={activeTab === tab.key ? { backgroundColor: brandColor } : {}}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold ${
                activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-[13px]">
            <Loader2 size={20} className="animate-spin mx-auto mb-2 text-gray-300" />
            Loading your requests…
          </div>
        ) : activeTab === 'active' ? (
          activeRequests.length === 0
            ? <EmptyState label="No active requests right now." />
            : activeRequests.map(r => <ServiceRequestCard key={r.id} r={r} />)
        ) : activeTab === 'food' ? (
          foodOrders.length === 0
            ? <EmptyState label="No food orders yet." />
            : foodOrders.map(r => <FoodOrderCard key={r.id} r={r} brandColor={brandColor} />)
        ) : (
          completedRequests.length === 0
            ? <EmptyState label="Nothing completed yet." />
            : completedRequests.map(r =>
                isFood(r)
                  ? <FoodOrderCard key={r.id} r={r} brandColor={brandColor} />
                  : <ServiceRequestCard key={r.id} r={r} />
              )
        )}
      </div>

      {/* Footer note */}
      <div className="mx-4 mt-8 px-4 py-3 bg-gray-100 rounded-2xl">
        <p className="text-[11px] text-gray-500 text-center leading-relaxed">
          Your data is only stored on this device and will clear at checkout.
        </p>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-center">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[13px] font-semibold"
          style={{ color: brandColor }}
        >
          <ArrowLeft size={14} /> Back to Services
        </Link>
      </div>
    </div>
  );
}
