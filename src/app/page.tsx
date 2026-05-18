'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  MapPin, Bus, Bell, ShieldCheck, Phone, Globe, User,
  MessageSquare, QrCode, Utensils, Star, ArrowRight,
  CheckCircle, Menu, X, Zap, Building2, DollarSign,
  BarChart3, Shield, Users, TrendingUp,
  Car, ChefHat, Repeat, AlertCircle,
} from 'lucide-react';
import GuestAuthModal from '@/components/GuestAuthModal';
import {
  GuestSheet,
  MessageSheetContent, TransportSheetContent, FacilitiesSheetContent,
  SafetySheetContent, WelcomeSheetContent, ReviewSheetContent,
} from '@/components/GuestSheets';
import { useGuest } from '@/lib/guest-context';

/* ──────────────────────────────────────────────────────────── */
/*  Root — detects hotel context and switches view             */
/* ──────────────────────────────────────────────────────────── */

type SheetName = 'message' | 'transport' | 'facilities' | 'safety' | 'welcome' | 'review';

export default function Home() {
  const [isHotelView, setIsHotelView] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<SheetName | ''>('');
  const [openSheet, setOpenSheet] = useState<SheetName | null>(null);
  const [showValidationSuccess, setShowValidationSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotel = params.get('hotel');
    const room = params.get('room');
    if (hotel) localStorage.setItem('attenda_hotel_slug', hotel);
    if (room) localStorage.setItem('attenda_qr_room', room);

    // Show hotel guest app when:
    //   1. ?hotel= is in the URL (first scan or admin preview)
    //   2. Device came from a room QR scan (both hotel slug + room stored) — covers back-navigation
    //   3. Guest has an active checked-in session
    // Admins who preview via ?hotel= without a room param don't get a room stored,
    // so they still see the marketing page on direct visits to /.
    const stored = localStorage.getItem('attenda_hotel_slug');
    const qrRoom = localStorage.getItem('attenda_qr_room');
    let hasActiveSession = false;
    try {
      const gs = localStorage.getItem('guestSession');
      if (gs) {
        const s = JSON.parse(gs);
        hasActiveSession = !!stored && new Date(s.checkout) > new Date();
      }
    } catch (err) {
      console.error('Error checking guest session:', err);
    }
    setIsHotelView(!!(hotel || (stored && qrRoom) || hasActiveSession));
  }, []);

  if (isHotelView === null) return <div className="h-dvh bg-white" />;

  if (isHotelView) {
    return (
      <HotelGuestApp
        modalOpen={modalOpen}
        pendingTarget={pendingTarget}
        setModalOpen={setModalOpen}
        setPendingTarget={setPendingTarget}
        openSheet={openSheet}
        setOpenSheet={setOpenSheet}
        showValidationSuccess={showValidationSuccess}
        setShowValidationSuccess={setShowValidationSuccess}
      />
    );
  }

  return <AttendaLandingPage />;
}

/* ──────────────────────────────────────────────────────────── */
/*  Hotel Guest App (unchanged)                                */
/* ──────────────────────────────────────────────────────────── */

const BURGUNDY = '#6B1D3C';

