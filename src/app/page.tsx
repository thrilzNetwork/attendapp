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
/*  Attenda Marketing Landing Page — LEAN SELL                 */
/* ──────────────────────────────────────────────────────────── */

const TEAL = '#0D9488';

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

      {/* HERO — inn-flow two-stacked-headline pattern */}
      <section className="relative pt-20 pb-20 md:pt-32 md:pb-28 px-5 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[14px] md:text-[16px] font-bold tracking-widest uppercase text-gray-500 mb-5">
            Hotel Operations Software
          </h2>
          <h1 className="text-[40px] md:text-[64px] leading-[1.05] font-black tracking-tight text-gray-900 mb-6">
            One Platform. <span style={{ color: TEAL }}>Built For Independent Hotels.</span>
          </h1>
          <p className="text-[18px] md:text-[20px] text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Attenda connects every guest request, staff task, vendor job, and GM dashboard into a single thread — so independent hotels can run leaner, serve faster, and capture more revenue without ripping out their PMS.
          </p>
          <button onClick={() => scrollTo(enrollRef)}
            className="px-9 py-4 rounded-xl text-white font-bold text-[16px] shadow-lg active:scale-[0.98] inline-flex items-center gap-2"
            style={{ backgroundColor: TEAL }}>
            Schedule a Demo <ArrowRight size={18} />
          </button>
          <p className="text-[13px] text-gray-500 mt-4">
            15-minute call. No slide deck. No commitment.
          </p>
        </div>
      </section>

      {/* MODULES — inn-flow style: 6 feature cards with icon + "Learn more" */}
      <section id="modules" className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
              Comprehensive Operations Software
            </h2>
            <h3 className="text-[32px] md:text-[42px] font-black tracking-tight text-gray-900 mb-4">
              Six modules. One thread. Every role covered.
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              Custom-built solutions to help your property run smarter — from the front desk to the vendors to the GM&apos;s morning review.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ModuleCard
              icon={<ChatIcon />}
              name="Guest Requests"
              tagline="In-room chat & service orders"
              body="Guests scan a QR code, tap what they need, and chat in real time. No app to download — works on any phone in any room."
            />
            <ModuleCard
              icon={<BellIcon />}
              name="Staff Task Log"
              tagline="PIN-in, log out. Every job tracked."
              body="Housekeeping, front desk, and maintenance get a single tap-to-accept view. Every accepted job is timestamped and tied to a room."
            />
            <ModuleCard
              icon={<TruckIcon />}
              name="Vendor Portal"
              tagline="Auto-restock, auto-invoice"
              body="Linen, food, shuttle, maintenance — vendors get a portal link, see open jobs, accept, and close. Invoices generated automatically."
            />
            <ModuleCard
              icon={<ChartIcon />}
              name="GM Dashboard"
              tagline="Every room, every shift, in one view"
              body="Real-time status across all rooms, all staff, all jobs. The GM opens one screen and knows everything happening on property right now."
            />
            <ModuleCard
              icon={<BookIcon />}
              name="Knowledge Base"
              tagline="Incidents captured, staff trained"
              body="When something goes wrong, the fix gets written down. New staff onboard faster, repeat incidents drop, and the playbook grows with the property."
            />
            <ModuleCard
              icon={<BusIcon />}
              name="Shuttle & Transport"
              tagline="Routes, cruise calendar, guest booking"
              body="Schedule shuttle runs, sync with cruise ship arrivals, let guests book seats from the room. Walked revenue becomes captured revenue."
            />
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

      {/* A NEW STANDARD — inn-flow 2-col with copy + CTA */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
                A New Standard For Independent Hotels
              </h2>
              <h3 className="text-[32px] md:text-[42px] font-black tracking-tight text-gray-900 mb-5 leading-tight">
                Run your whole property on one thread.
              </h3>
              <p className="text-[16px] text-gray-600 leading-relaxed mb-5">
                Attenda was built for the way independent hotels actually operate — multiple roles, multiple tools, one team trying to deliver five-star service without a five-star budget.
              </p>
              <p className="text-[16px] text-gray-600 leading-relaxed mb-8">
                Every request, every job, every handoff lives on a single thread. Your PMS stays. Your staff stays. Your vendors stay. You just get a clear view of every room, every shift, every dollar — in real time.
              </p>
              <button onClick={() => scrollTo(enrollRef)}
                className="px-7 py-3.5 rounded-xl text-white font-bold text-[15px] shadow-md inline-flex items-center gap-2"
                style={{ backgroundColor: TEAL }}>
                Schedule a Demo <ArrowRight size={16} />
              </button>
            </div>
            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
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

      {/* TESTIMONIAL — inn-flow CFO pattern */}
      <section id="case-study" className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-8">
            What hotel operators say about Attenda
          </h2>
          <blockquote className="text-[24px] md:text-[30px] font-black text-gray-900 leading-snug tracking-tight mb-8">
            &ldquo;One thread. Every room knew what was happening — us, the staff, the vendors. Nobody was guessing. We onboarded in 11 days and the front desk started capturing revenue we used to walk past.&rdquo;
          </blockquote>
          <div className="text-[15px] text-gray-600 font-semibold">
            — General Manager, 42-room boutique near PortMiami, Florida
          </div>
        </div>
      </section>

      {/* FINAL CTA BANNER — inn-flow dark band before footer */}
      <section className="py-20 px-5" style={{ backgroundColor: TEAL }}>
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-[32px] md:text-[44px] font-black tracking-tight mb-5 leading-tight">
            See the Attenda system in action.
          </h2>
          <p className="text-[17px] md:text-[19px] opacity-90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Learn how your property can run leaner, serve faster, and capture more — with your existing PMS and zero rip-and-replace.
          </p>
          <button onClick={() => scrollTo(enrollRef)}
            className="px-9 py-4 rounded-xl bg-white font-bold text-[16px] shadow-lg active:scale-[0.98] inline-flex items-center gap-2"
            style={{ color: TEAL }}>
            Schedule a Demo <ArrowRight size={18} />
          </button>
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
            { q: 'What modules does Attenda include?', a: 'Six: Guest Requests, Staff Task Log, Vendor Portal, GM Dashboard, Knowledge Base, and Shuttle & Transport. All connected on one thread.' },
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
              Three fields. We&apos;ll walk you through how the six modules connect — for your rooms, your team, your vendors.
            </p>
          </div>
          <EnrollForm />
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

/* ── Module card (feature catalog) ──────────────────────────── */

function ModuleCard({ icon, name, tagline, body }: {
  icon: React.ReactNode;
  name: string;
  tagline: string;
  body: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 transition-colors">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: TEAL }}>
        <div className="text-white">{icon}</div>
      </div>
      <h3 className="text-[18px] font-black text-gray-900 mb-1 tracking-tight">{name}</h3>
      <p className="text-[13px] font-semibold text-gray-500 mb-3 leading-snug">{tagline}</p>
      <p className="text-[14px] text-gray-700 leading-relaxed">{body}</p>
    </div>
  );
}

/* ── Module icons (inline SVG) ───────────────────────────────── */

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function BusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6v6" />
      <path d="M16 6v6" />
      <path d="M2 12h20" />
      <path d="M18 18h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
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
