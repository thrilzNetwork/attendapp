'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, Bell, Bus, Check, CheckCircle, ClipboardList, DollarSign, Globe, MapPin, Phone, QrCode, ShieldCheck, Store, Truck, User, Users, Utensils } from 'lucide-react';
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
const TEAL_BRIGHT = '#15b79e';


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

      {/* ANNOUNCEMENT BAR */}
      <div className="bg-gray-900 text-white text-center py-2 px-4 relative">
        <p className="text-[12px] font-semibold">
          Now live at our first property &middot; Attenda Ordering coming soon
        </p>
      </div>

      {/* NAV */}
      <nav className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: TEAL }}>
              <span className="text-white font-black text-[16px] tracking-tight">A</span>
            </div>
            <span className="font-bold text-[17px] text-gray-900 tracking-tight">attenda</span>
          </a>
          <div className="hidden md:flex items-center gap-7">
            <a href="#platform" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Platform</a>
            <a href="#modules" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Software</a>
            <a href="#case-study" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Case Study</a>
            <a href="/blog" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Blog</a>
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

      {/* HERO — sharper copy with revenue + labor above the fold */}
      <section className="relative py-20 md:py-28 px-5 bg-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.4] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #d0d5dd 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-5">
              <h6 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-4">
                Hotel Operations Software
              </h6>
              <h1 className="text-[40px] md:text-[56px] lg:text-[60px] leading-[1.05] font-black tracking-tight text-gray-900 mb-6">
                One Solution.<br />
                <span style={{ color: '#0D9488' }}>Built For Independent Hotels.</span>
              </h1>
              <p className="text-[18px] text-gray-600 leading-relaxed mb-8">
                Attenda is the operating system for independent hotels &mdash; guest requests, staff tasks, <strong>labor</strong>, vendors, shuttle, and <strong>revenue</strong> in one thread. No app, no rip-and-replace, no monthly per-room upcharge.
              </p>
              <a href="#demo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-bold text-[16px] transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                style={{ backgroundColor: '#15b79e', color: '#000' }}>
                Schedule a Demo <ArrowRight size={18} />
              </a>
              <p className="text-[13px] text-gray-500 mt-4">
                15-minute call. No slide deck. No commitment.
              </p>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <HeaderMockup />
            </div>
          </div>
        </div>
      </section>

      {/* WHY ATTENDA — 6-point grid (Inn-Flow pattern) */}
      <section className="py-16 md:py-24 px-5 bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-700">Built for independent hotels</span>
            </div>
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">Why hotel teams choose Attenda</h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
              One thread. Every role.<br />
              <span style={{ color: TEAL }}>No apps for guests.</span>
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              A single platform designed around how independent hotels actually operate &mdash; not a reskinned chatbot or a white-labeled marketplace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: QrCode, title: 'Zero apps for guests', desc: 'A QR code in the room. No download, no account, no app store. Every feature loads in the browser in under five seconds.' },
              { icon: Users, title: 'Built by hoteliers', desc: 'Front-desk to GM workflows. Not a tech team guessing what shifts look like. Attenda runs on the founder&apos;s own properties.' },
              { icon: DollarSign, title: 'Revenue your PMS misses', desc: 'Shuttle bookings, in-room dining, late checkout &mdash; revenue that walked past the front desk before. Now attributed and tracked.' },
              { icon: ClipboardList, title: 'One thread for the whole property', desc: 'Guest request &rarr; staff task &rarr; vendor job &rarr; GM dashboard. No sticky notes, no radio calls, no missed handoffs.' },
              { icon: Store, title: 'Partner-ready architecture', desc: 'Restaurants plug into Attenda, not UberEats. Hotels earn a share of every order. 10% flat vs 30% the delivery apps charge.' },
              { icon: Globe, title: 'Works alongside your PMS', desc: 'No rip-and-replace. Attenda runs beside your current system from day one. 11 days from contract to live.' },
            ].map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${TEAL}10` }}>
                    <ItemIcon size={20} style={{ color: TEAL }} />
                  </div>
                  <h4 className="text-[16px] font-black text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-[14px] text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FULL PLATFORM INVENTORY — 6 tabbed cards */}
      <PlatformTabs />

      {/* APP BY ROLE — existing showcase (keep) */}
      <section id="modules" className="py-16 md:py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
              One Platform &middot; Four Perspectives
            </h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
              Built for every role<br className="hidden md:block" />
              <span style={{ color: TEAL }}>in your property.</span>
            </h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              Tap any role to see Attenda from their perspective &mdash; no slide deck, no gate, just the actual screens they use every shift.
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
                        <p className="text-[13px] text-gray-600">Transport schedules, local attractions, in-room dining menus &mdash; all from the same QR code.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Zero apps for the guest</span>
                  </div>
                </div>
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
                  <h4 className="text-[26px] md:text-[32px] font-black text-gray-900 mb-3 leading-tight">One dashboard. Every tool.</h4>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>&check;</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Dashboard with live stats</p>
                        <p className="text-[13px] text-gray-600">Pending requests, staff on duty, avg response time, today&apos;s activity &mdash; at a glance.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>&check;</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Checklists inline</p>
                        <p className="text-[13px] text-gray-600">Start a housekeeping or maintenance checklist right from the Dashboard.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>&check;</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Schedules with day-off requests</p>
                        <p className="text-[13px] text-gray-600">Weekly schedule grid, color-coded by department.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>&check;</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Guest requests + staff chat</p>
                        <p className="text-[13px] text-gray-600">Accept, assign, mark done. Staff channel for internal coordination.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Email+password login &middot; Department-filtered views</span>
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
                  <h4 className="text-[26px] md:text-[32px] font-black text-gray-900 mb-3 leading-tight">Total visibility. One screen.</h4>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>&check;</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">KPI dashboards with trend tracking</p>
                        <p className="text-[13px] text-gray-600">RevPAR, occupancy, response times, revenue per channel.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>&check;</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Revenue attribution</p>
                        <p className="text-[13px] text-gray-600">See exactly what revenue came through Attenda &mdash; shuttle, dining, late checkout.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>&check;</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Staff & schedule management</p>
                        <p className="text-[13px] text-gray-600">Approve PTO, manage shifts, view department coverage.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${TEAL}15` }}>
                        <span className="text-[11px] font-black" style={{ color: TEAL }}>&check;</span>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-gray-900">Daily brief & property settings</p>
                        <p className="text-[13px] text-gray-600">Post GM notes. Manage shuttle, QR codes, room types, brand.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Real-time &middot; Every shift &middot; Every dollar</span>
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
                    Do Business With Attenda
                  </div>
                  <h4 className="text-[26px] md:text-[32px] font-black text-gray-900 mb-3 leading-tight">
                    Direct access to <span style={{ color: TEAL }}>every guest in every room.</span>
                  </h4>
                  <p className="text-[13px] text-gray-600 mb-5 leading-relaxed">
                    Attenda is the guest&apos;s front door &mdash; the QR code in the room, the app in their browser, the thread connecting them to the property. Partner with us and your business shows up where guests are already looking.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { icon: Utensils, title: 'Restaurants', desc: '10% flat. Driver included. Hotel guests ordering direct.' },
                      { icon: Truck, title: 'Services', desc: 'Amenities, maintenance, laundry &mdash; vendors plugged in.' },
                      { icon: MapPin, title: 'Experiences', desc: 'Tours, boat rentals, attractions. Booked from the room.' },
                      { icon: Store, title: 'Brands', desc: 'Mission-aligned brands. Reach guests who opt in.' },
                    ].map((c, i) => {
                      const CIcon = c.icon;
                      return (
                        <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${TEAL}12` }}>
                            <CIcon size={16} style={{ color: TEAL }} />
                          </div>
                          <div className="text-[13px] font-bold text-gray-900 mb-0.5">{c.title}</div>
                          <div className="text-[11px] text-gray-500 leading-snug">{c.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>You bring the product. We bring the hotel.</span>
                  </div>
                  <a href="/partner"
                    className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl text-white font-bold text-[13px] transition-all hover:shadow-md self-start"
                    style={{ backgroundColor: TEAL }}>
                    Apply to partner <ArrowRight size={14} />
                  </a>
                </div>
                <div className="p-8 md:p-10 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
                  <PartnerPortalMockup />
                </div>
              </div>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="text-center mt-10">
            <a href="#demo"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg font-bold text-[15px] shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: '#15b79e', color: '#000' }}>
              See it on your property <ArrowRight size={16} />
            </a>
            <div className="mt-3 text-[12px] text-gray-500">15-min call &middot; No slide deck &middot; No commitment</div>
          </div>
        </div>
      </section>

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
                    'Onboarding & QR setup &mdash; $0',
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

      {/* PROVEN RESULTS */}
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
            <KpiTileDark value="4&rarr;1" label="Tools replaced" />
            <KpiTileDark value="11" label="Days to live" />
            <KpiTileDark value="0" label="Apps for guests" />
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section id="case-study" className="py-12 md:py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-5 lg:order-1 order-2">
              <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 p-8 md:p-12 aspect-[4/5] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white shadow-md flex items-center justify-center mb-4">
                    <span className="text-3xl" style={{ color: '#0D9488' }}>â˜…</span>
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
                &ldquo;One thread. Every room knew what was happening &mdash; us, the staff, the vendors. Nobody was guessing. We onboarded in 11 days and the front desk started capturing revenue we used to walk past.&rdquo;
              </h2>
              <div className="border-l-4 pl-5" style={{ borderColor: '#15b79e' }}>
                <div className="text-[15px] font-bold text-gray-900">General Manager</div>
                <div className="text-[14px] text-gray-500">42-room boutique near PortMiami, Florida</div>
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
                      <div className="text-[48px] font-black leading-none mb-1" style={{ color: TEAL }}>$16,247</div>
                      <div className="text-[12px] text-gray-500 mb-5">+ partner orders + late checkout + shuttle</div>
                      <div className="grid grid-cols-4 gap-2 h-24 mb-4">
                        {[
                          { m: 'Feb', v: 0.45, val: '$2.1K' },
                          { m: 'Mar', v: 0.62, val: '$3.4K' },
                          { m: 'Apr', v: 0.85, val: '$4.8K' },
                          { m: 'May', v: 1.0, val: '$5.9K' },
                        ].map((b, i) => (
                          <div key={i} className="flex flex-col items-center justify-end">
                            <div className="text-[8px] text-gray-500 font-bold mb-1">{b.val}</div>
                            <div className="w-full rounded-t transition-all duration-1000"
                              style={{ height: `${b.v * 100}%`, backgroundColor: TEAL, opacity: 0.7 + i * 0.1 }} />
                            <div className="text-[9px] font-bold text-gray-500 mt-1">{b.m}</div>
                          </div>
                        ))}
                      </div>
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

      {/* DO BUSINESS WITH ATTENDA — multi-category partner section */}
      <section className="border-y border-gray-200 bg-[#F9FAFB]">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[11px] font-bold tracking-wider text-gray-600 uppercase">Do Business With Attenda</span>
            </div>
            <h2 className="text-[30px] md:text-[40px] font-black tracking-tight text-gray-900 leading-[1.05] mb-3">
              Your business in front of<br />every guest in every room.
            </h2>
            <p className="text-[16px] text-gray-600 max-w-2xl mx-auto">
              Attenda puts you inside the hotel experience &mdash; right where guests are already looking. Restaurants, services, experiences, and brands that align with our mission.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[
              {
                icon: Utensils,
                title: 'Restaurants',
                desc: '10% commission. Driver network included. Every order from a guest in the building &mdash; not competing on UberEats.',
                link: '/partner?type=restaurant',
              },
              {
                icon: Truck,
                title: 'Services & Vendors',
                desc: 'Housekeeping, maintenance, laundry, amenities &mdash; plug into hotel ops through Attenda\'s vendor portal.',
                link: '/partner?type=service',
              },
              {
                icon: MapPin,
                title: 'Experiences & Tours',
                desc: 'Excursions, boat rentals, local attractions. Guests book direct from their room. No third-party markup.',
                link: '/partner?type=experience',
              },
              {
                icon: Store,
                title: 'Brand Partners',
                desc: 'Brands that understand independent hospitality. Reach guests who care where their money goes.',
                link: '/partner?type=brand',
              },
            ].map((p, i) => {
              const PIcon = p.icon;
              return (
                <a key={i} href={p.link}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${TEAL}12` }}>
                    <PIcon size={22} style={{ color: TEAL }} />
                  </div>
                  <h4 className="text-[17px] font-black text-gray-900 mb-1.5 group-hover:opacity-80 transition-opacity">{p.title}</h4>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{p.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-[12px] font-bold" style={{ color: TEAL }}>
                    Apply now <ArrowRight size={14} />
                  </div>
                </a>
              );
            })}
          </div>

          <div className="text-center">
            <p className="text-[13px] text-gray-500 mb-4">
              <strong className="text-gray-700">Direct guest access.</strong> You bring the product. We bring the hotel.
            </p>
            <a href="/partner"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold text-[14px] shadow-sm hover:shadow-md transition-all"
              style={{ backgroundColor: TEAL }}>
              Apply to partner with Attenda <ArrowRight size={16} />
            </a>
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
            { q: 'What does Attenda include?', a: 'Guest experience (QR code check-in, chat, requests), Staff dashboard with checklists and schedules, GM KPIs and revenue tracking, Partner portal for vendors and restaurants &mdash; all connected on one thread.' },
            { q: 'Does the guest need to download an app?', a: 'No. They scan a QR code in the room &mdash; opens a mobile web app in their browser.' },
            { q: 'How are vendors onboarded?', a: 'Each vendor gets a lightweight web portal link. They see open jobs, accept, and update status.' },
            { q: 'What about my existing PMS?', a: 'Attenda runs alongside your current PMS from day one. No rip-and-replace.' },
            { q: 'How long does setup take?', a: '11 days from contract to live. We do QR design, branding, and staff training.' },
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
              Schedule a Demo
            </h2>
            <h3 className="text-[32px] md:text-[40px] font-black tracking-tight text-gray-900 mb-4">
              See Attenda on your property
            </h3>
            <p className="text-[16px] text-gray-600">
              Three fields. We&apos;ll show you Attenda from every role &mdash; guest, staff, GM, partner &mdash; on your property.
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
                className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 hover:shadow-lg transition-all flex flex-col relative overflow-hidden">
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
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">Built by a 15-Year Operator</h2>
            <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">The founder.</h3>
            <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
              Fifteen years in hospitality. Three PMS migrations. Two CRMs that died on the vine. One in-house tool that actually stuck.
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
                  Alejandro Soria has spent fifteen years inside hospitality &mdash; front desk, GM, owner-operator of independent properties in Texas and Florida. He&apos;s been the guy who picked the PMS, who trained the housekeeping staff, who took the 2am call when the boiler went out, and who wrote the &ldquo;do not lose this guest&rdquo; note in the margin of the shift log.
                </p>
                <p className="text-[16px] text-gray-700 leading-relaxed mb-5">
                  He&apos;s bought three PMS systems, integrated two CRMs, beta-tested four &ldquo;AI will transform hospitality&rdquo; platforms, and personally watched every one of them fail at the same point: the gap between the demo and the front desk. Attenda is what he built to close that gap &mdash; not a pitch deck, not a roadmap, an operations layer he runs on his own properties every day.
                </p>
                <p className="text-[16px] text-gray-700 leading-relaxed mb-6">
                  He doesn&apos;t do pilots, betas, or &ldquo;early access.&rdquo; Attenda is the tool he wished had existed in year one of his hospitality career &mdash; and the one he uses in year fifteen.
                </p>
                <blockquote className="border-l-4 pl-4 py-2 mb-6" style={{ borderColor: TEAL }}>
                  <p className="text-[17px] font-bold text-gray-900 italic leading-snug">
                    &ldquo;I&apos;ve sat through every demo. I&apos;ve signed the contracts. I&apos;ve been the GM on the call when the software didn&apos;t do what the sales rep said. Attenda exists because I got tired of paying for tools that don&apos;t work in the real world.&rdquo;
                  </p>
                  <div className="text-[12px] text-gray-500 mt-2 font-semibold">&mdash; Alejandro Soria, on why he stopped buying and started building</div>
                </blockquote>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">In hospitality</div>
                    <div className="text-[13px] font-black text-gray-900">15+ years</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Front desk &rarr; GM &rarr; owner</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">Properties run</div>
                    <div className="text-[13px] font-black text-gray-900">Independent &middot; TX & FL</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Boutique, 60&ndash;150 keys</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">Software burned through</div>
                    <div className="text-[13px] font-black text-gray-900">3 PMS &middot; 2 CRM &middot; 4 AI</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">None survived contact with guests</div>
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
                <li><a href="#case-study" className="hover:text-gray-900">Case Study</a></li>
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
              <span className="text-[13px] text-gray-600">attenda &mdash; the operations platform for independent hotels</span>
            </div>
            <div className="text-[12px] text-gray-500">
              &copy; 2026 Attenda. All rights reserved.
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

