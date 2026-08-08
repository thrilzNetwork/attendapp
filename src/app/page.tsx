'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, Bell, Bus, CheckCircle, Clock, Globe, MapPin, Phone, ShieldCheck, Tablet, User, Utensils, Wifi, Zap } from 'lucide-react';
import GuestAuthModal from '@/components/GuestAuthModal';
import {
  GuestSheet,
  MessageSheetContent, TransportSheetContent, FacilitiesSheetContent,
  SafetySheetContent, WelcomeSheetContent, ReviewSheetContent,
} from '@/components/GuestSheets';
import { useGuest } from '@/lib/guest-context';
import { getHotelConfig } from '@/lib/supabase';

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
  const [brandColor, setBrandColor] = useState('#6B1D3C');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotel = params.get('hotel');
    const room = params.get('room');
    if (hotel) localStorage.setItem('attenda_hotel_slug', hotel);
    if (room) localStorage.setItem('attenda_qr_room', room);

    getHotelConfig().then(cfg => {
      if (cfg?.brandColor) setBrandColor(cfg.brandColor);
    });

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
        brandColor={brandColor}
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

  return <PresenceLanding />;
}

/* ──────────────────────────────────────────────────────────── */
/*  Hotel Guest App                                             */
/* ──────────────────────────────────────────────────────────── */

