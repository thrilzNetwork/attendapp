'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase, subscribeToRequests, updateVendorStatus, getPartnerById, PartnerMenuItem } from '@/lib/supabase';
import { ShoppingBag, Clock, CheckCircle, Bell, RefreshCw, Truck, ExternalLink, UtensilsCrossed, Upload, ImageIcon } from 'lucide-react';

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
  uber_delivery_id: string | null;
  uber_tracking_url: string | null;
  uber_status: string | null;
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
  const router = useRouter();
  const previewPartnerId = searchParams.get('partnerId') || '';

  const [partnerId, setPartnerId] = useState(previewPartnerId);
  const [authChecked, setAuthChecked] = useState(!!previewPartnerId);
  const [partnerName, setPartnerName] = useState('');
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);

  // Resolve which partner this dashboard is for:
  //  - ?partnerId=xxx  → admin preview (no login needed)
  //  - otherwise       → the logged-in vendor's own partner (from their session)
  useEffect(() => {
    if (previewPartnerId) return; // preview mode, already set
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { router.replace('/vendor/login'); return; }
      const res = await fetch('/api/vendor-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'whoami', token }),
      });
      const data = await res.json();
      if (!data.ok || !data.vendor?.partner_id) { router.replace('/vendor/login'); return; }
      setPartnerId(data.vendor.partner_id);
      if (data.vendor.hotel_id) setHotelId(data.vendor.hotel_id);
      setAuthChecked(true);
    })();
  }, [previewPartnerId, router]);

  const load = useCallback(async () => {
    if (!partnerId) return;
    const { data } = await supabase
      .from('requests')
      .select('id, guest_name, room, details, status, vendor_status, total_amount, created_at, hotel_id, uber_delivery_id, uber_tracking_url, uber_status')
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
    if (!partnerId) { if (authChecked) setLoading(false); return; }
    getPartnerById(partnerId).then(p => { if (p) setPartnerName(p.name); });
    load();
  }, [partnerId, authChecked, load]);

  // Real-time: subscribe once we know the hotel_id
  useEffect(() => {
    if (!hotelId) return;
    const ch = subscribeToRequests(hotelId, () => load());
    return () => { supabase.removeChannel(ch); };
  }, [hotelId, load]);

  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [menuItems, setMenuItems] = useState<PartnerMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [imgUploading, setImgUploading] = useState<Record<string, boolean>>({});
  const [imgError, setImgError] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadMenu = useCallback(async () => {
    if (!partnerId) return;
    setMenuLoading(true);
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
      body: JSON.stringify({ action: 'get_menu_items', partner_id: partnerId }),
    });
    const data = await res.json();
    if (data.ok) setMenuItems(data.data || []);
    setMenuLoading(false);
  }, [partnerId]);

  useEffect(() => {
    if (activeTab === 'menu' && partnerId) loadMenu();
  }, [activeTab, partnerId, loadMenu]);

  const uploadMenuImage = async (item: PartnerMenuItem, file: File) => {
    setImgUploading(p => ({ ...p, [item.id]: true }));
    setImgError(p => ({ ...p, [item.id]: '' }));
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const uploadRes = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ action: 'upload_image', base64, filename: file.name, folder: 'menu-items' }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.ok) throw new Error(uploadData.error || 'Upload failed');
      await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ action: 'update_menu_item', id: item.id, image_url: uploadData.url }),
      });
      setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, image_url: uploadData.url } : i));
    } catch (e) {
      setImgError(p => ({ ...p, [item.id]: e instanceof Error ? e.message : 'Upload failed' }));
    }
    setImgUploading(p => ({ ...p, [item.id]: false }));
  };

  const removeMenuImage = async (item: PartnerMenuItem) => {
    await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
      body: JSON.stringify({ action: 'update_menu_item', id: item.id, image_url: null }),
    });
    setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, image_url: undefined } : i));
  };

  const [dispatching, setDispatching] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const dispatchUber = async (order: VendorOrder) => {
    setDispatching(order.id);
    setDispatchError(null);
    try {
      const res = await fetch('/api/uber-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch', requestId: order.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Dispatch failed');
      await load();
    } catch (e) {
      setDispatchError(e instanceof Error ? e.message : 'Dispatch failed');
    }
    setDispatching(null);
  };

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
    <div className="h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
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

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 flex gap-1 sticky top-[73px] z-10">
        {(['orders', 'menu'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-[13px] font-bold capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-400'}`}>
            {tab === 'orders' ? <span className="flex items-center gap-1.5"><ShoppingBag size={13} /> Orders {active.length > 0 && <span className="bg-orange-500 text-white rounded-full text-[10px] font-bold px-1.5">{active.length}</span>}</span> : <span className="flex items-center gap-1.5"><UtensilsCrossed size={13} /> Menu</span>}
          </button>
        ))}
      </div>

      {/* Menu tab */}
      {activeTab === 'menu' && (
        <div className="p-4 space-y-3 max-w-lg mx-auto">
          <p className="text-[12px] text-gray-400">Add photos to your menu items so guests can see what they&apos;re ordering.</p>
          {menuLoading ? (
            <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : menuItems.length === 0 ? (
            <div className="text-center py-16">
              <UtensilsCrossed size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-[14px] font-semibold text-gray-500">No menu items yet</p>
              <p className="text-[12px] text-gray-400 mt-1">Ask your hotel admin to add items to your menu.</p>
            </div>
          ) : menuItems.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
              {/* Image thumbnail or placeholder */}
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center border border-gray-200">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  : <ImageIcon size={22} className="text-gray-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-[14px] truncate">{item.name}</p>
                <p className="text-[12px] text-gray-400">${Number(item.price).toFixed(2)}{item.category ? ` · ${item.category}` : ''}</p>
                {imgError[item.id] && <p className="text-[11px] text-red-500 mt-0.5">{imgError[item.id]}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <input
                  ref={el => { fileRefs.current[item.id] = el; }}
                  type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadMenuImage(item, f); e.target.value = ''; }}
                />
                <button
                  onClick={() => fileRefs.current[item.id]?.click()}
                  disabled={imgUploading[item.id]}
                  className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50">
                  <Upload size={11} /> {imgUploading[item.id] ? 'Uploading…' : item.image_url ? 'Replace' : 'Add Photo'}
                </button>
                {item.image_url && (
                  <button onClick={() => removeMenuImage(item)} className="text-[10px] text-red-400 hover:text-red-600 font-semibold">Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'orders' && <div className="p-4 space-y-3 max-w-lg mx-auto">
        {active.length === 0 && done.length === 0 && (
          <div className="text-center py-20">
            <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[15px] font-semibold text-gray-500">No orders yet</p>
            <p className="text-[13px] text-gray-400 mt-1">New orders appear here in real-time</p>
          </div>
        )}

        {dispatchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700 font-medium">
            ⚠️ {dispatchError}
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

              <div className="flex gap-2 flex-wrap">
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

              {/* Uber Direct dispatch */}
              {!order.uber_delivery_id ? (
                <button
                  onClick={() => dispatchUber(order)}
                  disabled={dispatching === order.id}
                  className="mt-2 w-full py-2.5 rounded-xl font-bold text-[13px] bg-black text-white flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
                  <Truck size={14} />
                  {dispatching === order.id ? 'Dispatching…' : 'Send via Uber Direct'}
                </button>
              ) : (
                <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <Truck size={14} className="text-black shrink-0" />
                  <span className="text-[12px] font-bold text-gray-700 capitalize">{order.uber_status?.replace(/_/g, ' ') || 'Dispatched'}</span>
                  {order.uber_tracking_url && (
                    <a href={order.uber_tracking_url} target="_blank" rel="noopener noreferrer"
                      className="ml-auto text-[11px] font-bold text-teal-600 flex items-center gap-1">
                      Track <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              )}
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
      </div>}
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
