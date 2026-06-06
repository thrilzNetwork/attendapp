'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, Bell, Bus, CheckCircle, Globe, MapPin, Phone, ShieldCheck, User, Utensils } from 'lucide-react';
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

  const handleClick = (sheet: SheetName, requiresValidation = false) => {
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (new Date(session.checkout) > new Date()) {
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
    // No valid session — only ask for info on features that need it
    if (requiresValidation) {
      setPendingTarget(sheet);
      setModalOpen(true);
      return;
    }
    // Everything else opens directly — no forms
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
      <a href="https://www.bestwestern.com/rewards/join.html" target="_blank" rel="noopener noreferrer"
        className="w-full h-full block min-h-0 rounded-2xl overflow-hidden shadow-sm active:scale-[0.97]">
        <div className="relative w-full h-full rounded-2xl overflow-hidden">
          <Image src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&fit=crop&q=80"
            alt="Rewards" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-2 left-3">
            <span className="text-[13px] font-bold text-white tracking-wider">BEST WESTERN REWARDS</span>
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
        <button onClick={() => handleClick('message', true)} className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: brandColor }}>
            <User size={20} className="text-white" strokeWidth={1.5} />
          </div>
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: brandColor }}>MESSAGE US</span>
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
      <GuestSheet open={openSheet === 'message'} onClose={closeSheet} title="Front Desk / Message" fullHeight>
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

function AttendaLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeRole, setActiveRole] = useState<'guest' | 'staff' | 'gm' | 'partner'>('guest');
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

      {/* NAV — inn-flow style with Software + Company dropdowns */}
      <nav className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: TEAL }}>
              <span className="text-white font-black text-[16px] tracking-tight">A</span>
            </div>
            <span className="font-bold text-[17px] text-gray-900 tracking-tight">attenda</span>
          </a>
          <div className="hidden md:flex items-center gap-7">
            <a href="#modules" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Software</a>
            <a href="#case-study" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Case Study</a>
            <a href="#demo" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Resources</a>
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

      {/* HERO — inn-flow 2-col pattern: copy left, product mockup right */}
      <section className="relative py-20 md:py-28 px-5 bg-white overflow-hidden">
        {/* Subtle dot pattern background */}
        <div
          className="absolute inset-0 opacity-[0.4] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #d0d5dd 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* LEFT: copy (5/12) */}
            <div className="lg:col-span-5">
              <h6 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-4">
                Hotel Operations Software
              </h6>
              <h1 className="text-[40px] md:text-[56px] lg:text-[60px] leading-[1.05] font-black tracking-tight text-gray-900 mb-6">
                One Solution.<br />
                <span style={{ color: '#0D9488' }}>Built For Independent Hotels.</span>
              </h1>
              <p className="text-[18px] text-gray-600 leading-relaxed mb-8">
                Attenda connects every guest request, staff task, vendor job, and GM dashboard into a single thread — so independent hotels can run leaner, serve faster, and capture more revenue without ripping out their PMS.
              </p>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-bold text-[16px] transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                style={{ backgroundColor: '#15b79e', color: '#000' }}
              >
                Schedule a Demo
                <ArrowRight size={18} />
              </a>
              <p className="text-[13px] text-gray-500 mt-4">
                15-minute call. No slide deck. No commitment.
              </p>
            </div>
            {/* RIGHT: product mockup (6/12 + 1 col offset) */}
            <div className="lg:col-span-6 lg:col-start-7">
              <HeaderMockup />
            </div>
          </div>
        </div>
      </section>

      {/* APP BY ROLE — Role-based product showcase replacing the 6-module grid */}
      <section id="modules" className="py-16 md:py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
              One Platform · Four Perspectives
            </h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
              Built for every role<br className="hidden md:block" />
              <span style={{ color: TEAL }}>in your property.</span>
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              Tap any role to see Attenda from their perspective — no slide deck, no gate, just the actual screens they use every shift.
            </p>
          </div>

          {/* Role tabs */}
          <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
            {([
              { key: 'guest', label: '🧳 Guest', desc: 'in the room' },
              { key: 'staff', label: '🛎️ Staff', desc: 'on shift' },
              { key: 'gm', label: '👔 GM', desc: 'on the dashboard' },
              { key: 'partner', label: '🚚 Partner', desc: 'on delivery' },
            ] as const).map(r => (
              <button
                key={r.key}
                onClick={() => setActiveRole(r.key)}
                className={`px-5 py-3 rounded-xl text-[14px] font-bold transition-all border-2 ${
                  activeRole === r.key
                    ? 'shadow-md scale-[1.02]'
                    : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                }`}
                style={activeRole === r.key ? { borderColor: TEAL, backgroundColor: `${TEAL}08` } : {}}
              >
                {r.label}
                <span className="text-[11px] font-normal text-gray-400 ml-1">{r.desc}</span>
              </button>
            ))}
          </div>

          {/* Guest Panel */}
          {activeRole === 'guest' && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Left: the QR code story */}
                <div className="p-8 md:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4" style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: TEAL }} />
                    The guest experience
                  </div>
                  <h4 className="text-[26px] md:text-[32px] font-black text-gray-900 mb-3 leading-tight">
                    It starts with a QR code in the room.
                  </h4>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>1</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Guest scans the code</p>
                        <p className="text-[13px] text-gray-600">No app to download. Opens in their camera or browser. Name and room are pre-filled.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>2</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Orders towels, food, or shuttle</p>
                        <p className="text-[13px] text-gray-600">Real-time chat. No phone tag. The front desk sees every request the moment it lands.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>3</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Browses nearby, reviews restaurant</p>
                        <p className="text-[13px] text-gray-600">Transport schedules, local attractions, in-room dining menus — all from the same QR code.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Zero apps for the guest</span>
                  </div>
                </div>
                {/* Right: guest phone mockup */}
                <div className="p-8 md:p-10 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
                  <PhoneGuestMockup />
                </div>
              </div>
            </div>
          )}

          {/* Staff Panel */}
          {activeRole === 'staff' && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-8 md:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4" style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: TEAL }} />
                    The staff experience
                  </div>
                  <h4 className="text-[26px] md:text-[32px] font-black text-gray-900 mb-3 leading-tight">
                    One dashboard. Every tool.
                  </h4>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>✓</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Dashboard with live stats</p>
                        <p className="text-[13px] text-gray-600">Pending requests, staff on duty, avg response time, today&apos;s activity — at a glance.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>✓</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Checklists inline</p>
                        <p className="text-[13px] text-gray-600">Start a housekeeping or maintenance checklist right from the Dashboard. Check items off as you go.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>✓</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Schedules with day-off requests</p>
                        <p className="text-[13px] text-gray-600">Weekly schedule grid, color-coded by department. Staff request days off in-app.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>✓</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Guest requests + staff chat</p>
                        <p className="text-[13px] text-gray-600">Accept, assign, mark done. Staff channel for internal coordination.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>PIN login · Department-filtered views</span>
                  </div>
                </div>
                <div className="p-8 md:p-10 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
                  <StaffDashboardMockup />
                </div>
              </div>
            </div>
          )}

          {/* GM Panel */}
          {activeRole === 'gm' && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-8 md:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4" style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: TEAL }} />
                    The GM experience
                  </div>
                  <h4 className="text-[26px] md:text-[32px] font-black text-gray-900 mb-3 leading-tight">
                    Total visibility. One screen.
                  </h4>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>✓</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">KPI dashboards with trend tracking</p>
                        <p className="text-[13px] text-gray-600">RevPAR, occupancy, response times, revenue per channel — all updated in real time.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>✓</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Revenue attribution</p>
                        <p className="text-[13px] text-gray-600">See exactly what revenue came through Attenda — shuttle bookings, in-room dining, late checkout fees.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>✓</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Staff & schedule management</p>
                        <p className="text-[13px] text-gray-600">Approve PTO, manage shifts, view department coverage — all from the same platform.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>✓</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Daily brief & property settings</p>
                        <p className="text-[13px] text-gray-600">Post GM notes for the whole team. Manage shuttle grid, QR codes, room types, and brand settings.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Real-time · Every shift · Every dollar</span>
                  </div>
                </div>
                <div className="p-8 md:p-10 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
                  <GmDashboardMockup />
                </div>
              </div>
            </div>
          )}

          {/* Partner Panel */}
          {activeRole === 'partner' && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-8 md:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4" style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: TEAL }} />
                    The partner experience
                  </div>
                  <h4 className="text-[26px] md:text-[32px] font-black text-gray-900 mb-3 leading-tight">
                    A portal, not a phone call.
                  </h4>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>✓</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">See open jobs at a glance</p>
                        <p className="text-[13px] text-gray-600">Linen delivery? Shuttle run? Maintenance request? Partners see exactly what needs doing.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>✓</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Accept, update, close</p>
                        <p className="text-[13px] text-gray-600">Tap to accept. Tap to mark delivered. Every update is visible to staff and GM in real time.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>✓</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Restaurant menu management</p>
                        <p className="text-[13px] text-gray-600">Partners with in-house restaurants can manage menus, receive in-room dining orders, and update availability.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>No more phone tag · Auto-invoice</span>
                  </div>
                </div>
                <div className="p-8 md:p-10 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
                  <PartnerPortalMockup />
                </div>
              </div>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="text-center mt-10">
            <a
              href="#demo"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg font-bold text-[15px] shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: '#15b79e', color: '#000' }}
            >
              See it on your property <ArrowRight size={16} />
            </a>
            <div className="mt-3 text-[12px] text-gray-500">15-min call · No slide deck · No commitment</div>
          </div>
        </div>
      </section>

      {/* SEE IT IN ACTION — Pixel-accurate mockups of the actual product on 3 devices */}
      <section id="see-it-in-action" className="py-16 md:py-24 px-5 bg-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-700">The actual product · No mockups</span>
            </div>
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
              One thread. Every role.
            </h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
              The guest asks. The staff handles. <br className="hidden md:block" />
              <span style={{ color: '#0D9488' }}>The GM sees it all.</span>
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              Three devices. One conversation. Every request, every shift, every room — on the same thread.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 items-end">
            <div className="order-1"><PhoneMockup /></div>
            <div className="order-2 md:mt-12"><TabletMockup /></div>
            <div className="order-3 md:-mt-4"><DesktopMockup /></div>
          </div>
          {/* Single CTA after the showcase */}
          <div className="text-center mt-14">
            <a
              href="#schedule"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-black text-black rounded-lg transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: '#15b79e' }}
            >
              See it on your property
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
            <div className="mt-3 text-[12px] text-gray-500">15-min call · No slide deck · Reply in 4 hours</div>
          </div>
        </div>
      </section>

      {/* LOGO STRIP — inn-flow social proof pattern */}
      <section className="py-12 px-5 bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-6">
            Trusted by independent properties across Florida
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[14px] font-bold text-gray-400">
            <span>Boutique 42 · PortMiami</span>
            <span className="text-gray-300">·</span>
            <span>Inn 28 · Key West</span>
            <span className="text-gray-300">·</span>
            <span>Suites 56 · Tampa</span>
            <span className="text-gray-300">·</span>
            <span>Lodge 18 · Naples</span>
            <span className="text-gray-300">·</span>
            <span>Resort 92 · Orlando</span>
          </div>
        </div>
      </section>

      {/* A NEW STANDARD — inn-flow 2-col: text left, flow right */}
      <section className="py-12 md:py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6">
              <h6 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
                A New Standard For Independent Hotels
              </h6>
              <h2 className="text-[32px] md:text-[42px] font-black tracking-tight text-gray-900 mb-5 leading-tight">
                Run your whole property on one thread.
              </h2>
              <p className="text-[16px] text-gray-600 leading-relaxed mb-5">
                Attenda was built for the way independent hotels actually operate — multiple roles, multiple tools, one team trying to deliver five-star service without a five-star budget.
              </p>
              <p className="text-[16px] text-gray-600 leading-relaxed mb-8">
                Every request, every job, every handoff lives on a single thread. Your PMS stays. Your staff stays. Your vendors stay. You just get a clear view of every room, every shift, every dollar — in real time.
              </p>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg font-bold text-[15px] shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                style={{ backgroundColor: '#15b79e', color: '#000' }}
              >
                Schedule a Demo <ArrowRight size={16} />
              </a>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 bg-gray-50 rounded-2xl p-6 md:p-8 border border-gray-200">
              <FlowExample />
            </div>
          </div>
        </div>
      </section>

      {/* PROVEN RESULTS — inn-flow 4-KPI pattern */}
      <section className="py-20 px-5 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-400 mb-3">
              Proven Results
            </h2>
            <h3 className="text-[32px] md:text-[42px] font-black tracking-tight text-white">
              The bottom line: it works.
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <KpiTileDark value="73%" label="Faster guest response" />
            <KpiTileDark value="4→1" label="Tools replaced" />
            <KpiTileDark value="11" label="Days to live" />
            <KpiTileDark value="0" label="Apps for guests" />
          </div>
        </div>
      </section>

      {/* TESTIMONIAL — inn-flow 2-col pattern: image left, quote right */}
      <section id="case-study" className="py-12 md:py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-5 lg:order-1 order-2">
              <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 p-8 md:p-12 aspect-[4/5] flex items-center justify-center">
                {/* CSS-rendered hotel "scene" placeholder — could be a real photo */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white shadow-md flex items-center justify-center mb-4">
                    <span className="text-3xl" style={{ color: '#0D9488' }}>★</span>
                  </div>
                  <div className="text-[14px] font-bold text-gray-900 mb-1">5-star reviews</div>
                  <div className="text-[12px] text-gray-500">recovered pre-checkout</div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-6 lg:col-start-7 order-1 lg:order-2">
              <h6 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
                What hotel operators say about Attenda
              </h6>
              <h2 className="text-[28px] md:text-[36px] font-black tracking-tight text-gray-900 mb-6 leading-tight">
                &ldquo;One thread. Every room knew what was happening — us, the staff, the vendors. Nobody was guessing. We onboarded in 11 days and the front desk started capturing revenue we used to walk past.&rdquo;
              </h2>
              <div className="border-l-4 pl-5" style={{ borderColor: '#15b79e' }}>
                <div className="text-[15px] font-bold text-gray-900">General Manager</div>
                <div className="text-[14px] text-gray-500">42-room boutique near PortMiami, Florida</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA — inn-flow 2-col card pattern (NOT full-width banner) */}
      <section className="py-12 md:py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <h2 className="text-[28px] md:text-[36px] font-black tracking-tight text-gray-900 mb-3 leading-tight">
                  See the Attenda system in action.
                </h2>
                <p className="text-[16px] text-gray-600 leading-relaxed">
                  Learn how your property can run leaner, serve faster, and capture more — with your existing PMS and zero rip-and-replace.
                </p>
              </div>
              <div className="lg:col-span-4 lg:flex lg:justify-end">
                <a
                  href="#demo"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-bold text-[16px] shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                  style={{ backgroundColor: '#15b79e', color: '#000' }}
                >
                  Schedule a Demo
                  <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GENERATE REVENUE — One real story. One real number. No projections. */}
      <section id="revenue" className="py-16 md:py-24 px-5 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
              One Property · One Number
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

          {/* The one real story — 2 col: copy + dashboard mockup */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Left: the story */}
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: TEAL }}>CASE STUDY · BOUTIQUE HOTEL</div>
                <h4 className="text-[24px] md:text-[28px] font-black text-gray-900 leading-tight mb-4">
                  121 rooms · 1 restaurant · 4 months on Attenda.
                </h4>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-4">
                  An independent boutique hotel — 121 keys, an in-house restaurant, the kind of property that runs lean and competes with chains for direct bookings.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-4">
                  They switched on Attenda in February. By June, four months in, they&apos;d generated <span className="font-black text-gray-900">$16,000+ in attributable revenue</span> — captured shuttle bookings from cruise-ship days, in-room dining orders routed through their restaurant, late-checkout fees processed in-chat.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-6">
                  No 18-month rollout. No 6-figure implementation. Just the chat, the QR code, and a four-month run.
                </p>
                <div className="flex items-center gap-4 text-[12px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Verifiable · Numbers tracked in the platform</span>
                  </div>
                </div>
              </div>

              {/* Right: the dashboard that proves it */}
              <div className="bg-gray-50 p-8 md:p-10 border-t md:border-t-0 md:border-l border-gray-200 flex items-center justify-center">
                <div className="w-full max-w-sm">
                  {/* Browser chrome */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      </div>
                      <div className="flex-1 h-6 bg-white rounded-md border border-gray-200 flex items-center px-2 text-[9px] text-gray-500 font-semibold">
                        gm.attenda.app · Revenue
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Revenue · Last 4 months</div>
                        <div className="text-[9px] text-gray-400">Feb – May</div>
                      </div>
                      <div className="text-[10px] text-gray-400 mb-3">Attributable to Attenda</div>

                      {/* The hero number */}
                      <div className="text-[48px] font-black leading-none mb-1" style={{ color: TEAL }}>
                        $16,247
                      </div>
                      <div className="text-[12px] text-gray-500 mb-5">+ partner orders + late checkout + shuttle</div>

                      {/* 4 month bars */}
                      <div className="grid grid-cols-4 gap-2 h-24 mb-4">
                        {[
                          { m: 'Feb', v: 0.45, val: '$2.1K' },
                          { m: 'Mar', v: 0.62, val: '$3.4K' },
                          { m: 'Apr', v: 0.85, val: '$4.8K' },
                          { m: 'May', v: 1.0, val: '$5.9K' },
                        ].map((b, i) => (
                          <div key={i} className="flex flex-col items-center justify-end">
                            <div className="text-[8px] text-gray-500 font-bold mb-1">{b.val}</div>
                            <div
                              className="w-full rounded-t transition-all duration-1000"
                              style={{ height: `${b.v * 100}%`, backgroundColor: TEAL, opacity: 0.7 + i * 0.1 }}
                            />
                            <div className="text-[9px] font-bold text-gray-500 mt-1">{b.m}</div>
                          </div>
                        ))}
                      </div>

                      {/* Breakdown */}
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

          {/* The honest disclaimer */}
          <div className="mt-8 text-center max-w-2xl mx-auto">
            <p className="text-[13px] text-gray-500 leading-relaxed">
              <span className="font-bold text-gray-700">One property, one number.</span> We&apos;re not going to tell you your property will do the same. We&apos;re going to show you what we did for one, and let you decide if the math holds for your rooms, your restaurant, your cruise calendar.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-5 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3 text-center">Common questions</h2>
          <h3 className="text-[28px] font-black tracking-tight text-gray-900 mb-10 text-center">
            Real questions from real GMs
          </h3>
          {[
            { q: 'What does Attenda include?', a: 'Guest experience (QR code check-in, chat, requests), Staff dashboard with checklists and schedules, GM KPIs and revenue tracking, Partner portal for vendors and restaurants — all connected on one thread.' },
            { q: 'Does the guest need to download an app?', a: 'No. They scan a QR code in the room — opens a mobile web app in their browser.' },
            { q: 'How are vendors onboarded?', a: 'Each vendor gets a lightweight web portal link. They see open jobs, accept, and update status.' },
            { q: 'What about my existing PMS?', a: 'Attenda runs alongside your current PMS from day one. No rip-and-replace.' },
            { q: 'How long does setup take?', a: '11 days from contract to live. We do QR design, branding, and staff training.' },
            { q: 'What does Attenda cost?', a: 'Per-room, tiered by property size. We&apos;ll quote on the demo call.' },
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

      {/* DEMO FORM (anchored for nav/scroll) */}
      <section id="demo" ref={enrollRef} className="py-20 px-5">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
              Schedule a Demo
            </h2>
            <h3 className="text-[32px] md:text-[40px] font-black tracking-tight text-gray-900 mb-4">
              See Attenda on your property
            </h3>
            <p className="text-[16px] text-gray-600">
              Three fields. We&apos;ll show you Attenda from every role — guest, staff, GM, partner — on your property.
            </p>
          </div>
          <EnrollForm />
        </div>
      </section>

      {/* FIELD NOTES — 6 operator topics, no fake authors, no fake quotes */}
      <section id="blog" className="py-16 md:py-24 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
              Field Notes · For Independent Operators
            </h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
              Six problems every operator faces.
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              No fake authors. No invented quotes. These are the six topics we cover in Field Notes — written by Alejandro from fifteen years on the front desk, with real numbers from the properties running Attenda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                cat: 'Operations',
                catColor: '#3B82F6',
                title: 'The 12-questions-a-day front desk problem',
                problem: 'Towels. WiFi. Late checkout. Parking. Breakfast. Checkout time. The same six questions, twice each, every shift. Why QR codes close the gap.',
                readingTime: '5 min',
              },
              {
                num: '02',
                cat: 'Revenue',
                catColor: TEAL,
                title: 'Cruise-day shuttle: the $7,820 line item',
                problem: 'How a 121-room boutique captured $7,820 in four months from cruise-day shuttle bookings — the math, the UI, the cruise calendar integration.',
                readingTime: '7 min',
              },
              {
                num: '03',
                cat: 'Housekeeping',
                catColor: '#8B5CF6',
                title: 'Why we killed the 4-system housekeeping stack',
                problem: 'Housekeeping in one app. Front desk in another. GM dashboard in a third. Guest requests in a fourth. The day the team stopped using three of them.',
                readingTime: '6 min',
              },
              {
                num: '04',
                cat: 'Owner',
                catColor: '#F59E0B',
                title: 'The &ldquo;AI will transform hospitality&rdquo; trap',
                problem: 'Three pitches, three contracts, three dashboards no one opened. What the sales deck doesn&apos;t show you about contact with the front desk.',
                readingTime: '8 min',
              },
              {
                num: '05',
                cat: 'Industry',
                catColor: '#6B7280',
                title: 'The ops stack gap: chains vs. independents',
                problem: 'Chains can afford 8-figure PMS systems. Independents can&apos;t. The six tools an independent property actually needs to compete in 2026.',
                readingTime: '9 min',
              },
              {
                num: '06',
                cat: 'Reviews',
                catColor: '#10B981',
                title: 'From 3.8 to 4.7 stars: a six-month turnaround',
                problem: 'The problem was never the rooms. It was the gap between &ldquo;I need towels&rdquo; and &ldquo;towels arrived.&rdquo; The fix, the timeline, the metric to watch.',
                readingTime: '5 min',
              },
            ].map((topic, i) => (
              <a
                key={i}
                href="#demo"
                className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 hover:shadow-lg transition-all flex flex-col relative overflow-hidden"
              >
                {/* Big number watermark */}
                <div className="absolute top-3 right-4 text-[64px] font-black text-gray-100 leading-none pointer-events-none select-none">
                  {topic.num}
                </div>
                {/* Category */}
                <div className="flex items-center justify-between mb-3 relative">
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-white"
                    style={{ backgroundColor: topic.catColor }}
                  >
                    {topic.cat}
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold">{topic.readingTime}</span>
                </div>
                {/* Title */}
                <h4 className="text-[18px] font-black text-gray-900 mb-2 leading-tight group-hover:text-gray-700 relative">
                  {topic.title}
                </h4>
                {/* Problem statement */}
                <p className="text-[13px] text-gray-600 leading-relaxed mb-5 flex-1 relative" dangerouslySetInnerHTML={{ __html: topic.problem }} />
                {/* CTA row */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 relative">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">
                    By Alejandro Soria
                  </div>
                  <div className="text-[11px] font-bold flex items-center gap-1" style={{ color: TEAL }}>
                    Read the breakdown
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Bottom honest CTA */}
          <div className="mt-10 bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: TEAL }}>OPERATORS IN THE FIELD</div>
              <div className="text-[15px] font-black text-gray-900">Got a story from your property?</div>
              <div className="text-[13px] text-gray-600 mt-1">
                If you&apos;re running Attenda and have something worth saying — a number, a near-miss, a fix — we&apos;ll publish it under your name, with your property, with your numbers. Real attribution, not a quote mill.
              </div>
            </div>
            <a
              href="mailto:thrilznetwork@gmail.com"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3 text-[13px] font-black text-black rounded-lg transition-all shadow-sm hover:shadow-md"
              style={{ backgroundColor: '#15b79e' }}
            >
              Pitch your story
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ABOUT THE FOUNDER — Alejandro Soria */}
      <section id="founder" className="py-16 md:py-24 px-5 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
              Built by a 15-Year Operator
            </h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
              The founder.
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              Fifteen years in hospitality. Three PMS migrations. Two CRMs that died on the vine. One in-house tool that actually stuck.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
              {/* Left: Photo placeholder */}
              <div className="md:col-span-2 bg-gradient-to-br from-gray-100 to-gray-50 p-8 md:p-10 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-200">
                <div
                  className="w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center text-white text-[56px] font-black mb-4 shadow-lg"
                  style={{ backgroundColor: TEAL }}
                >
                  AS
                </div>
                <div className="text-[20px] font-black text-gray-900">Alejandro Soria</div>
                <div className="text-[14px] text-gray-500 font-semibold mt-1">Founder · Attenda</div>
                <div className="mt-4 flex items-center gap-2">
                  <a
                    href="#"
                    className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors"
                    aria-label="LinkedIn"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2">
                      <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
                    </svg>
                  </a>
                  <a
                    href="mailto:alejandro@attendaapp.com"
                    className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors"
                    aria-label="Email"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </a>
                </div>
              </div>

              {/* Right: Bio + quote */}
              <div className="md:col-span-3 p-8 md:p-10">
                <div className="text-[12px] uppercase tracking-widest text-gray-500 font-bold mb-2">The short version</div>
                <p className="text-[16px] text-gray-700 leading-relaxed mb-5">
                  Alejandro Soria has spent fifteen years inside hospitality — front desk, GM, owner-operator of independent properties in Texas and Florida. He&apos;s been the guy who picked the PMS, who trained the housekeeping staff, who took the 2am call when the boiler went out, and who wrote the &ldquo;do not lose this guest&rdquo; note in the margin of the shift log.
                </p>
                <p className="text-[16px] text-gray-700 leading-relaxed mb-5">
                  He&apos;s bought three PMS systems, integrated two CRMs, beta-tested four &ldquo;AI will transform hospitality&rdquo; platforms, and personally watched every one of them fail at the same point: the gap between the demo and the front desk. Attenda is what he built to close that gap — not a pitch deck, not a roadmap, an operations layer he runs on his own properties every day.
                </p>
                <p className="text-[16px] text-gray-700 leading-relaxed mb-6">
                  He doesn&apos;t do pilots, betas, or &ldquo;early access.&rdquo; Attenda is the tool he wished had existed in year one of his hospitality career — and the one he uses in year fifteen.
                </p>

                {/* Pull quote */}
                <blockquote className="border-l-4 pl-4 py-2 mb-6" style={{ borderColor: TEAL }}>
                  <p className="text-[17px] font-bold text-gray-900 italic leading-snug">
                    &ldquo;I&apos;ve sat through every demo. I&apos;ve signed the contracts. I&apos;ve been the GM on the call when the software didn&apos;t do what the sales rep said. Attenda exists because I got tired of paying for tools that don&apos;t work in the real world.&rdquo;
                  </p>
                  <div className="text-[12px] text-gray-500 mt-2 font-semibold">— Alejandro Soria, on why he stopped buying and started building</div>
                </blockquote>

                {/* Credibility signals */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">In hospitality</div>
                    <div className="text-[13px] font-black text-gray-900">15+ years</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Front desk → GM → owner</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">Properties run</div>
                    <div className="text-[13px] font-black text-gray-900">Independent · TX & FL</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Boutique, 60–150 keys</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">Software burned through</div>
                    <div className="text-[13px] font-black text-gray-900">3 PMS · 2 CRM · 4 AI</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">None survived contact with guests</div>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-6 flex items-center gap-3">
                  <a
                    href="mailto:alejandro@attendaapp.com"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-black text-black rounded-lg transition-all shadow-sm hover:shadow-md"
                    style={{ backgroundColor: '#15b79e' }}
                  >
                    Email Alejandro directly
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </a>
                  <a
                    href="#demo"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold text-gray-700 rounded-lg border border-gray-200 hover:border-gray-300"
                  >
                    See Attenda in action
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — inn-flow 4-col pattern */}
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
                <li><a href="#case-study" className="hover:text-gray-900">Case Study</a></li>
                <li><a href="#modules" className="hover:text-gray-900">Platform</a></li>
                <li><a href="/staff" className="hover:text-gray-900">Staff Login</a></li>
                <li><a href="mailto:thrilznetwork@gmail.com" className="hover:text-gray-900">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Resources</h4>
              <ul className="space-y-2.5 text-[14px] text-gray-700">
                <li><a href="#demo" className="hover:text-gray-900">Schedule a Demo</a></li>
                <li><a href="#modules" className="hover:text-gray-900">Feature Tour</a></li>
                <li><a href="#case-study" className="hover:text-gray-900">Customer Stories</a></li>
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
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: TEAL }}>
                <span className="text-white font-black text-[12px]">A</span>
              </div>
              <span className="text-[13px] text-gray-600">attenda — the operations platform for independent hotels</span>
            </div>
            <div className="text-[12px] text-gray-500">
              © 2026 Attenda. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Flow example (Room 204 pillows) ──────────────────────────── */