type PlatformAreaKey = 'ops' | 'revenue' | 'labor' | 'guest' | 'partners' | 'transport';

interface PlatformArea {
  key: PlatformAreaKey;
  icon: typeof ClipboardList;
  label: string;
  tagline: string;
  headline: string;
  sub: string;
  features: string[];
}

const PLATFORM_AREAS: PlatformArea[] = [
  {
    key: 'ops', icon: ClipboardList, label: 'Operations',
    tagline: 'The live board',
    headline: 'Every request, task, and room &mdash; one live thread.',
    sub: 'Guest scans, staff executes, GM sees it happen. Nothing lives on sticky notes or radio calls.',
    features: [
      'Real-time request board &mdash; pending, in progress, completed',
      'Per-room message threads between guests and staff',
      'Task logs with timestamps for every shift',
      'Ops tools for housekeeping, engineering, and front desk',
      'Status changes visible to the GM the second they happen',
      'Full request history per room and per guest',
    ],
  },
  {
    key: 'revenue', icon: DollarSign, label: 'Revenue',
    tagline: 'The property earns',
    headline: 'Your property makes money on every order.',
    sub: 'In-app food ordering with a transparent fee split. The hotel takes a share.',
    features: [
      'Guest food ordering straight from the room &mdash; no app download',
      'Configurable platform fee and hotel revenue share per partner',
      'Shuttle pricing with per-slot overrides and charge tracking',
      'Order revenue visible on the GM dashboard daily',
      'Stripe-ready checkout &mdash; card on file, charge to room next',
      '10% flat vs the 30% delivery apps take from restaurants',
    ],
  },
  {
    key: 'labor', icon: Users, label: 'Labor & Staff',
    tagline: 'The roster, visible',
    headline: 'Know your team like you know your occupancy.',
    sub: 'Staff accounts carry role, department, and labor data &mdash; so the GM sees the whole roster.',
    features: [
      'Role-based accounts &mdash; staff, admin, manager, vendor, GM',
      'Departments, hire dates, and employment type per person',
      'PTO usage and minimum-hours tracking built in',
      'Granular permissions per staff member',
      'Email + password login &mdash; no shared PINs, full accountability',
      'Lazy-loaded staff dashboard, fast on any device',
    ],
  },
  {
    key: 'guest', icon: QrCode, label: 'Guest Experience',
    tagline: 'Scan and go',
    headline: 'One QR code replaces the binder, the flyer, and the front-desk call.',
    sub: 'Guests get the whole property in their browser &mdash; WiFi, facilities, safety, food, shuttle &mdash; in under five seconds.',
    features: [
      'QR per room &mdash; no app store, no download, no account',
      'WiFi name and password one tap away',
      'Facilities, safety, transport, and dining pages &mdash; GM-editable',
      'Welcome letter with the manager\'s name and team photo',
      'Review routing to Google, TripAdvisor, and Yelp',
      'Guest validation tied to checkout date &mdash; sessions expire clean',
    ],
  },
  {
    key: 'partners', icon: Store, label: 'Vendors & Partners',
    tagline: 'The outside, inside',
    headline: 'Restaurants and vendors plug into your property.',
    sub: 'Nearby partners get menus, orders, and payouts through Attenda.',
    features: [
      'Partner portal with live menu management',
      'Inbound partner applications &mdash; your pipeline, not cold calls',
      'Per-partner fee percent and revenue share settings',
      'POS-ready architecture &mdash; integrations coming soon',
      'Ratings, hours, distance, and photos per partner',
      'Activate or pause a partner with one switch',
    ],
  },
  {
    key: 'transport', icon: Bus, label: 'Transport & Shuttle',
    tagline: 'Wheels managed',
    headline: 'Shuttle ops without the clipboard.',
    sub: 'Routes, time slots, capacity, and ad-hoc rides &mdash; booked by guests, assigned to drivers, priced by the property.',
    features: [
      'Named routes &mdash; airport, cruise port, or custom',
      'Time slots with per-day schedules and capacity limits',
      'Guest self-booking with party size and notes',
      'Ad-hoc ride requests assigned to drivers in real time',
      'Per-slot price overrides and event labels',
      'No-show and cancellation tracking per booking',
    ],
  },
];

