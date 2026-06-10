'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Bell, Bus, CheckCircle, Globe, MapPin, Phone, ShieldCheck, User, Utensils } from 'lucide-react';
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
    setPendingTarget(sheet);
    setModalOpen(true);
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
        <button onClick={() => handleClick('message')} className="flex items-center gap-2 shrink-0">
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
/*  Attenda Landing Page — 2026 State-of-the-Art Design        */
/* ──────────────────────────────────────────────────────────── */

const TEAL = '#0D9488';
const DARK = '#060F0D';

function AttendaLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const enrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased overflow-x-hidden">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes marquee { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        @keyframes float { 0%,100% { transform:translateY(0px) rotate(-1deg); } 50% { transform:translateY(-10px) rotate(-1deg); } }
        @keyframes float2 { 0%,100% { transform:translateY(0px) rotate(1.5deg); } 50% { transform:translateY(-12px) rotate(1.5deg); } }
        @keyframes float3 { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-6px); } }
        @keyframes gradientShift { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
        .au-fade-up  { animation: fadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .au-fade-up-1{ animation: fadeUp 0.65s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .au-fade-up-2{ animation: fadeUp 0.65s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        .au-fade-up-3{ animation: fadeUp 0.65s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .au-fade-up-4{ animation: fadeUp 0.65s cubic-bezier(0.22,1,0.36,1) 0.45s both; }
        .au-marquee  { animation: marquee 28s linear infinite; }
        .au-float    { animation: float  5s ease-in-out infinite; }
        .au-float2   { animation: float2 6s ease-in-out infinite; }
        .au-float3   { animation: float3 4s ease-in-out infinite; }
        .au-grad-text{
          background: linear-gradient(135deg, #2DD4BF 0%, #0D9488 40%, #2DD4BF 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s ease infinite;
        }
        .au-glow-border { box-shadow: 0 0 0 1px rgba(13,148,136,0.25), 0 4px 24px rgba(13,148,136,0.08); }
        .au-card-hover { transition: transform 0.22s ease, box-shadow 0.22s ease; }
        .au-card-hover:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(0,0,0,0.13); }
        .au-dark-section { background: linear-gradient(170deg, #050D0B 0%, #091410 60%, #060F0D 100%); }
        .au-noise::after {
          content:''; position:absolute; inset:0;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events:none; z-index:0;
        }
        .au-hero-glow {
          background: radial-gradient(ellipse 80% 55% at 50% 10%, rgba(13,148,136,0.22) 0%, transparent 70%);
        }
        .au-bento-glass {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(12px);
          transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .au-bento-glass:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(13,148,136,0.35);
          box-shadow: 0 0 32px rgba(13,148,136,0.07);
        }
        .au-pill {
          background: rgba(13,148,136,0.12);
          border: 1px solid rgba(13,148,136,0.25);
          color: #2DD4BF;
        }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/96 backdrop-blur-xl border-b border-gray-100 shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md" style={{ background: TEAL }}>
              <span className="text-white font-black text-[14px] tracking-tight">A</span>
            </div>
            <span className={`font-bold text-[17px] tracking-tight transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>attenda</span>
          </a>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-7">
            {[['#modules','Software'],['#case-study','Case Study'],['#demo','Resources']].map(([h,l])=>(
              <a key={h} href={h} className={`text-[14px] font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/65 hover:text-white'}`}>{l}</a>
            ))}
            <a href="/staff" className={`text-[14px] font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/65 hover:text-white'}`}>Log in</a>
            <button onClick={() => scrollTo(enrollRef)}
              className="px-5 py-2.5 rounded-xl text-white text-[13px] font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
              style={{ background: TEAL }}>
              Get a Demo
            </button>
          </div>

          {/* Mobile controls */}
          <div className="md:hidden flex items-center gap-2.5">
            <button onClick={() => scrollTo(enrollRef)} className="px-4 py-2 rounded-lg text-white text-[12px] font-bold" style={{ background: TEAL }}>Demo</button>
            <button onClick={() => setMobileNavOpen(o => !o)} className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}>
              {mobileNavOpen
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              }
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileNavOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 px-5 py-3 space-y-0.5 shadow-lg">
            {[['#modules','Software'],['#case-study','Case Study'],['#demo','Schedule a Demo'],['/staff','Staff Login'],['/partner','Partner Login']].map(([h,l])=>(
              <a key={h} href={h} onClick={() => setMobileNavOpen(false)}
                className="flex items-center py-3 text-[15px] font-medium text-gray-700 hover:text-gray-900 border-b border-gray-50 last:border-0">
                {l}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative au-dark-section au-noise overflow-hidden" style={{ minHeight: '100svh' }}>
        <div className="au-hero-glow absolute inset-0 pointer-events-none" />
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />

        <div className="relative z-10 max-w-6xl mx-auto px-5 pt-32 pb-12 text-center">
          {/* Badge */}
          <div className="au-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full au-pill mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] font-semibold tracking-wide">Live on 40+ independent properties · FL &amp; TX</span>
          </div>

          {/* Headline */}
          <h1 className="au-fade-up-1 text-[52px] md:text-[80px] lg:text-[100px] font-black leading-[0.92] tracking-tight text-white mb-7">
            One Thread.<br />
            <span className="au-grad-text">Built for Hotels.</span>
          </h1>

          {/* Sub */}
          <p className="au-fade-up-2 text-[18px] md:text-[20px] text-white/55 leading-relaxed max-w-2xl mx-auto mb-10">
            Attenda connects every guest request, staff task, vendor job, and GM dashboard into a single thread — so independent hotels run leaner, serve faster, and capture more revenue.
          </p>

          {/* CTAs */}
          <div className="au-fade-up-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => scrollTo(enrollRef)}
              className="group flex items-center gap-2.5 px-8 py-4 rounded-xl text-white font-bold text-[16px] shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all"
              style={{ background: `linear-gradient(135deg, ${TEAL} 0%, #0b8078 100%)` }}>
              Schedule a Demo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <a href="#modules" className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-[16px] border border-white/12 text-white/70 hover:border-white/25 hover:text-white transition-all">
              See it in action
            </a>
          </div>
          <p className="au-fade-up-4 text-[12px] text-white/30 mt-5">15-minute call · No slide deck · No commitment</p>
        </div>

        {/* Device mockups */}
        <div className="au-fade-up-4 relative z-10 max-w-5xl mx-auto px-5 pb-0">
          <HeroDevices />
        </div>

        {/* Bottom fade to white */}
        <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 0%, #ffffff 100%)' }} />
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────── */}
      <section className="py-4 bg-white border-b border-gray-100 overflow-hidden">
        <p className="text-center text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400 mb-3">Trusted by independent properties</p>
        <div className="flex overflow-hidden">
          <div className="au-marquee flex items-center gap-12 whitespace-nowrap">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-12">
                {['Boutique 42 · PortMiami', 'Inn 28 · Key West', 'Suites 56 · Tampa', 'Lodge 18 · Naples', 'Resort 92 · Orlando', 'Coastal 34 · Sarasota', 'Harbor Inn · Fort Lauderdale', 'Bay View 67 · Clearwater'].map((name, j) => (
                  <span key={j} className="text-[13px] font-semibold text-gray-400 shrink-0">{name}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENTO — Four roles ───────────────────────────────── */}
      <section id="modules" className="py-24 md:py-32 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: TEAL }}>One Platform · Four Perspectives</p>
            <h2 className="text-[38px] md:text-[56px] font-black tracking-tight text-gray-900 leading-[1.03]">
              Every role. Every shift.<br />
              <span style={{ color: TEAL }}>One thread.</span>
            </h2>
          </div>
          <RoleBento />
        </div>
      </section>

      {/* ── ONE THREAD SECTION ───────────────────────────────── */}
      <section className="py-24 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: TEAL }}>How it works</p>
              <h2 className="text-[36px] md:text-[46px] font-black tracking-tight text-gray-900 leading-[1.05] mb-5">
                The guest asks.<br />The staff handles.<br />
                <span style={{ color: TEAL }}>The GM sees it all.</span>
              </h2>
              <p className="text-[17px] text-gray-500 leading-relaxed mb-7">
                Every request, every job, every handoff lives on one thread. Your PMS stays. Your staff stays. Your vendors stay. You just get a clear view of every room, every shift, every dollar — in real time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => scrollTo(enrollRef)}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-[15px] text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                  style={{ background: TEAL }}>
                  Schedule a Demo
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm au-card-hover">
              <FlowExample />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS — Dark section ─────────────────────────────── */}
      <section className="relative py-24 px-5 au-dark-section au-noise overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(13,148,136,0.1) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[12px] font-bold tracking-[0.18em] uppercase text-white/40 mb-3">Proven Results</p>
            <h2 className="text-[32px] md:text-[44px] font-black text-white">The bottom line: it works.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { value: '73%', label: 'Faster guest response' },
              { value: '4→1', label: 'Tools replaced' },
              { value: '11', label: 'Days to go live' },
              { value: '0', label: 'Apps for guests' },
            ].map((stat, i) => (
              <div key={i} className="au-bento-glass rounded-2xl p-6 md:p-8 text-center">
                <div className="text-[44px] md:text-[60px] font-black leading-none mb-2 au-grad-text">{stat.value}</div>
                <div className="text-[12px] text-white/45 uppercase tracking-wider font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVENUE CASE STUDY ───────────────────────────────── */}
      <section id="case-study" className="py-24 md:py-32 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: TEAL }}>One Property · One Number</p>
            <h2 className="text-[36px] md:text-[52px] font-black tracking-tight text-gray-900 leading-[1.03]">
              121 rooms. 4 months.<br />
              <span style={{ color: TEAL }}>$16,247 attributed.</span>
            </h2>
            <p className="text-[16px] md:text-[18px] text-gray-500 max-w-xl mx-auto mt-4">
              No projections. No &ldquo;average property&rdquo;. One boutique hotel, one figure, attributable to Attenda.
            </p>
          </div>
          <RevenueCard />
          <p className="text-center text-[13px] text-gray-400 mt-8 max-w-xl mx-auto">
            <span className="font-semibold text-gray-600">One property, one number.</span> We&apos;re not going to tell you your property will do the same — we&apos;ll show you what we did for one and let you decide if the math holds.
          </p>
        </div>
      </section>

      {/* ── TESTIMONIAL ──────────────────────────────────────── */}
      <section className="py-20 px-5 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-1 mb-6">
            {[...Array(5)].map((_,i) => (
              <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill={TEAL}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            ))}
          </div>
          <blockquote className="text-[22px] md:text-[28px] font-black text-gray-900 leading-tight mb-6">
            &ldquo;One thread. Every room knew what was happening — us, the staff, the vendors. Nobody was guessing. We onboarded in 11 days and the front desk started capturing revenue we used to walk past.&rdquo;
          </blockquote>
          <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-5 py-3 border border-gray-200 shadow-sm">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-black" style={{ background: TEAL }}>GM</div>
            <div className="text-left">
              <div className="text-[14px] font-bold text-gray-900">General Manager</div>
              <div className="text-[12px] text-gray-500">42-room boutique · PortMiami, Florida</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-24 px-5 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: TEAL }}>Common questions</p>
            <h2 className="text-[34px] font-black tracking-tight text-gray-900">Real questions from real GMs.</h2>
          </div>
          <div className="space-y-2">
            {[
              { q: 'What does Attenda include?', a: 'Guest experience (QR code check-in, chat, requests), Staff dashboard with checklists and schedules, GM KPIs and revenue tracking, Partner portal for vendors and restaurants — all on one thread.' },
              { q: 'Does the guest need to download an app?', a: 'No. They scan a QR code in the room — it opens a mobile web app in their browser. Zero friction, zero installs.' },
              { q: 'How are vendors onboarded?', a: 'Each vendor gets a lightweight web portal link. They see open jobs, accept, and update status — no app, no training.' },
              { q: 'What about my existing PMS?', a: 'Attenda runs alongside your current PMS from day one. No rip-and-replace, no migration, no downtime.' },
              { q: 'How long does setup take?', a: '11 days from contract to live. We handle QR design, branding, and staff training.' },
              { q: 'What does Attenda cost?', a: "Per-room, tiered by property size. We'll give you an exact number on the demo call — no hidden fees, no surprises." },
            ].map((item, i) => (
              <button key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className={`w-full text-left rounded-2xl px-6 py-5 border transition-all ${openFaq === i ? 'bg-white border-gray-200 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-[15px] text-gray-900">{item.q}</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${openFaq === i ? 'rotate-45' : ''}`}
                    style={{ background: openFaq === i ? `${TEAL}15` : '#F3F4F6', border: `1px solid ${openFaq === i ? TEAL : '#E5E7EB'}` }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={openFaq === i ? TEAL : '#9CA3AF'} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                </div>
                {openFaq === i && <p className="mt-3 text-[14px] text-gray-500 leading-relaxed">{item.a}</p>}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO FORM ────────────────────────────────────────── */}
      <section id="demo" ref={enrollRef} className="py-24 px-5 bg-gray-50">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: TEAL }}>Schedule a Demo</p>
            <h2 className="text-[36px] md:text-[44px] font-black tracking-tight text-gray-900 mb-3">See Attenda on<br />your property.</h2>
            <p className="text-[16px] text-gray-500">15 minutes. Every role. Your rooms — no slide deck, no commitment.</p>
          </div>
          <EnrollForm />
        </div>
      </section>

      {/* ── FIELD NOTES ─────────────────────────────────────── */}
      <section className="py-24 md:py-32 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: TEAL }}>Field Notes · For Independent Operators</p>
            <h2 className="text-[36px] md:text-[48px] font-black tracking-tight text-gray-900 leading-[1.03]">Six problems every operator faces.</h2>
            <p className="text-[16px] text-gray-500 max-w-xl mx-auto mt-3">No fake authors. No invented quotes. Written by Alejandro from 15 years on the front desk.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { num:'01', cat:'Operations',  cc:'#3B82F6', title:'The 12-questions-a-day front desk problem',         body:'Towels. WiFi. Late checkout. Parking. The same six questions, twice each, every shift. Why QR codes close the gap.',                                          t:'5 min' },
              { num:'02', cat:'Revenue',     cc:TEAL,      title:'Cruise-day shuttle: the $7,820 line item',          body:'How a 121-room boutique captured $7,820 in four months from cruise-day shuttle bookings — the math, the UI, the cruise calendar.',                        t:'7 min' },
              { num:'03', cat:'Housekeeping',cc:'#8B5CF6', title:'Why we killed the 4-system housekeeping stack',     body:'Housekeeping in one app. Front desk in another. GM in a third. Guest requests in a fourth. The day the team stopped using three of them.',                 t:'6 min' },
              { num:'04', cat:'Owner',       cc:'#F59E0B', title:'The "AI will transform hospitality" trap',          body:'Three pitches, three contracts, three dashboards no one opened. What the sales deck doesn\'t show you.',                                                  t:'8 min' },
              { num:'05', cat:'Industry',    cc:'#6B7280', title:'The ops stack gap: chains vs. independents',        body:'Chains can afford 8-figure PMS systems. Independents can\'t. The six tools an independent property actually needs to compete.',                            t:'9 min' },
              { num:'06', cat:'Reviews',     cc:'#10B981', title:'From 3.8 to 4.7 stars: a six-month turnaround',    body:'The problem was never the rooms. It was the gap between "I need towels" and "towels arrived." The fix, the timeline, the metric to watch.',              t:'5 min' },
            ].map((topic, i) => (
              <div key={i} className="group bg-white border border-gray-200 rounded-2xl p-6 flex flex-col relative overflow-hidden au-card-hover cursor-pointer hover:border-gray-300 hover:shadow-xl transition-all"
                onClick={() => scrollTo(enrollRef)}>
                <div className="absolute top-4 right-5 text-[52px] font-black text-gray-100 leading-none pointer-events-none select-none">{topic.num}</div>
                <div className="flex items-center justify-between mb-4 relative">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-white" style={{ background: topic.cc }}>{topic.cat}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">{topic.t}</span>
                </div>
                <h3 className="text-[17px] font-black text-gray-900 mb-2 leading-tight relative">{topic.title}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed flex-1 relative mb-4">{topic.body}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">By Alejandro Soria</span>
                  <span className="text-[11px] font-bold flex items-center gap-1 opacity-60" style={{ color: TEAL }}>
                    Coming soon
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDER ──────────────────────────────────────────── */}
      <section className="py-24 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden au-card-hover">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              <div className="bg-gray-50 p-10 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-200">
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-[28px] font-black mb-4 shadow-lg" style={{ background: TEAL }}>AS</div>
                <div className="text-[19px] font-black text-gray-900">Alejandro Soria</div>
                <div className="text-[13px] text-gray-500 font-semibold mt-1">Founder · Attenda</div>
                <div className="mt-4 flex gap-2">
                  <a href="mailto:alejandro@attendaapp.com" className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </a>
                </div>
              </div>
              <div className="md:col-span-2 p-8 md:p-10">
                <p className="text-[11px] uppercase tracking-[0.18em] font-bold mb-4" style={{ color: TEAL }}>Built by a 15-year operator</p>
                <p className="text-[16px] text-gray-600 leading-relaxed mb-4">Alejandro Soria has spent fifteen years inside hospitality — front desk, GM, owner-operator of independent properties in Texas and Florida. He&apos;s bought three PMS systems, integrated two CRMs, and beta-tested four &ldquo;AI will transform hospitality&rdquo; platforms. Watched every one fail at the same point: the gap between the demo and the front desk.</p>
                <blockquote className="border-l-4 pl-4 py-1 mb-6" style={{ borderColor: TEAL }}>
                  <p className="text-[16px] font-bold text-gray-900 italic leading-snug">&ldquo;Attenda is the tool I wished had existed in year one of my hospitality career — and the one I use in year fifteen.&rdquo;</p>
                </blockquote>
                <div className="grid grid-cols-3 gap-3">
                  {[['15+ years','In hospitality'],['TX & FL','Properties run'],['3 PMS · 4 AI','Tools burned through']].map(([v,l],i)=>(
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[14px] font-black text-gray-900">{v}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA — dark ─────────────────────────────────── */}
      <section className="relative py-24 px-5 au-dark-section au-noise overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle 600px at 50% 50%, rgba(13,148,136,0.12) 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-[36px] md:text-[56px] font-black text-white leading-tight mb-4">
            See the Attenda system<br />
            <span className="au-grad-text">on your property.</span>
          </h2>
          <p className="text-[17px] text-white/45 mb-8 max-w-lg mx-auto">15 minutes. Every role. Your rooms. No slide deck, no commitment.</p>
          <button onClick={() => scrollTo(enrollRef)}
            className="inline-flex items-center gap-2.5 px-9 py-4 rounded-xl font-bold text-[16px] text-white shadow-xl hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: `linear-gradient(135deg, ${TEAL} 0%, #0b8078 100%)` }}>
            Schedule a Demo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="py-16 px-5 border-t border-gray-900/50" style={{ background: '#080F0D' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: TEAL }}>
                  <span className="text-white font-black text-[13px]">A</span>
                </div>
                <span className="font-bold text-white text-[16px]">attenda</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: '#4B7A74' }}>The operations platform for independent hotels.</p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: '#4B7A74' }}>Software</h4>
              <ul className="space-y-2.5">
                {['Guest Requests','Staff Dashboard','Vendor Portal','GM Dashboard','Shuttle & Transport'].map((item,i)=>(
                  <li key={i}><a href="#modules" className="text-[13px] hover:text-white transition-colors" style={{ color: '#6B9E97' }}>{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: '#4B7A74' }}>Company</h4>
              <ul className="space-y-2.5">
                {[['#case-study','Case Study'],['/staff','Staff Login'],['/partner','Partner Login'],['mailto:thrilznetwork@gmail.com','Contact'],['/privacy','Privacy'],['/terms','Terms']].map(([h,l],i)=>(
                  <li key={i}><a href={h} className="text-[13px] hover:text-white transition-colors" style={{ color: '#6B9E97' }}>{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: '#4B7A74' }}>Contact</h4>
              <ul className="space-y-2.5">
                <li className="text-[13px]" style={{ color: '#6B9E97' }}>thrilznetwork@gmail.com</li>
                <li className="text-[13px]" style={{ color: '#6B9E97' }}>Miami, FL</li>
              </ul>
              <button onClick={() => scrollTo(enrollRef)}
                className="mt-4 px-4 py-2 rounded-lg text-white text-[12px] font-bold transition-opacity hover:opacity-80"
                style={{ background: TEAL }}>
                Get a Demo
              </button>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: '#0D1F1C' }}>
            <div className="text-[12px]" style={{ color: '#4B7A74' }}>© 2026 Attenda. All rights reserved.</div>
            <a href="/superadmin" className="text-[10px] transition-colors hover:opacity-60" style={{ color: '#2D5550' }}>Platform Admin</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── HeroDevices — three floating device mockups ─────────────── */
function HeroDevices() {
  return (
    <div className="relative w-full flex items-end justify-center gap-4 md:gap-6 pb-0" style={{ height: '340px' }}>
      {/* Left — phone (guest app) */}
      <div className="au-float shrink-0 relative" style={{ zIndex: 1 }}>
        <div className="w-[130px] md:w-[155px] rounded-[24px] border-[7px] border-gray-800 bg-gray-900 overflow-hidden shadow-2xl" style={{ height: '280px' }}>
          <div className="h-full rounded-[18px] overflow-hidden bg-[#F5F5F5] flex flex-col">
            <div className="bg-white px-3 py-2 flex items-center gap-1.5 border-b border-gray-100">
              <div className="w-4 h-4 rounded-full border border-gray-200 flex items-center justify-center"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></div>
              <div className="flex-1"><div className="text-[9px] font-bold text-black">Front Desk</div><div className="text-[7px] text-green-500">● Online</div></div>
            </div>
            <div className="flex-1 px-2 py-2 space-y-1.5 overflow-hidden">
              <div className="flex justify-start"><div className="bg-white border border-gray-100 rounded-xl rounded-bl-sm px-2.5 py-1.5 text-[8px] text-gray-700 shadow-sm max-w-[85%]">Hello! How can I help you today?</div></div>
              <div className="flex justify-end"><div className="rounded-xl rounded-br-sm px-2.5 py-1.5 text-[8px] text-white max-w-[70%]" style={{ background: '#0D9488' }}>Extra towels please</div></div>
              <div className="flex justify-start"><div className="bg-white border border-gray-100 rounded-xl rounded-bl-sm px-2.5 py-2 shadow-sm max-w-[90%]">
                <p className="text-[8px] text-gray-700 mb-1.5">I&apos;ll send that to housekeeping. Confirm?</p>
                <div className="flex gap-1"><div className="flex-1 py-1 rounded-md text-white text-[7px] font-bold text-center" style={{ background: '#0D9488' }}>Yes</div><div className="flex-1 py-1 rounded-md bg-gray-100 text-gray-600 text-[7px] font-bold text-center">No</div></div>
              </div></div>
              <div className="flex justify-start"><div className="bg-green-50 border border-green-200 rounded-xl rounded-bl-sm px-2.5 py-1.5 text-[8px] shadow-sm"><span className="font-bold text-green-700">✓ Sent</span><span className="text-gray-500"> · ETA 7m</span></div></div>
            </div>
            <div className="border-t border-gray-100 px-2 py-1.5 flex items-center gap-1.5 bg-white">
              <div className="flex-1 h-6 rounded-full bg-gray-50 border border-gray-200 text-[8px] text-gray-400 px-2 flex items-center">Message...</div>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#0D9488' }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>
            </div>
          </div>
        </div>
        <div className="mt-2 text-center text-[9px] font-bold tracking-widest uppercase text-white/40">Guest</div>
      </div>

      {/* Center — tablet (staff dashboard, raised) */}
      <div className="au-float2 shrink-0 relative -mb-4" style={{ zIndex: 2 }}>
        <div className="w-[220px] md:w-[270px] rounded-[18px] border-[7px] border-gray-800 bg-gray-900 overflow-hidden shadow-2xl" style={{ height: '310px' }}>
          <div className="h-full rounded-[12px] overflow-hidden bg-white flex flex-col">
            <div className="bg-[#0D9488] px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-white text-[8px] font-black">A</div><span className="text-white text-[10px] font-bold">Staff Dashboard</span></div>
              <span className="text-white/60 text-[8px]">Maria · HK</span>
            </div>
            <div className="p-3 flex-1 overflow-hidden">
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {[['2','Pending'],['1','Active'],['14','Done']].map(([v,l],i)=>(
                  <div key={i} className="bg-gray-50 rounded-lg p-1.5 text-center"><div className="text-[15px] font-black text-gray-900">{v}</div><div className="text-[7px] text-gray-500 font-bold uppercase">{l}</div></div>
                ))}
              </div>
              <div className="border border-gray-200 rounded-xl p-2.5 mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold text-gray-900">🧹 Housekeeping</span>
                  <span className="text-[7px] text-gray-500">3/5</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full mb-2"><div className="h-1 rounded-full" style={{ width: '60%', background: '#0D9488' }} /></div>
                {[['Restock mini bar',true],['Change linens',true],['Vacuum floor',true],['Wipe surfaces',false],['Check amenities',false]].map(([label,done],i)=>(
                  <div key={i} className="flex items-center gap-1.5 py-0.5">
                    <div className={`w-3 h-3 rounded flex items-center justify-center border ${done ? 'border-teal-500' : 'border-gray-300'}`} style={done?{background:'#0D9488'}:{}}>
                      {done && <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span className={`text-[8px] ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{label as string}</span>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 flex items-center justify-between">
                <div><div className="text-[8px] font-bold text-gray-900">Room 204 · Towels</div><div className="text-[7px] text-gray-500">2m ago · Unassigned</div></div>
                <div className="px-2 py-1 rounded text-[7px] font-bold text-white" style={{ background: '#0D9488' }}>Accept</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 text-center text-[9px] font-bold tracking-widest uppercase text-white/40">Staff</div>
      </div>

      {/* Right — desktop (GM dashboard) */}
      <div className="au-float3 shrink-0 relative" style={{ zIndex: 1 }}>
        <div className="w-[200px] md:w-[250px] rounded-[14px] border-[7px] border-gray-800 bg-gray-900 overflow-hidden shadow-2xl" style={{ height: '270px' }}>
          <div className="h-full rounded-[8px] overflow-hidden bg-white flex flex-col">
            <div className="bg-gray-50 border-b border-gray-200 px-2 py-1.5 flex items-center gap-1.5">
              <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-400"/><div className="w-2 h-2 rounded-full bg-yellow-400"/><div className="w-2 h-2 rounded-full bg-green-400"/></div>
              <div className="flex-1 h-4 bg-white rounded border border-gray-200 flex items-center px-1.5 text-[7px] text-gray-500">gm.attenda.app</div>
            </div>
            <div className="flex-1 flex">
              <div className="w-[60px] bg-gray-50 border-r border-gray-200 p-1.5">
                <div className="text-[6px] font-black text-gray-500 mb-1.5 uppercase tracking-wide">GM</div>
                {[['📊','Dash',false],['📋','Orders',true],['👥','Staff',false],['🚚','Vendors',false]].map(([ic,lb,act],i)=>(
                  <div key={i} className={`px-1 py-1 rounded text-[7px] font-bold flex items-center gap-1 mb-0.5 ${act ? 'text-white' : 'text-gray-600'}`} style={act?{background:'#0D9488'}:{}}>
                    <span>{ic as string}</span><span>{lb as string}</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 p-2">
                <div className="text-[9px] font-black text-gray-900 mb-1.5">Live Orders</div>
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {[['Open','3'],['Active','5'],['Avg','7m']].map(([l,v],i)=>(
                    <div key={i} className="bg-gray-50 rounded p-1 text-center"><div className="text-[10px] font-black text-gray-900">{v}</div><div className="text-[6px] text-gray-500 uppercase font-bold">{l}</div></div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {[['$142','RevPAR','#0D9488'],['87%','Occ','#3B82F6'],['7m','Resp','#8B5CF6'],['$16K','Rev','#F59E0B']].map(([v,l,c],i)=>(
                    <div key={i} className="bg-gray-50 rounded p-1 text-center"><div className="text-[9px] font-black" style={{color:c as string}}>{v}</div><div className="text-[6px] text-gray-500 uppercase">{l}</div></div>
                  ))}
                </div>
                <div className="space-y-1">
                  {[['Room 204 towels','12s','bg-green-500'],['Shuttle 9:30AM','2m','bg-blue-500'],['Linen Co. accepted','4m','bg-purple-500']].map(([t,tm,c],i)=>(
                    <div key={i} className="flex items-center gap-1 text-[8px]">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c}`}/>
                      <span className="text-gray-600 flex-1 truncate">{t}</span>
                      <span className="text-gray-400">{tm}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 text-center text-[9px] font-bold tracking-widest uppercase text-white/40">GM</div>
      </div>
    </div>
  );
}

/* ── RoleBento — 2×2 bento grid for 4 roles ─────────────────── */
function RoleBento() {
  const [active, setActive] = useState<'guest'|'staff'|'gm'|'partner'>('guest');

  const roles = [
    {
      key: 'guest' as const, emoji: '🧳', label: 'Guest', sub: 'in the room',
      headline: 'It starts with a QR code.', color: TEAL,
      points: ['No app to download — opens in browser','Name + room pre-filled from QR code','Orders towels, food, or shuttle in seconds','Real-time chat with front desk'],
      badge: 'Zero apps',
    },
    {
      key: 'staff' as const, emoji: '🛎️', label: 'Staff', sub: 'on shift',
      headline: 'One dashboard. Every tool.', color: '#3B82F6',
      points: ['Live stats: pending, active, avg response time','Checklists inline — start from the dashboard','Schedule grid with day-off requests','Accept, assign, mark done — PIN login'],
      badge: 'PIN login',
    },
    {
      key: 'gm' as const, emoji: '👔', label: 'GM', sub: 'on the dashboard',
      headline: 'Total visibility. One screen.', color: '#8B5CF6',
      points: ['RevPAR, occupancy, response times — live','Revenue attribution per channel','Staff & schedule management','Daily brief + property settings'],
      badge: 'Real-time',
    },
    {
      key: 'partner' as const, emoji: '🚚', label: 'Partner', sub: 'on delivery',
      headline: 'A portal, not a phone call.', color: '#F59E0B',
      points: ['See open jobs — linen, shuttle, maintenance','Accept, update, close in one tap','Restaurant orders + menu management','Auto-invoice · no phone tag'],
      badge: 'Auto-invoice',
    },
  ];

  const role = roles.find(r => r.key === active)!;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Role selector — left column */}
      <div className="lg:col-span-4 flex lg:flex-col gap-3">
        {roles.map(r => (
          <button key={r.key} onClick={() => setActive(r.key)}
            className={`flex-1 lg:flex-none text-left p-4 rounded-2xl border-2 transition-all ${
              active === r.key
                ? 'bg-white shadow-md scale-[1.01]'
                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}
            style={active === r.key ? { borderColor: r.color } : {}}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{r.emoji}</span>
              <div>
                <div className="text-[14px] font-black text-gray-900">{r.label}</div>
                <div className="text-[11px] text-gray-400">{r.sub}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel — right column */}
      <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 h-full">
          {/* Copy */}
          <div className="p-8 md:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-100">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4"
              style={{ background: `${role.color}15`, color: role.color }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: role.color }} />
              The {role.label.toLowerCase()} experience
            </div>
            <h3 className="text-[26px] md:text-[30px] font-black text-gray-900 mb-4 leading-tight">{role.headline}</h3>
            <div className="space-y-3 mb-6">
              {role.points.map((p, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${role.color}15` }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={role.color} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="text-[14px] text-gray-600 leading-snug">{p}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-gray-500">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{role.badge}</span>
            </div>
          </div>
          {/* Mini mockup */}
          <div className="p-8 md:p-10 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
            {active === 'guest'   && <RoleMockupGuest />}
            {active === 'staff'   && <RoleMockupStaff />}
            {active === 'gm'      && <RoleMockupGM />}
            {active === 'partner' && <RoleMockupPartner />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Role mockups */
function RoleMockupGuest() {
  return (
    <div className="w-full max-w-[200px] mx-auto">
      <div className="bg-black rounded-[24px] p-2 shadow-xl">
        <div className="bg-white rounded-[18px] overflow-hidden" style={{ height: '360px' }}>
          <div className="bg-[#0D9488] px-3 py-2 flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-white text-[8px] font-black">A</div>
            <span className="text-white text-[10px] font-bold flex-1">Attenda · Room 204</span>
          </div>
          <div className="flex-1 bg-gray-50 p-3 space-y-2" style={{ height: 'calc(100% - 88px)' }}>
            <div className="flex justify-start"><div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-2.5 py-1.5 text-[9px] max-w-[80%] shadow-sm">Welcome! How can I help?</div></div>
            <div className="flex justify-end"><div className="rounded-2xl rounded-br-sm px-2.5 py-1.5 text-[9px] text-white max-w-[70%]" style={{ background: '#0D9488' }}>Extra towels please</div></div>
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-2.5 py-2 shadow-sm max-w-[90%]">
                <p className="text-[9px] mb-1.5">Confirm towel request?</p>
                <div className="flex gap-1"><div className="flex-1 py-1 rounded-lg text-white text-[8px] font-bold text-center" style={{ background: '#0D9488' }}>Yes</div><div className="flex-1 py-1 rounded-lg bg-gray-100 text-gray-600 text-[8px] font-bold text-center">No</div></div>
              </div>
            </div>
            <div className="flex justify-start"><div className="bg-green-50 border border-green-200 rounded-2xl rounded-bl-sm px-2.5 py-1.5 text-[9px] shadow-sm"><span className="font-bold text-green-700">✓ Sent</span><span className="text-gray-500"> · ETA 7m</span></div></div>
          </div>
          <div className="border-t border-gray-100 px-2.5 py-2 flex items-center gap-1.5 bg-white">
            <div className="flex-1 h-7 rounded-full bg-gray-50 border border-gray-200 px-2 flex items-center text-[8px] text-gray-400">Message...</div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#0D9488' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleMockupStaff() {
  return (
    <div className="w-full max-w-[260px] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-[#0D9488] px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-white text-[9px] font-black">A</div><span className="text-white text-[11px] font-bold">Dashboard</span></div>
        <div className="text-white/70 text-[9px]">👤 Maria</div>
      </div>
      <div className="p-3 space-y-2.5">
        <div className="grid grid-cols-3 gap-1.5">
          {[['2','Pending'],['1','Active'],['14','Done']].map(([v,l],i)=>(
            <div key={i} className="bg-gray-50 rounded-lg p-2 text-center"><div className="text-[16px] font-black text-gray-900">{v}</div><div className="text-[8px] text-gray-500 uppercase font-bold">{l}</div></div>
          ))}
        </div>
        <div className="space-y-1.5">
          {[{r:'204',t:'Towels',s:'pending',u:true},{r:'318',t:'Pillows',s:'active',u:false},{r:'412',t:'A/C fix',s:'active',u:false}].map((req,i)=>(
            <div key={i} className={`border rounded-xl p-2.5 ${req.u ? 'border-l-4' : 'border-gray-200'}`} style={req.u?{borderLeftColor:'#0D9488'}:{}}>
              <div className="flex items-center justify-between">
                <div><div className="text-[9px] font-bold text-gray-900">Room {req.r} · {req.t}</div><div className="text-[7px] text-gray-500">Just now</div></div>
                <div className={`px-1.5 py-0.5 rounded text-[7px] font-bold ${req.s==='pending'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>{req.s==='pending'?'Pending':'Active'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleMockupGM() {
  return (
    <div className="w-full max-w-[260px] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-1.5">
        <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-400"/><div className="w-2 h-2 rounded-full bg-yellow-400"/><div className="w-2 h-2 rounded-full bg-green-400"/></div>
        <div className="flex-1 h-5 bg-white rounded border border-gray-200 flex items-center px-2 text-[8px] text-gray-500">gm.attenda.app</div>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          {[['$142','RevPAR','#0D9488'],['87%','Occ','#3B82F6'],['7m','Resp','#8B5CF6'],['$16K','Rev','#F59E0B']].map(([v,l,c],i)=>(
            <div key={i} className="bg-gray-50 rounded-lg p-1.5 text-center"><div className="text-[12px] font-black" style={{color:c as string}}>{v}</div><div className="text-[7px] text-gray-500 uppercase font-bold tracking-wide">{l}</div></div>
          ))}
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5">
          <div className="flex items-center justify-between mb-2"><span className="text-[9px] font-bold text-gray-900">Revenue · 4 months</span><span className="text-[8px] text-gray-500">Feb→May</span></div>
          <div className="grid grid-cols-4 gap-1.5 h-12 items-end">
            {[45,62,78,100].map((v,i)=>(
              <div key={i} className="flex flex-col items-center justify-end h-full">
                <div className="w-full rounded-t" style={{ height:`${v}%`, background:'#0D9488', opacity: 0.5 + i * 0.15 }} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1 mt-1">{['Feb','Mar','Apr','May'].map((m,i)=><div key={i} className="text-[7px] text-gray-500 text-center font-bold">{m}</div>)}</div>
        </div>
        <div className="space-y-1.5">
          {[['Room 204 delivered','12s','bg-green-500'],['Shuttle booked','2m','bg-blue-500'],['Linen Co. accepted','4m','bg-purple-500']].map(([t,tm,c],i)=>(
            <div key={i} className="flex items-center gap-1.5 text-[9px]"><div className={`w-1.5 h-1.5 rounded-full ${c}`}/><span className="text-gray-600 flex-1">{t}</span><span className="text-gray-400">{tm}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleMockupPartner() {
  return (
    <div className="w-full max-w-[260px] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-1.5">
        <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-400"/><div className="w-2 h-2 rounded-full bg-yellow-400"/><div className="w-2 h-2 rounded-full bg-green-400"/></div>
        <div className="flex-1 h-5 bg-white rounded border border-gray-200 flex items-center px-2 text-[8px] text-gray-500">partner.attenda.app</div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-gray-900">🍞 Linen Co.</span>
          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">3 open</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {[['3','Pending'],['1','Cooking'],['12','Done']].map(([v,l],i)=>(
            <div key={i} className="bg-gray-50 rounded-lg p-1.5 text-center"><div className="text-[14px] font-black text-gray-900">{v}</div><div className="text-[7px] text-gray-500 uppercase font-bold">{l}</div></div>
          ))}
        </div>
        {[{item:'50 bath towels',value:'$120',status:'In Progress'},{item:'100 hand towels',value:'$85',status:'Open'},{item:'30 face cloths',value:'$45',status:'Open'}].map((job,i)=>(
          <div key={i} className={`border rounded-xl p-2.5 ${job.status==='In Progress'?'border-blue-200 bg-blue-50':'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div><div className="text-[9px] font-bold text-gray-900">{job.item}</div><div className="text-[7px] text-gray-500 mt-0.5">{job.status==='In Progress'?'● In progress':'○ Open'}</div></div>
              <div className="text-[11px] font-black text-gray-900">{job.value}</div>
            </div>
          </div>
        ))}
        <div className="text-center text-[8px] text-gray-400 pt-1 border-t border-gray-100">Auto-invoice · No phone tag</div>
      </div>
    </div>
  );
}

/* ── Revenue Card ─────────────────────────────────────────────── */
function RevenueCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-8 md:p-10 flex flex-col justify-center">
          <div className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: TEAL }}>Case Study · Boutique Hotel</div>
          <h3 className="text-[24px] md:text-[28px] font-black text-gray-900 leading-tight mb-4">121 rooms · 1 restaurant · 4 months on Attenda.</h3>
          <p className="text-[15px] text-gray-600 leading-relaxed mb-4">An independent boutique — 121 keys, an in-house restaurant, competing with chains for direct bookings. They switched on Attenda in February. By June, four months in, they&apos;d generated <span className="font-black text-gray-900">$16,000+ in attributable revenue.</span></p>
          <p className="text-[15px] text-gray-600 leading-relaxed mb-6">No 18-month rollout. No 6-figure implementation. Just the chat, the QR code, and a four-month run.</p>
          <div className="flex items-center gap-1.5 text-[12px] text-gray-500"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/><span>Verifiable · Numbers tracked in the platform</span></div>
        </div>
        <div className="bg-gray-50 p-8 md:p-10 border-t md:border-t-0 md:border-l border-gray-200 flex items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400"/><div className="w-2.5 h-2.5 rounded-full bg-yellow-400"/><div className="w-2.5 h-2.5 rounded-full bg-green-400"/></div>
                <div className="flex-1 h-5 bg-white rounded border border-gray-200 flex items-center px-2 text-[9px] text-gray-500 font-semibold">gm.attenda.app · Revenue</div>
              </div>
              <div className="p-5">
                <div className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">Revenue · Last 4 months</div>
                <div className="text-[9px] text-gray-400 mb-3">Attributable to Attenda</div>
                <div className="text-[48px] font-black leading-none mb-1" style={{ color: TEAL }}>$16,247</div>
                <div className="text-[11px] text-gray-500 mb-4">shuttle + dining + late checkout</div>
                <div className="grid grid-cols-4 gap-2 h-20 mb-3">
                  {[{m:'Feb',v:0.45,val:'$2.1K'},{m:'Mar',v:0.62,val:'$3.4K'},{m:'Apr',v:0.85,val:'$4.8K'},{m:'May',v:1.0,val:'$5.9K'}].map((b,i)=>(
                    <div key={i} className="flex flex-col items-center justify-end">
                      <div className="text-[7px] text-gray-500 font-bold mb-1">{b.val}</div>
                      <div className="w-full rounded-t" style={{ height:`${b.v*100}%`, background: TEAL, opacity: 0.65 + i*0.1 }}/>
                      <div className="text-[8px] font-bold text-gray-500 mt-1">{b.m}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  {[['Shuttle & transport','$7,820'],['In-room dining','$5,640'],['Late checkout & ancillary','$2,787']].map(([l,v],i)=>(
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-black text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Flow Example ─────────────────────────────────────────────── */
function FlowExample() {
  return (
    <div className="space-y-4">
      <div className="rounded-t-2xl px-5 py-3 flex items-center justify-between" style={{ background: DARK }}>
        <div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Live thread</div>
          <div className="text-[14px] font-bold text-white">Room 204 · Extra pillows · 9:42 PM</div>
        </div>
        <div className="text-[10px] px-2 py-1 rounded-full bg-green-500/20 text-green-300 font-bold">RESOLVED 9:51 PM</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-100 p-3 rounded-b-2xl">
        {[
          { role:'Guest', name:'Room 204', color: TEAL, initial:'G', steps:['📱 Taps "Need extras"','💬 "Extra pillows please"','✓ Delivered in 10 min'] },
          { role:'Staff', name:'Maria · Housekeeping', color:'#374151', initial:'S', steps:['🔔 Phone buzzes: Room 204','✅ Taps Accept','🚪 Walks to room, delivers'] },
          { role:'Vendor', name:'Linen Co.', color:'#7C3AED', initial:'V', steps:['📦 Auto-restock alert','✅ Confirms next-day delivery','💰 Invoice auto-generated'] },
        ].map((col,i)=>(
          <div key={i} className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[12px]" style={{ background: col.color }}>{col.initial}</div>
              <div><div className="text-[9px] font-bold text-gray-500 uppercase">{col.role}</div><div className="text-[11px] font-bold text-gray-900">{col.name}</div></div>
            </div>
            <div className="space-y-1.5">
              {col.steps.map((s,j)=><div key={j} className={`rounded-lg p-2 text-[11px] ${j===2?'text-white':'text-gray-700 bg-gray-50'}`} style={j===2?{background:col.color}:{}}>{s}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Enroll Form ─────────────────────────────────────────────── */
function EnrollForm() {
  const [form, setForm] = useState({ propertyName:'', contactName:'', email:'', phone:'', rooms:'' });
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');

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
            message: '',
          },
        }),
      });
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error((e as {error?:string}).error || 'Email failed'); }
      setStatus('sent');
    } catch (err) {
      console.error('Enrollment error:', err);
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
        <p className="text-[14px] text-gray-500">Expect a reply within one business day with a personalized demo for your property.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
      <div>
        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">Property Name *</label>
        <input value={form.propertyName} onChange={e => setForm({...form, propertyName: e.target.value})}
          placeholder="Best Western Miami Airport"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">Your Name *</label>
          <input value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})}
            placeholder="GM / Owner"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all" />
        </div>
        <div>
          <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">Email *</label>
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
            placeholder="gm@yourproperty.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">Phone</label>
          <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
            placeholder="+1 (305) 555-0000"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all" />
        </div>
        <div>
          <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">Room count</label>
          <input type="number" value={form.rooms} onChange={e => setForm({...form, rooms: e.target.value})}
            placeholder="e.g. 82"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all" />
        </div>
      </div>
      {status === 'error' && <p className="text-[13px] text-red-500">Something went wrong. Email us at alejandro@attendaapp.com</p>}
      <button onClick={handleSubmit} disabled={status === 'sending'}
        className="w-full py-4 rounded-xl text-white font-bold text-[15px] disabled:opacity-50 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        style={{ background: `linear-gradient(135deg, ${TEAL} 0%, #0b8078 100%)` }}>
        {status === 'sending' ? 'Sending...' : 'Show me on my property →'}
      </button>
      <div className="grid grid-cols-3 gap-3 pt-1 border-t border-gray-100">
        {[['Reply in 4 hrs','business days'],['15-min call','no slide deck'],['No card','no commitment']].map(([v,l],i)=>(
          <div key={i} className={`text-center ${i===1?'border-x border-gray-100':''}`}>
            <div className="text-[11px] font-bold text-gray-900">{v}</div>
            <div className="text-[10px] text-gray-400 leading-snug">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
