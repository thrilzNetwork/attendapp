'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bell, RefreshCw, LogOut, Hotel as HotelIcon, ArrowRight, CheckCircle, XCircle, DollarSign, Truck, CreditCard, Smartphone, Utensils, MapPin, Store, ChefHat, Clock, Package } from 'lucide-react';
import {
  supabase, subscribeToRequests, updateVendorStatus,
} from '@/lib/supabase';

type VendorStatus = 'new' | 'received' | 'preparing' | 'ready';

interface VendorOrder {
  id: string;
  guest_name: string;
  room: string;
  details: string;
  status: string;
  vendor_status: VendorStatus;
  total_amount: number;
  vendor_payout: number;
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
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
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

      {/* The offer — dynamic by type */}
      <section id="how-it-works" className="px-6 py-16 max-w-4xl mx-auto">
        {partnerType === 'restaurant' && (
          <>
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
                <p className="text-[11px] text-gray-400 mt-2">Fully integrated. Hotel &harr; Restaurant in one thread.</p>
              </div>
            </div>
            <div className="bg-teal-50 rounded-2xl p-6 sm:p-8 border border-teal-100">
              <p className="text-[14px] text-teal-900 leading-relaxed font-semibold">
                <strong>The math is simple:</strong> If your restaurant agrees to these terms, we activate your free ordering system, connect you to every hotel on Attenda near you, and start sending guests your way. No setup costs. No long-term lock-in.
              </p>
            </div>
          </>
        )}

        {partnerType === 'service' && (
          <>
            <h2 className="text-2xl font-black text-gray-900 text-center mb-10">How It Works</h2>
            <div className="grid sm:grid-cols-3 gap-4 mb-10">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <HotelIcon size={22} className="text-teal-600" />
                </div>
                <p className="text-[17px] font-black text-gray-900 mb-1">Guest requests</p>
                <p className="text-[12px] text-gray-500 mt-1">Through Attenda&apos;s room QR code &mdash; amenity, maintenance, housekeeping.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <Bell size={22} className="text-teal-600" />
                </div>
                <p className="text-[17px] font-black text-gray-900 mb-1">Staff assigns</p>
                <p className="text-[12px] text-gray-500 mt-1">Front desk routes the job to your vendor portal. You see it instantly.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={22} className="text-teal-600" />
                </div>
                <p className="text-[17px] font-black text-gray-900 mb-1">You fulfill</p>
                <p className="text-[12px] text-gray-500 mt-1">Complete the job. Status updates automatically. Hotel pays out.</p>
              </div>
            </div>
            <div className="bg-teal-50 rounded-2xl p-6 sm:p-8 border border-teal-100">
              <p className="text-[14px] text-teal-900 leading-relaxed font-semibold">
                <strong>No platform fee for vendors.</strong> Hotels subscribe to Attenda. You get free access to the vendor portal, direct job routing, and payment processing. Your only cost is the standard processing fee on completed jobs.
              </p>
            </div>
          </>
        )}

        {partnerType === 'experience' && (
          <>
            <h2 className="text-2xl font-black text-gray-900 text-center mb-10">How It Works</h2>
            <div className="grid sm:grid-cols-3 gap-4 mb-10">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <MapPin size={22} className="text-teal-600" />
                </div>
                <p className="text-[17px] font-black text-gray-900 mb-1">Listed in-room</p>
                <p className="text-[12px] text-gray-500 mt-1">Your experience appears on Attenda&apos;s guest page &mdash; right there with WiFi, facilities, and food.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <CreditCard size={22} className="text-teal-600" />
                </div>
                <p className="text-[17px] font-black text-gray-900 mb-1">Guest books direct</p>
                <p className="text-[12px] text-gray-500 mt-1">No third-party markup, no OTA commission. Guest pays your rate. Attenda processes the payment.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <DollarSign size={22} className="text-teal-600" />
                </div>
                <p className="text-[17px] font-black text-gray-900 mb-1">You keep 90%</p>
                <p className="text-[12px] text-gray-500 mt-1">10% commission. No listing fee. No monthly charge. Just the bookings we bring you.</p>
              </div>
            </div>
            <div className="bg-teal-50 rounded-2xl p-6 sm:p-8 border border-teal-100">
              <p className="text-[14px] text-teal-900 leading-relaxed font-semibold">
                <strong>We bring the guests. You bring the experience.</strong> No upfront costs, no long-term contracts. Your listing goes live within 48 hours of approval.
              </p>
            </div>
          </>
        )}