function PlatformTabs() {
  const [activeArea, setActiveArea] = useState<PlatformAreaKey>('ops');
  const area = PLATFORM_AREAS.find(a => a.key === activeArea)!;
  const AreaIcon = area.icon;

  return (
    <section id="platform" className="py-16 md:py-24 px-5 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">The Full Platform</h2>
          <h3 className="text-[34px] md:text-[48px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
            Not a QR messaging app.<br />
            <span style={{ color: TEAL }}>A hotel operating system.</span>
          </h3>
          <p className="text-[16px] md:text-[18px] text-gray-600 max-w-2xl mx-auto">
            Six systems, one thread. Everything below is live in production &mdash; not a roadmap slide.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
          {PLATFORM_AREAS.map(a => {
            const AIcon = a.icon;
            const isActive = a.key === activeArea;
            return (
              <button key={a.key}
                onClick={() => setActiveArea(a.key)}
                className={`px-5 py-3 rounded-xl text-[14px] font-bold transition-all border-2 ${
                  isActive ? 'shadow-md scale-[1.02]' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                }`}
                style={isActive ? { borderColor: TEAL, backgroundColor: `${TEAL}08` } : {}}
              >
                <AIcon size={16} className="inline-block mr-1.5" />
                {a.label}
              </button>
            );
          })}
        </div>

        {/* Active panel */}
        <div key={activeArea} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="p-8 md:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4" style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: TEAL }} />
                {area.tagline}
              </div>
              <h4 className="text-[26px] md:text-[32px] font-black text-gray-900 mb-3 leading-tight" dangerouslySetInnerHTML={{ __html: area.headline }} />
              <p className="text-[15px] text-gray-600 leading-relaxed mb-6 max-w-xl">{area.sub}</p>
              <ul className="space-y-3">
                {area.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px] text-gray-700 leading-snug">
                    <Check size={16} className="mt-0.5 shrink-0" style={{ color: TEAL_BRIGHT }} />
                    <span dangerouslySetInnerHTML={{ __html: f }} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 md:p-10 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${TEAL}15` }}>
                      <AreaIcon size={14} style={{ color: TEAL }} />
                    </div>
                    <span className="text-[12px] font-bold text-gray-700">{area.label}</span>
                  </div>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: TEAL_BRIGHT }} />
                </div>
                <div className="p-5">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">What&apos;s included</div>
                  <ul className="space-y-3">
                    {area.features.slice(0, 4).map(f => (
                      <li key={f} className="flex items-start gap-2 text-[12px] text-gray-700 leading-snug">
                        <Check size={14} className="mt-0.5 shrink-0" style={{ color: TEAL_BRIGHT }} />
                        <span dangerouslySetInnerHTML={{ __html: f }} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <a href="#modules"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg font-bold text-[15px] shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
            style={{ backgroundColor: '#15b79e', color: '#000' }}>
            See it by role <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   KPI tile dark (Proven Results strip)
   ──────────────────────────────────────────────────────────── */

function HeaderMockup() {
  return (
    <div className="relative w-full">
      <div className="rounded-2xl overflow-hidden bg-white shadow-2xl border border-gray-200">
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-3 h-7 bg-white rounded-md border border-gray-200 flex items-center px-3 text-[11px] text-gray-500 font-semibold">
            attenda.app/staff · Your Property
          </div>
        </div>
        <Image
          src="/images/staff-desktop.png"
          alt="Staff desktop dashboard showing real-time requests, room status, and activity feed"
          width={640}
          height={400}
          className="w-full h-auto block"
          priority
        />
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

/* PhoneGuestMockup — Phone frame showing the REAL guest app 2x2 grid */
function PhoneGuestMockup() {
  return (
    <div className="relative mx-auto w-[200px]" style={{ filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.15))' }}>
      <div className="bg-black rounded-[28px] p-2 shadow-xl">
        <div className="relative bg-white rounded-[24px] overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60px] h-[16px] bg-black rounded-b-xl z-10" />
          <Image
            src="/images/guest-app.png"
            alt="Guest app with 2x2 grid: Welcome, Transport, Facilities, Safety, Nearby, Food, Review, Message Us"
            width={200}
            height={432}
            className="w-full h-auto block"
          />
        </div>
      </div>
      <div className="text-center mt-2">
        <div className="text-[8px] uppercase tracking-[0.15em] text-gray-500 font-bold">THE ACTUAL GUEST APP</div>
      </div>
    </div>
  );
}

/* StaffDashboardMockup — Browser frame showing actual staff dashboard */
function StaffDashboardMockup() {
  return (
    <div className="w-full max-w-[320px] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
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
      <Image
        src="/images/staff-app.png"
        alt="Staff dashboard"
        width={320}
        height={500}
        className="w-full h-auto block"
      />
    </div>
  );
}

/* GmDashboardMockup — Browser frame showing actual GM dashboard */
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
      <Image
        src="/images/gm-dashboard.png"
        alt="GM dashboard"
        width={320}
        height={480}
        className="w-full h-auto block"
      />
    </div>
  );
}

/* PartnerPortalMockup — Real guest ordering screenshot */
function PartnerPortalMockup() {
  return (
    <div className="w-full max-w-[280px] mx-auto" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.18))' }}>
      <div className="relative rounded-[40px] border-[10px] border-gray-900 bg-gray-900 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80px] h-[20px] bg-gray-900 rounded-b-2xl z-10" />
        <div className="relative">
          <Image
            src="/images/guest-food.png"
            alt="Guest food ordering screen — browse menu, add items, order to room"
            width={280}
            height={607}
            className="w-full h-auto block"
          />
        </div>
      </div>
      <div className="text-center mt-4">
        <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-bold">Guests order in under 30s</div>
        <div className="text-sm font-black text-gray-900 mt-1">Scan. Browse. Order. Eat.</div>
        <div className="text-[10px] text-gray-500 mt-0.5">No app · No download · No account</div>
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
