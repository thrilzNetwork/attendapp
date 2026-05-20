'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bell, RefreshCw, LogOut, Hotel as HotelIcon } from 'lucide-react';
import {
  supabase, subscribeToRequests, updateRequestStatus,
} from '@/lib/supabase';

interface Request {
  id: string;
  guest_name: string;
  room: string;
  type: string;
  details: string;
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
}

const TEAL = '#0D9488';

function PartnerContent() {
  const searchParams = useSearchParams();
  const partnerId = searchParams.get('restaurant');

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);

  const reload = useCallback(async () => {
    if (!partnerId) return;
    // Fetch this partner's food orders — filtered to the partner's hotel
    let query = supabase
      .from('requests')
      .select('*')
      .eq('type', 'Food Order')
      .order('created_at', { ascending: false });
    if (hotelId) {
      query = query.eq('hotel_id', hotelId);
    }
    const { data } = await query;
    if (data) setRequests(data);
  }, [partnerId, hotelId]);

  useEffect(() => {
    if (!partnerId || !authenticated) return;
    reload();
    const ch = subscribeToRequests(hotelId, () => reload());
    return () => { supabase.removeChannel(ch); };
  }, [partnerId, authenticated, reload, hotelId]);

  const handleLogin = async () => {
    setPinError('');
    // Check partner PIN
    const { data } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId!)
      .single();

    if (!data) {
      setPinError('Restaurant not found.');
      return;
    }

    // For now, use a simple PIN check — partner PIN stored or use default
    const restaurantPin = data.pin_code || '2025';
    if (pin === restaurantPin) {
      setPartnerName(data.name);
      setHotelId(data.hotel_id || null);
      setAuthenticated(true);
    } else {
      setPinError('Incorrect PIN. Try again.');
      setPin('');
    }
  };

  if (!partnerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <p className="text-[14px] text-gray-500">No restaurant specified. Use <code className="bg-gray-100 px-1.5 py-0.5 rounded">?restaurant=ID</code></p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
            <HotelIcon size={28} style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">Restaurant Partner</h1>
          <p className="text-sm text-gray-400 text-center mb-6">Enter your PIN to see orders</p>
          <input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="PIN"
            maxLength={6}
            className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] border border-gray-100 focus:outline-none text-center tracking-[0.3em] font-mono mb-2"
          />
          {pinError && <p className="text-red-500 text-[12px] text-center mb-2">{pinError}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px]"
            style={{ backgroundColor: TEAL }}
          >
            VIEW ORDERS
          </button>
        </div>
      </div>
    );
  }

  const active = requests.filter(r => r.status !== 'completed');
  const completed = requests.filter(r => r.status === 'completed');

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">{partnerName || 'Restaurant'}</h1>
          <p className="text-[12px] text-gray-500">Orders Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={reload} className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-teal-600 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => { setAuthenticated(false); setPin(''); setHotelId(null); }}
            className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="shrink-0 px-6 py-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', count: requests.filter(r => r.status === 'pending').length, color: 'text-amber-600' },
          { label: 'Cooking', count: requests.filter(r => r.status === 'in-progress').length, color: 'text-blue-600' },
          { label: 'Done', count: requests.filter(r => r.status === 'completed').length, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
            <p className="text-[11px] text-gray-400 uppercase font-bold mb-1">{s.label}</p>
            <p className={`text-[24px] font-extrabold ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
        <h2 className="text-[14px] font-bold text-gray-500 uppercase tracking-wider mt-2">Active Orders</h2>
        {active.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm">
            <Bell size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-500">No active orders right now.</p>
          </div>
        )}
        {active.map(req => (
          <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${req.status === 'pending' ? 'bg-amber-400' : req.status === 'in-progress' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{req.type}</span>
                <span className="text-[11px] text-gray-400">• {new Date(req.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[14px] font-bold text-gray-900 mb-0.5">{req.guest_name} — Room {req.room}</p>
              <p className="text-[13px] text-gray-600 whitespace-pre-wrap">{req.details}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {req.status === 'pending' && (
                <button onClick={() => { updateRequestStatus(req.id, 'in-progress'); reload(); }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                  Start Cooking
                </button>
              )}
              {req.status === 'in-progress' && (
                <button onClick={() => { updateRequestStatus(req.id, 'completed'); reload(); }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-bold">
                  Ready for Pickup
                </button>
              )}
              {req.status === 'completed' && (
                <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-bold">Done</span>
              )}
            </div>
          </div>
        ))}

        {completed.length > 0 && (
          <>
            <h2 className="text-[14px] font-bold text-gray-500 uppercase tracking-wider mt-6">Completed</h2>
            {completed.slice(0, 10).map(req => (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4 shadow-sm opacity-60">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-gray-400">• {new Date(req.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-gray-500">{req.guest_name} — Room {req.room}</p>
                  <p className="text-[12px] text-gray-400 truncate">{req.details}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">Completed</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default function PartnerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-gray-300 border-t-[#0D9488] rounded-full animate-spin" />
      </div>
    }>
      <PartnerContent />
    </Suspense>
  );
}