        {partnerType === 'brand' && (
          <>
            <h2 className="text-2xl font-black text-gray-900 text-center mb-10">How It Works</h2>
            <div className="max-w-xl mx-auto space-y-4 mb-10">
              {[
                { step: '1', text: 'We identify brands that align with independent hospitality &mdash; products and services our guests already want.' },
                { step: '2', text: 'Your brand gets featured in Attenda&apos;s guest experience, surfaced to guests who opt in, not spammed to everyone.' },
                { step: '3', text: 'Guests engage directly. No ad spend, no middleman, no spray-and-pray. Just a relevant audience that chose to be there.' },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-[15px] text-white" style={{ backgroundColor: TEAL }}>{s.step}</div>
                  <p className="text-[14px] text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: s.text }} />
                </div>
              ))}
            </div>
            <div className="bg-teal-50 rounded-2xl p-6 sm:p-8 border border-teal-100">
              <p className="text-[14px] text-teal-900 leading-relaxed font-semibold">
                <strong>This is not an ad network.</strong> We don&apos;t sell impressions. We connect brands to hotel guests who already trust the platform. Partnership terms are negotiated per brand &mdash; reach out and we&apos;ll build the right model for you.
              </p>
            </div>
          </>
        )}
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
/*  Vendor iPad Dashboard — works for ANY partner type          */
/* ──────────────────────────────────────────────────────────── */

// Category-aware copy: restaurant, transport, service, attraction, default
type PartnerCategory = 'restaurant' | 'transport' | 'transportation' | 'service' | 'attraction' | 'experience' | string;

interface CategoryProfile {
  icon: React.ReactNode;
  dashboardTitle: string;
  requestWord: string; // "order" | "ride" | "booking" | "request"
  steps: Record<VendorStatus, { label: string; action: string }>;
}

function getCategoryProfile(category: PartnerCategory): CategoryProfile {
  const c = (category || '').toLowerCase();

  if (c === 'restaurant' || c === 'food' || c === 'catering') return {
    icon: <Utensils size={36} style={{ color: TEAL }} />,
    dashboardTitle: 'Kitchen Display',
    requestWord: 'order',
    steps: {
      new:       { label: 'New Order',    action: 'Accept Order'   },
      received:  { label: 'Accepted',     action: 'Start Cooking'  },
      preparing: { label: 'Preparing',    action: 'Mark Ready'     },
      ready:     { label: 'Ready ✓',      action: ''               },
    },
  };

  if (c === 'transport' || c === 'transportation' || c === 'shuttle' || c === 'taxi' || c === 'car') return {
    icon: <Truck size={36} style={{ color: TEAL }} />,
    dashboardTitle: 'Dispatch Board',
    requestWord: 'ride',
    steps: {
      new:       { label: 'New Request',  action: 'Accept Ride'     },
      received:  { label: 'Accepted',     action: 'Driver En Route' },
      preparing: { label: 'En Route',     action: 'Mark Arrived'    },
      ready:     { label: 'Arrived ✓',    action: ''                },
    },
  };

  if (c === 'service' || c === 'spa' || c === 'wellness' || c === 'cleaning' || c === 'maintenance') return {
    icon: <Smartphone size={36} style={{ color: TEAL }} />,
    dashboardTitle: 'Service Board',
    requestWord: 'booking',
    steps: {
      new:       { label: 'New Booking',  action: 'Confirm Booking' },
      received:  { label: 'Confirmed',    action: 'Start Service'   },
      preparing: { label: 'In Progress',  action: 'Mark Complete'   },
      ready:     { label: 'Completed ✓',  action: ''                },
    },
  };

  if (c === 'attraction' || c === 'experience' || c === 'tour' || c === 'activity') return {
    icon: <MapPin size={36} style={{ color: TEAL }} />,
    dashboardTitle: 'Experience Board',
    requestWord: 'reservation',
    steps: {
      new:       { label: 'New Reservation', action: 'Confirm'       },
      received:  { label: 'Confirmed',        action: 'Guest Arrived' },
      preparing: { label: 'In Session',       action: 'Mark Done'     },
      ready:     { label: 'Done ✓',           action: ''              },
    },
  };

  // Generic fallback
  return {
    icon: <Store size={36} style={{ color: TEAL }} />,
    dashboardTitle: 'Partner Dashboard',
    requestWord: 'request',
    steps: {
      new:       { label: 'New Request',  action: 'Accept'         },
      received:  { label: 'Accepted',     action: 'Start'          },
      preparing: { label: 'In Progress',  action: 'Mark Complete'  },
      ready:     { label: 'Complete ✓',   action: ''               },
    },
  };
}

