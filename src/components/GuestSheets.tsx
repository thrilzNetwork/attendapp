'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X, CheckCircle, Wifi, Check, Coffee, Dumbbell, Printer,
  WashingMachine, IceCream, Car, Bus, Flame, AlertTriangle,
  AlarmSmoke, Crosshair, ShieldCheck, Phone, Star, ExternalLink,
  Plane, MapPin, Utensils, ShoppingBag, Bell, Globe,
  User, Clock, DoorOpen, TrendingUp,
} from 'lucide-react';
import {
  supabase, getHotelConfig, HotelConfig,
  FacilitiesAmenity,
  createShuttleRequest,
} from '@/lib/supabase';
import { TaxiCallerRide } from '@/components/TaxiCallerRide';
import { AirportSchedule } from '@/components/AirportSchedule';

const BURGUNDY = '#6B1D3C';

/* ── Modal wrapper — centered, same style as check-in modal.
      wide = Request Now spec variant: 32px radius, 480/540/600 widths,
      52% overlay, 48px close, 25px/750 title. ── */
export function GuestSheet({
  open, onClose, title, children, fullHeight = false, wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  fullHeight?: boolean;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — clicking it closes the modal, nothing else moves */}
      <div
        className={wide ? 'absolute inset-0 bg-black/[0.52]' : 'absolute inset-0 bg-black/50'}
        onClick={onClose}
      />

      {/* Modal card — wide variant per Request Now spec (design_reference: screenshot) */}
      <div
        className={
          wide
            ? 'relative bg-white rounded-[32px] w-full max-w-[480px] md:max-w-[540px] lg:max-w-[600px] shadow-[0_16px_48px_rgba(0,0,0,0.12)] flex flex-col'
            : 'relative bg-white rounded-[20px] w-full shadow-2xl flex flex-col'
        }
        style={
          wide
            ? { maxHeight: '90dvh' }
            : {
                maxWidth: 380,
                maxHeight: fullHeight ? '88dvh' : '85dvh',
                height: fullHeight ? '88dvh' : undefined,
              }
        }
      >
        {/* Header */}
        {wide ? (
          <div className="shrink-0 flex items-center justify-between px-7 pt-7 pb-6 border-b border-gray-100">
            <h2 className="text-[25px] text-[#202735]" style={{ fontWeight: 750 }}>{title}</h2>
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center active:scale-90 shrink-0"
            >
              <X size={20} className="text-[#6B7280]" />
            </button>
          </div>
        ) : (
          <div className="shrink-0 flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <h2 className="text-[18px] font-bold text-black">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-90"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className={fullHeight ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'flex-1 overflow-y-auto'}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Request Now ───────────────────────────────────────────── */

const REQUEST_CATEGORIES = [
  {
    id: 'towels',
    icon: <Bell size={22} />,
    label: 'Towels',
    type: 'Amenity Request',
    details: 'Towel Service',
    color: '#429383',
    bg: '#E9F4F2',
  },
  {
    id: 'housekeeping',
    icon: <WashingMachine size={22} />,
    label: 'Housekeeping',
    type: 'Housekeeping',
    details: 'Cleaning Service',
    color: '#7C3AED',
    bg: '#F3EEFF',
  },
  {
    id: 'room_service',
    icon: <Utensils size={22} />,
    label: 'Room Service',
    type: 'Amenity Request',
    details: 'Room Service / Food',
    color: '#D28128',
    bg: '#FCF3E9',
  },
  {
    id: 'amenities',
    icon: <ShoppingBag size={22} />,
    label: 'Amenities',
    type: 'Amenity Request',
    details: 'Toiletries / Amenities',
    color: '#D33280',
    bg: '#FCEEF5',
  },
  {
    id: 'late_checkout',
    icon: <Clock size={22} />,
    label: 'Late Check-out',
    type: 'Front Desk Request',
    details: 'Late Checkout',
    color: '#3868EB',
    bg: '#ECF1FF',
  },
  {
    id: 'wake_up',
    icon: <Bell size={22} />,
    label: 'Wake-Up Call',
    type: 'Front Desk Request',
    details: 'Wake-Up Call',
    color: '#38976B',
    bg: '#E8F5F0',
  },
  {
    id: 'maintenance',
    icon: <Flame size={22} />,
    label: 'Maintenance',
    type: 'Maintenance',
    details: 'Maintenance Issue',
    color: '#DA3D38',
    bg: '#FBEDED',
  },
  {
    id: 'front_desk',
    icon: <Phone size={22} />,
    label: 'Call Front Desk',
    type: 'Front Desk Request',
    details: 'Please contact guest',
    color: '#6B7280',
    bg: '#F1F2F4',
  },
];

/* ── Service detail screens (v2): tap card → panel → submit ───── */

const TEXT_PRIMARY = '#202735';
const TEXT_SECONDARY = '#9BA4B4';
const BORDER = '#EDF0F3';

function ScreenBackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#202735] active:scale-95">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      Back
    </button>
  );
}

function ScreenFrame({ title, subtitle, onBack, children }: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="px-6 pt-4">
        <ScreenBackButton onBack={onBack} />
        <h3 className="text-[20px] text-[#202735] mt-3" style={{ fontWeight: 750 }}>{title}</h3>
        {subtitle && <p className="text-[14px] text-[#9BA4B4] mt-1">{subtitle}</p>}
      </div>
      <div className="px-6 py-4 flex-1">{children}</div>
    </div>
  );
}

function SubmitButton({ label, onClick, disabled }: {
  label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-[16px] text-white font-bold text-[15px] py-3.5 shadow-sm active:scale-[0.98] transition-transform disabled:opacity-50"
      style={{ backgroundColor: BURGUNDY }}
    >
      {disabled ? 'Sending…' : label}
    </button>
  );
}

const inputCls = 'w-full bg-gray-50 rounded-xl px-4 py-3 text-[15px] text-[#202735] outline-none border border-[#EDF0F3] placeholder:text-[#9BA4B4]';
const labelCls = 'text-[12px] font-semibold text-[#6B7280] mb-1.5 block';

type ScreenProps = {
  hotel: HotelConfig | null;
  room: string;
  sending: boolean;
  onSubmit: (type: string, details: string, label: string) => void;
  onBack: () => void;
};

