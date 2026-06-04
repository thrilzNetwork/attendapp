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

      {/* ═══ HERO — $16.4K case study outcome ═══ */}
      <section className="relative pt-16 pb-8 md:pt-24 md:pb-12 px-5">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 mb-5">
            <span className="text-[11px] font-bold text-gray-700 tracking-wide uppercase">42-room boutique · PortMiami · 90 days</span>
          </div>
          <h1 className="text-[48px] md:text-[72px] leading-[1.0] font-black tracking-tight text-gray-900 mb-3">
            <span style={{ color: TEAL }}>$16.4K</span> in 90 days.
          </h1>
          <p className="text-[18px] md:text-[22px] text-gray-600 max-w-xl mx-auto mb-8 leading-snug">
            From a 42-room near PortMiami. No PMS rip-out. Zero guest apps.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <button onClick={() => scrollTo(enrollRef)}
              className="w-full sm:w-auto px-7 py-4 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: TEAL }}>
              Book a 15-min demo <ArrowRight size={16} />
            </button>
            <button onClick={() => scrollTo(caseStudyRef)}
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-gray-100 text-gray-900 font-bold text-[15px] hover:bg-gray-200 transition-colors">
              Read the case study ↓
            </button>
          </div>

          {/* 4 KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            <KpiTile value="$16,420" label="Incremental revenue captured" sub="amenities, shuttle, room service" />
            <KpiTile value="7.8 → 9.1" label="Guest sentiment score" sub="checkout-time pulse weighted by tone" />
            <KpiTile value="38" label="Reviews recovered" sub="happy guests routed pre-checkout" />
            <KpiTile value="0" label="Phone tag" sub="one thread replaces 4+ calls per shift" />
          </div>
        </div>
      </section>

      {/* ═══ CASE STUDY — The story ═══ */}
      <section ref={caseStudyRef} className="py-20 px-5 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">The setup</div>
                <h3 className="text-[22px] font-black text-gray-900 mb-3">Onboarded in 11 days. No PMS rip-out.</h3>
                <p className="text-[15px] text-gray-600 leading-relaxed mb-4">
                  The property&apos;s existing PMS stayed. Attenda layered on top: QR codes in every room, a staff PIN app on three iPads, and a vendor portal link sent to their laundry and shuttle partners. Front desk trained in 90 minutes.
                </p>
                <p className="text-[15px] text-gray-600 leading-relaxed">
                  By day 11, every room request was a tracked job with an owner, an SLA, and a closed-loop.
                </p>
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-2">The 90-day result</div>
                <h3 className="text-[22px] font-black text-gray-900 mb-3">The front desk started upselling without trying.</h3>
                <p className="text-[15px] text-gray-600 leading-relaxed mb-4">
                  1,247 paid service jobs captured — things that used to go to voicemail or quietly not happen. The shuttle alone generated $3,180 in previously-walked revenue. 38 five-star reviews recovered. Zero 1-stars in the pilot window.
                </p>
                <p className="text-[15px] text-gray-600 leading-relaxed">
                  At checkout, every satisfied guest got a 1-tap link to Google Reviews. Unhappy guests got a personal text from the GM while still on property.
                </p>
              </div>
            </div>

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

      {/* ═══ HOW IT WORKS — Room 204 flow ═══ */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-[32px] md:text-[40px] font-black tracking-tight text-gray-900">How it works</h2>
          </div>
          <FlowExample />
        </div>
      </section>

      {/* ═══ STATS STRIP ═══ */}
      <section className="py-16 px-5 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-[56px] font-black leading-none mb-2" style={{ color: TEAL }}>73%</div>
            <div className="text-[14px] text-gray-400 uppercase tracking-wider font-semibold">Faster guest response time</div>
          </div>
          <div>
            <div className="text-[56px] font-black leading-none mb-2" style={{ color: TEAL }}>4→1</div>
            <div className="text-[14px] text-gray-400 uppercase tracking-wider font-semibold">Tools replaced (PMS + chat + vendor + QR)</div>
          </div>
          <div>
            <div className="text-[56px] font-black leading-none mb-2" style={{ color: TEAL }}>0</div>
            <div className="text-[14px] text-gray-400 uppercase tracking-wider font-semibold">Apps for guests to download</div>
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

/* ── Flow example (Room 204 pillows) ──────────────────────────── */
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
/*  Landing components — KPI tile                               */
/* ──────────────────────────────────────────────────────────── */

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