const VS_STYLE: Record<VendorStatus, { color: string; bg: string; border: string; btnBg: string; icon: React.ReactNode }> = {
  new:       { color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     btnBg: 'bg-red-500 hover:bg-red-600',     icon: <Bell size={16} className="text-red-500" /> },
  received:  { color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   btnBg: 'bg-amber-500 hover:bg-amber-600', icon: <ChefHat size={16} className="text-amber-500" /> },
  preparing: { color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    btnBg: 'bg-blue-500 hover:bg-blue-600',   icon: <Clock size={16} className="text-blue-500" /> },
  ready:     { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', btnBg: '',                                icon: <CheckCircle size={16} className="text-emerald-500" /> },
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const VS_NEXT: Record<VendorStatus, VendorStatus | null> = {
  new: 'received', received: 'preparing', preparing: 'ready', ready: null,
};

function OrderCard({ order, profile, onAdvance }: { order: VendorOrder; profile: CategoryProfile; onAdvance: (id: string, next: VendorStatus) => void }) {
  const style = VS_STYLE[order.vendor_status];
  const step  = profile.steps[order.vendor_status];
  const next  = VS_NEXT[order.vendor_status];
  const isNew = order.vendor_status === 'new';
  return (
    <div className={`rounded-2xl border-2 ${style.border} ${style.bg} p-5 flex flex-col gap-3 ${isNew ? 'shadow-lg ring-2 ring-red-300' : 'shadow-sm'} transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {style.icon}
          <span className={`text-[11px] font-black uppercase tracking-widest ${style.color}`}>{step.label}</span>
        </div>
        <span className="text-[11px] text-gray-400">{timeAgo(order.created_at)}</span>
      </div>

      <div>
        <p className="text-[20px] font-black text-gray-900 leading-tight">Room {order.room}</p>
        <p className="text-[14px] text-gray-600 font-medium">{order.guest_name}</p>
      </div>

      <div className="bg-white/70 rounded-xl p-3">
        <p className="text-[13px] text-gray-700 leading-relaxed">{order.details}</p>
      </div>

      {order.total_amount > 0 && (
        <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
          <DollarSign size={12} />
          <span className="font-semibold text-gray-900">${order.total_amount.toFixed(2)}</span>
          <span className="text-gray-400"> · your payout <span className="font-semibold text-emerald-600">${order.vendor_payout.toFixed(2)}</span></span>
        </div>
      )}

      {next && step.action && (
        <button
          onClick={() => onAdvance(order.id, next)}
          className={`w-full py-4 rounded-xl font-black text-[15px] text-white transition-all active:scale-95 ${style.btnBg}`}
        >
          {step.action}
        </button>
      )}
    </div>
  );
}

function PartnerContent() {
  const searchParams = useSearchParams();
  const partnerId = searchParams.get('restaurant');
  const urlType = searchParams.get('type');

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [partnerData, setPartnerData] = useState<Record<string, unknown> | null>(null);
  const [menuItems, setMenuItems] = useState<Array<{ id: string; name: string; description: string; price: number; is_active: boolean }>>([]);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [newAlert, setNewAlert] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'info'>('orders');
  const prevCountRef = useRef(0);

  const partnerName = (partnerData?.name as string) || '';
  const partnerCategory = (partnerData?.category as string) || '';
  const profile = getCategoryProfile(partnerCategory);

  const reload = useCallback(async () => {
    if (!partnerId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('requests')
      .select('id,guest_name,room,details,status,vendor_status,total_amount,vendor_payout,created_at')
      .eq('partner_id', partnerId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });
    if (data) {
      setOrders(data as VendorOrder[]);
      const incoming = (data as VendorOrder[]).filter(o => o.vendor_status === 'new').length;
      if (incoming > prevCountRef.current) {
        setNewAlert(true);
        setTimeout(() => setNewAlert(false), 3000);
        try { new Audio('/sounds/ding.mp3').play().catch(() => {}); } catch {}
      }
      prevCountRef.current = incoming;
    }
  }, [partnerId]);

  useEffect(() => {
    if (!partnerId || !authenticated) return;
    reload();
    const ch = subscribeToRequests(hotelId, () => reload());
    return () => { supabase.removeChannel(ch); };
  }, [partnerId, authenticated, reload, hotelId]);

  const handleLogin = async (pinOverride?: string) => {
    const attemptPin = pinOverride ?? pin;
    setPinError('');
    const { data } = await supabase.from('partners').select('*').eq('id', partnerId!).single();
    if (!data) { setPinError('Partner not found.'); return; }
    if (attemptPin === (data.pin_code || '')) {
      setPartnerData(data as Record<string, unknown>);
      setHotelId((data.hotel_id as string) || null);
      setAuthenticated(true);
      // Load menu items
      const { data: items } = await supabase.from('partner_menu_items').select('*').eq('partner_id', partnerId!).eq('is_active', true).order('name');
      if (items) setMenuItems(items);
    } else {
      setPinError('Incorrect PIN. Try again.');
      setPin('');
    }
  };

  const handleAdvance = async (id: string, next: VendorStatus) => {
    await updateVendorStatus(id, next);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, vendor_status: next } : o));
  };

  if (!partnerId || partnerId === 'login') {
    return <RestaurantLandingPage urlType={urlType || ''} />;
  }

  if (!authenticated) {
    const loginProfile = getCategoryProfile('');
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-3xl p-10 shadow-2xl">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}15` }}>
            {loginProfile.icon}
          </div>
          <h1 className="text-2xl font-black text-center mb-1">Partner Dashboard</h1>
          <p className="text-[14px] text-gray-400 text-center mb-8">Enter your 4-digit PIN</p>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {pin.split('').concat(Array(4 - pin.length).fill('')).map((ch, i) => (
              <div key={i} className={`h-14 rounded-xl flex items-center justify-center text-2xl font-black border-2 ${ch ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-gray-50 text-gray-300'}`}>
                {ch ? '•' : ''}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map(k => (
              <button key={k} onClick={() => {
                if (k === '⌫') setPin(p => p.slice(0, -1));
                else if (k && pin.length < 4) { const np = pin + k; setPin(np); if (np.length === 4) setTimeout(() => handleLogin(np), 100); }
              }}
                className={`h-14 rounded-xl text-xl font-bold transition-all active:scale-95 ${k === '' ? 'invisible' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
              >{k}</button>
            ))}
          </div>
          {pinError && <p className="text-red-500 text-[13px] text-center mb-2">{pinError}</p>}
          <button onClick={() => handleLogin()} className="w-full py-4 rounded-xl text-white font-black text-[15px] mt-2" style={{ backgroundColor: TEAL }}>
            SIGN IN
          </button>
        </div>
      </div>
    );
  }

  const newOrders   = orders.filter(o => o.vendor_status === 'new');
  const received    = orders.filter(o => o.vendor_status === 'received');
  const preparing   = orders.filter(o => o.vendor_status === 'preparing');
  const readyOrders = orders.filter(o => o.vendor_status === 'ready');
  const todayRevenue = orders.reduce((s, o) => s + (o.vendor_payout || 0), 0);

  const kanbanCols = [
    { status: 'new' as VendorStatus,      emoji: '🔴', items: newOrders },
    { status: 'received' as VendorStatus,  emoji: '🟡', items: received },
    { status: 'preparing' as VendorStatus, emoji: '🔵', items: preparing },
    { status: 'ready' as VendorStatus,     emoji: '🟢', items: readyOrders },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none">
      {/* Header */}
      <header className="shrink-0 bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${TEAL}25` }}>
            <div className="scale-50 -m-2">{profile.icon}</div>
          </div>
          <div>
            <h1 className="text-[16px] font-black leading-tight">{partnerName}</h1>
            <p className="text-[11px] text-gray-500 capitalize">{partnerCategory || 'Partner'} · {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {newAlert && (
            <div className="flex items-center gap-2 bg-red-500 text-white text-[12px] font-bold px-3 py-1.5 rounded-full animate-bounce">
              <Bell size={12} /> NEW {profile.requestWord.toUpperCase()}
            </div>
          )}
          <div className="text-right">
            <p className="text-[11px] text-gray-500">Today&apos;s Payout</p>
            <p className="text-[16px] font-black text-emerald-400">${todayRevenue.toFixed(2)}</p>
          </div>
          <button onClick={reload} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setAuthenticated(false); setPin(''); setHotelId(null); setPartnerData(null); }} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="shrink-0 bg-gray-900 border-b border-gray-800 flex items-center px-4">
        {([
          { id: 'orders', label: `${profile.requestWord.charAt(0).toUpperCase() + profile.requestWord.slice(1)}s`, badge: newOrders.length },
          { id: 'menu',   label: 'Menu & Pricing', badge: 0 },
          { id: 'info',   label: 'Business Info', badge: 0 },
        ] as { id: 'orders' | 'menu' | 'info'; label: string; badge: number }[]).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`relative px-5 py-3 text-[13px] font-bold border-b-2 transition-colors ${activeTab === t.id ? 'border-teal-400 text-teal-300' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {t.label}
            {t.badge > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5">{t.badge}</span>}
          </button>
        ))}
        {/* Stats in tab bar */}
        <div className="ml-auto flex items-center gap-5 pr-2">
          {[
            { label: 'New', count: newOrders.length, color: newOrders.length > 0 ? 'text-red-400' : 'text-gray-600' },
            { label: 'Active', count: received.length + preparing.length, color: 'text-amber-400' },
            { label: 'Done', count: readyOrders.length, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={`text-[18px] font-black ${s.color}`}>{s.count}</span>
              <span className="text-[10px] text-gray-600 uppercase font-bold">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Orders tab — 4-column Kanban */}
      {activeTab === 'orders' && (
        <div className="flex-1 overflow-hidden grid grid-cols-4 gap-0 divide-x divide-gray-800">
          {kanbanCols.map(col => {
            const colLabel = profile.steps[col.status].label;
            return (
              <div key={col.status} className="flex flex-col min-h-0">
                <div className={`shrink-0 px-4 py-3 border-b border-gray-800 ${col.items.length > 0 && col.status === 'new' ? 'bg-red-950/40' : 'bg-gray-900'}`}>
                  <h2 className="text-[13px] font-black tracking-wide">{col.emoji} {colLabel}</h2>
                  <p className="text-[11px] text-gray-500">{col.items.length} {profile.requestWord}{col.items.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-950">
                  {col.items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 opacity-30">
                      <Package size={32} className="mb-2" />
                      <p className="text-[12px]">Empty</p>
                    </div>
                  )}
                  {col.items.map(order => (
                    <OrderCard key={order.id} order={order} profile={profile} onAdvance={handleAdvance} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Menu & Pricing tab */}
      {activeTab === 'menu' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-[18px] font-black mb-1">Menu &amp; Pricing</h2>
            <p className="text-[13px] text-gray-500 mb-6">Items visible to guests when ordering from you. Managed by hotel admin.</p>
            {menuItems.length === 0 ? (
              <div className="bg-gray-900 rounded-2xl p-10 text-center border border-gray-800">
                <Package size={36} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-semibold">No menu items yet</p>
                <p className="text-[12px] text-gray-600 mt-1">Contact the hotel to add your services or menu items.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {menuItems.map(item => (
                  <div key={item.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-white">{item.name}</p>
                      {item.description && <p className="text-[12px] text-gray-400 mt-0.5">{item.description}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[18px] font-black text-emerald-400">${Number(item.price).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Business Info tab */}
      {activeTab === 'info' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-[18px] font-black mb-1">Business Info</h2>
            <p className="text-[13px] text-gray-500 mb-6">Your profile as guests see it. Contact hotel admin to update.</p>
            {([
              { label: 'Business Name',  value: partnerData?.name as string },
              { label: 'Category',       value: partnerData?.category as string },
              { label: 'Phone',          value: partnerData?.phone as string },
              { label: 'Email',          value: partnerData?.email as string },
              { label: 'Address',        value: partnerData?.address as string },
              { label: 'Hours',          value: partnerData?.hours as string },
              { label: 'Description',    value: partnerData?.description as string },
              { label: 'Attenda Fee',    value: partnerData?.attenda_fee_percent ? `${partnerData.attenda_fee_percent}%` : '10%' },
            ] as { label: string; value: string }[]).filter(r => r.value).map(row => (
              <div key={row.label} className="bg-gray-900 rounded-xl border border-gray-800 px-5 py-4 flex gap-4">
                <p className="text-[12px] text-gray-500 uppercase font-bold w-32 shrink-0 pt-0.5">{row.label}</p>
                <p className="text-[14px] text-white font-medium flex-1 capitalize">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
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