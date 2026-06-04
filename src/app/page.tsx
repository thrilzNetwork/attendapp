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

function AttendaLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const caseStudyRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
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

      {/* ═══ NAV ═══ */}
      <nav className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: TEAL }}>
              <span className="text-white font-black text-[16px] tracking-tight">A</span>
            </div>
            <span className="font-bold text-[17px] text-gray-900 tracking-tight">attenda</span>
          </a>
          <div className="hidden md:flex items-center gap-7">
            <button onClick={() => scrollTo(caseStudyRef)} className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Case study</button>
            <button onClick={() => scrollTo(demoRef)} className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Product</button>
            <a href="/staff" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Staff Login</a>
            <button onClick={() => scrollTo(enrollRef)}
              className="px-5 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all active:scale-[0.97] shadow-sm"
              style={{ backgroundColor: TEAL }}>
              Book a demo
            </button>
          </div>
          <button onClick={() => scrollTo(enrollRef)} className="md:hidden px-4 py-2 rounded-lg text-white text-[12px] font-bold"
            style={{ backgroundColor: TEAL }}>Demo</button>
        </div>
      </nav>

      {/* ═══ HERO — Revenue-led ═══ */}
      <section className="relative pt-12 pb-12 md:pt-20 md:pb-16 px-5">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-bold text-gray-700 tracking-wide uppercase">For limited-service hotels · airport · cruise port · boutique</span>
          </div>
          <h1 className="text-[40px] md:text-[60px] leading-[1.05] font-black tracking-tight text-gray-900 mb-6">
            The operating system for<br />
            <span style={{ color: TEAL }}>independent hotels that can&apos;t afford to miss a request.</span>
          </h1>
          <p className="text-[18px] md:text-[20px] text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Attenda turns every QR-scan in the room into a tracked, billed, reviewed service job — and routes every happy guest to your Google review before the unhappy ones hit TripAdvisor. One platform. Front desk, housekeeping, shuttle, room service, vendors, sentiment, reviews. Live in 11 days.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <button onClick={() => scrollTo(enrollRef)}
              className="w-full sm:w-auto px-7 py-4 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: TEAL }}>
              Book a 15-min demo <ArrowRight size={16} />
            </button>
            <button onClick={() => scrollTo(caseStudyRef)}
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-gray-100 text-gray-900 font-bold text-[15px] hover:bg-gray-200 transition-colors">
              See the case study ↓
            </button>
          </div>

          {/* Outcome strip under hero CTAs */}
          <div className="grid grid-cols-3 max-w-2xl mx-auto gap-2 text-center">
            <div>
              <div className="text-[24px] md:text-[28px] font-black text-gray-900 leading-none">$16.4K</div>
              <div className="text-[10px] md:text-[11px] text-gray-500 uppercase tracking-wider font-semibold mt-1">Captured in 90 days</div>
            </div>
            <div className="border-x border-gray-200">
              <div className="text-[24px] md:text-[28px] font-black text-gray-900 leading-none">7.8 → 9.1</div>
              <div className="text-[10px] md:text-[11px] text-gray-500 uppercase tracking-wider font-semibold mt-1">Guest score lift</div>
            </div>
            <div>
              <div className="text-[24px] md:text-[28px] font-black text-gray-900 leading-none">38</div>
              <div className="text-[10px] md:text-[11px] text-gray-500 uppercase tracking-wider font-semibold mt-1">Reviews recovered</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ THE BLEED — What hotels lose today ═══ */}
      <section className="py-20 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[12px] font-bold tracking-widest uppercase text-gray-500 mb-3">The bleed</div>
            <h2 className="text-[32px] md:text-[44px] font-black tracking-tight text-gray-900 mb-4">
              Three ways your hotel is losing money every month
            </h2>
            <p className="text-[16px] text-gray-600 max-w-2xl mx-auto">
              It&apos;s not your team. It&apos;s the fact that the front desk is the only channel — and they can&apos;t be on the phone and at the desk at the same time.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BleedCard
              big="$16K+/mo"
              title="Missed in-room revenue"
              body="Amenity refills, late checkouts, room service, paid shuttle runs — the guest would have paid, but they gave up after 4 rings and 1 voicemail."
            />
            <BleedCard
              big="73%"
              title="Complaints that never reach the GM"
              body="A guest is annoyed at breakfast. By check-out they&apos;re in an Uber. You find out three weeks later via a 1-star review you can&apos;t respond to without sounding defensive."
            />
            <BleedCard
              big="$30K+"
              title="Cost of one bad public review"
              body="A single sub-3-star on Google drops OTA ranking for 90+ days. For a 40-room property near a cruise port, that&apos;s roughly 200 lost room nights a year."
            />
          </div>
        </div>
      </section>

      {/* ═══ CASE STUDY — The hero of the page ═══ */}
      <section ref={caseStudyRef} className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[12px] font-bold tracking-widest uppercase text-gray-500 mb-3">Case study · 90-day pilot</div>
            <h2 className="text-[32px] md:text-[44px] font-black tracking-tight text-gray-900 mb-4">
              A 42-room boutique near PortMiami
            </h2>
            <p className="text-[16px] text-gray-600 max-w-2xl mx-auto">
              Limited-service. Heavy on cruise-port and airport overnight stays. Two staff on the desk at peak. Before Attenda, &ldquo;the phone tag with housekeeping&rdquo; was the #1 reason the GM couldn&apos;t grow.
            </p>
          </div>

          {/* The 4 KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <KpiTile value="$16,420" label="Incremental revenue captured" sub="amenities, shuttle, room service, late checkouts" />
            <KpiTile value="7.8 → 9.1" label="Guest sentiment score" sub="from checkout-time pulse, weighted by message tone" />
            <KpiTile value="38" label="Reviews recovered to Google" sub="happy guests routed pre-checkout" />
            <KpiTile value="0" label="Phone tag · desk ↔ housekeeping" sub="one thread per room replaces 4+ calls per shift" />
          </div>

          {/* The story */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">The setup</div>
                <h3 className="text-[22px] font-black text-gray-900 mb-3">Onboarded in 11 days. No PMS rip-out.</h3>
                <p className="text-[15px] text-gray-600 leading-relaxed mb-4">
                  The property&apos;s existing PMS stayed. Attenda layered on top: QR codes in every room, a staff PIN app on three iPads, and a vendor portal link sent to their laundry and shuttle partners. Front desk trained in 90 minutes.
                </p>
                <p className="text-[15px] text-gray-600 leading-relaxed">
                  By day 11, every room request — &ldquo;extra towels&rdquo;, &ldquo;airport at 5am&rdquo;, &ldquo;can I check out at 2?&rdquo; — was a tracked job with an owner, an SLA, and a closed-loop.
                </p>
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">The 90-day result</div>
                <h3 className="text-[22px] font-black text-gray-900 mb-3">The front desk started upselling without trying.</h3>
                <p className="text-[15px] text-gray-600 leading-relaxed mb-4">
                  1,247 paid service jobs captured in the first quarter — things that used to go to voicemail, &ldquo;figure it out at the desk&rdquo;, or just quietly not happen. The shuttle alone, after Attenda routed every request through one calendar, generated $3,180 in previously-walked revenue.
                </p>
                <p className="text-[15px] text-gray-600 leading-relaxed">
                  At checkout, every satisfied guest got a 1-tap link to Google Reviews. The 8% who weren&apos;t satisfied got a personal text from the GM while still on property. 38 five-stars recovered. Zero 1-stars posted in the pilot window.
                </p>
              </div>
            </div>

            {/* The pull quote */}
            <div className="mt-10 pt-10 border-t border-gray-200">
              <blockquote className="text-[22px] md:text-[26px] font-black text-gray-900 leading-snug tracking-tight max-w-3xl mx-auto text-center">
                &ldquo;We didn&apos;t realize how much revenue was sitting in the room until we stopped leaving it there.&rdquo;
              </blockquote>
              <div className="text-center mt-4 text-[13px] text-gray-500 font-semibold">
                — General Manager, 42-room boutique near PortMiami
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SENTIMENT + REVIEWS — The differentiator ═══ */}
      <section className="py-20 px-5 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-3">Sentiment & reviews</div>
            <h2 className="text-[32px] md:text-[44px] font-black tracking-tight text-white mb-4">
              Find out about the bad review<br />before your guest posts it.
            </h2>
            <p className="text-[16px] text-gray-400 max-w-2xl mx-auto">
              Attenda scores every message. A happy guest at checkout gets a 1-tap link to your Google page. A guest who dropped below 7 on the sentiment scale gets a personal DM from you while they&apos;re still on property.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before card */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
              <div className="text-[11px] font-bold tracking-widest uppercase text-red-400 mb-3">Before Attenda</div>
              <h3 className="text-[20px] font-black text-white mb-4">Black-box. Black-mail.</h3>
              <ul className="space-y-3 text-[14px] text-gray-300">
                <li className="flex gap-3"><span className="text-red-400 font-bold">×</span> Guest leaves, you find out 3 weeks later via 1-star on Google.</li>
                <li className="flex gap-3"><span className="text-red-400 font-bold">×</span> Score tanks. OTA ranking drops. Revenue impact invisible.</li>
                <li className="flex gap-3"><span className="text-red-400 font-bold">×</span> Happy guests walk out without ever writing a review.</li>
                <li className="flex gap-3"><span className="text-red-400 font-bold">×</span> Staff doesn&apos;t know who&apos;s unhappy until the survey comes back.</li>
              </ul>
            </div>

            {/* After card */}
            <div className="rounded-2xl p-6 border-2" style={{ backgroundColor: TEAL, borderColor: TEAL }}>
              <div className="text-[11px] font-bold tracking-widest uppercase text-white/80 mb-3">After Attenda</div>
              <h3 className="text-[20px] font-black text-white mb-4">Live pulse. Recovery queue.</h3>
              <ul className="space-y-3 text-[14px] text-white/95">
                <li className="flex gap-3"><span className="font-bold">✓</span> Every message scored in real time. Weekly leak report.</li>
                <li className="flex gap-3"><span className="font-bold">✓</span> Happy guest → 1-tap Google / TripAdvisor link at checkout.</li>
                <li className="flex gap-3"><span className="font-bold">✓</span> Unhappy guest → routed to GM, not the internet. Recovery in your inbox.</li>
                <li className="flex gap-3"><span className="font-bold">✓</span> Net Promoter Score trend, per property, per month, in your dashboard.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHAT ATTENDA DOES — 4 capabilities ═══ */}
      <section ref={demoRef} className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[32px] md:text-[44px] font-black tracking-tight text-gray-900 mb-4">
              What Attenda actually does
            </h2>
            <p className="text-[16px] text-gray-600 max-w-2xl mx-auto">
              Four capabilities. One platform. Replaces the four tools you&apos;re duct-taping today.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CapabilityCard
              number="01"
              title="Capture"
              tagline="Turn every request into a tracked, billed job."
              bullets={[
                'Amenity refills, late checkouts, room service, paid shuttle',
                'Auto-routes to the right staff or vendor — no dispatcher needed',
                'Every job has an owner, an SLA, and a paper trail',
              ]}
            />
            <CapabilityCard
              number="02"
              title="Connect"
              tagline="One thread. Three roles. Zero phone tag."
              bullets={[
                'Guest ↔ staff ↔ vendor on the same conversation',
                'Staff quick-log from a phone, no app install required',
                'Vendor portal — they see open jobs, accept, update status',
              ]}
            />
            <CapabilityCard
              number="03"
              title="Convert"
              tagline="Turn every checkout into a marketing win."
              bullets={[
                'Satisfied guest gets a 1-tap review link pre-checkout',
                'Unhappy guest gets a personal DM from the GM while on property',
                'Direct booking nudges for guests who came back twice',
              ]}
            />
            <CapabilityCard
              number="04"
              title="Coach"
              tagline="Know your leaks before the survey tells you."
              bullets={[
                'Sentiment scored on every message, weighted by tone',
                'Weekly leak report — "$X you missed this week"',
                'Per-property NPS trend, SLA breaches, recovery queue',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT PREVIEW — 4 screens ═══ */}
      <section className="py-20 px-5 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[32px] md:text-[44px] font-black tracking-tight text-gray-900 mb-4">
              One platform. Four screens. Zero friction.
            </h2>
            <p className="text-[16px] text-gray-600 max-w-xl mx-auto">
              Every side of the conversation, in the pocket or on the wall.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MockupCard
              imageSrc="/mockups/guest-phone.png"
              imageAlt="Guest phone showing concierge chat"
              label="Guest in their room"
              tagline="Scan. Talk. Done."
            />
            <MockupCard
              imageSrc="/mockups/staff-phone.png"
              imageAlt="Staff phone showing quick-log checklist"
              label="Staff on the floor"
              tagline="Log in 3 seconds."
            />
            <AdminMockupCard />
            <QrMockupCard />
          </div>
        </div>
      </section>

      {/* ═══ HOW IT FLOWS ═══ */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[32px] md:text-[44px] font-black tracking-tight text-gray-900 mb-4">
              How a request actually flows
            </h2>
            <p className="text-[16px] text-gray-600">One thread. Three roles. Zero phone tag.</p>
          </div>

          <FlowExample />
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="py-16 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-[56px] font-black leading-none mb-2" style={{ color: TEAL }}>73%</div>
            <div className="text-[14px] text-gray-600 uppercase tracking-wider font-semibold">Faster guest response time</div>
          </div>
          <div>
            <div className="text-[56px] font-black leading-none mb-2" style={{ color: TEAL }}>4→1</div>
            <div className="text-[14px] text-gray-600 uppercase tracking-wider font-semibold">Tools replaced (PMS + chat + vendor + QR)</div>
          </div>
          <div>
            <div className="text-[56px] font-black leading-none mb-2" style={{ color: TEAL }}>0</div>
            <div className="text-[14px] text-gray-600 uppercase tracking-wider font-semibold">Apps for guests to download</div>
          </div>
        </div>
      </section>

      {/* ═══ DEMO REQUEST ═══ */}
      <section ref={enrollRef} className="py-20 px-5">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-[32px] md:text-[40px] font-black tracking-tight text-gray-900 mb-4">
              See your own case study in 15 minutes
            </h2>
            <p className="text-[16px] text-gray-600">
              Walk us through your property — number of rooms, segment, current pain. We&apos;ll model what Attenda would have captured in your last 90 days, line-by-line. No deck, no fluff.
            </p>
          </div>
          <EnrollForm />
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-20 px-5 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[32px] font-black tracking-tight text-gray-900 mb-10 text-center">Common questions</h2>
          {[
            {
              q: 'Does the guest need to download an app?',
              a: 'No. They scan a QR code in the room — opens a mobile web app in their browser. Add to home screen if they want.',
            },
            {
              q: 'How are vendors onboarded?',
              a: 'Each vendor gets a lightweight web portal link. They see open jobs, accept, and update status. We handle the rest.',
            },
            {
              q: 'What about my existing PMS?',
              a: 'Attenda runs alongside your current PMS from day one. We replace it once you see the value — or stay layered if you prefer. No rip-and-replace.',
            },
            {
              q: 'How long does setup take?',
              a: '11 days from contract to live. We do the QR design, branding, and staff training. You provide three iPads and a Wi-Fi password.',
            },
            {
              q: 'What does Attenda cost?',
              a: 'Per-room, tiered by property size. Pilot properties start at no-cost for 90 days in exchange for a case study. We&apos;ll quote on the demo call.',
            },
            {
              q: 'What segment is Attenda built for?',
              a: 'Independent hotels, 20–200 rooms, limited-service, with a high single-night or two-night stay mix — airport corridor, cruise port, drive-to leisure, boutique urban. If your front desk runs on three people and a spreadsheet, you&apos;re the customer.',
            },
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

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 px-5 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: TEAL }}>
              <span className="text-white font-black text-[12px]">A</span>
            </div>
            <span className="text-[13px] text-gray-600">attenda — the operating system for independent hotels</span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-gray-500">
            <a href="/staff" className="hover:text-gray-900">Staff</a>
            <a href="mailto:thrilznetwork@gmail.com" className="hover:text-gray-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  4 mockup cards                                              */
/* ──────────────────────────────────────────────────────────── */

function MockupCard({ imageSrc, imageAlt, label, tagline }: {
  imageSrc: string;
  imageAlt: string;
  label: string;
  tagline: string;
}) {
  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-all hover:shadow-xl">
      <div className="aspect-[3/4] relative bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 25vw"
        />
      </div>
      <div className="p-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</div>
        <div className="text-[18px] font-black text-gray-900 tracking-tight">{tagline}</div>
      </div>
    </div>
  );
}

function AdminMockupCard() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const shifts: { [k: number]: { [k: number]: string } } = {
    0: { 1: 'Maria', 2: 'Maria' },
    1: { 1: 'Maria', 2: 'Alex', 3: 'Alex' },
    2: { 0: 'Alex', 1: 'Alex', 2: 'Sofia' },
    3: { 1: 'Sofia', 2: 'Sofia' },
    4: { 1: 'Alex', 2: 'Alex', 3: 'Maria' },
    5: { 0: 'Maria', 1: 'Maria', 2: 'Maria', 3: 'Sofia' },
    6: { 1: 'Sofia', 2: 'Sofia' },
  };
  const colorMap: { [k: string]: string } = {
    Maria: '#0D9488',
    Alex: '#7c3aed',
    Sofia: '#f59e0b',
  };
  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-all hover:shadow-xl">
      <div className="aspect-[3/4] relative bg-gradient-to-br from-gray-900 to-gray-800 p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Admin · Schedule</div>
          <div className="text-[9px] text-gray-500">Week of May 30</div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {days.map(d => (
            <div key={d} className="text-center text-[8px] font-bold text-gray-400 uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((_, dayIdx) => (
            <div key={dayIdx} className="space-y-1">
              {[0, 1, 2, 3].map(row => {
                const name = shifts[dayIdx]?.[row];
                return (
                  <div
                    key={row}
                    className="rounded text-[8px] font-bold text-white text-center py-1"
                    style={{ backgroundColor: name ? colorMap[name] : '#1f2937', opacity: name ? 1 : 0.3 }}
                  >
                    {name || '—'}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="absolute bottom-4 left-4 right-4 bg-gray-800/80 backdrop-blur rounded-lg p-2 flex items-center justify-between">
          <div className="text-[9px] text-gray-300">
            <span className="font-bold text-white">3</span> open shifts
          </div>
          <div className="text-[9px] px-2 py-0.5 rounded text-white font-bold" style={{ backgroundColor: TEAL }}>
            Auto-fill
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Admin at the desk</div>
        <div className="text-[18px] font-black text-gray-900 tracking-tight">Schedule a week in 60s.</div>
      </div>
    </div>
  );
}

function QrMockupCard() {
  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-all hover:shadow-xl">
      <div className="aspect-[3/4] relative bg-gradient-to-br from-amber-50 to-orange-50 p-6 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-gray-900">
          <div className="w-32 h-32 grid grid-cols-7 grid-rows-7 gap-px">
            {Array.from({ length: 49 }).map((_, i) => {
              // pseudo-random pattern
              const filled = [0, 1, 2, 6, 7, 8, 13, 14, 18, 21, 24, 25, 28, 32, 35, 39, 40, 42, 45, 48].includes(i);
              return <div key={i} className={filled ? 'bg-gray-900' : 'bg-white'} />;
            })}
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Scan me</div>
          <div className="text-[10px] text-gray-600 mt-0.5">Your room&apos;s digital directory</div>
        </div>
      </div>
      <div className="p-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">In every room</div>
        <div className="text-[18px] font-black text-gray-900 tracking-tight">Tap once. Routed.</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Flow example (Room 204 pillows)                            */
/* ──────────────────────────────────────────────────────────── */

function FlowExample() {
  return (
    <div className="space-y-4">
      {/* Thread header */}
      <div className="bg-gray-900 text-white rounded-t-2xl px-5 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Live thread</div>
          <div className="text-[14px] font-bold">Room 204 · Extra pillows · 9:42 PM</div>
        </div>
        <div className="text-[10px] px-2 py-1 rounded-full bg-green-500/20 text-green-300 font-bold">RESOLVED 9:51 PM</div>
      </div>

      {/* 3 role cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-100 p-3 rounded-b-2xl">
        {/* Guest */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[12px]" style={{ backgroundColor: TEAL }}>G</div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Guest</div>
              <div className="text-[12px] font-bold text-gray-900">Room 204</div>
            </div>
          </div>
          <div className="space-y-1.5 text-[12px] text-gray-700">
            <div className="bg-gray-50 rounded-lg p-2">📱 Taps &ldquo;Need extras&rdquo; in QR directory</div>
            <div className="bg-gray-50 rounded-lg p-2">💬 &ldquo;We need extra pillows please&rdquo;</div>
            <div className="rounded-lg p-2 text-white" style={{ backgroundColor: TEAL }}>✓ &ldquo;Delivered in 10 min&rdquo;</div>
          </div>
        </div>

        {/* Staff */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-[12px]">S</div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase">Staff</div>
              <div className="text-[12px] font-bold text-gray-900">Maria · Housekeeping</div>
            </div>
          </div>
          <div className="space-y-1.5 text-[12px] text-gray-700">
            <div className="bg-gray-50 rounded-lg p-2">🔔 Phone buzzes: &ldquo;Room 204 &middot; pillows&rdquo;</div>
            <div className="bg-gray-50 rounded-lg p-2">✅ Taps Accept</div>
            <div className="bg-gray-50 rounded-lg p-2">🚪 Walks to room, delivers</div>
          </div>
        </div>

        {/* Vendor */}
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

/* ──────────────────────────────────────────────────────────── */
/*  Landing components — Bleed / KPI / Capability               */
/* ──────────────────────────────────────────────────────────── */

function BleedCard({ big, title, body }: { big: string; title: string; body: string }) {
  return (
    <div className="bg-white rounded-2xl p-7 border border-gray-200">
      <div className="text-[44px] md:text-[52px] font-black leading-none mb-3 tracking-tight" style={{ color: TEAL }}>
        {big}
      </div>
      <div className="text-[17px] font-black text-gray-900 mb-2">{title}</div>
      <p className="text-[14px] text-gray-600 leading-relaxed">{body}</p>
    </div>
  );
}

function KpiTile({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 text-center">
      <div className="text-[28px] md:text-[36px] font-black leading-none mb-2 tracking-tight" style={{ color: TEAL }}>
        {value}
      </div>
      <div className="text-[13px] font-bold text-gray-900 mb-1">{label}</div>
      <div className="text-[11px] text-gray-500 leading-snug">{sub}</div>
    </div>
  );
}

function CapabilityCard({ number, title, tagline, bullets }: {
  number: string;
  title: string;
  tagline: string;
  bullets: string[];
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-7 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="text-[13px] font-black tracking-widest text-gray-400">{number}</div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${TEAL}15` }}>
          <CheckCircle size={20} style={{ color: TEAL }} />
        </div>
      </div>
      <h3 className="text-[24px] font-black text-gray-900 mb-2 tracking-tight">{title}</h3>
      <p className="text-[14px] text-gray-600 mb-5 font-medium">{tagline}</p>
      <ul className="space-y-2.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2.5 text-[14px] text-gray-700 leading-snug">
            <span className="font-bold mt-0.5" style={{ color: TEAL }}>✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