function ScreenTowels({ sending, onSubmit, onBack }: ScreenProps) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  return (
    <ScreenFrame title="Request Towels" subtitle="Need fresh towels? We've got you covered." onBack={onBack}>
      <div className="space-y-4">
        <div>
          <span className={labelCls}>How many towel sets?</span>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl border border-[#EDF0F3] px-3 py-2.5">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-full bg-white border border-[#EDF0F3] text-[20px] font-bold text-[#202735] active:scale-95">−</button>
            <span className="text-[17px] font-bold text-[#202735]">{qty} {qty === 1 ? 'set' : 'sets'}</span>
            <button onClick={() => setQty(q => Math.min(2, q + 1))} className="w-10 h-10 rounded-full bg-white border border-[#EDF0F3] text-[20px] font-bold text-[#202735] active:scale-95">+</button>
          </div>
          {qty >= 2 && <p className="text-[11px] text-[#9BA4B4] mt-1 text-center">Maximum 2 towel sets per request.</p>}
        </div>
        <div>
          <span className={labelCls}>Notes</span>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any special instructions?" className={inputCls} />
        </div>
        <SubmitButton
          label="Request Towels"
          disabled={sending}
          onClick={() => onSubmit('Amenity Request', `Towel Service · ${qty} set${qty > 1 ? 's' : ''}${notes ? ` · Notes: ${notes}` : ''}`, 'Towels')}
        />
      </div>
    </ScreenFrame>
  );
}

