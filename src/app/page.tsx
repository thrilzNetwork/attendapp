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
            <button onClick={() => scrollTo(demoRef)} className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">See it</button>
            <a href="/staff" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Staff Login</a>
            <button onClick={() => scrollTo(enrollRef)}
              className="px-5 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all active:scale-[0.97] shadow-sm"
              style={{ backgroundColor: TEAL }}>
              Join the pilot
            </button>
          </div>
          <button onClick={() => scrollTo(enrollRef)} className="md:hidden px-4 py-2 rounded-lg text-white text-[12px] font-bold"
            style={{ backgroundColor: TEAL }}>Pilot</button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 px-5">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-bold text-gray-700 tracking-wide uppercase">Pilot program — 3 hotels live</span>
          </div>
          <h1 className="text-[40px] md:text-[64px] leading-[1.05] font-black tracking-tight text-gray-900 mb-6">
            Guests, staff, and vendors.<br />
            <span style={{ color: TEAL }}>One roof. One conversation.</span>
          </h1>
          <p className="text-[18px] md:text-[20px] text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            A connected platform for independent hotels. QR directories in every room. Native chat between guests, staff, and providers. No app to download.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => scrollTo(demoRef)}
              className="w-full sm:w-auto px-7 py-4 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: TEAL }}>
              See it in 30 seconds <ArrowRight size={16} />
            </button>
            <button onClick={() => scrollTo(enrollRef)}
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-gray-100 text-gray-900 font-bold text-[15px] hover:bg-gray-200 transition-colors">
              Book a 15-min demo
            </button>
          </div>
        </div>

        {/* ── Live animated chat mockup ── */}
        <div className="max-w-md mx-auto mt-14 md:mt-20">
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-[28px] p-6 shadow-2xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-[10px] font-bold text-gray-900 tracking-wider">
              LIVE THREAD · ROOM 204
            </div>
            <ChatThread />
          </div>
        </div>
      </section>

      {/* ═══ 4-SCREEN VISUAL GRID ═══ */}
      <section ref={demoRef} className="py-20 px-5 bg-gray-50">
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
              See it run on your property
            </h2>
            <p className="text-[16px] text-gray-600">
              15-minute walkthrough on your real workflow — schedules, concierge, vendors, the lot. No deck, no fluff. We tailor the demo to a problem you actually have.
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
              a: '2 weeks from contract to live. We do the QR design, branding, and staff training.',
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
            <span className="text-[13px] text-gray-600">attenda — built for independent hotels</span>
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
/*  Live animated chat thread (Hero)                            */
/* ──────────────────────────────────────────────────────────── */

function ChatThread() {
  const [step, setStep] = useState(0);
  const messages = [
    { role: 'guest', name: 'Room 204', text: 'Hi — we need extra pillows please', time: '9:42 PM' },
    { role: 'staff', name: 'Maria · Housekeeping', text: 'On the way with 2 pillows 👌', time: '9:43 PM' },
    { role: 'vendor', name: 'Linen Co.', text: 'Restock order received for Room 204', time: '9:44 PM' },
    { role: 'staff', name: 'Maria', text: 'Delivered. Anything else?', time: '9:51 PM' },
  ];

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % (messages.length + 1)), 2200);
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <div className="space-y-2.5">
      {messages.slice(0, step).map((m, i) => (
        <div key={i} className={`flex ${m.role === 'guest' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
          <div className={`max-w-[80%] ${m.role === 'guest' ? 'items-end' : 'items-start'} flex flex-col`}>
            <div className="text-[9px] text-gray-400 mb-0.5 px-1 font-semibold uppercase tracking-wider">
              {m.name} · {m.time}
            </div>
            <div
              className="px-3.5 py-2 rounded-2xl text-[13px] text-white"
              style={
                m.role === 'guest'
                  ? { backgroundColor: TEAL, borderBottomRightRadius: 4 }
                  : m.role === 'staff'
                  ? { backgroundColor: '#374151', borderBottomLeftRadius: 4 }
                  : { backgroundColor: '#7c3aed', borderBottomLeftRadius: 4 }
              }
            >
              {m.text}
            </div>
          </div>
        </div>
      ))}
      {step === 0 && (
        <div className="text-center text-[11px] text-gray-500 py-4">Thread starting...</div>
      )}
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
