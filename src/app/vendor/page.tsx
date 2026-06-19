'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, subscribeToRequests, updateVendorStatus, getPartnerById } from '@/lib/supabase';
import { ShoppingBag, Clock, CheckCircle, Bell, RefreshCw } from 'lucide-react';

interface VendorOrder {
  id: string;
  guest_name: string;
  room: string;
  details: string;
  status: string;
  vendor_status: 'new' | 'received' | 'preparing' | 'ready' | null;
  total_amount: number | null;
  created_at: string;
  hotel_id: string;
}

const VENDOR_STEPS: { key: VendorOrder['vendor_status']; label: string; color: string }[] = [
  { key: 'new',       label: 'New',       color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'received',  label: 'Received',  color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'preparing', label: 'Preparing', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'ready',     label: 'Ready',     color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
];

function statusStyle(vs: VendorOrder['vendor_status']) {
  return VENDOR_STEPS.find(s => s.key === vs)?.color || 'bg-gray-100 text-gray-500 border-gray-200';
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

function VendorDashboard() {
  const searchParams = useSearchParams();
  const partnerId = searchParams.get('partnerId') || '';

  const [partnerName, setPartnerName] = useState('');
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);

  const load = useCallback(async () => {
    if (!partnerId) return;
    const { data } = await supabase
      .from('requests')
      .select('id, guest_name, room, details, status, vendor_status, total_amount, created_at, hotel_id')
      .eq('partner_id', partnerId)
      .neq('status', 'closed')
      .order('created_at', { ascending: false });
    const rows = (data || []) as VendorOrder[];
    setOrders(rows);
    setNewCount(rows.filter(r => r.vendor_status === 'new').length);
    if (rows[0]?.hotel_id && !hotelId) setHotelId(rows[0].hotel_id);
    setLoading(false);
  }, [partnerId, hotelId]);

  useEffect(() => {
    if (!partnerId) { setLoading(false); return; }
    getPartnerById(partnerId).then(p => { if (p) setPartnerName(p.name); });
    load();
  }, [partnerId, load]);

  // Real-time: subscribe once we know the hotel_id
  useEffect(() => {
    if (!hotelId) return;
    const ch = subscribeToRequests(hotelId, () => load());
    return () => { supabase.removeChannel(ch); };
  }, [hotelId, load]);

  const advance = async (order: VendorOrder) => {
    const idx = VENDOR_STEPS.findIndex(s => s.key === order.vendor_status);
    const next = VENDOR_STEPS[idx + 1];
    if (!next) return;
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, vendor_status: next.key } : o));
    await updateVendorStatus(order.id, next.key as 'new' | 'received' | 'preparing' | 'ready');
  };

  const markDone = async (order: VendorOrder) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed', vendor_status: 'ready' } : o));
    await supabase.from('requests').update({ status: 'completed', vendor_status: 'ready' }).eq('id', order.id);
  };

  const active = orders.filter(o => o.status !== 'completed');
  const done = orders.filter(o => o.status === 'completed');

  if (!partnerId) return (
    <div className="h-screen flex items-center justify-center text-gray-500 font-semibold">
      Missing partnerId in URL
    </div>
  );

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Vendor Dashboard</div>
          <h1 className="text-[20px] font-extrabold text-gray-900 leading-tight">{partnerName || 'Restaurant'}</h1>
        </div>
        <div className="flex items-center gap-3">
          {newCount > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
              <Bell size={13} className="text-orange-600" />
              <span className="text-[12px] font-bold text-orange-700">{newCount} new</span>
            </div>
          )}
          <button onClick={load} className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {active.length === 0 && done.length === 0 && (
          <div className="text-center py-20">
            <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[15px] font-semibold text-gray-500">No orders yet</p>
            <p className="text-[13px] text-gray-400 mt-1">New orders appear here in real-time</p>
          </div>
        )}

        {/* Active orders */}
        {active.map(order => {
          const stepIdx = VENDOR_STEPS.findIndex(s => s.key === order.vendor_status);
          const next = VENDOR_STEPS[stepIdx + 1];
          return (
            <div key={order.id} className={`bg-white rounded-2xl border-2 shadow-sm p-4 ${order.vendor_status === 'new' ? 'border-orange-300' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[15px] font-extrabold text-gray-900">{order.guest_name}</p>
                    <span className="text-[11px] text-gray-400">Room {order.room}</span>
                  </div>
                  <p className="text-[13px] text-gray-700 leading-snug">{order.details.replace(/^[^:]+:\s*/, '')}</p>
                  {order.total_amount && (
                    <p className="text-[13px] font-bold text-teal-700 mt-1">${Number(order.total_amount).toFixed(2)}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${statusStyle(order.vendor_status)}`}>
                    {VENDOR_STEPS.find(s => s.key === order.vendor_status)?.label || 'New'}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 justify-end">
                    <Clock size={10} /> {timeAgo(order.created_at)}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex gap-1 mb-3">
                {VENDOR_STEPS.map((s, i) => (
                  <div key={s.key} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? 'bg-teal-500' : 'bg-gray-200'}`} />
                ))}
              </div>

              <div className="flex gap-2">
                {next && (
                  <button onClick={() => advance(order)}
                    className="flex-1 py-2.5 rounded-xl text-white font-bold text-[13px] bg-teal-600 hover:bg-teal-700 active:scale-95 transition-transform">
                    Mark {next.label}
                  </button>
                )}
                <button onClick={() => markDone(order)}
                  className="px-4 py-2.5 rounded-xl font-bold text-[13px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-transform">
                  Done ✓
                </button>
              </div>
            </div>
          );
        })}

        {/* Completed orders (collapsed) */}
        {done.length > 0 && (
          <div className="border border-dashed border-gray-300 rounded-2xl p-4">
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <CheckCircle size={13} className="text-emerald-500" /> Completed today ({done.length})
            </p>
            <div className="space-y-2">
              {done.map(order => (
                <div key={order.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-gray-600">{order.guest_name} · Rm {order.room}</p>
                    <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{order.details.replace(/^[^:]+:\s*/, '')}</p>
                  </div>
                  {order.total_amount && <p className="text-[13px] font-bold text-gray-500">${Number(order.total_amount).toFixed(2)}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VendorPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    }>
      <VendorDashboard />
    </Suspense>
  );
}
