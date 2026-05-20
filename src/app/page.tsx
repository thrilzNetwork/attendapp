'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  MapPin, Bus, Bell, ShieldCheck, Phone, Globe, User,
  MessageSquare, QrCode, Utensils, Star, ArrowRight,
  CheckCircle, Menu, X, Zap, Building2,
  BarChart3, Shield, TrendingUp,
  Car, ChefHat, Layers,
  ArrowLeftRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

    // Load brand color from hotel config
    getHotelConfig().then(cfg => {
      if (cfg?.brandColor) setBrandColor(cfg.brandColor);
    });

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
    <div className="h-dvh w-full overflow-hidden grid grid-rows-[auto,1fr,auto,1fr,auto] px-5 pt-5 pb-4 gap-2 bg-[#F5F5F5]">
      {/* Row 1: Header */}
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

      {/* Row 2: 2x2 Grid */}
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

      {/* Row 3: Rewards Banner */}
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

      {/* Row 4: Nearby + Food */}
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

      {/* Row 5: Footer */}
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

      {/* Validation Success Modal - shown when staff confirms guest */}
      <ValidationSuccessModal
        open={showValidationSuccess}
        onClose={() => setShowValidationSuccess(false)}
        brandColor={brandColor}
      />

      {/* ── Guest Sheets (slide-up overlays) ── */}
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



/* ──────────────────────────────────────────────────────────── */
/*  Attenda Marketing Landing Page                             */
/* ──────────────────────────────────────────────────────────── */

/* ── Brand Constants ─────────────────────────────────────── */
const TEAL = '#0D9488';
const INK_950 = '#0f0f23';

/* ── Reusable Section Component ──────────────────────────── */
function SectionLabel({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-400/20 bg-brand-400/8 mb-5">
      <Icon size={12} className="text-brand-400" />
      <span className="text-[11px] font-bold text-brand-400 tracking-wide uppercase">{text}</span>
    </div>
  );
}

function AttendaLandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const enrollRef = useRef<HTMLDivElement>(null);

  const scrollToEnroll = () => {
    enrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════
          NAV
         ═══════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-ink-100/60">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-white font-display font-black text-[16px] tracking-tight">A</span>
            </div>
            <span className="font-display font-bold text-[17px] text-ink-900 tracking-tight">attenda</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="/staff" className="nav-link">Staff Login</a>
            <button onClick={scrollToEnroll}
              className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-[13px] font-bold hover:bg-brand-600 transition-all active:scale-[0.97] shadow-sm">
              Get a Demo
            </button>
          </div>

          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="md:hidden p-2 text-ink-500 hover:text-ink-900">
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-ink-100 bg-white px-5 py-5 space-y-4 animate-fade-in">
            <a href="#how-it-works" onClick={() => setMobileNavOpen(false)} className="block text-[15px] font-semibold text-ink-700 hover:text-ink-900">How It Works</a>
            <a href="#features" onClick={() => setMobileNavOpen(false)} className="block text-[15px] font-semibold text-ink-700 hover:text-ink-900">Features</a>
            <a href="/staff" className="block text-[15px] font-semibold text-ink-700 hover:text-ink-900">Staff Login</a>
            <button onClick={scrollToEnroll} className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-bold text-[14px] hover:bg-brand-600 transition-colors">
              Get a Demo
            </button>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════════
          HERO
         ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${INK_950} 0%, #0d1b2a 50%, #0a2418 100%)` }}>
        <div className="absolute inset-0 bg-dot" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand-400/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 pt-24 pb-32 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left max-w-2xl">
            <SectionLabel icon={Zap} text="Built by an Operator · For Operators" />

            <h1 className="font-display text-[44px] md:text-[60px] font-extrabold text-white leading-[1.05] mb-6 tracking-tight">
              Same chaos.<br />
              <span className="gradient-text">One system.</span>
            </h1>

            <p className="text-[17px] text-ink-300 leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0">
              The same repetitive questions, requests, and phone calls every shift. One platform that connects your guests, your staff, and your vendors &mdash; so nothing gets lost and your team can focus on running the place.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button onClick={scrollToEnroll}
                className="px-7 py-4 rounded-xl bg-brand-500 text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-brand-600 transition-all active:scale-[0.97] shadow-lg shadow-brand-500/20">
                Enroll Your Property <ArrowRight size={16} />
              </button>
              <a href="/staff"
                className="px-7 py-4 rounded-xl border border-white/15 text-ink-200 text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                View Staff Dashboard
              </a>
            </div>

            <div className="flex flex-wrap gap-x-10 gap-y-3 mt-12 justify-center lg:justify-start">
              <div className="text-center lg:text-left">
                <p className="text-[28px] font-bold text-white font-display tracking-tight">0%</p>
                <p className="text-[10px] text-ink-400 uppercase tracking-wider font-medium">Commissions to 3rd parties</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-[28px] font-bold text-white font-display tracking-tight">&lt; 60s</p>
                <p className="text-[10px] text-ink-400 uppercase tracking-wider font-medium">Guest access via QR</p>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-center gap-6">
            <PhoneMockup />

            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-400 bg-brand-400/15 w-5 h-5 rounded-full flex items-center justify-center">1</span>
                <span className="text-[11px] text-ink-300 font-medium whitespace-nowrap">Guest scans</span>
              </div>
              <ArrowRight size={14} className="text-ink-500 shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-400 bg-brand-400/15 w-5 h-5 rounded-full flex items-center justify-center">2</span>
                <span className="text-[11px] text-ink-300 font-medium whitespace-nowrap">Staff routes</span>
              </div>
              <ArrowRight size={14} className="text-ink-500 shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-400 bg-brand-400/15 w-5 h-5 rounded-full flex items-center justify-center">3</span>
                <span className="text-[11px] text-ink-300 font-medium whitespace-nowrap">Vendor fulfills</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ═══════════════════════════════════════════════════════
          REVENUE
         ═══════════════════════════════════════════════════════ */}
      <section id="revenue" className="py-28" style={{ background: `linear-gradient(135deg, ${INK_950} 0%, #0d1b2a 100%)` }}>
        <div className="relative max-w-7xl mx-auto px-5">
          <div className="text-center mb-16">
            <SectionLabel icon={TrendingUp} text="Revenue Potential" />
            <h2 className="font-display text-[38px] md:text-[44px] font-extrabold text-white mb-4 tracking-tight">
              Not every feature makes money.<br className="hidden sm:block" /> <span className="gradient-text">The right ones can.</span>
            </h2>
            <p className="text-[16px] text-ink-300 max-w-2xl mx-auto leading-relaxed">
              Partner with local businesses, set your shuttle rates, and earn referral commissions. Revenue is a potential &mdash; not a promise. We only show you what actually works.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Food */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center hover:bg-white/[0.07] transition-all">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                <ChefHat size={22} className="text-emerald-400" />
              </div>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.15em] mb-1">Food &amp; Beverage</p>
              <h3 className="text-[17px] font-bold text-white font-display mb-3">Revenue on partnered orders</h3>
              <p className="text-[13px] text-ink-300 leading-relaxed mb-4">
                Delivery apps like Uber Eats won&apos;t pay the property &mdash; but partnered restaurants do. When local businesses go Attenda-powered, every order through the guest app earns a cut. No kitchen required.
              </p>
              <div className="pill border-white/10 text-white/60 text-[10px]">Up to 15% per order</div>
            </div>

            {/* Transport */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center hover:bg-white/[0.07] transition-all">
              <div className="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-4">
                <Car size={22} className="text-blue-400" />
              </div>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.15em] mb-1">Transportation</p>
              <h3 className="text-[17px] font-bold text-white font-display mb-3">Set your shuttle rates</h3>
              <p className="text-[13px] text-ink-300 leading-relaxed mb-4">
                You set the price. The driver gets paid. You take a cut. Scheduled routes, on-demand rides, and cruise port calendars — all booked through the guest app. No Uber. No Lyft.
              </p>
              <div className="pill border-white/10 text-white/60 text-[10px]">You control pricing</div>
            </div>

            {/* Attractions */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center hover:bg-white/[0.07] transition-all">
              <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-4">
                <MapPin size={22} className="text-amber-400" />
              </div>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-[0.15em] mb-1">Local Attractions</p>
              <h3 className="text-[17px] font-bold text-white font-display mb-3">Referral commissions</h3>
              <p className="text-[13px] text-ink-300 leading-relaxed mb-4">
                Tours, spas, water sports, excursions — any local experience lists in the app. When a guest books, you earn a referral commission. Your concierge work, automated and monetized.
              </p>
              <div className="pill border-white/10 text-white/60 text-[10px]">Passive revenue stream</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS
         ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-28 bg-ink-50">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-16">
            <SectionLabel icon={ArrowLeftRight} text="How it connects" />
            <h2 className="font-display text-[38px] md:text-[44px] font-extrabold text-ink-900 mb-4 tracking-tight">
              One flow, no middleman.
            </h2>
            <p className="text-[16px] text-ink-400 max-w-2xl mx-auto leading-relaxed">
              Every interaction flows through Attenda &mdash; from guest request to staff action to vendor fulfillment. No third-party platforms taking a cut.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-ink-100 p-7 shadow-sm">
              <p className="text-[10px] font-bold text-brand-500 uppercase tracking-[0.15em] mb-3">Step 1</p>
              <h3 className="font-bold text-[17px] text-ink-900 font-display mb-2">Guest taps in</h3>
              <p className="text-[13px] text-ink-400 leading-relaxed">
                Scans the QR code in their room. Instant access to food ordering, shuttle booking, messaging, nearby attractions, and more.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-ink-100 p-7 shadow-sm relative">
              <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 text-ink-300">
                <ArrowRight size={20} />
              </div>
              <p className="text-[10px] font-bold text-brand-500 uppercase tracking-[0.15em] mb-3">Step 2</p>
              <h3 className="font-bold text-[17px] text-ink-900 font-display mb-2">Staff receives &amp; routes</h3>
              <p className="text-[13px] text-ink-400 leading-relaxed">
                Every request hits the live staff dashboard. AI replies handle the basics. Orders and service tickets go directly to the right vendor or team member.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-ink-100 p-7 shadow-sm">
              <p className="text-[10px] font-bold text-brand-500 uppercase tracking-[0.15em] mb-3">Step 3</p>
              <h3 className="font-bold text-[17px] text-ink-900 font-display mb-2">Vendor fulfills</h3>
              <p className="text-[13px] text-ink-400 leading-relaxed">Local restaurants get food orders. Drivers see their shuttle manifest. Attractions receive bookings. Everyone gets paid. Partnered vendors share revenue with the property.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FEATURES
         ═══════════════════════════════════════════════════════ */}
      <section id="features" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-16">
            <SectionLabel icon={Layers} text="Everything you need" />
            <h2 className="font-display text-[38px] md:text-[44px] font-extrabold text-ink-900 mb-4 tracking-tight">
              Every feature eliminates<br className="hidden sm:block" /> a real problem.
            </h2>
            <p className="text-[16px] text-ink-400 max-w-xl mx-auto leading-relaxed">
              Not a feature list. A list of repetitive tasks your staff never has to do manually again.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Bell, title: 'Live Request Dashboard', tag: 'Lost sticky notes', desc: 'Towels, housekeeping, wake-up calls — every request hits a real-time dashboard, gets assigned, and is tracked to done.' },
              { icon: MessageSquare, title: 'Guest Messaging + AI Replies', tag: 'Endless repetitive questions', desc: 'Guests message the front desk directly. Smart auto-replies handle Wi-Fi, pool hours, checkout times without staff lifting a finger.' },
              { icon: Bus, title: 'Shuttle & Transport Booking', tag: 'Phone tag & missed pickups', desc: 'Guests book seats on scheduled shuttles. Staff see a live manifest. Drivers get their routes. Everyone stays on time.' },
              { icon: QrCode, title: 'QR Room Codes', tag: 'App downloads that never happen', desc: 'Scan a QR in the room. Instant access. No download, no login. Pre-fills room number and guest info automatically.' },
              { icon: Utensils, title: 'In-Room Food Ordering', tag: 'Guests leaving for meals', desc: 'Restaurants go Attenda-powered for direct ordering. One tap to order. Property earns when partnered &mdash; not from every delivery app.' },
              { icon: Star, title: 'Review & Feedback Flow', tag: 'Bad reviews you never saw', desc: 'Capture feedback before checkout. Route happy guests to Google. Handle issues privately before they hit public reviews.' },
              { icon: Shield, title: 'Safety & Emergency Info', tag: 'Guests calling for basics', desc: 'Fire exits, emergency contacts, CO detector info — all in the app. Staff handle fewer inquiry calls.' },
              { icon: BarChart3, title: 'Staff Operations Dashboard', tag: 'No shift visibility', desc: 'Every request, message, booking, and assignment in one screen. See what is pending from any device, any shift.' },
              { icon: Building2, title: 'Multi-Property Management', tag: 'Running blind across sites', desc: 'Superadmin console gives you oversight across every property. Switch, compare, and manage everything from one login.' },
            ].map(f => (
              <div key={f.title} className="group relative rounded-2xl p-6 border border-ink-100 bg-white hover:border-brand-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-brand-400/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <f.icon size={20} className="text-brand-500" />
                </div>
                <div className="inline-block text-[10px] text-ink-400 font-semibold bg-ink-50 px-2 py-0.5 rounded-md mb-2.5">{f.tag}</div>
                <h3 className="font-bold text-[15px] text-ink-900 mb-1.5 font-display">{f.title}</h3>
                <p className="text-[12px] text-ink-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════
          BUILT BY OPERATORS
         ═══════════════════════════════════════════════════════ */}
      <section className="py-28" style={{ background: `linear-gradient(135deg, ${INK_950} 0%, #0d1b2a 100%)` }}>
        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <p className="text-[12px] font-bold text-brand-400 uppercase tracking-[0.2em] mb-5">Who built this</p>
          <h2 className="font-display text-[34px] md:text-[40px] font-extrabold text-white mb-5 tracking-tight">
            Built by operators who<br />
            <span className="gradient-text">worked the floor.</span>
          </h2>
          <p className="text-[16px] text-ink-300 leading-relaxed mb-6 max-w-2xl mx-auto">
            Attenda didn&apos;t come from a product manager&apos;s whiteboard. Every feature was born from a real moment of frustration inside a hospitality property — the front desk answering the same question for the 30th time, a shuttle booking lost in a text thread, a guest ordering Uber Eats instead of calling the kitchen.
          </p>
          <p className="text-[15px] text-ink-300 leading-relaxed mb-12 max-w-2xl mx-auto">
            We are <span className="text-white font-semibold">Thrilz Network LLC</span> — an agentic technology company that builds operational tools for the hospitality industry.
          </p>
          <div className="flex flex-wrap justify-center gap-10">
            {[
              { icon: Zap, label: 'Agentic AI Frameworks' },
              { icon: MapPin, label: 'Local-First Design' },
              { icon: ArrowLeftRight, label: 'Operator-Driven Roadmap' },
            ].map(v => (
              <div key={v.label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center">
                  <v.icon size={18} className="text-brand-400" />
                </div>
                <span className="text-[14px] font-semibold text-white">{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════
          INTEGRATIONS
         ═══════════════════════════════════════════════════════ */}
      <section className="py-16 bg-white border-y border-ink-100">
        <div className="max-w-5xl mx-auto px-5">
          <p className="text-center text-[10px] text-ink-400 uppercase tracking-[0.2em] font-bold mb-4">Works with tools you already run</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Clover POS', desc: 'Direct kitchen orders. No re-entry.' },
              { name: 'Google Reviews', desc: 'Route happy guests. Protect your rating.' },
              { name: 'Email Alerts', desc: 'Instant alerts for every request.' },
              { name: 'QR Codes', desc: 'Room-specific codes. Instant access.' },
            ].map(i => (
              <div key={i.name} className="border border-ink-100 rounded-2xl p-5 hover:border-brand-200 hover:shadow-sm transition-all text-center">
                <h3 className="font-bold text-[14px] text-ink-900 font-display mb-1">{i.name}</h3>
                <p className="text-[11px] text-ink-400 leading-relaxed">{i.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════
          ENROLL
         ═══════════════════════════════════════════════════════ */}
      <section ref={enrollRef} id="enroll" className="py-28" style={{ background: `linear-gradient(160deg, ${INK_950} 0%, #0a2218 100%)` }}>
        <div className="relative max-w-2xl mx-auto px-5 text-center">
          <SectionLabel icon={Zap} text="No contract. No setup fee." />
          <h2 className="font-display text-[34px] md:text-[40px] font-extrabold text-white mb-4 tracking-tight">Let&apos;s fix your operation.</h2>
          <p className="text-[15px] text-ink-300 mb-10 max-w-lg mx-auto leading-relaxed">
            Tell us about your operation. We&apos;ll reach out within one business day with a live demo and a plan built specifically for your property.
          </p>
          <EnrollForm />
        </div>
      </section>
      {/* ═══════════════════════════════════════════════════════
          FOOTER
         ═══════════════════════════════════════════════════════ */}
      <footer className="bg-white border-t border-ink-100 py-12">
        <div className="max-w-7xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-display font-black text-[14px]">A</span>
            </div>
            <span className="font-display font-bold text-[16px] text-ink-900 tracking-tight">attenda</span>
            <span className="text-[11px] text-ink-400 ml-1">· Thrilz Network LLC</span>
          </div>
          <div className="flex items-center gap-8 flex-wrap justify-center text-[12px]">
            <a href="#revenue" className="text-ink-400 hover:text-ink-900 transition-colors">Revenue</a>
            <a href="#how-it-works" className="text-ink-400 hover:text-ink-900 transition-colors">How It Works</a>
            <a href="#features" className="text-ink-400 hover:text-ink-900 transition-colors">Features</a>
            <a href="/privacy" className="text-ink-400 hover:text-ink-900 transition-colors">Privacy</a>
            <a href="/terms" className="text-ink-400 hover:text-ink-900 transition-colors">Terms</a>
            <a href="/staff" className="text-ink-400 hover:text-ink-900 transition-colors">Staff Login</a>
          </div>
          <p className="text-[11px] text-ink-300">© {new Date().getFullYear()} Thrilz Network LLC</p>
        </div>
      </footer>    </div>
  );
}

/* ── Phone Mockup ───────────────────────────────────────────── */
function PhoneMockup() {
  const BURG = TEAL;
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
              <span className="text-[7px] font-bold text-white tracking-wider">REWARDS</span>
            </div>
          </div>
          <div className="flex gap-1.5" style={{ height: '18%' }}>
            <div className="w-[38%] rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: BURG }}>
              <span className="text-[6px] font-black text-white">NEARBY</span>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex-1 rounded-xl flex items-center justify-center" style={{ backgroundColor: BURG }}>
                <span className="text-[6px] font-black text-white">FOOD</span>
              </div>
              <div className="flex-1 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                <span className="text-[6px] font-black" style={{ color: BURG }}>REVIEW</span>
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
            placeholder="gm@yourproperty.com"
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
function ValidationSuccessModal({ open, onClose, brandColor }: { open: boolean; onClose: () => void; brandColor: string }) {
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
          style={{ backgroundColor: brandColor }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