function HotelGuestApp({
  brandColor, modalOpen, pendingTarget, setModalOpen, setPendingTarget, openSheet, setOpenSheet,
  showValidationSuccess, setShowValidationSuccess,
}: {
  brandColor: string;
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

  useEffect(() => {
    resetValidationOnCheckout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isValidated && !prevValidated && guest) {
      setShowValidationSuccess(true);
    }
    setPrevValidated(isValidated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidated, prevValidated, guest]);

  const handleClick = (sheet: SheetName, requiresAuth = false) => {
    // Check for a valid (non-expired) session
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (new Date(session.checkout) > new Date()) {
          // Valid session — open directly, no re-prompting
          setOpenSheet(sheet);
          return;
        }
        // Expired — clear it
        localStorage.removeItem('guestSession');
      } catch {
        localStorage.removeItem('guestSession');
      }
    }
    // No valid session — only gate features that need guest identity
    if (requiresAuth) {
      setPendingTarget(sheet);
      setModalOpen(true);
      return;
    }
    setOpenSheet(sheet);
  };

  const closeSheet = () => setOpenSheet(null);

  return (
    <div className="h-dvh w-full overflow-hidden grid grid-rows-[auto,1fr,auto,1fr,auto] px-5 pt-5 pb-4 gap-2 bg-[#F5F5F5]">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[34px] font-black text-black leading-none">Hello!</h1>
            {guest && (
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full shrink-0 ${isValidated ? 'bg-emerald-100' : 'bg-amber-100'}`}>
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
          className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center shadow-sm active:scale-95 shrink-0"
        >
          <Phone size={18} style={{ color: brandColor }} strokeWidth={1.5} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 min-h-0">
        <button onClick={() => handleClick('welcome')}
          className="rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-sm"
          style={{ backgroundColor: brandColor }}>
          <MapPin size={28} className="text-white" strokeWidth={1.5} />
          <span className="text-[11px] font-bold text-white tracking-[0.12em] uppercase">WELCOME</span>
        </button>
        <button onClick={() => handleClick('transport', true)}
          className="rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-sm"
        >
          <Bus size={28} className="" strokeWidth={1.5} style={{ color: brandColor }} />
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: brandColor }}>TRANSPORT</span>
        </button>
        <button onClick={() => handleClick('facilities')}
          className="rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-sm"
        >
          <Bell size={28} className="" strokeWidth={1.5} style={{ color: brandColor }} />
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: brandColor }}>FACILITIES</span>
        </button>
        <button onClick={() => handleClick('safety')}
          className="rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-sm"
          style={{ backgroundColor: brandColor }}>
          <ShieldCheck size={28} className="text-white" strokeWidth={1.5} />
          <span className="text-[11px] font-bold text-white tracking-[0.12em] uppercase">SAFETY</span>
        </button>
      </div>
      <a href="/nearby?tab=attractions"
        className="w-full h-full block min-h-0 rounded-2xl overflow-hidden shadow-sm active:scale-[0.97]">
        <div className="relative w-full h-full rounded-2xl overflow-hidden">
          <Image src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&fit=crop&q=80"
            alt="Local attractions" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-2 left-3">
            <span className="text-[13px] font-bold text-white tracking-wider">EXPLORE LOCAL</span>
          </div>
        </div>
      </a>
      <div className="flex gap-3 min-h-0">
        <button onClick={() => (window.location.href = '/nearby?tab=attractions')}
          className="w-[38%] h-full rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center gap-1 active:scale-[0.97] shadow-sm">
          <MapPin size={24} className="" strokeWidth={1.5} style={{ color: brandColor }} />
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: brandColor }}>NEARBY</span>
        </button>
        <div className="flex-1 h-full flex flex-col gap-3">
          <button onClick={() => (window.location.href = '/nearby?tab=restaurants')}
            className="flex-1 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] shadow-sm"
            style={{ backgroundColor: brandColor }}>
            <Utensils size={20} className="text-white" strokeWidth={1.5} />
            <span className="text-[11px] font-bold text-white tracking-[0.12em] uppercase">FOOD</span>
          </button>
          <button onClick={() => handleClick('review')}
            className="flex-1 rounded-2xl bg-white border border-gray-200 flex items-center justify-center active:scale-[0.97] shadow-sm">
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: brandColor }}>LEAVE A REVIEW</span>
          </button>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-gray-400" />
          <span className="text-[11px] text-gray-400 leading-none">powered by Attenda</span>
        </div>
        <button onClick={() => (window.location.href = '/account')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 shadow-sm active:scale-[0.97]">
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: brandColor }}>My Orders</span>
        </button>
        <button onClick={() => handleClick('message', true)} className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: brandColor }}>
            <User size={20} className="text-white" strokeWidth={1.5} />
          </div>
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: brandColor }}>REQUEST NOW</span>
        </button>
      </div>

      <GuestAuthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          if (pendingTarget) setOpenSheet(pendingTarget as SheetName);
        }}
      />
      <ValidationSuccessModal
        open={showValidationSuccess}
        onClose={() => setShowValidationSuccess(false)}
        brandColor={brandColor}
      />
      <GuestSheet open={openSheet === 'message'} onClose={closeSheet} title="Request Now">
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
      <p className="text-center text-[9px] text-gray-300 pb-1">This property is independently owned and operated.</p>
    </div>
  );
}


function ValidationSuccessModal({ open, onClose, brandColor }: { open: boolean; onClose: () => void; brandColor: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-3xl w-[280px] p-8 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: brandColor }}>
          <CheckCircle size={32} className="text-white" />
        </div>
        <h3 className="text-[20px] font-black text-gray-900 mb-2">You&apos;re all set!</h3>
        <p className="text-[14px] text-gray-600">Your stay is confirmed. You can now book shuttle rides, order amenities, and message the front desk.</p>
        <button onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl text-white font-bold text-[15px]" style={{ backgroundColor: brandColor }}>
          Got it
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Attenda Presence — Coming Soon Landing                      */
/* ──────────────────────────────────────────────────────────── */

const TEAL = '#0D9488';
const TEAL_BRIGHT = '#15b79e';
const INK = '#101418';
const BRASS = '#b98d4f';

function PresenceLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');
  const [notified, setNotified] = useState(false);
  const howRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [emailError, setEmailError] = useState('');

  const handleNotify = () => {
    if (!email.trim()) {
      setEmailError('Please enter your email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setNotified(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased overflow-x-hidden">

      {/* NAV */}
      <nav className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center group">
            <img src="/brand/logo-primary.svg" alt="Attenda" height={36} style={{ height: 36, width: 'auto' }} />
          </a>
          <div className="hidden md:flex items-center gap-7">
            <a href="#how" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">How it works</a>
            <a href="/blog" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Blog</a>
            <a href="/staff" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Log in</a>
            <button onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-5 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all active:scale-[0.97] shadow-sm"
              style={{ backgroundColor: TEAL }}>
              Get notified
            </button>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <a href="/staff" className="text-[13px] text-gray-600 hover:text-gray-900 font-medium">Log in</a>
            <button onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 rounded-lg text-white text-[12px] font-bold"
              style={{ backgroundColor: TEAL }}>Get notified</button>
          </div>
        </div>
      </nav>

      {/* HERO — Coming soon with Higgsfield hero image */}
      <section className="relative py-16 md:py-24 px-5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafb 50%, #f0fdfb 100%)' }}>
        {/* Animated gradient orbs */}
        <div className="gradient-orb w-[400px] h-[400px] top-[-100px] right-[10%] opacity-40" style={{ background: 'radial-gradient(circle, rgba(15,184,158,0.3) 0%, transparent 70%)' }} />
        <div className="gradient-orb w-[300px] h-[300px] bottom-[10%] left-[-50px] opacity-30" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.25) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.25] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #d0d5dd 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-teal-200 bg-teal-50/50 animate-scale-in" style={{ animationDelay: '0.1s' }}>
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-[12px] font-bold text-teal-700 tracking-wide uppercase">Coming Soon</span>
              </div>
              <h1 className="text-[40px] md:text-[52px] lg:text-[56px] leading-[1.05] font-black tracking-tight text-gray-900 mb-6 animate-scale-in" style={{ animationDelay: '0.2s' }}>
                Attenda<br />
                <span className="shimmer-text">Presence</span>
              </h1>
              <p className="text-[18px] text-gray-600 leading-relaxed mb-6 animate-scale-in" style={{ animationDelay: '0.3s' }}>
                Every guest knows you&rsquo;re there. Every staff member knows when you step away.
              </p>
              <p className="text-[15px] text-gray-500 leading-relaxed mb-8 animate-scale-in" style={{ animationDelay: '0.35s' }}>
                A realtime system for single-coverage front desks — a kiosk display guests can see, a console staff carry in their pocket, and an admin view that logs it all.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-scale-in" style={{ animationDelay: '0.4s' }}>
                <button onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-[16px] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ backgroundColor: TEAL_BRIGHT, color: '#000' }}>
                  See how it works <ArrowRight size={18} />
                </button>
                <a href="/staff" className="text-[14px] font-semibold text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 group">
                  Staff log in <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </a>
              </div>

              {/* Key stats */}
              <div className="mt-10 flex items-center gap-6 flex-wrap animate-scale-in" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2">
                  <Zap size={18} style={{ color: TEAL }} />
                  <p className="text-[12px] text-gray-500 font-medium">&lt;1s sync</p>
                </div>
                <div className="h-6 w-px bg-gray-200" />
                <div className="flex items-center gap-2">
                  <Wifi size={18} style={{ color: TEAL }} />
                  <p className="text-[12px] text-gray-500 font-medium">Offline-safe</p>
                </div>
                <div className="h-6 w-px bg-gray-200" />
                <div className="flex items-center gap-2">
                  <Clock size={18} style={{ color: TEAL }} />
                  <p className="text-[12px] text-gray-500 font-medium">Full event log</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-6 lg:col-start-7 relative">
              <div className="relative animate-float rounded-2xl overflow-hidden shadow-premium">
                <Image
                  src="/images/presence-hero.jpg"
                  alt="Attenda Presence — tablet kiosk at a boutique hotel front desk"
                  width={1600}
                  height={893}
                  className="object-cover w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 glass rounded-xl px-4 py-2.5 inline-flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[12px] font-bold text-gray-900">Front desk attended</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" ref={howRef} className="py-16 md:py-24 px-5 bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-700">How it works</span>
            </div>
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">Presence, made simple</h2>
            <h3 className="text-[34px] md:text-[44px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
              One desk. Two devices.<br />
              <span style={{ color: TEAL }}>Never a silent front desk.</span>
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              Attenda Presence connects the guest-facing display on your counter to the staff console in your team&rsquo;s pocket — in realtime.
            </p>
          </div>

          {/* 3-step flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: Tablet,
                title: 'Guest Display',
                accent: TEAL,
                desc: 'A kiosk-locked tablet at the front desk. When attended, it shows an ambient clock, hotel info, and rotating promos. When staff steps away, a clear "We\'ll be right with you" bar appears with a live countdown and an assistance button.',
              },
              {
                step: '02',
                icon: User,
                title: 'Staff Console',
                accent: BRASS,
                desc: 'A phone app staff carry on shift. One tap to step away with a reason and estimated duration — towels, guest assist, restock, break. Guests who need help send an instant alert straight to their pocket.',
              },
              {
                step: '03',
                icon: ShieldCheck,
                title: 'Admin View',
                accent: INK,
                desc: 'Every away event is logged server-side — who stepped away, for how long, when it ran overdue, and how fast assist requests were answered. Per-property and portfolio-wide.',
              },
            ].map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <div key={i} className="group relative h-full bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-2xl p-7 shadow-premium transition-all duration-500 hover:shadow-premium-hover hover:-translate-y-1 hover:bg-white/90 overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 80% 80%, ${item.accent}08 0%, transparent 70%)` }} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${item.accent}15 0%, ${item.accent}08 100%)` }}>
                        <ItemIcon size={20} style={{ color: item.accent }} />
                      </div>
                      <span className="text-[11px] font-black tracking-widest text-gray-300">{item.step}</span>
                    </div>
                    <h4 className="text-[17px] font-black text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {[
              'Realtime sync — step away, it shows on the display in under a second',
              'Guests can always request help — even when the desk is unattended',
              'No app for guests. Just a display they can see and tap.',
              'Offline-safe — the display keeps working if the network drops',
              'Every away session logged: reason, estimated, actual, overdue',
              'Per-property theming — no brand names hardcoded anywhere',
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                <CheckCircle size={18} className="shrink-0 mt-0.5" style={{ color: TEAL }} />
                <p className="text-[14px] text-gray-700">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMING SOON / NOTIFY */}
      <section className="relative py-16 md:py-20 px-5 overflow-hidden">
        <div className="gradient-orb w-[400px] h-[400px] bottom-[-150px] right-[5%] opacity-30" style={{ background: 'radial-gradient(circle, rgba(185,141,79,0.3) 0%, transparent 70%)' }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-200 bg-amber-50/50 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Launching soon</span>
          </div>
          <h3 className="text-[32px] md:text-[42px] font-black tracking-tight text-gray-900 mb-4 leading-[1.1]">
            Be first in line when<br />Presence goes live.
          </h3>
          <p className="text-[16px] text-gray-600 mb-8 max-w-xl mx-auto">
            We&rsquo;re rolling out to independent hotels. Drop your email and we&rsquo;ll let you know the moment it&rsquo;s ready for your property.
          </p>

          {notified ? (
            <div className="max-w-md mx-auto bg-teal-50 border border-teal-200 rounded-2xl p-6">
              <CheckCircle size={28} className="mx-auto mb-3" style={{ color: TEAL }} />
              <p className="text-[16px] font-bold text-gray-900 mb-1">You&rsquo;re on the list!</p>
              <p className="text-[14px] text-gray-600">We&rsquo;ll be in touch when Attenda Presence launches.</p>
            </div>
          ) : (
            <div className="max-w-md mx-auto flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleNotify(); }}
                  placeholder="gm@yourproperty.com"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-4 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-500 transition-colors bg-white"
                />
                <button onClick={handleNotify}
                  className="px-8 py-4 rounded-xl text-white font-bold text-[15px] shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                  style={{ backgroundColor: TEAL }}>
                  Notify me
                </button>
              </div>
              {emailError && <p className="text-[13px] text-red-500 font-medium text-left">{emailError}</p>}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/brand/logo-primary.svg" alt="Attenda" height={24} style={{ height: 24, width: 'auto' }} />
            <span className="text-[12px] text-gray-400 ml-1">Presence</span>
          </div>
          <p className="text-[12px] text-gray-400">&copy; {new Date().getFullYear()} Attenda. Built for independent hotels.</p>
          <div className="flex items-center gap-5">
            <a href="/staff" className="text-[12px] text-gray-500 hover:text-gray-900 font-medium">Staff log in</a>
            <a href="/blog" className="text-[12px] text-gray-500 hover:text-gray-900 font-medium">Blog</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