function FlowExample() {
  return (
    <div className="space-y-4">
      <div className="bg-gray-900 text-white rounded-t-2xl px-5 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Live thread</div>
          <div className="text-[14px] font-bold">Room 204 · Extra pillows · 9:42 PM</div>
        </div>
        <div className="text-[10px] px-2 py-1 rounded-full bg-green-500/20 text-green-300 font-bold">RESOLVED 9:51 PM</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-100 p-3 rounded-b-2xl">
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[12px]" style={{ backgroundColor: TEAL }}>G</div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Guest</div>
              <div className="text-[12px] font-bold text-gray-900">Room 204</div>
            </div>
          </div>
          <div className="space-y-1.5 text-[12px] text-gray-700">
            <div className="bg-gray-50 rounded-lg p-2">📱 Taps &ldquo;Need extras&rdquo;</div>
            <div className="bg-gray-50 rounded-lg p-2">💬 &ldquo;Extra pillows please&rdquo;</div>
            <div className="rounded-lg p-2 text-white" style={{ backgroundColor: TEAL }}>✓ Delivered in 10 min</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-[12px]">S</div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Staff</div>
              <div className="text-[12px] font-bold text-gray-900">Maria · Housekeeping</div>
            </div>
          </div>
          <div className="space-y-1.5 text-[12px] text-gray-700">
            <div className="bg-gray-50 rounded-lg p-2">🔔 Phone buzzes: Room 204 pillows</div>
            <div className="bg-gray-50 rounded-lg p-2">✅ Taps Accept</div>
            <div className="bg-gray-50 rounded-lg p-2">🚪 Walks to room, delivers</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-[12px]">V</div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Vendor</div>
              <div className="text-[12px] font-bold text-gray-900">Linen Co.</div>
            </div>
          </div>
          <div className="space-y-1.5 text-[12px] text-gray-700">
            <div className="bg-gray-50 rounded-lg p-2">📦 Auto-restock alert: Room 204</div>
            <div className="bg-gray-50 rounded-lg p-2">✅ Confirms next-day delivery</div>
            <div className="bg-gray-50 rounded-lg p-2">💰 Invoice auto-generated</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Header product mockup (CSS-rendered GM dashboard, hero right side) ── */

/* ── Pixel-accurate mockups of the actual product — used in the "See it in action" section ── */

const TEAL_MOCKUP = '#0D9488';

function PhoneMockup() {
  return (
    <div className="relative w-full max-w-[280px] mx-auto" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.18))' }}>
      <div className="relative rounded-[40px] border-[10px] border-gray-900 bg-gray-900 overflow-hidden aspect-[9/19] shadow-2xl">
        <div className="relative h-full w-full rounded-[32px] overflow-hidden bg-[#F4F4F5]">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80px] h-[20px] bg-gray-900 rounded-b-2xl z-10" />
          {/* Status bar */}
          <div className="relative z-0 bg-white px-5 pt-3 pb-1 flex items-center justify-between text-[10px] font-semibold text-gray-900">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-[2px] items-end">
                <div className="w-[2px] h-[5px] bg-gray-900 rounded-sm" />
                <div className="w-[2px] h-[7px] bg-gray-900 rounded-sm" />
                <div className="w-[2px] h-[9px] bg-gray-900 rounded-sm" />
                <div className="w-[2px] h-[11px] bg-gray-900 rounded-sm" />
              </div>
              <div className="w-5 h-2.5 border border-gray-900 rounded-[2px] ml-1 relative">
                <div className="absolute inset-[1px] bg-gray-900 rounded-[1px]" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
          {/* Header — /message page header */}
          <div className="bg-white px-4 py-2.5 flex items-center gap-2.5 border-b border-gray-100">
            <div className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-bold text-black leading-none">Front Desk</div>
              <div className="text-[9px] text-green-500 font-medium mt-0.5">● Online now</div>
            </div>
          </div>
          {/* Chat area */}
          <div className="px-3 py-3 space-y-2">
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white border border-gray-100 px-3 py-2 text-[10px] text-gray-800 leading-relaxed shadow-sm">
                Hello! How can I assist you today? I can help with room service, transport, nearby attractions, and more.
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-br-md px-3 py-2 text-[10px] text-white leading-relaxed" style={{ backgroundColor: TEAL_MOCKUP }}>
                Request Towels
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-white border border-gray-100 px-3 py-2.5 shadow-sm">
                <p className="text-[10px] text-gray-800 leading-relaxed mb-2">
                  I can send a towel request to housekeeping for you. Would you like me to do that?
                </p>
                <div className="flex gap-1.5">
                  <div className="flex-1 py-1.5 rounded-lg text-white text-[9px] font-bold text-center" style={{ backgroundColor: TEAL_MOCKUP }}>
                    Yes, send request
                  </div>
                  <div className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-[9px] font-bold text-center">
                    No thanks
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-br-md px-3 py-2 text-[10px] text-white leading-relaxed" style={{ backgroundColor: TEAL_MOCKUP }}>
                Yes, please send towel service
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white border border-green-200 px-3 py-2 text-[10px] text-gray-800 leading-relaxed shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center text-white text-[7px] font-bold">✓</div>
                  <span className="text-[9px] font-bold text-green-700">Request sent</span>
                </div>
                Our team will take care of this. Track it in the Live Orders dashboard.
              </div>
            </div>
          </div>
          {/* Quick replies */}
          <div className="px-3 pb-2 flex gap-1.5 overflow-hidden">
            {['WiFi', 'Pool', 'Checkout', 'Wake-Up'].map((label, i) => (
              <div key={i} className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[8px] text-gray-600 font-medium">
                {label}
              </div>
            ))}
          </div>
          {/* Input bar */}
          <div className="bg-white border-t border-gray-100 px-3 py-2.5 flex items-center gap-1.5">
            <div className="flex-1 bg-gray-50 rounded-full px-3 py-2 text-[10px] text-gray-400 border border-gray-200">
              Type a message...
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: TEAL_MOCKUP }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="text-center mt-4">
        <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold">1. Guest submits</div>
        <div className="text-sm font-black text-gray-900 mt-1">From the room, in 4 taps</div>
        <div className="text-[10px] text-gray-500 mt-0.5">No app to download</div>
      </div>
    </div>
  );
}