function HotelGuestApp({
  modalOpen, pendingTarget, setModalOpen, setPendingTarget, openSheet, setOpenSheet,
  showValidationSuccess, setShowValidationSuccess,
}: {
  modalOpen: boolean;
  pendingTarget: SheetName | '';
  setModalOpen: (v: boolean) => void;
  setPendingTarget: (v: SheetName | '') => void;
  openSheet: SheetName | null;
  setOpenSheet: (v: SheetName | null) => void;
  showValidationSuccess: boolean;
  setShowValidationSuccess: (v: boolean) => void;
}) {
  const { guest, isValidated, resetValidationOnCheckout } = useGuest();
  const [prevValidated, setPrevValidated] = useState(isValidated);

  // Check for checkout reset on mount
  useEffect(() => {
    resetValidationOnCheckout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for validation status change to show success modal
  useEffect(() => {
    if (isValidated && !prevValidated && guest) {
      setShowValidationSuccess(true);
    }
    setPrevValidated(isValidated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidated, prevValidated, guest]);

  const handleClick = (sheet: SheetName, requiresValidation = false) => {
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (new Date(session.checkout) > new Date()) {
          // If requires validation and not validated, show validation modal
          if (requiresValidation && session.validationStatus !== 'confirmed') {
            setPendingTarget(sheet);
            setModalOpen(true);
            return;
          }
          setOpenSheet(sheet);
          return;
        }
      } catch (err) {
        console.error('Error parsing guest session:', err);
        localStorage.removeItem('guestSession');
      }
    }
    setPendingTarget(sheet);
    setModalOpen(true);
  };

  const closeSheet = () => setOpenSheet(null);

  return (
    <div className="h-dvh w-full flex flex-col bg-[#F5F5F5]">
      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[34px] font-black text-black leading-none">Hello!</h1>
              {guest && (
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${isValidated ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  <div className={`w-2 h-2 rounded-full ${isValidated ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className={`text-[11px] font-bold ${isValidated ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {isValidated ? 'Validated' : 'Pending Validation'}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[15px] text-gray-400 mt-1 font-normal">What do you need today?</p>
          </div>
          <button
            onClick={() => handleClick('safety')}
            className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center shadow-sm active:scale-95"
          >
            <Phone size={18} className="text-[#6B1D3C]" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3 min-h-0">
        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleClick('welcome')}
            className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-[0.97] transition-transform shadow-sm py-4"
            style={{ backgroundColor: BURGUNDY }}>
            <MapPin size={32} className="text-white" strokeWidth={1.5} />
            <span className="text-[13px] font-bold text-white tracking-[0.12em] uppercase">WELCOME</span>
          </button>
          <button onClick={() => handleClick('transport', true)}
            className="aspect-square rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center gap-3 active:scale-[0.97] transition-transform shadow-sm py-4"
          >
            <Bus size={32} className="text-[#6B1D3C]" strokeWidth={1.5} />
            <span className="text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: BURGUNDY }}>TRANSPORT</span>
          </button>
          <button onClick={() => handleClick('facilities')}
            className="aspect-square rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center gap-3 active:scale-[0.97] transition-transform shadow-sm py-4"
          >
            <Bell size={32} className="text-[#6B1D3C]" strokeWidth={1.5} />
            <span className="text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: BURGUNDY }}>FACILITIES</span>
          </button>
          <button onClick={() => handleClick('safety')}
            className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-[0.97] transition-transform shadow-sm py-4"
            style={{ backgroundColor: BURGUNDY }}>
            <ShieldCheck size={32} className="text-white" strokeWidth={1.5} />
            <span className="text-[13px] font-bold text-white tracking-[0.12em] uppercase">SAFETY</span>
          </button>
        </div>

        {/* Restaurants Banner */}
        <button onClick={() => (window.location.href = '/nearby?tab=restaurants')} className="w-full block">
          <div className="relative w-full aspect-[4/1] rounded-2xl overflow-hidden shadow-sm">
            <Image src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&fit=crop&q=80"
              alt="Restaurants" fill className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-4">
              <span className="text-[15px] font-bold text-white tracking-wider">RESTAURANTS</span>
            </div>
          </div>
        </button>

        {/* Rewards + Nearby/Review Row */}
        <div className="flex gap-3">
          <a href="https://www.bestwestern.com/rewards/join.html" target="_blank" rel="noopener noreferrer"
            className="w-[38%] aspect-[3/4] rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] block relative">
            <Image src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&fit=crop&q=80"
              alt="Rewards" fill className="object-cover" sizes="38vw" />
          </a>
          <div className="flex-1 flex flex-col gap-3">
            <button onClick={() => (window.location.href = '/nearby?tab=attractions')}
              className="flex-1 rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center gap-2 active:scale-[0.97] shadow-sm py-2">
              <MapPin size={22} className="text-[#6B1D3C]" strokeWidth={1.5} />
              <span className="text-[12px] font-bold tracking-[0.12em] uppercase" style={{ color: BURGUNDY }}>NEARBY</span>
            </button>
            <button onClick={() => handleClick('review')}
              className="flex-1 rounded-2xl flex items-center justify-center active:scale-[0.97] shadow-sm py-2"
              style={{ backgroundColor: BURGUNDY }}>
              <span className="text-[12px] font-bold text-white tracking-[0.12em] uppercase">LEAVE A REVIEW</span>
            </button>
          </div>
        </div>

        {/* Footer — powered by + Message */}
        <div className="flex items-end justify-between pt-1 pb-2">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-gray-400" />
            <span className="text-[11px] text-gray-400 leading-none">powered by Attenda</span>
          </div>
          <button onClick={() => handleClick('message')} className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: BURGUNDY }}>
              <User size={20} className="text-white" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: BURGUNDY }}>MESSAGE US</span>
          </button>
        </div>
      </div>

      <GuestAuthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          if (pendingTarget) setOpenSheet(pendingTarget as SheetName);
        }}
      />

      {/* Validation Success Modal - shown when staff confirms guest */}
      <ValidationSuccessModal
        open={showValidationSuccess}
        onClose={() => setShowValidationSuccess(false)}
      />

      {/* ── Guest Sheets (slide-up overlays) ── */}
      <GuestSheet open={openSheet === 'message'} onClose={closeSheet} title="Front Desk" fullHeight>
        <MessageSheetContent />
      </GuestSheet>
      <GuestSheet open={openSheet === 'transport'} onClose={closeSheet} title="Transport">
        <TransportSheetContent />
      </GuestSheet>
      <GuestSheet open={openSheet === 'facilities'} onClose={closeSheet} title="Facilities">
        <FacilitiesSheetContent />
      </GuestSheet>
      <GuestSheet open={openSheet === 'safety'} onClose={closeSheet} title="Safety">
        <SafetySheetContent />
      </GuestSheet>
      <GuestSheet open={openSheet === 'welcome'} onClose={closeSheet} title="Welcome">
        <WelcomeSheetContent />
      </GuestSheet>
      <GuestSheet open={openSheet === 'review'} onClose={closeSheet} title="Leave a Review">
        <ReviewSheetContent onClose={closeSheet} />
      </GuestSheet>
    </div>
  );
}



