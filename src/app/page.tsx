'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, Bell, Bus, Check, CheckCircle, ClipboardList, Clock, DollarSign, MapPin, Phone, ShieldCheck, User, Users, Utensils, Wifi } from 'lucide-react';
import GuestAuthModal from '@/components/GuestAuthModal';
import {
  GuestSheet,
  MessageSheetContent, TransportSheetContent, FacilitiesSheetContent,
  SafetySheetContent, WelcomeSheetContent, ReviewSheetContent,
} from '@/components/GuestSheets';
import { useGuest } from '@/lib/guest-context';
import { getHotelConfig } from '@/lib/supabase';
import Reveal from '@/components/landing/Reveal';

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

  return <AttendaLandingPage />;
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
      <div className="flex gap-3 items-stretch">
        <button onClick={() => (window.location.href = '/account')}
          className="flex-1 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center gap-2 active:scale-[0.97] shadow-sm">
          <ClipboardList size={18} strokeWidth={1.5} style={{ color: brandColor }} />
          <span className="text-[12px] font-bold tracking-[0.08em] uppercase" style={{ color: brandColor }}>My Orders</span>
        </button>
        <button onClick={() => handleClick('message', true)}
          className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] shadow-sm"
          style={{ backgroundColor: brandColor }}>
          <User size={18} className="text-white" strokeWidth={1.5} />
          <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-white">Request Now</span>
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
/*  Attenda Marketing Landing Page — LEAN SELL                 */
/* ──────────────────────────────────────────────────────────── */

const TEAL = '#0D9488';
const TEAL_BRIGHT = '#15b79e';


function AttendaLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const enrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <div className="min-h-screen bg-white font-sans antialiased overflow-x-hidden">

      {/* ANNOUNCEMENT BAR */}
      <div className="bg-gray-900 text-white text-center py-2 px-4 relative">
        <p className="text-[12px] font-semibold">
          Built by hotel operators, for independent hotels.
        </p>
      </div>

      {/* NAV */}
      <nav className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center group">
            <img src="/brand/logo-primary.svg" alt="Attenda" height={36} style={{ height: 36, width: 'auto' }} />
          </a>
          <div className="hidden md:flex items-center gap-7">
            <a href="#pillars" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Platform</a>
            <a href="#modules" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Product</a>
            <a href="#revenue" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Case Study</a>
            <a href="/blog" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Field Notes</a>
            <a href="#founder" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">About</a>
            <a href="/staff" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Log in</a>
            <button onClick={() => scrollTo(enrollRef)}
              className="px-5 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all active:scale-[0.97] shadow-sm"
              style={{ backgroundColor: TEAL }}>
              Get a Demo
            </button>
          </div>
          <button onClick={() => scrollTo(enrollRef)} className="md:hidden px-4 py-2 rounded-lg text-white text-[12px] font-bold"
            style={{ backgroundColor: TEAL }}>Get a Demo</button>
        </div>
      </nav>

      {/* HERO — full-width cinematic band */}
      <section className="relative min-h-[560px] md:min-h-[680px] flex items-center overflow-hidden">
        <Image
          src="/images/landing/hero-lobby.jpg"
          alt="A front-desk associate welcoming an arriving guest in a warm boutique hotel lobby"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Base scrim — stronger on mobile (text wraps wider) so white copy stays legible */}
        <div className="absolute inset-0 bg-black/50 md:bg-black/25" />
        {/* Directional gradient — near-opaque on the left (behind the copy), fading to reveal the photo on the right */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,15,20,0.95) 0%, rgba(8,15,20,0.82) 44%, rgba(8,15,20,0.45) 68%, rgba(8,15,20,0.08) 100%)' }} />

        <div className="relative w-full max-w-6xl mx-auto px-5 py-20 md:py-28">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-white/20 bg-white/10 backdrop-blur-sm animate-scale-in" style={{ animationDelay: '0.1s' }}>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-[12px] font-bold text-white/90 tracking-wide uppercase">Hotel operations, organized</span>
            </div>
            <h1 className="text-[40px] md:text-[58px] lg:text-[64px] leading-[1.04] font-black tracking-tight text-white mb-6 animate-scale-in" style={{ animationDelay: '0.2s', textShadow: '0 2px 18px rgba(0,0,0,0.5)' }}>
              Run a more<br />
              <span style={{ color: '#5eead4' }}>organized hotel.</span>
            </h1>
            <p className="text-[18px] text-white leading-relaxed mb-8 animate-scale-in" style={{ animationDelay: '0.3s', textShadow: '0 1px 12px rgba(0,0,0,0.6)' }}>
              Attenda connects your daily operations, your team, your guest experience, and your hotel knowledge in one place — without replacing your PMS.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-scale-in" style={{ animationDelay: '0.4s' }}>
              <a href="#product"
                className="animate-pulse-glow inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-[16px] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ backgroundColor: '#15b79e', color: '#000' }}>
                See Attenda in Action <ArrowRight size={18} />
              </a>
              <a href="#demo" className="text-[14px] font-semibold text-white/80 hover:text-white transition-colors flex items-center gap-1 group">
                Schedule a 15-minute demo <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </a>
            </div>
            {/* Founder credibility — honest, no invented social proof */}
            <div className="mt-10 flex items-center gap-2.5 animate-scale-in" style={{ animationDelay: '0.5s' }}>
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <p className="text-[13px] text-white/70 font-medium">Built from real hotel operations. Designed for independent hotels.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PMS POSITIONING BAND — kill the #1 fear immediately */}
      <section className="py-12 md:py-16 px-5 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[22px] md:text-[28px] font-black tracking-tight text-gray-900 leading-snug max-w-3xl mx-auto">
              Attenda is not a PMS — and doesn&apos;t try to be.
            </p>
            <p className="text-[15px] md:text-[16px] text-gray-600 mt-3 max-w-2xl mx-auto">
              Your PMS manages reservations. Attenda helps your team manage the operation <span className="italic">around</span> them.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <div className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-2">Your PMS</div>
              <p className="text-[14px] text-gray-600">Reservations · Rates · Folios · System of record</p>
            </div>
            <div className="rounded-2xl border-2 p-6" style={{ borderColor: `${TEAL}40`, backgroundColor: `${TEAL}06` }}>
              <div className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: TEAL }}>Attenda</div>
              <p className="text-[14px] text-gray-700">Operations · Team · Guest experience · Knowledge · Revenue moments</p>
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM — operator voice */}
      <Reveal>
        <section className="py-16 md:py-24 px-5 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">This is your day</h2>
            <h3 className="text-[30px] md:text-[44px] font-black tracking-tight text-gray-900 mb-6 leading-[1.08]">
              Hotels don&apos;t have an information problem.<br />
              <span style={{ color: TEAL }}>They have an organization problem.</span>
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 leading-relaxed mb-4">
              The phone rings — a guest wants to know where the shuttle is. Another needs towels. An employee needs a procedure. A manager is looking for a completed checklist. Someone&apos;s checking the schedule. Transportation needs coordinating. And the GM is just trying to figure out what actually happened today.
            </p>
            <p className="text-[16px] md:text-[18px] text-gray-600 leading-relaxed mb-8">
              Your team already creates all of that information. It&apos;s just scattered across apps, paper, radios, and people&apos;s heads.
            </p>
            <p className="text-[17px] md:text-[19px] font-bold text-gray-900">
              Attenda puts it somewhere everyone can actually use.
            </p>
          </div>
        </section>
      </Reveal>

      {/* SEE IT FROM EVERY ANGLE — role mockups */}
      <section id="product" className="py-16 md:py-24 px-5 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">One system, every role</h2>
            <p className="text-[28px] md:text-[40px] font-black tracking-tight text-gray-900 leading-[1.1]">
              See Attenda from <span style={{ color: TEAL }}>every angle</span>
            </p>
            <p className="text-[16px] text-gray-600 mt-4">
              Not another guest-messaging app. The whole operation — transport, housekeeping, cash, knowledge, revenue — seen from wherever you&rsquo;re standing.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {([
              { photo: '/images/landing/scene-airport.jpg', role: 'For Guests', sub: 'Their whole stay in one place — shuttle, transport, dining, and the front desk. Not just a chat box.',
                icon: Bus, cue: 'Airport shuttle · 4 min away', cueSub: 'Live GPS · on time' },
              { photo: '/images/landing/scene-housekeeping.jpg', role: 'For Staff', sub: 'The real work of the shift — checklists, rooms, cash, night audit — organized and visible.',
                icon: ClipboardList, cue: 'Housekeeping · 14 of 18 rooms', cueSub: 'shift checklist on track' },
              { photo: '/images/landing/scene-manager.jpg', role: 'For Management', sub: 'Know what’s actually happening — checklists, cash, transport, exceptions — from anywhere.',
                icon: CheckCircle, cue: 'Today · checklists on track', cueSub: 'cash drop logged · 3 open' },
            ] as { photo: string; role: string; sub: string; icon: typeof Bell; cue: string; cueSub: string }[]).map((c, i) => {
              const CueIcon = c.icon;
              return (
                <Reveal key={c.role} direction="up" delay={i * 120} className="flex flex-col">
                  <div className="relative rounded-3xl overflow-hidden shadow-premium aspect-[4/5]">
                    <Image src={c.photo} alt={c.role} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${TEAL}15` }}>
                          <CueIcon size={18} style={{ color: TEAL }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-black text-gray-900 truncate">{c.cue}</p>
                          <p className="text-[11px] text-gray-500 truncate">{c.cueSub}</p>
                        </div>
                        <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <div className="text-[15px] font-black text-gray-900">{c.role}</div>
                    <p className="text-[13px] text-gray-500 mt-1">{c.sub}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* THE FOUR PILLARS */}
      <section id="pillars" className="py-16 md:py-24 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">The four outcomes</h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
              Operate. Serve.<br /><span style={{ color: TEAL }}>Learn. Grow.</span>
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              Everything Attenda does ladders up to four outcomes for your hotel &mdash; not a pile of features to learn.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {([
              { n: '01', icon: ClipboardList, title: 'Operate', tag: 'Know what’s happening in your hotel.', img: '/images/landing/pillar-ops.jpg',
                body: 'Daily to-dos, department checklists, cash controls, night-audit prep, schedules, and manager assignments — organized and visible. Your team executes; management sees it happen, from anywhere.',
                points: ['Daily operational dashboard', 'Checklists & to-dos by department', 'Schedules & manager assignments', 'Staff accountability & visibility'],
                scenario: 'A manager off-site opens Attenda and sees the day at a glance — done, pending, requests, transportation, and what needs attention. No group text.' },
              { n: '02', icon: Bell, title: 'Serve', tag: 'Give guests a simple way to reach the hotel.', img: '/images/landing/pillar-guest.jpg',
                body: 'Guests reach the hotel through whatever touchpoint you choose — a welcome letter, a link, a QR, or check-in. No app, no account. Hotel info, amenities, shuttle, requests, and curated local tips, right on their phone.',
                points: ['Share access your way — letter, link, or QR', 'Guest requests (towels, housekeeping, maintenance)', 'Shuttle requests + live tracking', 'Local recommendations & transportation'],
                scenario: 'A guest opens the hotel’s link, taps “towels” — the request reaches the right person, and the towels arrive. The result is the hero, not the tech.' },
              { n: '03', icon: Users, title: 'Learn', tag: 'Better hotels are run by better-informed people.', img: '/images/landing/pillar-knowledge.jpg',
                body: 'Your SOPs, procedures, and property knowledge — accessible to the team that needs them. Attenda’s assistant helps people find approved answers; when it can’t, it points them to a manager instead of guessing. AI assists the operation. It never runs it.',
                points: ['Right Answers — approved knowledge access', 'Learning & HR', 'Culture Hub — recognition, birthdays, incentives'],
                coming: ['Attenda University', 'Community knowledge exchange'],
                scenario: 'A new team member asks a procedure question and gets the property’s real answer in seconds — or a clean handoff to a manager.' },
              { n: '04', icon: DollarSign, title: 'Grow', tag: 'Be more useful to your guest — and capture the value.', img: '/images/landing/pillar-revenue.jpg',
                body: 'Not every hotel has a restaurant. Every hotel has guests who want dinner, a ride, or something to do. Curate the transportation, dining, and experiences around the stay — convenient for the guest, a new channel for the hotel. Curated by hospitality people, not random ads.',
                points: ['Transportation & taxi', 'Curated dining (partner delivery)', 'Experiences & local partners', 'Revenue visible to management'],
                scenario: 'A guest wants dinner; you don’t have a restaurant. Instead of “we don’t,” they get three great nearby options you chose — ordered from the room.' },
            ] as { n: string; icon: typeof ClipboardList; title: string; tag: string; img: string; body: string; points: string[]; coming?: string[]; scenario: string }[]).map((p) => {
              const PIcon = p.icon;
              return (
                <Reveal key={p.n} direction="up">
                  <div className="h-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-premium flex flex-col">
                    <div className="relative h-40 md:h-44 w-full overflow-hidden">
                      <Image src={p.img} alt={p.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                    </div>
                    <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${TEAL}15 0%, ${TEAL}08 100%)` }}>
                        <PIcon size={20} style={{ color: TEAL }} />
                      </div>
                      <span className="text-[13px] font-black text-gray-300">{p.n}</span>
                      <h4 className="text-[20px] font-black text-gray-900">{p.title}</h4>
                    </div>
                    <p className="text-[15px] font-bold mb-2" style={{ color: TEAL }}>{p.tag}</p>
                    <p className="text-[14px] text-gray-600 leading-relaxed mb-4">{p.body}</p>
                    <ul className="space-y-2 mb-4">
                      {p.points.map(pt => (
                        <li key={pt} className="flex items-start gap-2 text-[13px] text-gray-700">
                          <Check size={15} className="mt-0.5 shrink-0" style={{ color: TEAL_BRIGHT }} />{pt}
                        </li>
                      ))}
                      {p.coming?.map(pt => (
                        <li key={pt} className="flex items-center gap-2 text-[13px] text-gray-400">
                          <Clock size={15} className="shrink-0" />{pt}
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300 border border-gray-200 rounded px-1.5 py-0.5">Coming</span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-l-2 pl-3 text-[13px] text-gray-500 italic leading-relaxed" style={{ borderColor: `${TEAL}40` }}>{p.scenario}</div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* SCENARIO BAND — airport coordination */}
      <Reveal>
        <section className="relative py-20 md:py-28 px-5 overflow-hidden">
          <Image src="/images/landing/scene-airport.jpg" alt="A hotel shuttle driver welcoming an arriving guest at the airport" fill sizes="100vw" className="object-cover object-center" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,15,20,0.15) 0%, rgba(8,15,20,0.55) 58%, rgba(8,15,20,0.86) 100%)' }} />
          <div className="relative max-w-5xl mx-auto">
            <div className="ml-auto max-w-md text-right">
              <h3 className="text-[26px] md:text-[38px] font-black tracking-tight text-white leading-[1.1] mb-3">Airport chaos, handled.</h3>
              <p className="text-[15px] md:text-[17px] text-white/85">Live shuttle location, guest ETAs, and pickups in one view. Less guessing at the curb — better coordination for every arrival.</p>
            </div>
          </div>
        </section>
      </Reveal>


      {/* PRICING — inline */}
      <section className="py-16 md:py-24 px-5 bg-white" id="pricing">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">Simple Pricing</h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
              Flat &amp; transparent.
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              No contracts. No per-room games. No hidden fees.
            </p>
          </div>
          <div className="max-w-lg mx-auto">
            <div className="bg-white border-2 rounded-2xl overflow-hidden shadow-md" style={{ borderColor: TEAL }}>
              <div className="px-8 py-6 text-center" style={{ backgroundColor: `${TEAL}06` }}>
                <div className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: TEAL }}>Attenda Platform</div>
                <div className="text-[44px] font-black text-gray-900 leading-none mb-1">Flat monthly</div>
                <div className="text-[15px] text-gray-600">+ variable ordering revenue share</div>
              </div>
              <div className="px-8 py-6">
                <ul className="space-y-3.5">
                  {[
                    'No per-room pricing &mdash; same flat regardless of size',
                    'No contracts. Cancel anytime.',
                    'All modules included &mdash; no upsells or tier unlocks',
                    'Onboarding &amp; setup handled with you',
                    'Revenue share only on orders that flow through the platform',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3 text-[14px] text-gray-700">
                      <Check size={16} className="mt-0.5 shrink-0" style={{ color: TEAL_BRIGHT }} />
                      <span dangerouslySetInnerHTML={{ __html: item }} />
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <a href="#demo" className="w-full block text-center py-4 rounded-xl text-white font-bold text-[15px] shadow-sm hover:shadow-md transition-all" style={{ backgroundColor: TEAL }}>
                    Get a quote on the demo call
                  </a>
                  <p className="text-[11px] text-gray-400 mt-2 text-center">We&apos;ll show your number, not a slide</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GENERATE REVENUE — case study */}
      <section id="revenue" className="py-16 md:py-24 px-5 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
              One Property &middot; One Number
            </h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
              A 121-room boutique with a restaurant.
              <br />
              <span style={{ color: TEAL }}>$16,000+ in 4 months.</span>
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              This is the only number we&apos;re going to put on the page. No projections. No &ldquo;average property&rdquo;. One boutique hotel, one figure, attributable to Attenda.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: TEAL }}>CASE STUDY &middot; BOUTIQUE HOTEL</div>
                <h4 className="text-[24px] md:text-[28px] font-black text-gray-900 leading-tight mb-4">
                  121 rooms &middot; 1 restaurant &middot; 4 months on Attenda.
                </h4>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-4">
                  An independent boutique hotel &mdash; 121 keys, an in-house restaurant, the kind of property that runs lean and competes with chains for direct bookings.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-4">
                  They switched on Attenda in February. By June, four months in, they&apos;d generated <span className="font-black text-gray-900">$16,000+ in attributable revenue</span> &mdash; captured shuttle bookings from cruise-ship days, in-room dining orders routed through their restaurant, late-checkout fees processed in-chat.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-6">
                  No 18-month rollout. No 6-figure implementation. Just the chat, the QR code, and a four-month run.
                </p>
                <div className="flex items-center gap-4 text-[12px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Verifiable &middot; Numbers tracked in the platform</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-8 md:p-10 border-t md:border-t-0 md:border-l border-gray-200 flex items-center justify-center">
                <div className="w-full max-w-sm">
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      </div>
                      <div className="flex-1 h-6 bg-white rounded-md border border-gray-200 flex items-center px-2 text-[9px] text-gray-500 font-semibold">
                        gm.attenda.app &middot; Revenue
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Revenue &middot; Last 4 months</div>
                        <div className="text-[9px] text-gray-400">Feb &ndash; May</div>
                      </div>
                      <div className="text-[10px] text-gray-400 mb-3">Attributable to Attenda</div>
                      <CountUpStat value={16247} prefix="$" duration={2200} className="text-[48px] font-black leading-none mb-1" style={{ color: TEAL }} />
                      <div className="text-[12px] text-gray-500 mb-5">+ partner orders + late checkout + shuttle</div>
                      <CaseStudyBars />
                      <div className="border-t border-gray-100 pt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-600">Shuttle & transport</span>
                          <span className="font-black text-gray-900">$7,820</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-600">In-room dining (restaurant)</span>
                          <span className="font-black text-gray-900">$5,640</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-600">Late checkout & ancillary</span>
                          <span className="font-black text-gray-900">$2,787</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center max-w-2xl mx-auto">
            <p className="text-[13px] text-gray-500 leading-relaxed">
              <span className="font-bold text-gray-700">One property, one number.</span> We&apos;re not going to tell you your property will do the same. We&apos;re going to show you what we did for one, and let you decide if the math holds for your rooms, your restaurant, your cruise calendar.
            </p>
          </div>
        </div>
      </section>

      {/* SCENARIO BAND — curated local dining */}
      <Reveal>
        <section className="relative py-20 md:py-28 px-5 overflow-hidden">
          <Image src="/images/landing/scene-dining.jpg" alt="A couple enjoying dinner at a curated local restaurant" fill sizes="100vw" className="object-cover object-center" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,15,20,0.86) 0%, rgba(8,15,20,0.5) 55%, rgba(8,15,20,0.15) 100%)' }} />
          <div className="relative max-w-5xl mx-auto">
            <div className="max-w-md">
              <h3 className="text-[26px] md:text-[38px] font-black tracking-tight text-white leading-[1.1] mb-3">No restaurant? Still their best meal.</h3>
              <p className="text-[15px] md:text-[17px] text-white/85">Curate the dining, transportation, and experiences around the stay — convenient for the guest, and a new channel for the hotel.</p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* IMPLEMENTATION */}
      <Reveal>
        <section className="py-16 md:py-24 px-5 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">Getting started</h2>
              <h3 className="text-[30px] md:text-[44px] font-black tracking-tight text-gray-900 mb-4 leading-[1.08]">
                We configure Attenda around your hotel &mdash; <span style={{ color: TEAL }}>not the other way around.</span>
              </h3>
              <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
                You don&apos;t need another six-month technology project. Start with Attenda&apos;s operational tools, then shape your own to-dos, checklists, procedures, departments, and assignments.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { n: '1', t: 'We learn your operation', d: 'How your property actually runs — departments, procedures, the daily rhythm.' },
                { n: '2', t: 'We configure your workflows', d: 'Your to-dos, checklists, knowledge, and assignments, set up around your hotel.' },
                { n: '3', t: 'Your team goes live', d: 'QR design, branding, and staff training. Weeks, not months.' },
              ].map(s => (
                <div key={s.n} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[15px] font-black mb-3" style={{ backgroundColor: TEAL }}>{s.n}</div>
                  <h4 className="text-[16px] font-black text-gray-900 mb-1.5">{s.t}</h4>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl overflow-hidden shadow-premium">
              <Image src="/images/landing/scene-onboarding.jpg" alt="Attenda onboarding — configuring the platform alongside hotel staff" width={1600} height={900} className="w-full h-auto object-cover" />
            </div>
          </div>
        </section>
      </Reveal>

      {/* MANAGED OPERATIONAL SUPPORT — cinematic photo band */}
      <Reveal>
        <section className="relative py-24 md:py-32 px-5 overflow-hidden">
          <Image src="/images/landing/scene-manager.jpg" alt="An operations consultant guiding a hotel manager" fill sizes="100vw" className="object-cover object-center" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,15,20,0.9) 0%, rgba(8,15,20,0.7) 45%, rgba(8,15,20,0.35) 100%)' }} />
          <div className="relative max-w-5xl mx-auto">
            <div className="max-w-2xl">
              <h2 className="text-[14px] font-bold tracking-widest uppercase text-white/60 mb-3">More than software</h2>
              <h3 className="text-[30px] md:text-[44px] font-black tracking-tight text-white mb-5 leading-[1.08]">
                Technology alone doesn&apos;t fix hotel operations.<br /><span style={{ color: '#5eead4' }}>People do.</span>
              </h3>
              <p className="text-[16px] md:text-[18px] text-white/80 max-w-2xl mb-8">
                For properties that want hands-on help, Attenda can provide or coordinate operational support &mdash; implementation, configuration, and ongoing guidance. Software, plus knowledge, plus execution.
              </p>
              <a href="#demo" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-bold text-[15px] shadow-sm hover:shadow-md transition-all" style={{ backgroundColor: TEAL }}>
                Ask about managed support <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>
      </Reveal>

      {/* TRUST & SECURITY */}
      <Reveal>
        <section className="py-16 md:py-24 px-5 bg-gray-50 border-y border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">Built to be trusted</h2>
              <h3 className="text-[30px] md:text-[44px] font-black tracking-tight text-gray-900 leading-[1.08]">
                Your operation, kept <span style={{ color: TEAL }}>separate and secure.</span>
              </h3>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-premium mb-10 max-w-4xl mx-auto">
              <Image src="/images/landing/scene-evening.jpg" alt="A hotel front desk, staffed and secure in the evening" width={1600} height={720} className="w-full h-auto object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: ShieldCheck, t: 'Tenant separation', d: 'Each property’s data is isolated from every other.' },
                { icon: User, t: 'AI that knows when not to guess', d: 'Managers decide. When the answer isn’t there, Attenda escalates to a person — it never runs the operation.' },
                { icon: Users, t: 'Role-based access', d: 'Staff, admin, and manager permissions, scoped to the job.' },
                { icon: Wifi, t: 'Guest privacy', d: 'Minimal guest data. No PMS integration required.' },
              ].map(x => {
                const XIcon = x.icon;
                return (
                  <div key={x.t} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `linear-gradient(135deg, ${TEAL}15 0%, ${TEAL}08 100%)` }}>
                      <XIcon size={20} style={{ color: TEAL }} />
                    </div>
                    <h4 className="text-[15px] font-black text-gray-900 mb-1.5">{x.t}</h4>
                    <p className="text-[13px] text-gray-600 leading-relaxed">{x.d}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </Reveal>

      {/* FAQ */}
      <section className="py-20 px-5 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3 text-center">Common questions</h2>
          <h3 className="text-[28px] font-black tracking-tight text-gray-900 mb-10 text-center">
            Real questions from real GMs
          </h3>
          {[
            { q: 'What does Attenda include?', a: 'A guest experience guests reach however you share it (requests, shuttle, hotel info &mdash; no app), a staff dashboard with checklists and schedules, management visibility and revenue tracking, and a partner portal for vendors and restaurants &mdash; all connected in one place.' },
            { q: 'Does the guest need to download an app?', a: 'No. Guests open a mobile web page in their browser &mdash; shared however the hotel chooses (a welcome letter, a link, a QR, or at check-in). No download, no account.' },
            { q: 'How are vendors onboarded?', a: 'Each vendor gets a lightweight web portal link. They see open jobs, accept, and update status.' },
            { q: 'What about my existing PMS?', a: 'Attenda runs alongside your current PMS from day one. No rip-and-replace.' },
            { q: 'How long does setup take?', a: 'Weeks, not months. We configure Attenda around how your property already runs &mdash; QR design, branding, workflows, and staff training.' },
            { q: 'What does Attenda cost?', a: 'Flat monthly per property + ordering revenue share. No contracts. No per-room games. We&apos;ll quote on the demo call.' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full text-left bg-white rounded-2xl p-5 mb-3 border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-[15px] text-gray-900">{item.q}</span>
                <span className={`text-gray-400 transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </span>
              </div>
              {openFaq === i && (
                <p className="mt-3 text-[14px] text-gray-600 leading-relaxed">{item.a}</p>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* DEMO FORM */}
      <section id="demo" ref={enrollRef} className="py-20 px-5">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
              Schedule a 15-minute demo
            </h2>
            <h3 className="text-[32px] md:text-[40px] font-black tracking-tight text-gray-900 mb-4">
              Let&apos;s look at your hotel.
            </h3>
            <p className="text-[16px] text-gray-600">
              Give us 15 minutes. Show us how your operation works, and we&apos;ll show you where Attenda fits. No rip-and-replace, no giant implementation presentation — just hotel operations.
            </p>
          </div>
          <EnrollForm />
        </div>
      </section>

      {/* FIELD NOTES */}
      <section id="blog" className="py-16 md:py-24 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
              Field Notes &middot; For Independent Operators
            </h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
              Six problems every operator faces.
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              No fake authors. No invented quotes. These are the six topics we cover in Field Notes &mdash; written by Alejandro from fifteen years on the front desk, with real numbers from the properties running Attenda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { num: '01', cat: 'Operations', catColor: '#3B82F6', title: 'The 12-questions-a-day front desk problem', slug: 'the-12-questions-a-day-front-desk-problem', problem: 'Towels. WiFi. Late checkout. Parking. Breakfast. Checkout time. The same six questions, twice each, every shift. Why QR codes close the gap.', readingTime: '5 min' },
              { num: '02', cat: 'Revenue', catColor: TEAL, title: 'Cruise-day shuttle: the $7,820 line item', slug: 'cruise-day-shuttle-the-dollar7820-line-item', problem: 'How a 121-room boutique captured $7,820 in four months from cruise-day shuttle bookings &mdash; the math, the UI, the cruise calendar integration.', readingTime: '7 min' },
              { num: '03', cat: 'Housekeeping', catColor: '#8B5CF6', title: 'Why we killed the 4-system housekeeping stack', slug: 'why-we-killed-the-4-system-housekeeping-stack', problem: 'Housekeeping in one app. Front desk in another. GM dashboard in a third. Guest requests in a fourth. The day the team stopped using three of them.', readingTime: '6 min' },
              { num: '04', cat: 'Owner', catColor: '#F59E0B', title: 'The &ldquo;AI will transform hospitality&rdquo; trap', slug: 'the-ai-will-transform-hospitality-trap', problem: 'Three pitches, three contracts, three dashboards no one opened. What the sales deck doesn&apos;t show you about contact with the front desk.', readingTime: '8 min' },
              { num: '05', cat: 'Industry', catColor: '#6B7280', title: 'The ops stack gap: chains vs. independents', slug: 'the-ops-stack-gap-chains-vs-independents', problem: 'Chains can afford 8-figure PMS systems. Independents can&apos;t. The six tools an independent property actually needs to compete in 2026.', readingTime: '9 min' },
              { num: '06', cat: 'Reviews', catColor: '#10B981', title: 'From 3.8 to 4.7 stars: a six-month turnaround', slug: 'from-3-8-to-4-7-stars-a-six-month-turnaround', problem: 'The problem was never the rooms. It was the gap between &ldquo;I need towels&rdquo; and &ldquo;towels arrived.&rdquo; The fix, the timeline, the metric to watch.', readingTime: '5 min' },
            ].map((topic, i) => (
              <a key={i} href={`/blog/${topic.slug}`}
                className="group hover-lift bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 hover:shadow-lg flex flex-col relative overflow-hidden">
                <div className="absolute top-3 right-4 text-[64px] font-black text-gray-100 leading-none pointer-events-none select-none">{topic.num}</div>
                <div className="flex items-center justify-between mb-3 relative">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-white" style={{ backgroundColor: topic.catColor }}>{topic.cat}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">{topic.readingTime}</span>
                </div>
                <h4 className="text-[18px] font-black text-gray-900 mb-2 leading-tight group-hover:text-gray-700 relative">{topic.title}</h4>
                <p className="text-[13px] text-gray-600 leading-relaxed mb-5 flex-1 relative" dangerouslySetInnerHTML={{ __html: topic.problem }} />
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 relative">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">By Alejandro Soria</div>
                  <div className="text-[11px] font-bold flex items-center gap-1" style={{ color: TEAL }}>
                    Read the breakdown
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT THE FOUNDER */}
      <section id="founder" className="py-16 md:py-24 px-5 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">Operator to operator</h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">Built inside real hotel operations.</h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              Limited-service, extended-stay, and full-service. F&amp;B and airport operations. Different segments, the same operational problem &mdash; and the tool built to solve it.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
              <div className="md:col-span-2 bg-gradient-to-br from-gray-100 to-gray-50 p-8 md:p-10 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-200">
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center text-white text-[56px] font-black mb-4 shadow-lg" style={{ backgroundColor: TEAL }}>AS</div>
                <div className="text-[20px] font-black text-gray-900">Alejandro Soria</div>
                <div className="text-[14px] text-gray-500 font-semibold mt-1">Founder &middot; Attenda</div>
                <div className="mt-4 flex items-center gap-2">
                  <a href="#" className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors" aria-label="LinkedIn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>
                  </a>
                  <a href="mailto:alejandro@attendaapp.com" className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors" aria-label="Email">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </a>
                </div>
              </div>
              <div className="md:col-span-3 p-8 md:p-10">
                <div className="text-[12px] uppercase tracking-widest text-gray-500 font-bold mb-2">The short version</div>
                <p className="text-[16px] text-gray-700 leading-relaxed mb-5">
                  Alejandro Soria has spent his career inside hotel operations &mdash; limited-service, extended-stay, and full-service properties, plus F&amp;B and airport operations. He&apos;s picked the PMS, run the front desk, trained the teams, taken the 2am call when the boiler went out, and lived the gap between what the software promised and what the shift actually needed.
                </p>
                <p className="text-[16px] text-gray-700 leading-relaxed mb-5">
                  Across every segment, the same problem kept surfacing: the work <em>around</em> the hotel was scattered across apps, paper, and people&apos;s heads &mdash; and the guest paid for it. Attenda is what he built to close that gap: not a pitch deck, not a roadmap, an operations layer built operator to operator.
                </p>
                <p className="text-[16px] text-gray-700 leading-relaxed mb-6">
                  He doesn&apos;t do pilots, betas, or &ldquo;early access.&rdquo; Attenda is the tool he wished had existed in year one of his hospitality career &mdash; and the one he uses in year fifteen.
                </p>
                <blockquote className="border-l-4 pl-4 py-2 mb-6" style={{ borderColor: TEAL }}>
                  <p className="text-[17px] font-bold text-gray-900 italic leading-snug">
                    &ldquo;I&apos;ve sat through the demos and signed the contracts. I&apos;ve been the GM on the call when the software didn&apos;t do what it promised. Attenda is the tool I wanted on the floor &mdash; built by someone who&apos;s actually run the operation.&rdquo;
                  </p>
                  <div className="text-[12px] text-gray-500 mt-2 font-semibold">&mdash; Alejandro Soria, operator to operator</div>
                </blockquote>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">In hospitality</div>
                    <div className="text-[13px] font-black text-gray-900">15+ years</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Front desk &rarr; GM &rarr; owner</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">Segments run</div>
                    <div className="text-[13px] font-black text-gray-900">Limited &middot; Extended &middot; Full-service</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">plus F&amp;B &amp; airport ops</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">Discipline</div>
                    <div className="text-[13px] font-black text-gray-900">Hotel ops + technology</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Built operator to operator</div>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <a href="mailto:alejandro@attendaapp.com"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-black text-black rounded-lg transition-all shadow-sm hover:shadow-md"
                    style={{ backgroundColor: '#15b79e' }}>
                    Email Alejandro directly
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </a>
                  <a href="#demo"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-gray-700 rounded-lg border border-gray-200 hover:border-gray-300">
                    See Attenda in action
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-5 border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Software</h4>
              <ul className="space-y-2.5 text-[14px] text-gray-700">
                <li><a href="#modules" className="hover:text-gray-900">Guest Requests</a></li>
                <li><a href="#modules" className="hover:text-gray-900">Staff Task Log</a></li>
                <li><a href="#modules" className="hover:text-gray-900">Vendor Portal</a></li>
                <li><a href="#modules" className="hover:text-gray-900">GM Dashboard</a></li>
                <li><a href="#modules" className="hover:text-gray-900">Knowledge Base</a></li>
                <li><a href="#modules" className="hover:text-gray-900">Shuttle & Transport</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Company</h4>
              <ul className="space-y-2.5 text-[14px] text-gray-700">
                <li><a href="#revenue" className="hover:text-gray-900">Case Study</a></li>
                <li><a href="#platform" className="hover:text-gray-900">Platform</a></li>
                <li><a href="/staff" className="hover:text-gray-900">Staff Login</a></li>
                <li><a href="mailto:thrilznetwork@gmail.com" className="hover:text-gray-900">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Resources</h4>
              <ul className="space-y-2.5 text-[14px] text-gray-700">
                <li><a href="#demo" className="hover:text-gray-900">Schedule a Demo</a></li>
                <li><a href="/blog" className="hover:text-gray-900">Field Notes Blog</a></li>
                <li><a href="#platform" className="hover:text-gray-900">Feature Tour</a></li>
                <li><a href="#revenue" className="hover:text-gray-900">Customer Stories</a></li>
                <li><a href="/privacy" className="hover:text-gray-900">Privacy</a></li>
                <li><a href="/terms" className="hover:text-gray-900">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Contact</h4>
              <ul className="space-y-2.5 text-[14px] text-gray-700">
                <li>thrilznetwork@gmail.com</li>
                <li>Miami, FL</li>
                <li className="pt-2">
                  <button onClick={() => scrollTo(enrollRef)}
                    className="px-4 py-2 rounded-lg text-white text-[12px] font-bold"
                    style={{ backgroundColor: TEAL }}>
                    Get a Demo
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src="/brand/icon-mark.svg" alt="Attenda" style={{ height: 28, width: 'auto' }} />
              <span className="text-[13px] text-gray-600">attenda &mdash; the operations platform for independent hotels</span>
            </div>
            <div className="text-[12px] text-gray-500">
              &copy; 2026 Attenda. All rights reserved.
              <p className="text-[10px] text-gray-400 mt-1">This property is independently owned and operated.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   FULL PLATFORM INVENTORY — 6 tabs
   ──────────────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 1800): [number, React.RefObject<HTMLDivElement>] {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setCount(target);
      return;
    }
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 4);
          setCount(Math.round(ease * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return [count, ref];
}

/* ── Animated stat (counts up when scrolled into view) ───────── */
function CountUpStat({
  value, prefix = '', suffix = '', className = '', style, duration,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
}) {
  const [count, ref] = useCountUp(value, duration);
  return (
    <div ref={ref} className={className} style={style}>
      {prefix}{count.toLocaleString('en-US')}{suffix}
    </div>
  );
}

/* ── Case-study bars (grow with stagger when scrolled into view) ── */
function CaseStudyBars() {
  const [grown, setGrown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setGrown(true);
      return;
    }
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setGrown(true);
        obs.disconnect();
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="grid grid-cols-4 gap-2 h-24 mb-4">
      {[
        { m: 'Feb', v: 0.45, val: '$2.1K' },
        { m: 'Mar', v: 0.62, val: '$3.4K' },
        { m: 'Apr', v: 0.85, val: '$4.8K' },
        { m: 'May', v: 1.0, val: '$5.9K' },
      ].map((b, i) => (
        <div key={i} className="flex flex-col items-center justify-end">
          <div className="text-[8px] text-gray-500 font-bold mb-1 transition-opacity duration-500" style={{ opacity: grown ? 1 : 0, transitionDelay: `${300 + i * 140}ms` }}>{b.val}</div>
          <div className="w-full rounded-t transition-all duration-1000 ease-out"
            style={{ height: grown ? `${b.v * 100}%` : '4%', backgroundColor: TEAL, opacity: 0.7 + i * 0.1, transitionDelay: `${i * 140}ms` }} />
          <div className="text-[9px] font-bold text-gray-500 mt-1">{b.m}</div>
        </div>
      ))}
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
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({
          type: 'enrollment_inquiry',
          data: {
            contactName: form.contactName,
            contactEmail: form.email,
            contactPhone: form.phone,
            propertyName: form.propertyName,
            propertyType: 'Property',
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
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-teal-600" />
        </div>
        <h3 className="text-[20px] font-bold text-gray-900 mb-2">We&apos;ll be in touch!</h3>
        <p className="text-[14px] text-gray-600">Expect a reply within one business day with a personalized demo for your property.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 text-left space-y-4">
      <div>
        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">Property Name *</label>
        <input value={form.propertyName} onChange={e => setForm({ ...form, propertyName: e.target.value })}
          placeholder="Your Property Name"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-500 transition-colors" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">Your Name *</label>
          <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })}
            placeholder="GM / Owner"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-500 transition-colors" />
        </div>
        <div>
          <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">Email *</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="gm@yourproperty.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-500 transition-colors" />
        </div>
      </div>
      <button onClick={handleSubmit} disabled={status === 'sending'}
        className="w-full py-4 rounded-xl text-white font-bold text-[15px] disabled:opacity-50 shadow-sm"
        style={{ backgroundColor: TEAL }}>
        {status === 'sending' ? 'Sending...' : 'Show me on my property →'}
      </button>
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="text-center">
          <div className="text-[11px] font-bold text-gray-900">Reply in 4 hrs</div>
          <div className="text-[10px] text-gray-500 leading-snug">business days</div>
        </div>
        <div className="text-center border-x border-gray-200">
          <div className="text-[11px] font-bold text-gray-900">15-min call</div>
          <div className="text-[10px] text-gray-500 leading-snug">no slide deck</div>
        </div>
        <div className="text-center">
          <div className="text-[11px] font-bold text-gray-900">No card</div>
          <div className="text-[10px] text-gray-500 leading-snug">no commitment</div>
        </div>
      </div>
    </div>
  );
}

/* (persona mockup cards removed — replaced by FlowExample in the A New Standard section) */