function TabletMockup() {
  const requests = [
    { room: '204', type: 'Towels', icon: '🛏️', time: '2m', status: 'pending', assignee: null, urgent: true },
    { room: '318', type: 'Pillows', icon: '☕', time: '5m', status: 'in-progress', assignee: 'Maria', urgent: false },
    { room: '412', type: 'Maintenance · A/C', icon: '🔧', time: '8m', status: 'in-progress', assignee: 'Carlos', urgent: false },
    { room: '205', type: 'Housekeeping', icon: '🧹', time: '3m', status: 'pending', assignee: null, urgent: false },
  ];
  return (
    <div className="relative w-full max-w-[420px] mx-auto" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }}>
      <div className="rounded-2xl overflow-hidden bg-white shadow-2xl border-[8px] border-gray-900">
        {/* Browser chrome */}
        <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 h-6 bg-white rounded-md border border-gray-200 flex items-center px-2 text-[9px] text-gray-500 font-semibold">
            attenda.app/staff · Best Western Miami Airport
          </div>
        </div>
        {/* Top bar — staff header with PIN badge */}
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: TEAL_MOCKUP }}>
              A
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-900 leading-none">Attenda Staff</div>
              <div className="text-[8px] text-gray-500 mt-0.5">Maria · Housekeeping</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-1 rounded-md bg-gray-100 text-[8px] font-bold text-gray-700">PIN: 2025</div>
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-[8px] font-black text-red-700">2</div>
          </div>
        </div>
        {/* Status tabs */}
        <div className="bg-white border-b border-gray-200 px-4 flex gap-3">
          <div className="py-2 text-[10px] font-bold border-b-2" style={{ color: TEAL_MOCKUP, borderColor: TEAL_MOCKUP }}>
            Active <span className="ml-1 px-1.5 rounded-full text-[8px]" style={{ backgroundColor: TEAL_MOCKUP, color: 'white' }}>3</span>
          </div>
          <div className="py-2 text-[10px] font-bold text-gray-400">Completed</div>
          <div className="py-2 text-[10px] font-bold text-gray-400">Messages <span className="ml-1 px-1.5 rounded-full bg-gray-200 text-gray-600 text-[8px]">1</span></div>
        </div>
        {/* Request cards */}
        <div className="bg-gray-50 p-3 space-y-2">
          {requests.map((req, i) => (
            <div key={i} className={`bg-white rounded-lg border ${req.urgent ? 'border-l-4' : 'border-gray-200'} p-2.5 shadow-sm`}
                 style={req.urgent ? { borderLeftColor: TEAL_MOCKUP } : {}}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="text-base">{req.icon}</div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-900">Room {req.room} · {req.type}</div>
                    <div className="text-[8px] text-gray-500">Submitted {req.time} ago</div>
                  </div>
                </div>
                <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                  req.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {req.status === 'pending' ? 'Pending' : 'In progress'}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[8px] text-gray-600">
                  {req.assignee ? `Assigned: ${req.assignee}` : 'Unassigned'}
                </div>
                <div className="flex gap-1">
                  {req.status === 'pending' ? (
                    <>
                      <div className="px-2 py-1 rounded text-[8px] font-bold text-gray-600 bg-gray-100">Assign</div>
                      <div className="px-2 py-1 rounded text-[8px] font-bold text-white" style={{ backgroundColor: TEAL_MOCKUP }}>Accept</div>
                    </>
                  ) : (
                    <div className="px-2 py-1 rounded text-[8px] font-bold text-white bg-green-600">Mark done ✓</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center mt-4">
        <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold">2. Staff executes</div>
        <div className="text-sm font-black text-gray-900 mt-1">PIN-in, accept, done</div>
        <div className="text-[10px] text-gray-500 mt-0.5">Average resolution: 7m 14s</div>
      </div>
    </div>
  );
}

function DesktopMockup() {
  const navItems = [
    { label: 'Dashboard', active: false, icon: '📊' },
    { label: 'Orders', active: true, icon: '📋', count: 3 },
    { label: 'Staff', active: false, icon: '👥' },
    { label: 'Vendors', active: false, icon: '🚚' },
    { label: 'Knowledge', active: false, icon: '📚' },
  ];
  const compactRequests = [
    { room: '204', type: 'Towels', time: '2m', status: 'pending' },
    { room: '318', type: 'Pillows', time: '5m', status: 'progress' },
    { room: '412', type: 'A/C fix', time: '8m', status: 'progress' },
  ];
  return (
    <div className="relative w-full max-w-[480px] mx-auto" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.18))' }}>
      <div className="rounded-2xl overflow-hidden bg-white shadow-2xl border-[8px] border-gray-900">
        {/* Browser chrome */}
        <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 h-6 bg-white rounded-md border border-gray-200 flex items-center px-2 text-[9px] text-gray-500 font-semibold">
            gm.attenda.app · Best Western Miami Airport
          </div>
        </div>
        {/* Two-col layout */}
        <div className="flex">
          {/* Sidebar */}
          <div className="w-[100px] bg-gray-50 border-r border-gray-200 p-2.5 shrink-0">
            <div className="text-[9px] font-black text-gray-900 mb-2 tracking-wide">ATTENDA GM</div>
            <div className="space-y-1">
              {navItems.map((item, i) => (
                <div key={i} className={`px-2 py-1.5 rounded text-[9px] font-bold flex items-center justify-between ${
                  item.active ? 'text-white' : 'text-gray-700'
                }`} style={item.active ? { backgroundColor: TEAL_MOCKUP } : {}}>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.count && <span className="text-[8px] bg-white/30 px-1 rounded">{item.count}</span>}
                </div>
              ))}
            </div>
          </div>
          {/* Main */}
          <div className="flex-1 p-3 bg-white">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[12px] font-black text-gray-900">Live Orders</div>
              <div className="text-[8px] text-gray-500">Updated 2s ago</div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              <div className="bg-gray-50 rounded p-1.5">
                <div className="text-[7px] text-gray-500 uppercase font-bold">Open</div>
                <div className="text-[12px] font-black text-gray-900">3</div>
              </div>
              <div className="bg-gray-50 rounded p-1.5">
                <div className="text-[7px] text-gray-500 uppercase font-bold">In progress</div>
                <div className="text-[12px] font-black text-gray-900">5</div>
              </div>
              <div className="bg-gray-50 rounded p-1.5">
                <div className="text-[7px] text-gray-500 uppercase font-bold">Avg time</div>
                <div className="text-[12px] font-black text-gray-900">7m</div>
              </div>
            </div>
            <div className="space-y-1">
              {compactRequests.map((req, i) => (
                <div key={i} className="flex items-center justify-between py-1 px-1.5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[9px] font-bold text-gray-900">#{req.room}</div>
                    <div className="text-[9px] text-gray-700">{req.type}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-[8px] text-gray-500">{req.time}</div>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      req.status === 'pending' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="text-center mt-4">
        <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold">3. GM oversees</div>
        <div className="text-sm font-black text-gray-900 mt-1">One screen, total visibility</div>
        <div className="text-[10px] text-gray-500 mt-0.5">Every room, every shift, in real time</div>
      </div>
    </div>
  );
}

function HeaderMockup() {
  // Real-looking week-at-a-glance GM dashboard, rendered in pure CSS
  // Inspired by the actual /staff dashboard — kept generic enough to feel real
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const occupancy = [0.85, 0.92, 0.78, 0.95, 0.88, 0.72, 0.45];
  const rooms = [
    { num: '201', status: 'occupied' },
    { num: '202', status: 'occupied' },
    { num: '203', status: 'clean' },
    { num: '204', status: 'occupied' },
    { num: '205', status: 'dirty' },
    { num: '206', status: 'occupied' },
    { num: '207', status: 'clean' },
    { num: '208', status: 'occupied' },
    { num: '209', status: 'occupied' },
    { num: '210', status: 'clean' },
    { num: '211', status: 'dirty' },
    { num: '212', status: 'occupied' },
  ];
  return (
    <div className="relative w-full">
      {/* Subtle drop shadow + border */}
      <div className="rounded-2xl overflow-hidden bg-white shadow-2xl border border-gray-200">
        {/* Browser chrome */}
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-3 h-7 bg-white rounded-md border border-gray-200 flex items-center px-3 text-[11px] text-gray-500 font-semibold">
            attenda.app/staff · Best Western Miami Airport
          </div>
        </div>
        {/* Top stats bar */}
        <div className="px-5 py-4 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-bold text-gray-900 uppercase tracking-wide">This week</div>
            <div className="text-[10px] font-bold text-gray-500">May 27 – Jun 2</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">Occupancy</div>
              <div className="text-[18px] font-black text-gray-900" style={{ color: '#0D9488' }}>87%</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">Open jobs</div>
              <div className="text-[18px] font-black text-gray-900">12</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">In progress</div>
              <div className="text-[18px] font-black text-gray-900">5</div>
            </div>
          </div>
        </div>
        {/* Occupancy chart */}
        <div className="px-5 py-3 bg-white border-b border-gray-100">
          <div className="grid grid-cols-7 gap-2 h-12">
            {days.map((d, i) => (
              <div key={i} className="flex flex-col items-center justify-end">
                <div
                  className="w-full rounded-t"
                  style={{ height: `${occupancy[i] * 100}%`, backgroundColor: '#0D9488', opacity: 0.7 }}
                />
                <div className="text-[9px] font-bold text-gray-500 mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Room grid */}
        <div className="px-5 py-4 bg-gray-50">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Room status</div>
          <div className="grid grid-cols-6 gap-2">
            {rooms.map((r) => {
              const colors = {
                occupied: { bg: 'bg-teal-100', text: 'text-teal-800' },
                clean: { bg: 'bg-green-100', text: 'text-green-800' },
                dirty: { bg: 'bg-amber-100', text: 'text-amber-800' },
              }[r.status as 'occupied' | 'clean' | 'dirty'];
              return (
                <div key={r.num} className={`${colors.bg} ${colors.text} rounded p-1.5 text-center`}>
                  <div className="text-[10px] font-black">{r.num}</div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Activity feed */}
        <div className="px-5 py-3 bg-white border-t border-gray-100">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Recent activity</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#0D9488' }} />
              <span className="text-gray-600">Room 204 — Extra pillows</span>
              <span className="text-gray-400 ml-auto">9:42 AM</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-gray-600">Room 207 — Towels</span>
              <span className="text-gray-400 ml-auto">9:38 AM</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-gray-600">Vendor: Linen Co restock</span>
              <span className="text-gray-400 ml-auto">9:15 AM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── KPI tile dark (Proven Results strip) ────────────────────── */

function KpiTileDark({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-gray-700 rounded-2xl p-6">
      <div className="text-[44px] md:text-[56px] font-black leading-none mb-3 tracking-tight" style={{ color: TEAL }}>
        {value}
      </div>
      <div className="text-[13px] text-gray-300 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

/* ── Role-based Mockups ───────────────────────────────────── */

/* PhoneGuestMockup — Phone frame showing a QR code + guest chat */
function PhoneGuestMockup() {
  const [qrOrApp, setQrOrApp] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setQrOrApp(v => !v), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative mx-auto w-[200px]">
      {/* Phone frame */}
      <div className="bg-black rounded-[28px] p-2 shadow-xl">
        <div className="bg-white rounded-[24px] overflow-hidden">
          {qrOrApp ? (
            /* QR code screen */
            <div className="h-[400px] flex flex-col items-center justify-center p-6 bg-white">
              <div className="w-32 h-32 mb-4 relative">
                {/* QR code pattern */}
                <div className="absolute inset-0 border-4 border-black rounded-sm" />
                <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-black" />
                <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-black" />
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-black" />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-black" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-sm bg-black" />
                </div>
                <div className="absolute top-[40%] left-[25%] w-2 h-2 bg-black rounded-sm" />
                <div className="absolute top-[60%] left-[55%] w-3 h-3 bg-black rounded-sm" />
                <div className="absolute top-[30%] left-[65%] w-2 h-2 bg-black rounded-sm" />
                <div className="absolute top-[70%] left-[35%] w-2 h-2 bg-black rounded-sm" />
              </div>
              <p className="text-[14px] font-black text-gray-900">Room 204</p>
              <p className="text-[10px] text-gray-500">Scan to open · No app needed</p>
            </div>
          ) : (
            /* Chat app screen */
            <div className="h-[400px] flex flex-col">
              <div className="bg-teal-600 px-4 py-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-white text-[8px] font-bold">A</div>
                <div className="text-white text-[12px] font-bold flex-1">Attenda</div>
              </div>
              <div className="flex-1 bg-gray-50 p-3 space-y-2 overflow-hidden">
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-3 py-2 text-[10px] max-w-[75%] shadow-sm">
                    Welcome! How can I help?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-teal-600 rounded-2xl rounded-br-md px-3 py-2 text-[10px] text-white max-w-[70%]">
                    Request towels please
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
                    <p className="text-[10px] mb-1">I&apos;ll send a towel request. Confirm?</p>
                    <div className="flex gap-1">
                      <div className="flex-1 text-center py-1 rounded bg-teal-600 text-white text-[8px] font-bold">Send</div>
                      <div className="flex-1 text-center py-1 rounded bg-gray-200 text-gray-700 text-[8px] font-bold">Cancel</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-teal-600 rounded-2xl rounded-br-md px-3 py-2 text-[10px] text-white max-w-[60%]">
                    Yes, send
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-green-50 border border-green-200 rounded-2xl rounded-bl-md px-3 py-2 text-[10px]">
                    <span className="font-bold text-green-700">✓ Request sent</span>
                    <span className="text-gray-500"> · ETA 7m</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 px-3 py-2 flex items-center gap-2">
                <div className="flex-1 h-7 rounded-full bg-gray-100 border border-gray-200" />
                <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Badge */}
      <div className="absolute -top-2 -right-2 bg-teal-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-md">
        QR → Chat
      </div>
    </div>
  );
}

/* StaffDashboardMockup — Browser frame showing staff dashboard with checklists */
function StaffDashboardMockup() {
  return (
    <div className="w-full max-w-[320px] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Browser chrome */}
      <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 h-5 bg-white rounded border border-gray-200 flex items-center px-2 text-[8px] text-gray-500 font-semibold">
          attenda.app/staff
        </div>
      </div>
      {/* App header */}
      <div className="bg-teal-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-white text-[10px] font-black">A</div>
          <span className="text-white text-[13px] font-bold">Dashboard</span>
        </div>
        <div className="text-white/70 text-[10px]">👤 Staff</div>
      </div>
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Pending', value: '2' },
            { label: 'Active', value: '1' },
            { label: 'Done', value: '14' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-[18px] font-black text-gray-900">{s.value}</div>
              <div className="text-[9px] text-gray-500 font-bold uppercase">{s.label}</div>
            </div>
          ))}
        </div>
        {/* Checklist card */}
        <div className="border border-gray-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-gray-900">🧹 Housekeeping</span>
            <span className="text-[9px] text-gray-500">3/5 done</span>
          </div>
          <div className="bg-gray-100 rounded-full h-1.5 mb-2">
            <div className="h-1.5 rounded-full bg-teal-600" style={{ width: '60%' }} />
          </div>
          <div className="space-y-1">
            {[
              { label: 'Restock mini bar', done: true },
              { label: 'Change linens', done: true },
              { label: 'Vacuum floor', done: true },
              { label: 'Wipe surfaces', done: false },
              { label: 'Check amenities', done: false },
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-2 py-0.5">
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${item.done ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}`}>
                  {item.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span className={`text-[10px] ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Next shift info */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5">
          <div>
            <div className="text-[10px] font-bold text-gray-900">Next shift: 2pm</div>
            <div className="text-[9px] text-gray-500">Front Desk · Room 312 checkout</div>
          </div>
          <div className="text-[8px] font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded-full">View schedules</div>
        </div>
      </div>
    </div>
  );
}

/* GmDashboardMockup — Browser frame showing KPI dashboard */
function GmDashboardMockup() {
  return (
    <div className="w-full max-w-[320px] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 h-5 bg-white rounded border border-gray-200 flex items-center px-2 text-[8px] text-gray-500 font-semibold">
          gm.attenda.app
        </div>
      </div>
      <div className="p-4 space-y-3">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'RevPAR', value: '$142', color: '#0D9488' },
            { label: 'Occ', value: '87%', color: '#3B82F6' },
            { label: 'Resp', value: '7m', color: '#8B5CF6' },
            { label: 'Rev', value: '$16K', color: '#F59E0B' },
          ].map((kpi, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-[16px] font-black" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-[7px] text-gray-500 font-bold uppercase tracking-wider">{kpi.label}</div>
            </div>
          ))}
        </div>
        {/* Revenue chart */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-900">Revenue · 4 months</span>
            <span className="text-[8px] text-gray-500">Feb → May</span>
          </div>
          <div className="grid grid-cols-4 gap-2 h-12 items-end">
            {[45, 62, 78, 100].map((v, i) => (
              <div key={i} className="flex flex-col items-center justify-end">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{ height: `${v}%`, backgroundColor: '#0D9488', opacity: 0.5 + i * 0.15 }}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {['Feb', 'Mar', 'Apr', 'May'].map((m, i) => (
              <div key={i} className="text-[7px] font-bold text-gray-500 text-center">{m}</div>
            ))}
          </div>
        </div>
        {/* Live feed */}
        <div className="space-y-1.5">
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Live feed</div>
          {[
            { text: 'Room 204 towels delivered', time: '12s', color: 'bg-green-500' },
            { text: 'Shuttle booked 9:30 AM', time: '2m', color: 'bg-blue-500' },
            { text: 'Vendor: Linen Co. accepted', time: '4m', color: 'bg-purple-500' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
              <span className="text-gray-700 flex-1">{item.text}</span>
              <span className="text-gray-400">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* PartnerPortalMockup — Browser frame showing vendor portal */
function PartnerPortalMockup() {
  return (
    <div className="w-full max-w-[320px] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 h-5 bg-white rounded border border-gray-200 flex items-center px-2 text-[8px] text-gray-500 font-semibold">
          vendor.attenda.app
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-gray-900">🍞 Linen Co.</span>
          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">3 open</span>
        </div>
        <div className="space-y-1.5">
          {[
            { item: '50 bath towels', value: '$120', status: 'In Progress' },
            { item: '100 hand towels', value: '$85', status: 'Open' },
            { item: '30 face cloths', value: '$45', status: 'Open' },
          ].map((job, i) => (
            <div key={i} className={`border rounded-lg p-2.5 ${job.status === 'In Progress' ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-gray-900">{job.item}</div>
                  <div className="text-[8px] text-gray-500 mt-0.5">{job.status === 'In Progress' ? '● In progress' : '○ Open'}</div>
                </div>
                <div className="text-[12px] font-black text-gray-900">{job.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center text-[8px] text-gray-500 pt-2 border-t border-gray-100">
          Auto-invoice · No phone tag
        </div>
      </div>
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
          placeholder="Best Western Miami Airport"
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
