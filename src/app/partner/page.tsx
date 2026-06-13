'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bell, RefreshCw, LogOut, Hotel as HotelIcon, ArrowRight, CheckCircle, XCircle, DollarSign, Truck, CreditCard, Smartphone, Utensils, MapPin, Store } from 'lucide-react';
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

/* ──────────────────────────────────────────────────────────── */
/*  Restaurant Landing Page (shown to new visitors)             */
/* ──────────────────────────────────────────────────────────── */
function RestaurantLandingPage({ urlType: initialUrlType }: { urlType?: string }) {
  const urlType = initialUrlType || '';
  const [showApply, setShowApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const initialPt = urlType && ['restaurant', 'service', 'experience', 'brand'].includes(urlType) ? urlType : 'restaurant';
  const [partnerType, setPartnerType] = useState(initialPt);
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', hotel: '', partnerType: initialPt, details: '' });

  // Sync form partnerType when type tab changes
  useEffect(() => {
    setForm(f => ({ ...f, partnerType }));
  }, [partnerType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    try {
      const res = await fetch('/api/partner-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setApplied(true);
        setForm({ name: '', contact: '', phone: '', email: '', hotel: '', partnerType: 'restaurant', details: '' });
      }
    } catch {
      // Silently handle — form submit failure is non-blocking
    }
    setApplying(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Partner type categories */}
      <section className="px-6 pt-12 pb-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
          {[
            { key: 'restaurant', icon: Utensils, label: 'Restaurants' },
            { key: 'service', icon: Truck, label: 'Services & Vendors' },
            { key: 'experience', icon: MapPin, label: 'Experiences & Tours' },
            { key: 'brand', icon: Store, label: 'Brand Partners' },
          ].map(t => (
            <button key={t.key} onClick={() => setPartnerType(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border-2 ${
                partnerType === t.key
                  ? 'shadow-md scale-[1.02]'
                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
              }`}
              style={partnerType === t.key ? { borderColor: TEAL, backgroundColor: `${TEAL}08` } : {}}>
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Hero — dynamic by type */}
      <section className="px-6 pb-16 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[11px] font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
          <HotelIcon size={12} /> Do Business With Attenda
        </div>
        {partnerType === 'restaurant' && (
          <>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight mb-4">
              Your restaurant.<br />In front of hotel guests.
            </h1>
            <p className="text-[15px] text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
              We are not UberEats. Not DoorDash. Not Grubhub. We don&apos;t compete with delivery platforms — we open a channel you can&apos;t access on your own: <strong className="text-gray-900">hotel guests ordering directly from you</strong>.
            </p>
          </>
        )}
        {partnerType === 'service' && (
          <>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight mb-4">
              Your service.<br />In every hotel room.
            </h1>
            <p className="text-[15px] text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
              Housekeeping, maintenance, laundry, amenity delivery &mdash; whatever you provide, <strong className="text-gray-900">Attenda puts you inside the hotel&apos;s operations</strong>. Guests request. Staff assigns. You fulfill.
            </p>
          </>
        )}
        {partnerType === 'experience' && (
          <>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight mb-4">
              Your experiences.<br />Booked from the room.
            </h1>
            <p className="text-[15px] text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
              Boat rentals, tours, excursions, local attractions. <strong className="text-gray-900">Guests discover and book through Attenda</strong> &mdash; no third-party markup, no OTA commission eating your margin.
            </p>
          </>
        )}
        {partnerType === 'brand' && (
          <>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight mb-4">
              Your brand.<br />In front of guests who care.
            </h1>
            <p className="text-[15px] text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
              Brands that understand independent hospitality. Attenda gives you <strong className="text-gray-900">direct access to hotel guests</strong> who have opted into the experience &mdash; not a spray-and-pray ad buy.
            </p>
          </>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setShowApply(true)}
            className="px-8 py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2"
            style={{ backgroundColor: TEAL }}
          >
            Apply Now <ArrowRight size={16} />
          </button>
          <a href="#how-it-works" className="px-8 py-3.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-[14px] hover:bg-gray-50 transition-colors text-center">
            How It Works
          </a>
        </div>
      </section>

      {/* Market gap — dynamic by type */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {partnerType === 'restaurant' && (
            <div className="grid sm:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-4">A market you can&apos;t reach alone</h2>
                <p className="text-[14px] text-gray-600 leading-relaxed mb-4">
                  Hotels are a closed ecosystem. You can&apos;t walk in and start serving guests. Traditional delivery platforms don&apos;t bridge this gap either — they build apps for the general public, not for a hotel&apos;s front desk.
                </p>
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  <strong className="text-gray-900">Attenda</strong> is the operations system hotels already use — for checklists, chat, guest requests, and revenue tracking. When a guest wants food, they order <strong className="text-gray-900">through their hotel&apos;s Attenda page</strong>, and it lands in your kitchen.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                    <XCircle size={20} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-red-500">Delivery Platforms</p>
                    <p className="text-[11px] text-gray-400">UberEats, DoorDash, Grubhub</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                    <CheckCircle size={20} className="text-teal-500" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-teal-600">Attenda Network</p>
                    <p className="text-[11px] text-gray-400">Direct line to hotel guests</p>
                  </div>
                </div>
                <div className="mt-6 space-y-2 text-[13px] text-gray-500">
                  <p className="flex items-center gap-2"><XCircle size={12} className="text-red-300 shrink-0" />Charge 25-30% per order</p>
                  <p className="flex items-center gap-2"><XCircle size={12} className="text-red-300 shrink-0" />No access to hotel-only demand</p>
                  <p className="flex items-center gap-2"><CheckCircle size={12} className="text-teal-400 shrink-0" />We take 10% — firm, direct</p>
                  <p className="flex items-center gap-2"><CheckCircle size={12} className="text-teal-400 shrink-0" />We bring the driver</p>
                  <p className="flex items-center gap-2"><CheckCircle size={12} className="text-teal-400 shrink-0" />We give you the ordering system free</p>
                </div>
              </div>
            </div>
          )}
          {partnerType !== 'restaurant' && (
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-black text-gray-900 mb-4">You serve hotels. We open the door.</h2>
              <p className="text-[14px] text-gray-600 leading-relaxed mb-4">
                Hotels are a closed ecosystem. Cold calls, vendor gatekeepers, and procurement cycles make it nearly impossible to get in front of the people who make decisions.
              </p>
              <p className="text-[14px] text-gray-600 leading-relaxed">
                <strong className="text-gray-900">Attenda</strong> is already inside the hotel — the QR code in every room, the dashboard on every staff device, the revenue thread the GM checks daily. We give you a direct channel to guests and staff that didn&apos;t exist before.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* The offer */}
      <section id="how-it-works" className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-black text-gray-900 text-center mb-10">The Offer</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <DollarSign size={22} className="text-teal-600" />
            </div>
            <p className="text-[28px] font-black text-gray-900">10%</p>
            <p className="text-[12px] text-gray-500 mt-1">Commission per order</p>
            <p className="text-[11px] text-gray-400 mt-2">Firm and direct. No hidden fees, no sliding scales.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <Truck size={22} className="text-teal-600" />
            </div>
            <p className="text-[28px] font-black text-gray-900">Delivery</p>
            <p className="text-[12px] text-gray-500 mt-1">We provide the driver</p>
            <p className="text-[11px] text-gray-400 mt-2">Your kitchen cooks. We handle getting it to the guest.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <CreditCard size={22} className="text-teal-600" />
            </div>
            <p className="text-[28px] font-black text-gray-900">3%</p>
            <p className="text-[12px] text-gray-500 mt-1">Credit card fee</p>
            <p className="text-[11px] text-gray-400 mt-2"><strong className="text-gray-700">Debit cards: 0%</strong> — no charge at all.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <Smartphone size={22} className="text-teal-600" />
            </div>
            <p className="text-[28px] font-black text-gray-900">Free</p>
            <p className="text-[12px] text-gray-500 mt-1">Online ordering system</p>
            <p className="text-[11px] text-gray-400 mt-2">Fully integrated. Hotel ↔ Restaurant in one thread.</p>
          </div>
        </div>

        <div className="bg-teal-50 rounded-2xl p-6 sm:p-8 border border-teal-100">
          <p className="text-[14px] text-teal-900 leading-relaxed font-semibold">
            <strong>The math is simple:</strong> If your restaurant agrees to these terms, we activate your free ordering system, connect you to every hotel on Attenda near you, and start sending guests your way. No setup costs. No long-term lock-in.
          </p>
        </div>
      </section>

      {/* CTA — dynamic by type */}
      <section className="px-6 py-16 bg-gray-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-white mb-4">Ready to start?</h2>
          <p className="text-[14px] text-gray-400 mb-8 max-w-lg mx-auto">
            {partnerType === 'restaurant' && 'Fill in your details and we\'ll get back to you within 24 hours to activate your restaurant on the Attenda network.'}
            {partnerType === 'service' && 'Tell us about your service. We\'ll review and reach out within 24 hours to discuss how you plug into Attenda\'s vendor portal.'}
            {partnerType === 'experience' && 'Share your experience or tour. We\'ll review and contact you within 24 hours to get you listed on Attenda.'}
            {partnerType === 'brand' && 'Fill in your details and we\'ll be in touch within 24 hours to explore how your brand fits into the Attenda ecosystem.'}
          </p>
          <button
            onClick={() => setShowApply(true)}
            className="px-10 py-4 rounded-xl text-white font-bold text-[15px] flex items-center gap-2 mx-auto"
            style={{ backgroundColor: TEAL }}
          >
            Apply Now <ArrowRight size={18} />
          </button>
          <p className="text-[12px] text-gray-500 mt-4">
            Already a partner? <a href="#partner-login" className="text-teal-400 underline">Log in to your dashboard</a>
          </p>
        </div>
      </section>

      {/* Apply Modal */}
      {showApply && !applied && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5" onClick={() => setShowApply(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {partnerType === 'restaurant' && 'Apply as Restaurant Partner'}
              {partnerType === 'service' && 'Apply as Service Vendor'}
              {partnerType === 'experience' && 'Apply as Experience Partner'}
              {partnerType === 'brand' && 'Apply as Brand Partner'}
            </h3>
            <p className="text-[13px] text-gray-500 mb-6">We&apos;ll reach out within 24 hours.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[12px] font-semibold text-gray-600 block mb-1">{partnerType === 'restaurant' ? 'Restaurant' : 'Business'} Name</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  placeholder={partnerType === 'restaurant' ? "e.g. Luigi's Pizzeria" : "Your business name"}
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-gray-600 block mb-1">Partnership Type</label>
                <select value={form.partnerType} onChange={e => setForm(f => ({ ...f, partnerType: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-200">
                  <option value="restaurant">Restaurant</option>
                  <option value="service">Service &amp; Vendor</option>
                  <option value="experience">Experience &amp; Tour</option>
                  <option value="brand">Brand Partner</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-gray-600 block mb-1">Contact Name</label>
                <input
                  required
                  value={form.contact}
                  onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-gray-600 block mb-1">Phone</label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  placeholder="(954) 555-0123"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-gray-600 block mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  placeholder="chef@luigis.com"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-gray-600 block mb-1">Nearest Hotel (optional)</label>
                <input
                  value={form.hotel}
                  onChange={e => setForm(f => ({ ...f, hotel: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  placeholder="e.g. Best Western Fort Lauderdale"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-gray-600 block mb-1">Tell us about your business (optional)</label>
                <textarea
                  value={form.details}
                  onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-200 resize-none"
                  placeholder="Brief description of what you offer..."
                  rows={3}
                />
              </div>
              <button
                type="submit"
                disabled={applying}
                className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                {applying ? 'Sending...' : 'Submit Application'}
              </button>
              <button type="button" onClick={() => setShowApply(false)} className="w-full text-[13px] text-gray-500 py-2">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Applied success */}
      {showApply && applied && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5" onClick={() => { setShowApply(false); setApplied(false); }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Application Sent!</h3>
            <p className="text-[13px] text-gray-500 mb-6">We&apos;ll review and get back to you within 24 hours.</p>
            <button
              onClick={() => { setShowApply(false); setApplied(false); }}
              className="px-6 py-3 rounded-xl text-white font-bold text-[14px]"
              style={{ backgroundColor: TEAL }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Existing partner login anchor */}
      <div id="partner-login" className="px-6 py-12 text-center border-t border-gray-100">
        <p className="text-[13px] text-gray-400 mb-2">Already have a partner account?</p>
        <a href="?restaurant=login" className="text-teal-600 font-bold text-[14px] underline">Log in to your dashboard →</a>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Existing Partner Dashboard                                  */
/* ──────────────────────────────────────────────────────────── */
function PartnerContent() {
  const searchParams = useSearchParams();
  const partnerId = searchParams.get('restaurant');
  const urlType = searchParams.get('type');

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);

  const reload = useCallback(async () => {
    if (!partnerId) return;
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
    const { data } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId!)
      .single();

    if (!data) {
      setPinError('Restaurant not found.');
      return;
    }

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

  // No partner ID → show the landing page
  if (!partnerId || partnerId === 'login') {
    return <RestaurantLandingPage urlType={urlType || ''} />;
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
          <a href="/partner" className="block text-center text-[12px] text-teal-600 mt-4 underline">
            ← Back to partner info
          </a>
        </div>
      </div>
    );
  }

  const active = requests.filter(r => r.status !== 'completed');
  const completed = requests.filter(r => r.status === 'completed');

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
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