function ScreenHousekeeping({ onSubmit, sending, onBack }: ScreenProps) {
  const [svc, setSvc] = useState<string>('');
  const [notes, setNotes] = useState('');
  return (
    <ScreenFrame title="Housekeeping Service" subtitle="Our team will review your request based on availability." onBack={onBack}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#F3EEFF]/60 border border-[#EDF0F3] px-4 py-3">
          <p className="text-[12px] font-bold text-[#7C3AED] mb-1">Our Housekeeping Policy</p>
          <p className="text-[13px] text-[#202735] leading-relaxed">Service is available on request. Submitting a request does not guarantee service — our team confirms based on availability.</p>
        </div>
        <div>
          <span className={labelCls}>What do you need?</span>
          <div className="grid grid-cols-2 gap-2">
            {['Full Room Cleaning', 'Trash Removal', 'Fresh Linens', 'Other'].map(t => (
              <button key={t} onClick={() => setSvc(t)}
                className={`rounded-xl border px-3 py-2.5 text-[13px] font-semibold text-left active:scale-[0.98] ${svc === t ? 'border-[#7C3AED] bg-[#F3EEFF] text-[#7C3AED]' : 'border-[#EDF0F3] bg-white text-[#202735]'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={labelCls}>Additional Notes</span>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Anything we should know?" className={inputCls} />
        </div>
        <SubmitButton
          label="Request Housekeeping"
          disabled={sending || !svc}
          onClick={() => onSubmit('Housekeeping', `${svc}${notes ? ` · Notes: ${notes}` : ''}`, 'Housekeeping')}
        />
        <p className="text-[11px] text-[#9BA4B4] text-center">Submitting a request does not guarantee service.</p>
      </div>
    </ScreenFrame>
  );
}

function ScreenRoomService({ hotel, onBack }: ScreenProps) {
  const phone = hotel?.frontDeskPhone || '';
  return (
    <ScreenFrame title="Today's Room Service Menu" subtitle="Food service is provided by our selected restaurant partner." onBack={onBack}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#EDF0F3] p-6 text-center">
          <Utensils size={28} className="mx-auto text-[#D28128] mb-2" />
          <p className="text-[15px] font-bold text-[#202735]">Today's menu is not available yet.</p>
          <p className="text-[13px] text-[#9BA4B4] mt-1">Your order can be placed by phone in the meantime.</p>
        </div>
        <a href={`tel:${phone}`} className="block text-center">
          <button className="w-full rounded-[16px] text-white font-bold text-[15px] py-3.5 shadow-sm active:scale-[0.98] transition-transform" style={{ backgroundColor: BURGUNDY }}>
            Order Now — Call
          </button>
        </a>
        <p className="text-[11px] text-[#9BA4B4] text-center">Tap to call the Front Desk{phone ? ` at ${phone}` : ''} and place your order.</p>
      </div>
    </ScreenFrame>
  );
}

function ScreenAmenities({ onSubmit, sending, onBack }: ScreenProps) {
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const ITEMS = ['Comb', 'Toothpaste', 'Toothbrush', 'Feminine Products', 'Shower Cap', 'Makeup Remover'];
  const chosen = ITEMS.filter(i => sel[i]);
  return (
    <ScreenFrame title="Request Amenities" subtitle="Forgot something? We're happy to help." onBack={onBack}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#EDF0F3] divide-y divide-[#EDF0F3]">
          {ITEMS.map(item => (
            <button key={item} onClick={() => setSel(s => ({ ...s, [item]: !s[item] }))}
              className="w-full flex items-center justify-between px-4 py-3 active:bg-gray-50">
              <span className="text-[15px] font-semibold text-[#202735]">{item}</span>
              <span className={`w-6 h-6 rounded-md border flex items-center justify-center ${sel[item] ? 'border-[#D33280] bg-[#D33280]' : 'border-[#EDF0F3]'}`}>
                {sel[item] && <CheckCircle size={14} className="text-white" />}
              </span>
            </button>
          ))}
        </div>
        <div>
          <span className={labelCls}>Notes</span>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Anything else you need?" className={inputCls} />
        </div>
        <SubmitButton
          label="Request Amenities"
          disabled={sending || chosen.length === 0}
          onClick={() => onSubmit('Amenity Request', `Toiletries / Amenities · ${chosen.join(', ')}${notes ? ` · Notes: ${notes}` : ''}`, 'Amenities')}
        />
        <p className="text-[11px] text-[#9BA4B4] text-center">Items are subject to availability.</p>
      </div>
    </ScreenFrame>
  );
}

const LATE_CHECKOUT_OPTIONS = [
  { time: '12:00 PM', fee: 0, price: 'Complimentary' },
  { time: '1:00 PM', fee: 15, price: '$15' },
  { time: '2:00 PM', fee: 30, price: '$30' },
];

function ScreenLateCheckout({ onSubmit, sending, onBack }: ScreenProps) {
  const [pick, setPick] = useState<number | null>(null);
  const sel = pick !== null ? LATE_CHECKOUT_OPTIONS[pick] : null;
  return (
    <ScreenFrame title="Request Late Check-out" subtitle="Need a little more time?" onBack={onBack}>
      <div className="space-y-4">
        <div className="space-y-2">
          {LATE_CHECKOUT_OPTIONS.map((o, i) => (
            <button key={o.time} onClick={() => setPick(i)}
              className={`w-full flex items-center justify-between rounded-xl border px-4 py-3.5 active:scale-[0.99] ${pick === i ? 'border-[#3868EB] bg-[#ECF1FF]' : 'border-[#EDF0F3] bg-white'}`}>
              <span className="text-[15px] font-bold text-[#202735]">{o.time}</span>
              <span className={`text-[14px] font-bold ${pick === i ? 'text-[#3868EB]' : 'text-[#9BA4B4]'}`}>{o.price}</span>
            </button>
          ))}
        </div>
        {sel && (
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-[#202735]">
            <span className="font-bold">Summary:</span> {sel.time} · {sel.price === 'Complimentary' ? 'No fee' : `${sel.price} fee on approval`}
          </div>
        )}
        <SubmitButton
          label="Request Late Check-out"
          disabled={sending || pick === null}
          onClick={() => sel && onSubmit('Front Desk Request', `Late Checkout · ${sel.time}${sel.fee > 0 ? ` (fee ${sel.price})` : ' (complimentary)'}`, `Late Check-out ${sel.time}`)}
        />
        <p className="text-[11px] text-[#9BA4B4] text-center">Late check-out is subject to availability and hotel approval. Fees may apply.</p>
      </div>
    </ScreenFrame>
  );
}

function ScreenWakeUp({ onSubmit, sending, onBack }: ScreenProps) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [time, setTime] = useState('');
  const today = date;
  return (
    <ScreenFrame title="Schedule a Wake-Up Call" subtitle="We'll help you start your day on time." onBack={onBack}>
      <div className="space-y-4">
        <div>
          <span className={labelCls}>Date</span>
          <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <span className={labelCls}>Time</span>
          <input type="time" step={300} value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
          <p className="text-[11px] text-[#9BA4B4] mt-1">Calls in 5-minute intervals, hotel local time.</p>
        </div>
        {date && time && (
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-[#202735]">
            <span className="font-bold">Wake-up call:</span> {date} · {time}
          </div>
        )}
        <SubmitButton
          label="Request Wake-Up Call"
          disabled={sending || !date || !time}
          onClick={() => onSubmit('Front Desk Request', `Wake-Up Call · ${date} at ${time}`, 'Wake-Up Call')}
        />
        <p className="text-[11px] text-[#9BA4B4] text-center">Sent to the Front Desk for confirmation.</p>
      </div>
    </ScreenFrame>
  );
}

function ScreenMaintenance({ onSubmit, sending, onBack }: ScreenProps) {
  const [cat, setCat] = useState('');
  const [desc, setDesc] = useState('');
  const [perm, setPerm] = useState(false);
  const CATS = ['Shower', 'Air Conditioning', 'Television', 'Other'];
  return (
    <ScreenFrame title="Report a Maintenance Issue" subtitle="Something not working? Let us know." onBack={onBack}>
      <div className="space-y-4">
        <div>
          <span className={labelCls}>What's the issue?</span>
          <div className="grid grid-cols-2 gap-2">
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`rounded-xl border px-3 py-2.5 text-[13px] font-semibold text-left active:scale-[0.98] ${cat === c ? 'border-[#DA3D38] bg-[#FBEDED] text-[#DA3D38]' : 'border-[#EDF0F3] bg-white text-[#202735]'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={labelCls}>Description</span>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Please describe the issue." className={inputCls} />
        </div>
        <label className="flex items-start gap-2.5 rounded-xl border border-[#EDF0F3] px-4 py-3 active:scale-[0.99]">
          <input type="checkbox" checked={perm} onChange={e => setPerm(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#DA3D38]" />
          <span className="text-[13px] font-semibold text-[#202735]">Staff may enter my room if I'm away.</span>
        </label>
        <SubmitButton
          label="Submit Maintenance Request"
          disabled={sending || !cat || !desc.trim() || !perm}
          onClick={() => onSubmit('Maintenance', `Maintenance Issue · ${cat}: ${desc.trim()}${perm ? ' · Permission to enter granted' : ''}`, cat)}
        />
        <p className="text-[11px] text-[#9BA4B4] text-center">For urgent safety issues, please call the Front Desk immediately.</p>
      </div>
    </ScreenFrame>
  );
}

function ScreenFrontDesk({ hotel, onBack }: ScreenProps) {
  const phone = hotel?.frontDeskPhone || '';
  return (
    <ScreenFrame title="Contact Front Desk" subtitle="We're just a phone call away." onBack={onBack}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#EDF0F3] p-6 text-center">
          {hotel?.name && <p className="text-[16px] font-bold text-[#202735] mb-1">{hotel.name}</p>}
          {phone ? <p className="text-[15px] text-[#9BA4B4]">{phone}</p> : <p className="text-[13px] text-[#9BA4B4]">Number available at the hotel.</p>}
        </div>
        <a href={phone ? `tel:${phone}` : undefined} className="block">
          <button className="w-full rounded-[16px] text-white font-bold text-[15px] py-3.5 shadow-sm active:scale-[0.98] transition-transform" style={{ backgroundColor: BURGUNDY }}>
            📞 Call Front Desk
          </button>
        </a>
      </div>
    </ScreenFrame>
  );
}

const REQUEST_SCREENS: Record<string, React.FC<ScreenProps>> = {
  towels: ScreenTowels,
  housekeeping: ScreenHousekeeping,
  room_service: ScreenRoomService,
  amenities: ScreenAmenities,
  late_checkout: ScreenLateCheckout,
  wake_up: ScreenWakeUp,
  maintenance: ScreenMaintenance,
  front_desk: ScreenFrontDesk,
};

export function MessageSheetContent() {
  const [guestName, setGuestName] = useState('Guest');
  const [guestRoom, setGuestRoom] = useState('?');
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [hotelColor, setHotelColor] = useState(BURGUNDY);
  const [screen, setScreen] = useState<string | null>(null);
  const [cfg, setCfg] = useState<HotelConfig | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        setGuestName(s.name || 'Guest');
        setGuestRoom(s.room || '?');
      } catch { localStorage.removeItem('guestSession'); }
    }
    getHotelConfig().then(h => {
      setCfg(h);
      if (h?.brandColor) setHotelColor(h.brandColor);
    });
  }, []);

  const sendRequest = async (type: string, details: string, label: string) => {
    if (sending) return;
    setSending(true);
    try {
      const hotel = cfg || await getHotelConfig();
      await supabase.from('requests').insert({
        hotel_id: hotel?.id,
        guest_name: guestName,
        room: guestRoom,
        type,
        details,
        status: 'pending',
      });
      if (hotel?.notificationEmail) {
        fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
          body: JSON.stringify({ type: 'new_request', data: { notificationEmail: hotel.notificationEmail, hotelName: hotel.name, guestName, room: guestRoom, requestType: type, details } }),
        }).catch(() => {});
      }
      setSent(label);
    } catch { /* ignore */ }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${hotelColor}15` }}>
          <CheckCircle size={32} style={{ color: hotelColor }} />
        </div>
        <h3 className="text-[18px] font-extrabold text-[#202735] mb-1">Request Sent!</h3>
        <p className="text-[14px] text-[#9BA4B4] mb-6">Your request has been sent to our team.</p>
        <div className="bg-gray-50 rounded-2xl px-4 py-3 text-[13px] text-gray-600 mb-6">
          <span className="font-semibold">{sent}</span> · Room {guestRoom}
        </div>
        <button onClick={() => { setSent(null); setScreen(null); }} className="text-[13px] font-bold" style={{ color: hotelColor }}>
          + Make another request
        </button>
      </div>
    );
  }

  // Service detail screen — tap card → panel → submit (v2 navigation)
  if (screen) {
    const Screen = REQUEST_SCREENS[screen];
    if (Screen) {
      return (
        <div className="flex-1 flex flex-col">
          <div className="shrink-0 px-6 pt-4">
            <ScreenBackButton onBack={() => setScreen(null)} />
          </div>
          <Screen
            hotel={cfg}
            room={guestRoom}
            sending={sending}
            onBack={() => setScreen(null)}
            onSubmit={(type, details, label) => sendRequest(type, details, label).then(() => setScreen(null))}
          />
        </div>
      );
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Pending Validation chip — soft gate: staff still receives + verifies the request */}
      <div className="mx-5 mt-3 rounded-xl bg-[#F1F2F4] px-4 py-2 text-[11px] font-semibold text-[#6B7280] text-center">
        Pending Validation · Our team is confirming your stay
      </div>
      <p className="text-[13.5px] text-[#9BA4B4] text-center px-6 pt-2 pb-3">How can we make your stay better?</p>
      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        {REQUEST_CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setScreen(cat.id)}
            className="h-[124px] flex flex-col items-center justify-center gap-2 rounded-[20px] border border-[#EDF0F3] bg-white px-2 shadow-[0_2px_4px_rgba(0,0,0,0.06)] active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: cat.bg, color: cat.color }}>
              {cat.icon}
            </div>
            <span className="text-[13.5px] font-bold text-[#202735] text-center leading-tight">{cat.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[12.5px] text-[#9BA4B4] text-center py-4">Room {guestRoom} · {guestName}</p>
    </div>
  );
}

/* ── Transport ────────────────────────────────────────────────────── */
export function TransportSheetContent() {
  return (
    <div className="overflow-y-auto flex-1">
      <div className="px-5 pt-2 pb-6">
        <OnDemandInner />
      </div>
    </div>
  );
}


interface PlaceResult {
  display_name: string;
  short_name: string;
  lat: number;
  lng: number;
}



export function TransportBooker({
  brandColor = BURGUNDY,
  defaultFromText = '',
  defaultToText = '',
  skipModeScreen = false,
}: {
  brandColor?: string;
  defaultFromText?: string;
  defaultToText?: string;
  skipModeScreen?: boolean;
}) {
  const [screen, setScreen] = useState<'mode' | 'schedule' | 'address' | 'confirm' | 'done' | 'taxi'>(skipModeScreen ? 'address' : 'mode');
  const [config, setConfig] = useState<HotelConfig | null>(null);

  // FROM field — fromTouched prevents autocomplete firing on pre-filled default
  const [fromText, setFromText] = useState(defaultFromText);
  const [fromTouched, setFromTouched] = useState(false);
  const [fromPlace, setFromPlace] = useState<PlaceResult | null>(null);
  const [fromSuggestions, setFromSuggestions] = useState<PlaceResult[]>([]);
  const [fromLoading, setFromLoading] = useState(false);

  // TO field
  const [toText, setToText] = useState(defaultToText);
  const [toPlace, setToPlace] = useState<PlaceResult | null>(null);
  const [toSuggestions, setToSuggestions] = useState<PlaceResult[]>([]);
  const [toLoading, setToLoading] = useState(false);

  // Booking details
  const [guestName, setGuestName] = useState('');
  const [room, setRoom] = useState('');
  const [pax, setPax] = useState(1);
  const [notes, setNotes] = useState('');
  const [tripDate, setTripDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [tripTime, setTripTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Properly persisted debounce timers across renders
  const debounceFrom = useRef<ReturnType<typeof setTimeout>>();
  const debounceTo = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    getHotelConfig().then(h => {
      setConfig(h);
      // Only pre-fill hotel name if no defaultFromText was provided
      if (!defaultFromText && h?.name) setFromText(h.name);
    });
    try {
      const gs = localStorage.getItem('guestSession');
      if (gs) { const s = JSON.parse(gs); setGuestName(s.name || ''); setRoom(s.room || ''); }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autocomplete for FROM — only fires after user has touched the field
  useEffect(() => {
    if (!fromTouched || fromText.length < 2 || fromPlace) { setFromSuggestions([]); return; }
    clearTimeout(debounceFrom.current);
    debounceFrom.current = setTimeout(async () => {
      setFromLoading(true);
      try {
        const res = await fetch(`/api/places-autocomplete?q=${encodeURIComponent(fromText)}`);
        setFromSuggestions(await res.json());
      } catch { setFromSuggestions([]); }
      finally { setFromLoading(false); }
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromText, fromPlace, fromTouched]);

  // Autocomplete for TO
  useEffect(() => {
    if (toText.length < 2 || toPlace) { setToSuggestions([]); return; }
    clearTimeout(debounceTo.current);
    debounceTo.current = setTimeout(async () => {
      setToLoading(true);
      try {
        const res = await fetch(`/api/places-autocomplete?q=${encodeURIComponent(toText)}`);
        setToSuggestions(await res.json());
      } catch { setToSuggestions([]); }
      finally { setToLoading(false); }
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toText, toPlace]);

  const handleBook = async () => {
    if (!guestName || !room) { setError('Name and room number are required.'); return; }
    if (fromText.length < 3) { setError('Please enter a pickup location.'); return; }
    if (!toPlace && toText.length < 3) { setError('Please enter a destination.'); return; }
    setSubmitting(true); setError('');
    try {
      await createShuttleRequest({
        hotel_id: config?.id || '',
        guest_name: guestName,
        room_number: room,
        pickup_location: fromPlace?.display_name || fromText,
        destination: toPlace?.display_name || toText,
        date: tripDate,
        time: tripTime || undefined,
        pax,
        notes: notes || undefined,
        status: 'pending',
      });
      setScreen('done');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to book.'); }
    finally { setSubmitting(false); }
  };

  const thirdParty = config?.transportContent?.third_party_name && config?.transportContent?.third_party_url
    ? { name: config.transportContent.third_party_name, url: config.transportContent.third_party_url, description: config.transportContent.third_party_description || '' }
    : null;

  // Screen: mode selection
  if (screen === 'mode') return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 text-center">How would you like to travel?</p>
      <button
        onClick={() => setScreen('schedule')}
        className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
      >
        <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <Bus size={26} className="text-emerald-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">Complementary Airport Shuttle</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">FREE</span>
          </div>
          <p className="text-[13px] text-gray-400 mt-1">Free hotel shuttle · Staff confirms your spot</p>
        </div>
      </button>
      <button
        onClick={() => setScreen('taxi')}
        className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
      >
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brandColor}18` }}>
          <Car size={26} style={{ color: brandColor }} />
        </div>
        <div className="flex-1">
          <span className="text-base font-bold text-gray-900">Book an Attenda Taxi</span>
          <p className="text-[13px] text-gray-400 mt-1">On-demand · Get a price &amp; pay online</p>
        </div>
      </button>
      {thirdParty && (
        <div className="space-y-2">
          <a
            href={thirdParty.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform text-left block"
          >
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <ExternalLink size={26} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-gray-900">{thirdParty.name}</span>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">External</span>
              </div>
              <p className="text-[13px] text-gray-400 mt-1">{thirdParty.description || 'Third-party transport partner'}</p>
            </div>
            <ExternalLink size={16} className="text-gray-300 shrink-0" />
          </a>
          <p className="text-[11px] text-gray-400 text-center px-4">
            ⚠️ {thirdParty.name} is an independent company — booking is managed outside Attenda and subject to their own terms.
          </p>
        </div>
      )}
    </div>
  );

  // Screen: hotel shuttle schedule (time slot picker)
  if (screen === 'schedule') return (
    <div>
      <button onClick={() => setScreen('mode')} className="text-sm font-semibold flex items-center gap-1 mb-3" style={{ color: brandColor }}>
        ← Back
      </button>
      <AirportSchedule brandColor={brandColor} config={config} />
    </div>
  );

  // Screen: TaxiCaller on-demand
  if (screen === 'taxi') return (
    <TaxiCallerRide
      brandColor={brandColor}
      config={config}
      title="Book a Taxi"
      pickupDefault={config?.address || ''}
      onBack={() => setScreen('mode')}
    />
  );

  // Screen: address picker
  if (screen === 'address') return (
    <div className="space-y-3">
      {!skipModeScreen && (
        <button onClick={() => setScreen('mode')} className="text-sm font-semibold flex items-center gap-1" style={{ color: brandColor }}>
          ← Back
        </button>
      )}

      {/* FROM card */}
      <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 relative">
        <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" /> From
        </label>
        <input
          value={fromText}
          onChange={e => { setFromText(e.target.value); setFromTouched(true); setFromPlace(null); }}
          placeholder="Pickup address"
          className="w-full bg-gray-50 rounded-xl px-3 py-3 border border-gray-200 text-sm outline-none text-gray-800 focus:border-gray-400 transition-colors"
        />
        {fromLoading && (
          <div className="absolute right-5 bottom-5">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin inline-block" />
          </div>
        )}
        {fromSuggestions.length > 0 && !fromPlace && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
            {fromSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { setFromPlace(s); setFromText(s.short_name); setFromSuggestions([]); }}
                className="w-full px-4 py-3.5 text-left border-b border-gray-50 last:border-0 active:bg-gray-50 hover:bg-gray-50"
              >
                <p className="text-sm font-semibold text-gray-900">{s.short_name}</p>
                <p className="text-[12px] text-gray-400 mt-0.5 truncate">{s.display_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Arrow connector */}
      <div className="flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center">
          <MapPin size={14} className="text-red-400" />
        </div>
      </div>

      {/* TO card */}
      <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 relative">
        <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" /> To
        </label>
        <input
          value={toText}
          onChange={e => { setToText(e.target.value); setToPlace(null); }}
          placeholder="Where are you going?"
          className="w-full bg-gray-50 rounded-xl px-3 py-3 border border-gray-200 text-sm outline-none text-gray-800 focus:border-gray-400 transition-colors"
        />
        {toLoading && (
          <div className="absolute right-5 bottom-5">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin inline-block" />
          </div>
        )}
        {toSuggestions.length > 0 && !toPlace && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden">
            {toSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { setToPlace(s); setToText(s.short_name); setToSuggestions([]); }}
                className="w-full px-4 py-3.5 text-left border-b border-gray-50 last:border-0 active:bg-gray-50 hover:bg-gray-50"
              >
                <p className="text-sm font-semibold text-gray-900">{s.short_name}</p>
                <p className="text-[12px] text-gray-400 mt-0.5 truncate">{s.display_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {(toPlace || toText.length > 3) && fromText.length > 3 && (
        <button
          onClick={() => setScreen('confirm')}
          className="w-full py-4 rounded-xl text-white font-bold text-[15px]"
          style={{ backgroundColor: brandColor }}
        >
          Continue →
        </button>
      )}
    </div>
  );

  // Screen: confirm booking
  if (screen === 'confirm') return (
    <div className="space-y-3">
      <button onClick={() => setScreen('address')} className="text-sm font-semibold flex items-center gap-1" style={{ color: brandColor }}>
        ← Back
      </button>

      {/* Route card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div className="w-0.5 h-6 bg-gray-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase mb-0.5">From</p>
              <p className="text-sm font-semibold text-gray-800">{fromPlace?.short_name || fromText}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase mb-0.5">To</p>
              <p className="text-sm font-semibold text-gray-800">{toPlace?.short_name || toText}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service row */}
      <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
          <Bus size={18} className="text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-800">Hotel Transportation</p>
          <p className="text-[12px] text-gray-500">Our team will confirm and reach out with details.</p>
        </div>
        <span className="text-[12px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-full shrink-0">FREE</span>
      </div>

      {/* Guest details */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Name</label>
            <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Your name" className="w-full bg-gray-50 rounded-xl px-3 py-3 border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div className="w-24">
            <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Room</label>
            <input value={room} onChange={e => setRoom(e.target.value)} placeholder="201" className="w-full bg-gray-50 rounded-xl px-3 py-3 border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Date</label>
            <input type="date" value={tripDate} onChange={e => setTripDate(e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-3 border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block">Time (optional)</label>
            <input type="time" value={tripTime} onChange={e => setTripTime(e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-3 border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-600">Party size</label>
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={() => setPax(Math.max(1, pax - 1))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-lg">−</button>
            <span className="w-6 text-center text-base font-bold">{pax}</span>
            <button onClick={() => setPax(Math.min(20, pax + 1))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-lg">+</button>
          </div>
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes — flight number, special needs, etc." className="w-full bg-gray-50 rounded-xl px-3 py-3 border border-gray-200 text-sm outline-none resize-none h-16 focus:border-gray-400 transition-colors" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 text-center">{error}</p>}

      <button onClick={handleBook} disabled={submitting} className="w-full py-4 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: brandColor }}>
        {submitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</> : 'Submit Request'}
      </button>
    </div>
  );

  // Screen: done
  return (
    <div className="bg-gray-50 rounded-2xl p-8 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <CheckCircle size={28} className="text-green-600" />
      </div>
      <div>
        <h2 className="text-lg font-extrabold text-black">Request submitted!</h2>
        <p className="text-sm text-gray-500 mt-2">Our team will confirm your transportation and reach out with details. Contact the front desk for immediate assistance.</p>
      </div>
      <button onClick={() => { setScreen(skipModeScreen ? 'address' : 'mode'); setToText(''); setToPlace(null); setFromPlace(null); setFromTouched(false); setFromText(defaultFromText); setError(''); }}
        className="text-sm font-semibold" style={{ color: brandColor }}>
        New Request
      </button>
    </div>
  );
}

function OnDemandInner() {
  return <TransportBooker brandColor={BURGUNDY} />;
}

/* ── Facilities ──────────────────────────────────────────────────── */
export function FacilitiesSheetContent() {
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  useEffect(() => { getHotelConfig().then(setConfig); }, []);

  const wifiName = config?.wifiName || 'Hotel-WiFi';
  const wifiPassword = config?.wifiPassword || '';
  const copyWiFi = () => { navigator.clipboard.writeText(wifiPassword || wifiName); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const iconMap: Record<string, React.ReactNode> = {
    Coffee: <Coffee size={18} />,
    Dumbbell: <Dumbbell size={18} />,
    Printer: <Printer size={18} />,
    WashingMachine: <WashingMachine size={18} />,
    IceCream: <IceCream size={18} />,
    Car: <Car size={18} />,
    Bus: <Bus size={18} />,
    Wifi: <Wifi size={18} />,
    Check: <Check size={18} />,
    MapPin: <MapPin size={18} />,
    Phone: <Phone size={18} />,
    Utensils: <Utensils size={18} />,
    ShoppingBag: <ShoppingBag size={18} />,
    Star: <Star size={18} />,
    Bell: <Bell size={18} />,
    ShieldCheck: <ShieldCheck size={18} />,
    Globe: <Globe size={18} />,
    User: <User size={18} />,
    Plane: <Plane size={18} />,
    Clock: <Clock size={18} />,
    DoorOpen: <DoorOpen size={18} />,
    Flame: <Flame size={18} />,
    AlarmSmoke: <AlarmSmoke size={18} />,
    Crosshair: <Crosshair size={18} />,
    TrendingUp: <TrendingUp size={18} />,
  };

  const defaultAmenities = [
    { icon: <Coffee size={18} />, title: 'Complimentary Breakfast', desc: '6:30 AM — 9:30 AM daily. Hot & continental options.' },
    { icon: <Dumbbell size={18} />, title: 'Pool & Fitness Center', desc: 'Open 6:00 AM — 10:00 PM. Towels at front desk.' },
    { icon: <Printer size={18} />, title: 'Business Center', desc: '24-hour access. Printing, fax, and computer stations.' },
    { icon: <WashingMachine size={18} />, title: 'Guest Laundry', desc: 'Coin-operated on 2nd floor. Detergent at front desk.' },
    { icon: <IceCream size={18} />, title: 'Ice & Vending', desc: 'Ice machines every floor. Snack & beverage vending in lobby.' },
    { icon: <Car size={18} />, title: 'Complimentary Parking', desc: 'Free for hotel guests. Oversized spots available.' },
    { icon: <Bus size={18} />, title: 'Airport / Cruise Shuttle', desc: 'Scheduled shuttle to MIA & Port of Miami. Book 24hrs ahead.' },
  ];

  const amenities = (config?.facilitiesContent && config.facilitiesContent.length > 0)
    ? config.facilitiesContent.map((a: FacilitiesAmenity) => ({
        icon: iconMap[a.icon] || <span className="text-[12px] font-bold">?</span>,
        title: a.title,
        desc: a.description,
      }))
    : defaultAmenities;

  return (
    <div className="overflow-y-auto px-5 pt-2 pb-8 space-y-3">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${BURGUNDY}18` }}><Wifi size={20} style={{ color: BURGUNDY }} /></div>
          <div><p className="text-[14px] font-bold text-gray-800">Free Wi-Fi</p><p className="text-[11px] text-gray-400">Complimentary high-speed internet</p></div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Network</p>
            <p className="text-[15px] font-mono font-bold text-gray-800">{wifiName}</p>
            {wifiPassword && (<><p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Password</p><p className="text-[14px] font-mono font-bold text-gray-800">{wifiPassword}</p></>)}
          </div>
          <button onClick={copyWiFi} className="px-3 py-1.5 rounded-lg text-white text-[11px] font-bold flex items-center gap-1" style={{ backgroundColor: BURGUNDY }}>
            {copied ? <><Check size={12} />Copied</> : 'Copy'}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-3 font-semibold">Amenities</p>
        <div className="space-y-3">
          {amenities.map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${BURGUNDY}18`, color: BURGUNDY }}>{a.icon}</div>
              <div><p className="text-[13px] font-semibold text-gray-800">{a.title}</p><p className="text-[12px] text-gray-500">{a.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Safety ──────────────────────────────────────────────────────── */
const DEFAULT_EMERGENCY_MSG = "Remain calm. Call 911 for immediate emergency response, then notify the front desk at";
const DEFAULT_CONTACTS: { label: string; number: string }[] = [
  { label: 'Emergency (Police, Fire, Medical)', number: '911' },
];
const DEFAULT_FIRE_ITEMS = [
  'Smoke detectors in every room, tested monthly.',
  'Know your nearest fire exit — posted on your door.',
  'In case of fire: Do not use elevators. Use stairs.',
  'If trapped: Seal door cracks, signal from window, call 911.',
  'Assembly point is in the front parking lot.',
];
const DEFAULT_CO_ITEMS = [
  'CO detectors on every floor and inside every room.',
  'Chirping sound = notify front desk. Do not silence it.',
  'CO symptoms: headache, dizziness, nausea — seek fresh air and call 911.',
  'Smoke alarms are interconnected — one triggers all.',
  'Do not tamper with detectors.',
];
const DEFAULT_SECURITY_ITEMS = [
  'Exterior doors locked 10 PM – 6 AM. Use room key.',
  'Security cameras in public areas, parking, and hallways.',
  'Report suspicious activity to front desk.',
  'Lock door and use deadbolt when inside.',
  'Use in-room safe or front desk deposit for valuables.',
];
const DEFAULT_CLOSING_MSG = 'Contact the front desk at any time for safety concerns. Your wellbeing is our top priority.';

export function SafetySheetContent() {
  const [config, setConfig] = useState<HotelConfig | null>(null);
  useEffect(() => { getHotelConfig().then(setConfig); }, []);
  const frontDesk = config?.frontDeskPhone || 'Ext. 0';
  const sc = config?.safetyContent;

  const emergencyMessage = sc?.emergency_message ?? DEFAULT_EMERGENCY_MSG;
  const emergencyContacts = sc?.emergency_contacts?.length
    ? sc.emergency_contacts
    : [
        ...DEFAULT_CONTACTS,
        { label: 'Front Desk', number: frontDesk },
        { label: 'Hotel Security', number: 'Ext. 0' },
      ];
  const fireItems = sc?.fire_safety_items?.length ? sc.fire_safety_items : DEFAULT_FIRE_ITEMS;
  const coItems = sc?.co_items?.length ? sc.co_items : DEFAULT_CO_ITEMS;
  const securityItems = sc?.security_items?.length ? sc.security_items : DEFAULT_SECURITY_ITEMS;
  const closingMessage = sc?.closing_message ?? DEFAULT_CLOSING_MSG;

  return (
    <div className="overflow-y-auto px-5 pt-2 pb-8 space-y-3">
      <div className="bg-red-50 rounded-2xl p-4 border border-red-100 flex items-start gap-3">
        <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
        <div><p className="text-[13px] font-bold text-red-800 mb-1">In Case of Emergency</p><p className="text-[12px] text-red-700 leading-relaxed">{emergencyMessage} {frontDesk}.</p></div>
      </div>
      {/* Carbon Monoxide Safety — warning sign + infographic */}
      <div className="bg-white rounded-2xl overflow-hidden border-2 border-red-300 shadow-sm">
        {/* Red header bar with warning triangle */}
        <div className="bg-red-600 px-4 py-3 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/15 rounded flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-white" />
          </div>
          <p className="text-[15px] font-bold text-white uppercase tracking-wide">Carbon Monoxide Safety Tips</p>
        </div>

        {/* Warning text */}
        <div className="px-4 pt-3 pb-2 bg-red-50">
          <p className="text-[12px] text-red-900 font-semibold leading-relaxed">
            Carbon Monoxide is a colorless, odorless, poisonous gas, and exposure can be fatal.
          </p>
        </div>

        {/* Two columns: Symptoms | What to Do */}
        <div className="grid grid-cols-2 gap-px bg-gray-200">
          {/* Left: Symptoms */}
          <div className="bg-white p-3">
            <p className="text-[11px] font-bold text-red-700 mb-2 uppercase tracking-wider">Symptoms</p>
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">▸</span> Headache</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">▸</span> Dizziness</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">▸</span> Nausea</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">▸</span> Confusion</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">▸</span> Shortness of breath</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">▸</span> Loss of consciousness</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-red-500 shrink-0 mt-0.5">▸</span> Fatigue</p>
            </div>
          </div>
          {/* Right: Do Something About It */}
          <div className="bg-white p-3">
            <p className="text-[11px] font-bold text-red-700 mb-2 uppercase tracking-wider">Do something about it</p>
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-orange-500 shrink-0 mt-0.5">▸</span> Never ignore a CO alarm</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-orange-500 shrink-0 mt-0.5">▸</span> Call 911 if you suspect CO poisoning</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-orange-500 shrink-0 mt-0.5">▸</span> Never use a generator or grill inside</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-orange-500 shrink-0 mt-0.5">▸</span> Check fireplace / wood stove ventilation</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-orange-500 shrink-0 mt-0.5">▸</span> Move outside immediately for fresh air</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-orange-500 shrink-0 mt-0.5">▸</span> Keep the person awake</p>
              <p className="text-[11px] text-gray-800 flex items-start gap-1.5"><span className="text-orange-500 shrink-0 mt-0.5">▸</span> Do not use the phone inside</p>
            </div>
          </div>
        </div>

        {/* Bottom notice — detector reminder */}
        <div className="bg-red-600 px-4 py-2.5 flex items-center gap-2">
          <ShieldCheck size={14} className="text-white shrink-0" />
          <p className="text-[11px] text-white font-semibold">Your room is equipped with a carbon monoxide detector.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-3 font-semibold">Emergency Contacts</p>
        {emergencyContacts.map((e, i) => (
          <a key={i} href={`tel:${e.number.replace(/[^0-9]/g, '')}`} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 active:bg-gray-100 mb-1.5">
            <div className="flex items-center gap-3"><Phone size={16} style={{ color: BURGUNDY }} /><p className="text-[13px] font-semibold text-gray-800">{e.label}</p></div>
            <span className="text-[14px] font-bold" style={{ color: BURGUNDY }}>{e.number}</span>
          </a>
        ))}
      </div>
      {[
        { icon: <Flame size={17} className="text-orange-500" />, title: 'Fire Safety', items: fireItems },
        { icon: <AlarmSmoke size={17} style={{ color: BURGUNDY }} />, title: 'CO & Smoke Detection', items: coItems },
        { icon: <Crosshair size={17} style={{ color: BURGUNDY }} />, title: 'Property Security', items: securityItems },
      ].map(section => (
        <div key={section.title} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">{section.icon}<p className="text-[14px] font-bold text-gray-800">{section.title}</p></div>
          {section.items.map((text, i) => (
            <div key={i} className="flex items-start gap-2 mb-2">
              <ShieldCheck size={13} className="text-gray-300 shrink-0 mt-0.5" />
              <p className="text-[12px] text-gray-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      ))}
      <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
        <p className="text-[11px] text-amber-700 text-center">{closingMessage}</p>
      </div>
    </div>
  );
}

/* ── Welcome Letter ──────────────────────────────────────────────────── */
export function WelcomeSheetContent() {
  const [config, setConfig] = useState<HotelConfig | null>(null);
  useEffect(() => { getHotelConfig().then(setConfig); }, []);
  if (!config) return <div className="flex-1 flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: BURGUNDY }} /></div>;

  return (
    <div className="overflow-y-auto px-5 pt-2 pb-8 space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{config.welcomeLetter || 'Thank you for choosing our hotel. We hope you have a wonderful stay.'}</p>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[14px] font-bold" style={{ color: BURGUNDY }}>{config.managerName || 'Hotel Manager'}</p>
          <p className="text-[12px] text-gray-400">{config.name}</p>
          <p className="text-[10px] text-gray-400 mt-1">This property is independently owned and operated.</p>
        </div>
      </div>
      {config.teamPhotoUrl ? (
        <div className="rounded-2xl overflow-hidden border border-gray-100">
          <div className="relative h-56 w-full"><Image src={config.teamPhotoUrl} alt="Team" fill className="object-cover" sizes="100vw" /></div>
          <div className="p-3 bg-white"><p className="text-[12px] font-semibold text-gray-700">Your team at {config.name}</p></div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Review ────────────────────────────────────────────────────────── */
export function ReviewSheetContent({ onClose: closeSheet }: { onClose: () => void }) {
  const [step, setStep] = useState<'rating' | 'feedback' | 'done'>('rating');
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleStarClick = (val: number) => { setRating(val); setStep(val <= 2 ? 'feedback' : 'done'); };

  const handleSubmitFeedback = async () => {
    const hotel = await getHotelConfig();
    const sesh = JSON.parse(localStorage.getItem('guestSession') || '{}');
    if (hotel?.notificationEmail) {
      const body = `Low guest review.\nRating: ${rating} stars\nFeedback: ${feedback.trim() || 'None'}\nGuest: ${sesh.name || 'Unknown'} Room ${sesh.room || 'N/A'}`;
      window.location.href = `mailto:${hotel.notificationEmail}?subject=Guest Complaint ${rating} Stars&body=${encodeURIComponent(body)}`;
    }
    setStep('done');
  };

  const openReview = async (url: string) => {
    const hotel = await getHotelConfig();
    const map: Record<string, string | undefined> = { google: hotel?.googleReviewUrl, tripadvisor: hotel?.tripadvisorUrl, yelp: hotel?.yelpUrl };
    const fallback: Record<string, string> = { google: `https://www.google.com/search?q=${encodeURIComponent((hotel?.name || '') + ' reviews')}`, tripadvisor: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(hotel?.name || '')}`, yelp: `https://www.yelp.com/search?find_desc=${encodeURIComponent(hotel?.name || '')}` };
    window.open(map[url] || fallback[url], '_blank');
  };

  const labelColors = ['', 'text-red-500', 'text-red-400', 'text-amber-400', 'text-amber-400', 'text-emerald-600'];
  const labels = ['', 'Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'];

  return (
    <div className="overflow-y-auto px-5 pt-2 pb-8">
      {step === 'rating' && (
        <div className="text-center py-6">
          <p className="text-[22px] font-bold text-black mb-1">How was your stay?</p>
          <p className="text-[13px] text-gray-400 mb-6">Tap a star to rate your experience</p>
          <div className="flex justify-center gap-2 mb-4">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => handleStarClick(s)} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)} className="active:scale-90 transition-transform">
                <Star size={44} className={s <= (hovered || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
              </button>
            ))}
          </div>
          {rating > 0 && <p className={`text-[13px] font-semibold ${labelColors[rating]}`}>{labels[rating]}</p>}
        </div>
      )}
      {step === 'feedback' && (
        <div className="py-4">
          <div className="text-center mb-4">
            <p className="text-[20px] font-bold text-black mb-1">We&apos;re sorry to hear that</p>
            <p className="text-[13px] text-gray-400">Tell us so we can make it right</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3">
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What went wrong?" className="w-full bg-gray-50 rounded-xl p-3 text-[14px] text-gray-800 outline-none border border-gray-200 resize-none h-28" />
          </div>
          <button onClick={handleSubmitFeedback} className="w-full py-3.5 rounded-[14px] text-white font-bold text-[15px]" style={{ backgroundColor: BURGUNDY }}>Submit Feedback to Manager</button>
        </div>
      )}
      {step === 'done' && rating >= 3 && (
        <div className="py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-green-500" /></div>
          <p className="text-[22px] font-bold text-black mb-2">Thank you!</p>
          <p className="text-[13px] text-gray-400 mb-6">Your feedback helps others. Share on a platform:</p>
          <div className="space-y-2.5">
            {[{ label: 'Google', letter: 'G', url: 'google' }, { label: 'TripAdvisor', letter: 'T', url: 'tripadvisor' }, { label: 'Yelp', letter: 'Y', url: 'yelp' }].map(p => (
              <button key={p.label} onClick={() => openReview(p.url)} className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 active:scale-[0.98]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${BURGUNDY}18` }}><span className="text-[14px] font-bold" style={{ color: BURGUNDY }}>{p.letter}</span></div>
                <span className="flex-1 text-left text-[14px] font-bold text-gray-800">{p.label}</span>
                <ExternalLink size={15} className="text-gray-400" />
              </button>
            ))}
          </div>
          <button onClick={closeSheet} className="mt-4 text-[13px] font-semibold text-gray-400">Close</button>
        </div>
      )}
      {step === 'done' && rating <= 2 && (
        <div className="py-6 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${BURGUNDY}18` }}><CheckCircle size={32} style={{ color: BURGUNDY }} /></div>
          <p className="text-[22px] font-bold text-black mb-2">Thank you</p>
          <p className="text-[13px] text-gray-400 mb-6">Your feedback has been sent to management.</p>
          <button onClick={closeSheet} className="w-full py-3.5 rounded-[14px] bg-gray-100 text-[15px] font-bold text-gray-700">Close</button>
        </div>
      )}
    </div>
  );
}
