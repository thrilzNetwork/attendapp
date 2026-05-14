'use client';

import { useState, useEffect } from 'react';
import { MapPin, Bus, Bell, ShieldCheck, Phone, Globe, User } from 'lucide-react';
import GuestAuthModal from '@/components/GuestAuthModal';

const BURGUNDY = '#6B1D3C';

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotel = params.get('hotel');
    const room = params.get('room');
    if (hotel) localStorage.setItem('attenda_hotel_slug', hotel);
    if (room) localStorage.setItem('attenda_qr_room', room);
  }, []);

  const handleClick = (target: string) => {
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        const checkout = new Date(session.checkout);
        if (checkout > new Date()) {
          if (target.startsWith('/')) window.location.href = target;
          else if (target.startsWith('#')) alert('Coming soon');
          return;
        }
      } catch {
        localStorage.removeItem('guestSession');
      }
    }
    setPendingTarget(target);
    setModalOpen(true);
  };

  return (
    <div className="h-dvh w-full overflow-hidden flex flex-col px-5 pt-5 pb-4 gap-2">
      {/* Header — fixed, auto height */}
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-black text-black leading-none">Hello!</h1>
          <p className="text-[15px] text-gray-400 mt-1 font-normal">What do you need today?</p>
        </div>
        <button
          onClick={() => handleClick('/safety')}
          className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center shadow-sm active:scale-95"
        >
          <Phone size={18} className="text-[#6B1D3C]" strokeWidth={1.5} />
        </button>
      </div>

      {/* Grid — flex-1, fills available space, buttons stretch */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleClick('/welcome')}
            className="h-full rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-sm"
            style={{ backgroundColor: BURGUNDY }}
          >
            <MapPin size={24} className="text-white" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-white tracking-[0.14em] uppercase">WELCOME</span>
          </button>

        <button
          onClick={() => handleClick('/transport')}
          className="h-full rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-sm"
        >
          <Bus size={24} className="text-[#6B1D3C]" strokeWidth={1.5} />
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: BURGUNDY }}>TRANSPORT</span>
        </button>

        <button
          onClick={() => handleClick('/facilities')}
          className="h-full rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-sm"
        >
          <Bell size={24} className="text-[#6B1D3C]" strokeWidth={1.5} />
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: BURGUNDY }}>FACILITIES</span>
        </button>

        <button
          onClick={() => handleClick('/safety')}
          className="h-full rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-sm"
          style={{ backgroundColor: BURGUNDY }}
        >
          <ShieldCheck size={24} className="text-white" strokeWidth={1.5} />
          <span className="text-[10px] font-bold text-white tracking-[0.14em] uppercase">SAFETY</span>
        </button>
      </div>

      {/* Restaurants Carousel — 17% height, fixed */}
      <div className="h-[17%] min-h-[110px] shrink-0">
        <button onClick={() => window.location.href = '/nearby?tab=restaurants'} className="w-full h-full block">
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&fit=crop&q=80"
              alt="Restaurants"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2.5 left-4">
              <span className="text-sm font-bold text-white tracking-wider">RESTAURANTS</span>
            </div>
            <div className="absolute bottom-2.5 right-4 flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="w-2 h-2 rounded-full bg-white/40" />
              <span className="w-2 h-2 rounded-full bg-white/40" />
            </div>
          </div>
        </button>
      </div>

      {/* Bottom Section — flex-1, fills remaining */}
      <div className="flex-1 min-h-0 flex gap-2">
        {/* Left — Rewards */}
        <a
          href="https://www.bestwestern.com/rewards/join.html"
          target="_blank"
          rel="noopener noreferrer"
          className="w-[38%] h-full rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] block"
          onClick={(e) => {
            // Don't trigger auth modal for external links
            e.stopPropagation();
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&fit=crop&q=80"
            alt="Rewards"
            className="w-full h-full object-cover"
          />
        </a>

        {/* Right — 2 tall buttons */}
        <div className="flex-1 h-full flex flex-col gap-2">
          <button
            onClick={() => (window.location.href = '/nearby?tab=attractions')}
            className="flex-1 rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center gap-1.5 active:scale-[0.97] shadow-sm"
          >
            <MapPin size={18} className="text-[#6B1D3C]" strokeWidth={1.5} />
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: BURGUNDY }}>NEARBY</span>
          </button>

          <button
            onClick={() => handleClick('/review')}
            className="flex-1 rounded-2xl flex items-center justify-center active:scale-[0.97] shadow-sm"
            style={{ backgroundColor: BURGUNDY }}
          >
            <span className="text-[10px] font-bold text-white tracking-[0.14em] uppercase">LEAVE A REVIEW</span>
          </button>
        </div>
      </div>

      {/* Footer — fixed, auto height */}
      <div className="shrink-0 flex items-end justify-between pt-1">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-gray-400" />
          <span className="text-[10px] text-gray-400 leading-none">powered by Thrilz network</span>
        </div>
        <button
          onClick={() => handleClick('/message')}
          className="flex items-center gap-2"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: BURGUNDY }}>
            <User size={18} className="text-white" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: BURGUNDY }}>MESSAGE US</span>
        </button>
      </div>

      <GuestAuthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          if (pendingTarget.startsWith('/')) window.location.href = pendingTarget;
          else if (pendingTarget.startsWith('#')) alert('Coming soon');
        }}
      />
    </div>
  );
}