/* ──────────────────────────────────────────────────────────── */
/*  Attenda Marketing Landing Page                             */
/* ──────────────────────────────────────────────────────────── */

const TEAL = '#0D9488';
const DARK = '#0F172A';

function AttendaLandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const enrollRef = useRef<HTMLDivElement>(null);

  const scrollToEnroll = () => {
    enrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: TEAL }}>
              <span className="text-white font-black text-[14px]">A</span>
            </div>
            <div>
              <span className="font-black text-[17px] text-gray-900">attenda</span>
              <span className="hidden sm:inline text-[11px] text-gray-400 ml-2 font-medium">by Thrilz Network LLC</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-7">
            <a href="#problem" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">The Problem</a>
            <a href="#revenue" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Revenue</a>
            <a href="#ecosystem" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Ecosystem</a>
            <a href="#features" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Features</a>
            <a href="/staff" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">Staff Login</a>
            <button onClick={scrollToEnroll}
              className="px-5 py-2.5 rounded-lg text-white text-[13px] font-bold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: TEAL }}>
              Get a Demo →
            </button>
          </div>

          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="md:hidden p-2">
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 space-y-4">
            <a href="#problem" onClick={() => setMobileNavOpen(false)} className="block text-[15px] font-semibold text-gray-700">The Problem</a>
            <a href="#revenue" onClick={() => setMobileNavOpen(false)} className="block text-[15px] font-semibold text-gray-700">Revenue</a>
            <a href="#ecosystem" onClick={() => setMobileNavOpen(false)} className="block text-[15px] font-semibold text-gray-700">Ecosystem</a>
            <a href="#features" onClick={() => setMobileNavOpen(false)} className="block text-[15px] font-semibold text-gray-700">Features</a>
            <a href="/staff" className="block text-[15px] font-semibold text-gray-700">Staff Login</a>
            <button onClick={scrollToEnroll} className="w-full py-3 rounded-xl text-white font-bold text-[14px]" style={{ backgroundColor: TEAL }}>
              Get a Demo
            </button>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${DARK} 0%, #1a2744 55%, #0a2a1a 100%)` }}>
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div className="relative max-w-6xl mx-auto px-5 pt-20 pb-28 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 mb-6">
              <Zap size={12} className="text-teal-400" />
              <span className="text-[12px] font-bold text-teal-400 tracking-wide uppercase">Built by an Operator · For Operators</span>
            </div>

            <h1 className="text-[40px] md:text-[56px] font-black text-white leading-[1.05] mb-5">
              Your hotel&apos;s<br />
              <span style={{ color: TEAL }}>operations engine.</span><br />
              <span className="text-gray-300">Your guests&apos; best stay.</span>
            </h1>

            <p className="text-[17px] text-gray-300 leading-relaxed mb-4 max-w-xl mx-auto lg:mx-0">
              Attenda connects your hotel to local restaurants and drivers, eliminates repetitive staff tasks, and generates direct revenue — so the guest wins, the restaurant wins, the hotel wins, and the community wins.
            </p>
            <p className="text-[14px] text-teal-400 font-semibold mb-8 max-w-xl mx-auto lg:mx-0">
              No kitchen? No problem. No dedicated driver? No problem. We built the network.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button onClick={scrollToEnroll}
                className="px-7 py-4 rounded-xl text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: TEAL }}>
                Enroll Your Property <ArrowRight size={16} />
              </button>
              <a href="/staff"
                className="px-7 py-4 rounded-xl border border-white/20 text-white text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                View Staff Dashboard →
              </a>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-10 justify-center lg:justify-start">
              {[
                { val: '0%', label: 'Commissions to 3rd parties' },
                { val: '< 60s', label: 'Guest onboarding via QR' },
                { val: '100%', label: 'Local. No middleman.' },
              ].map(s => (
                <div key={s.label} className="text-center lg:text-left">
                  <p className="text-[24px] font-black text-white">{s.val}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0 flex justify-center">
            <PhoneMockup />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── The Problem ─────────────────────────────────────── */}
      <section id="problem" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 mb-4">
              <AlertCircle size={13} className="text-red-500" />
              <span className="text-[12px] font-bold text-red-600 uppercase tracking-wide">Sound familiar?</span>
            </div>
            <h2 className="text-[34px] font-black text-gray-900 mb-3">Hotels are losing money on problems that are already solved.</h2>
            <p className="text-[16px] text-gray-500 max-w-2xl mx-auto">We&apos;ve worked inside properties. We know the exact moments where staff time, guest satisfaction, and revenue all bleed out at once.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Repeat,
                title: 'Same 10 requests. Every day.',
                desc: '"Do you have towels?" "What time is checkout?" "Can I get a wake-up call?" Your staff answers these 50 times a day instead of doing real work.',
                color: 'bg-orange-50 border-orange-100',
                iconBg: 'bg-orange-100',
                iconColor: '#EA580C',
              },
              {
                icon: DollarSign,
                title: 'Food orders happening off your platform.',
                desc: 'Guests leave your app to find food elsewhere. The hotel sees nothing. The restaurant misses a captive audience. Everyone loses a connection that was right there.',
                color: 'bg-red-50 border-red-100',
                iconBg: 'bg-red-100',
                iconColor: '#DC2626',
              },
              {
                icon: Car,
                title: 'No coordinated transportation.',
                desc: 'Guests need airport rides and cruise port shuttles. Without a system, it\'s phone tag, missed pickups, and frustrated guests writing 2-star reviews.',
                color: 'bg-amber-50 border-amber-100',
                iconBg: 'bg-amber-100',
                iconColor: '#D97706',
              },
              {
                icon: MessageSquare,
                title: 'Guest requests fall through the cracks.',
                desc: 'A room service request lives in a text thread. A maintenance note is on a sticky note. By shift change it\'s forgotten and the guest is at the front desk, angry.',
                color: 'bg-purple-50 border-purple-100',
                iconBg: 'bg-purple-100',
                iconColor: '#7C3AED',
              },
              {
                icon: ChefHat,
                title: 'No kitchen? Guests go elsewhere.',
                desc: 'Not every property has F&B. Guests leave for food and don\'t come back until midnight. You lose the spend and the engagement entirely.',
                color: 'bg-pink-50 border-pink-100',
                iconBg: 'bg-pink-100',
                iconColor: '#DB2777',
              },
              {
                icon: Star,
                title: 'Bad reviews you never saw coming.',
                desc: 'Guests check out unhappy, go straight to Google, and post a 1-star review. You had no idea they were unhappy. No feedback loop. No chance to fix it.',
                color: 'bg-blue-50 border-blue-100',
                iconBg: 'bg-blue-100',
                iconColor: '#2563EB',
              },
            ].map(p => (
              <div key={p.title} className={`rounded-2xl p-6 border ${p.color}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${p.iconBg}`}>
                  <p.icon size={20} style={{ color: p.iconColor }} />
                </div>
                <h3 className="font-bold text-[15px] text-gray-900 mb-2">{p.title}</h3>
                <p className="text-[13px] text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Revenue ─────────────────────────────────────────── */}
      <section id="revenue" className="py-24" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #0d2230 100%)` }}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 mb-4">
              <TrendingUp size={13} className="text-teal-400" />
              <span className="text-[12px] font-bold text-teal-400 uppercase tracking-wide">Revenue Generation</span>
            </div>
            <h2 className="text-[34px] font-black text-white mb-3">Attenda doesn&apos;t cost money. It makes it.</h2>
            <p className="text-[16px] text-gray-400 max-w-2xl mx-auto">Every feature is designed around a revenue outcome — for you, your local partners, and your guests.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Food ordering card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <ChefHat size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Food & Beverage</p>
                  <h3 className="text-[17px] font-black text-white">Connect your providers. Or use ours.</h3>
                </div>
              </div>
              <p className="text-[14px] text-gray-300 leading-relaxed mb-5">
                Restaurants link their existing delivery apps in minutes — guests tap and order. Or restaurants go Attenda-powered: <span className="text-white font-semibold">they keep more revenue, the hotel earns on every order, and the guest never leaves the app.</span>
              </p>

              {/* Comparison table */}
              <div className="rounded-xl overflow-hidden border border-white/10">
                {/* Header */}
                <div className="grid grid-cols-3 text-center">
                  <div className="bg-white/5 px-3 py-2.5 border-r border-white/10">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Off-platform</p>
                  </div>
                  <div className="bg-white/5 px-3 py-2.5 border-r border-white/10">
                    <p className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">Own apps linked</p>
                  </div>
                  <div className="bg-teal-500/20 px-3 py-2.5">
                    <p className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">Attenda-powered ✦</p>
                  </div>
                </div>
                {/* Rows */}
                {[
                  {
                    label: '🍽️ Restaurant',
                    cols: ['No hotel exposure', 'Their existing rate', 'Competitive fee, direct guests'],
                    highlight: 2,
                  },
                  {
                    label: '🏨 Hotel earns',
                    cols: ['Nothing', 'Nothing', 'Revenue share every order'],
                    highlight: 2,
                  },
                  {
                    label: '🧑 Guest',
                    cols: ['Leaves your app', 'One tap, stays in app', 'In-room ordering, seamless'],
                    highlight: 2,
                  },
                ].map((row, ri) => (
                  <div key={ri} className="grid grid-cols-3 border-t border-white/10">
                    <div className="bg-white/3 px-3 py-3 border-r border-white/10">
                      <p className="text-[11px] font-bold text-gray-300">{row.label}</p>
                    </div>
                    <div className="bg-white/3 px-3 py-3 border-r border-white/10">
                      <p className="text-[11px] text-gray-400 leading-snug">{row.cols[1]}</p>
                    </div>
                    <div className="bg-teal-500/10 px-3 py-3">
                      <p className="text-[11px] text-teal-200 font-semibold leading-snug">{row.cols[2]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transport card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Car size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-[11px] text-blue-400 font-bold uppercase tracking-wider">Transportation</p>
                  <h3 className="text-[17px] font-black text-white">Shuttle to airport. Cruise port. Anywhere.</h3>
                </div>
              </div>
              <p className="text-[14px] text-gray-300 leading-relaxed mb-5">
                Local drivers partner with Attenda to offer scheduled and on-demand shuttles. Guests book through the app. <span className="text-white font-semibold">You set the price. The driver gets paid. You take a cut.</span> No Lyft. No Uber. Local business, local revenue.
              </p>
              <div className="space-y-2">
                {[
                  'Scheduled airport routes with seat booking',
                  'Cruise port calendar with auto-shuttle suggestions',
                  'Vendor accounts for external shuttle companies',
                  'Passenger manifest for every run',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle size={13} className="text-blue-400 shrink-0" />
                    <span className="text-[13px] text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Attractions */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <MapPin size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Local Attractions</p>
                    <h3 className="text-[17px] font-black text-white">Turn recommendations into revenue.</h3>
                  </div>
                </div>
                <p className="text-[14px] text-gray-300 leading-relaxed">
                  List local tours, spas, water parks, and experiences directly in the guest app. When a guest books, <span className="text-white font-semibold">you earn a referral commission.</span> Your concierge work is now automated and monetized.
                </p>
              </div>
              <div className="flex-shrink-0 grid grid-cols-2 gap-3 text-center">
                {[
                  { label: 'Tours & Activities', icon: '🎯' },
                  { label: 'Spa & Wellness', icon: '💆' },
                  { label: 'Water Sports', icon: '🏄' },
                  { label: 'Nightlife & Dining', icon: '🍸' },
                ].map(a => (
                  <div key={a.label} className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="text-[20px] mb-1">{a.icon}</div>
                    <p className="text-[10px] text-gray-400 font-semibold">{a.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Triple Win ──────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-3">The only model where everyone comes out ahead</p>
            <h2 className="text-[36px] font-black text-gray-900">W · W · W · W</h2>
            <p className="text-[16px] text-gray-500 mt-2">Guest wins. Restaurant wins. Hotel wins. Community wins.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                emoji: '🧑',
                label: 'Guest Wins',
                color: 'bg-blue-50 border-blue-100',
                accent: '#2563EB',
                points: [
                  'Order food from their room',
                  'No app to download',
                  'Local quality, not chains',
                  'One tap — done',
                ],
              },
              {
                emoji: '🍽️',
                label: 'Restaurant Wins',
                color: 'bg-orange-50 border-orange-100',
                accent: '#EA580C',
                points: [
                  'Direct access to hotel guests',
                  'Link existing delivery apps free',
                  'Or go Attenda-powered — keep more',
                  'More orders, less overhead',
                ],
              },
              {
                emoji: '🏨',
                label: 'Hotel Wins',
                color: 'bg-teal-50 border-teal-100',
                accent: TEAL,
                points: [
                  'Earns revenue on every food order',
                  'Guests stay engaged on-property',
                  'No kitchen required',
                  'Zero work to set up',
                ],
              },
              {
                emoji: '🏘️',
                label: 'Community Wins',
                color: 'bg-emerald-50 border-emerald-100',
                accent: '#059669',
                points: [
                  'Money stays local',
                  'Local restaurants grow',
                  'Local drivers get steady work',
                  'No giant taking a cut',
                ],
              },
            ].map(w => (
              <div key={w.label} className={`rounded-2xl border p-6 ${w.color}`}>
                <div className="text-[36px] mb-3">{w.emoji}</div>
                <h3 className="text-[16px] font-black mb-3" style={{ color: w.accent }}>{w.label}</h3>
                <ul className="space-y-1.5">
                  {w.points.map(p => (
                    <li key={p} className="flex items-start gap-2">
                      <CheckCircle size={13} className="mt-0.5 shrink-0" style={{ color: w.accent }} />
                      <span className="text-[12px] text-gray-700 leading-snug">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Local Ecosystem ─────────────────────────────────── */}
      <section id="ecosystem" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 mb-4">
              <Users size={13} style={{ color: TEAL }} />
              <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: TEAL }}>The Local Network</span>
            </div>
            <h2 className="text-[34px] font-black text-gray-900 mb-3">We connect your hotel to the local economy.</h2>
            <p className="text-[16px] text-gray-500 max-w-2xl mx-auto">Attenda isn&apos;t just software. It&apos;s a network of vetted local restaurants, drivers, and attractions — all plugged into your property.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: '🍽️',
                title: 'Local Restaurants',
                desc: 'Restaurants connect their existing delivery apps in 2 minutes, or go Attenda-powered and keep more of every order. Hotel guests find them in-app. No platform fees to join.',
                cta: 'For restaurants: free to connect',
              },
              {
                icon: '🚐',
                title: 'Local Drivers',
                desc: 'Independent shuttle operators and drivers register as vendors. They get a real-time passenger manifest, a booking system, and a steady stream of hotel guests who need reliable transport.',
                cta: 'For drivers: set your own rates',
              },
              {
                icon: '🏖️',
                title: 'Local Attractions',
                desc: 'Tours, spas, boat rentals, excursions — any local experience can list on Attenda. Guests discover them through the hotel app and book directly, keeping revenue circulating locally.',
                cta: 'For attractions: referral only',
              },
            ].map(p => (
              <div key={p.title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="text-[36px] mb-4">{p.icon}</div>
                <h3 className="font-bold text-[16px] text-gray-900 mb-2">{p.title}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{p.desc}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold" style={{ borderColor: `${TEAL}40`, color: TEAL, backgroundColor: `${TEAL}08` }}>
                  <CheckCircle size={11} />
                  {p.cta}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">The bigger picture</p>
              <h3 className="text-[22px] font-black text-gray-900 mb-2">Guest wins. Restaurant wins. Hotel wins. Community wins.</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed">
                Every order placed through Attenda goes to a local business. Every shuttle booked supports a local driver. Restaurants keep more of their revenue. Hotels earn without needing a kitchen. And guests get a seamless experience that never asks them to leave the app.
              </p>
            </div>
            <div className="flex-shrink-0 grid grid-cols-2 gap-4 text-center">
              {[
                { val: '🧑', label: 'Guest wins' },
                { val: '🍽️', label: 'Restaurant wins' },
                { val: '🏨', label: 'Hotel wins' },
                { val: '🏘️', label: 'Community wins' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 border border-gray-100 bg-gray-50">
                  <p className="text-[20px] font-black" style={{ color: TEAL }}>{s.val}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <h2 className="text-[34px] font-black text-gray-900 mb-3">Every feature eliminates a real problem.</h2>
            <p className="text-[16px] text-gray-500 max-w-xl mx-auto">Not a feature list. A list of repetitive tasks your staff never has to do manually again.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Bell,
                title: 'Live Request Dashboard',
                problem: 'Sticky notes & lost texts',
                desc: 'Towels, housekeeping, wake-up calls, room service — every guest request hits a real-time dashboard, gets assigned to staff, and is tracked to completion.',
                color: '#FEF3C7', iconColor: '#D97706',
              },
              {
                icon: MessageSquare,
                title: 'Guest Messaging + AI Replies',
                problem: 'Staff answering the same questions all day',
                desc: 'Guests message the front desk directly. Smart auto-replies handle Wi-Fi, pool hours, checkout times. Service requests get turned into live tickets automatically.',
                color: '#EDE9FE', iconColor: '#7C3AED',
              },
              {
                icon: Bus,
                title: 'Shuttle & Transport Booking',
                problem: 'Phone-tag and missed pickups',
                desc: 'Guests book seats on scheduled shuttles. Staff see a live passenger manifest. Drivers get their runs. Cruise port schedules keep everyone on time.',
                color: '#D1FAE5', iconColor: '#059669',
              },
              {
                icon: QrCode,
                title: 'QR Room Codes',
                problem: 'App downloads no guest ever completes',
                desc: 'Scan a QR code in the room. Instant access. No download, no login friction, no technical support needed. Pre-fills room number and guest info automatically.',
                color: '#DBEAFE', iconColor: '#2563EB',
              },
              {
                icon: Utensils,
                title: 'In-Room Food Ordering',
                problem: 'Guests leaving the property to eat',
                desc: 'Restaurants link their own delivery apps or go Attenda-powered. Either way, guests order from the room in one tap. Hotel earns on every Attenda-powered order. Clover handles fulfillment.',
                color: '#FCE7F3', iconColor: '#DB2777',
              },
              {
                icon: Star,
                title: 'Review & Feedback Flow',
                problem: 'Negative reviews you never saw coming',
                desc: 'Capture feedback before checkout. Route happy guests to Google. Handle issues privately. Your online rating improves and problems get fixed before they go public.',
                color: '#FEF9C3', iconColor: '#CA8A04',
              },
              {
                icon: Shield,
                title: 'Safety & Emergency Info',
                problem: 'Guests calling the front desk for basic info',
                desc: 'Fire exits, emergency contacts, CO detector info, security hours — all in the app. Guests have what they need. Staff handle fewer basic inquiry calls.',
                color: '#F0FDF4', iconColor: '#16A34A',
              },
              {
                icon: BarChart3,
                title: 'Staff Operations Dashboard',
                problem: 'No visibility across shifts',
                desc: 'Every request, message, booking, and assignment in one screen. Managers see what\'s pending, what\'s in progress, and who\'s handling what — from any device.',
                color: '#F0F9FF', iconColor: '#0284C7',
              },
              {
                icon: Building2,
                title: 'Multi-Property Management',
                problem: 'Running multiple locations blind',
                desc: 'Superadmin console gives you oversight across every property. Switch between hotels, compare activity, and manage staff accounts from one login.',
                color: '#F5F3FF', iconColor: '#6D28D9',
              },
            ].map(f => (
              <div key={f.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: f.color }}>
                  <f.icon size={20} style={{ color: f.iconColor }} />
                </div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 mb-2">
                  <span className="text-[10px] font-bold text-red-500">Solves: {f.problem}</span>
                </div>
                <h3 className="font-bold text-[15px] text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-[12px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built by operators ──────────────────────────────── */}
      <section className="py-20" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #0d2020 100%)` }}>
        <div className="max-w-4xl mx-auto px-5 text-center">
          <div className="text-[48px] mb-6">🛎️</div>
          <h2 className="text-[32px] font-black text-white mb-5">
            This wasn&apos;t built in a boardroom.<br />
            <span style={{ color: TEAL }}>It was built on the floor.</span>
          </h2>
          <p className="text-[16px] text-gray-300 leading-relaxed mb-6 max-w-2xl mx-auto">
            Every feature in Attenda was born from a real moment of frustration inside a hotel property. The front desk answering the same question for the 40th time. A shuttle booking lost in a text thread. A guest ordering Uber Eats instead of calling the kitchen.
          </p>
          <p className="text-[16px] text-gray-300 leading-relaxed mb-8 max-w-2xl mx-auto">
            We are <span className="text-white font-semibold">Thrilz Network LLC</span> — an agentic technology company that builds operational tools for the hospitality industry. Not a startup that guesses at problems. Operators who found the solution.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: '⚙️', label: 'Agentic AI frameworks', desc: 'Automation that actually works in a hotel context' },
              { icon: '📍', label: 'Local-first design', desc: 'Built to keep revenue inside the community' },
              { icon: '🔁', label: 'Operator-driven roadmap', desc: 'Every new feature solves a real staff complaint' },
            ].map(v => (
              <div key={v.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <div className="text-[28px] mb-2">{v.icon}</div>
                <p className="text-[13px] font-bold text-white mb-1">{v.label}</p>
                <p className="text-[11px] text-gray-400">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech integrations strip ─────────────────────────── */}
      <section className="py-14 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-5">
          <p className="text-center text-[11px] text-gray-400 uppercase tracking-[0.2em] font-semibold mb-8">Works with the tools already in your property</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Clover POS', badge: 'Food Orders', color: '#10B981', desc: 'Direct kitchen orders. No re-entry. Charges added to final bill.' },
              { name: 'Google Reviews', badge: 'Reputation', color: '#EAB308', desc: 'Route happy guests directly. Protect your rating.' },
              { name: 'Email Alerts', badge: 'Notifications', color: '#3B82F6', desc: 'Instant staff alerts for every request and message.' },
              { name: 'QR Smart Codes', badge: 'Access', color: '#8B5CF6', desc: 'Room-specific codes. No app store. Instant access.' },
            ].map(i => (
              <div key={i.name} className="border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i.color }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{i.badge}</span>
                </div>
                <h3 className="font-bold text-[14px] text-gray-900 mb-1">{i.name}</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">{i.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Enroll ──────────────────────────────────────────── */}
      <section ref={enrollRef} id="enroll" className="py-24" style={{ background: `linear-gradient(160deg, ${DARK} 0%, #0a2218 100%)` }}>
        <div className="max-w-2xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 mb-6">
            <Zap size={12} className="text-teal-400" />
            <span className="text-[12px] font-semibold text-teal-400">No contract. No setup fee. No surprises.</span>
          </div>
          <h2 className="text-[34px] font-black text-white mb-3">Let&apos;s build your property&apos;s revenue engine.</h2>
          <p className="text-[15px] text-gray-300 mb-10">
            Tell us about your property. We&apos;ll reach out within one business day with a live demo and a plan built specifically for your operation.
          </p>
          <EnrollForm />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: TEAL }}>
              <span className="text-white font-black text-[12px]">A</span>
            </div>
            <span className="font-black text-[16px] text-gray-900">attenda</span>
            <span className="text-[12px] text-gray-400 ml-1">· Thrilz Network LLC</span>
          </div>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <a href="#problem" className="text-[12px] text-gray-400 hover:text-gray-600">The Problem</a>
            <a href="#revenue" className="text-[12px] text-gray-400 hover:text-gray-600">Revenue</a>
            <a href="#ecosystem" className="text-[12px] text-gray-400 hover:text-gray-600">Ecosystem</a>
            <a href="/privacy" className="text-[12px] text-gray-400 hover:text-gray-600">Privacy</a>
            <a href="/terms" className="text-[12px] text-gray-400 hover:text-gray-600">Terms</a>
            <a href="/staff" className="text-[12px] text-gray-400 hover:text-gray-600">Staff Login</a>
          </div>
          <p className="text-[11px] text-gray-300">© {new Date().getFullYear()} Thrilz Network LLC</p>
        </div>
      </footer>
    </div>
  );
}

/* ── Phone Mockup ───────────────────────────────────────────── */
function PhoneMockup() {
  const BURG = '#6B1D3C';
  const tiles = [
    { label: 'WELCOME', bg: BURG, text: 'white' },
    { label: 'TRANSPORT', bg: 'white', text: BURG },
    { label: 'FACILITIES', bg: 'white', text: BURG },
    { label: 'SAFETY', bg: BURG, text: 'white' },
  ];

  return (
    <div className="relative" style={{ width: 230, height: 460 }}>
      <div className="absolute inset-0 rounded-[38px] border-[8px] border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[#F4F4F5] flex flex-col p-3 gap-2">
          <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
            <div>
              <p className="text-[11px] font-black text-black leading-none">Hello!</p>
              <p className="text-[7px] text-gray-400 mt-0.5">What do you need today?</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center">
              <Phone size={10} style={{ color: BURG }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 flex-1">
            {tiles.map(t => (
              <div key={t.label} className="rounded-xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: t.bg, border: t.bg === 'white' ? '1px solid #e5e7eb' : 'none' }}>
                <span className="text-[7px] font-black tracking-[0.1em]" style={{ color: t.text }}>{t.label}</span>
              </div>
            ))}
          </div>
          <div className="h-[18%] rounded-xl overflow-hidden relative">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' }} />
            <div className="absolute inset-0 flex items-end p-2">
              <span className="text-[7px] font-bold text-white tracking-wider">RESTAURANTS & NEARBY</span>
            </div>
          </div>
          <div className="flex gap-1.5" style={{ height: '18%' }}>
            <div className="w-[38%] rounded-xl bg-gray-700" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex-1 rounded-xl bg-white border border-gray-100 flex items-center justify-center">
                <span className="text-[6px] font-black" style={{ color: BURG }}>NEARBY</span>
              </div>
              <div className="flex-1 rounded-xl flex items-center justify-center" style={{ backgroundColor: BURG }}>
                <span className="text-[6px] font-black text-white">REVIEW</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-1 pt-0.5">
            <span className="text-[6px] text-gray-400">powered by attenda</span>
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: BURG }}>
                <User size={9} className="text-white" />
              </div>
              <span className="text-[6px] font-bold" style={{ color: BURG }}>MESSAGE</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-900 rounded-full z-10" />
      <div className="absolute -inset-6 rounded-[60px] opacity-15 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${TEAL}, transparent)` }} />
    </div>
  );
}

/* ── Enroll Form ────────────────────────────────────────────── */
function EnrollForm() {
  const [form, setForm] = useState({ propertyName: '', contactName: '', email: '', phone: '', rooms: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!form.propertyName || !form.email || !form.contactName) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'enrollment_inquiry',
          data: {
            contactName: form.contactName,
            contactEmail: form.email,
            contactPhone: form.phone,
            propertyName: form.propertyName,
            propertyType: 'Hotel / Property',
            rooms: form.rooms || 'Not specified',
            city: '',
            message: form.message,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Email failed');
      }
      setStatus('sent');
    } catch (err) {
      console.error('Enrollment submission error:', err);
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="bg-white/10 border border-white/20 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-teal-400" />
        </div>
        <h3 className="text-[20px] font-bold text-white mb-2">We&apos;ll be in touch!</h3>
        <p className="text-[14px] text-gray-400">Expect a reply within one business day with a personalized demo for your property.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Property Name *</label>
          <input value={form.propertyName} onChange={e => setForm({ ...form, propertyName: e.target.value })}
            placeholder="Best Western Miami Airport"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-gray-400 outline-none focus:border-teal-500 transition-colors" />
        </div>
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Your Name *</label>
          <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })}
            placeholder="General Manager / Owner"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-gray-400 outline-none focus:border-teal-500 transition-colors" />
        </div>
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Email *</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="gm@yourhotel.com"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-gray-400 outline-none focus:border-teal-500 transition-colors" />
        </div>
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Phone</label>
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="305-555-0100"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-gray-400 outline-none focus:border-teal-500 transition-colors" />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Number of Rooms</label>
        <select value={form.rooms} onChange={e => setForm({ ...form, rooms: e.target.value })}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:border-teal-500 transition-colors appearance-none">
          <option value="" className="bg-gray-900">Select range...</option>
          <option value="1-25" className="bg-gray-900">1–25 rooms</option>
          <option value="26-50" className="bg-gray-900">26–50 rooms</option>
          <option value="51-100" className="bg-gray-900">51–100 rooms</option>
          <option value="101-200" className="bg-gray-900">101–200 rooms</option>
          <option value="200+" className="bg-gray-900">200+ rooms</option>
        </select>
      </div>
      <div>
        <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold block mb-1.5">Tell us about your operation</label>
        <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
          placeholder="Current pain points, what you're using now, what you most want to fix first..."
          rows={3}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-gray-400 outline-none focus:border-teal-500 transition-colors resize-none" />
      </div>
      {status === 'error' && (
        <p className="text-[13px] text-red-400">Something went wrong — email us at thrilznetwork@gmail.com</p>
      )}
      <button onClick={handleSubmit} disabled={status === 'sending' || !form.propertyName || !form.email || !form.contactName}
        className="w-full py-4 rounded-xl text-white font-bold text-[15px] disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        style={{ backgroundColor: TEAL }}>
        {status === 'sending' ? (
          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
        ) : (
          <>Request a Demo <ArrowRight size={16} /></>
        )}
      </button>
      <p className="text-[11px] text-gray-500 text-center">We reply within 1 business day. No spam, ever.</p>
    </div>
  );
}

/* ── Validation Success Modal ────────────────────────────── */
function ValidationSuccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-[20px] w-full max-w-[340px] shadow-2xl p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <h3 className="text-[20px] font-bold text-gray-900 mb-2">Validation Confirmed!</h3>
        <p className="text-[14px] text-gray-500 mb-4">
          Your information has been verified. You now have full access to all features including transport booking and ordering.
        </p>
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-[14px] text-white font-bold text-[15px] active:scale-[0.98] shadow-sm"
          style={{ backgroundColor: '#6B1D3C' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
