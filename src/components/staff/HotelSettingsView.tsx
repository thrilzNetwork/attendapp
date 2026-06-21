'use client';
/* eslint-disable */

import { useState } from 'react';
import {
  Settings, Wifi, ImageIcon, ExternalLink, CalendarDays, DollarSign,
  Bell, ShieldCheck, Bus, UtensilsCrossed, MapPin, Plus, Trash2,
  Save, Upload, Hotel as HotelIcon, ChevronLeft, ChevronRight, type LucideIcon,
  Star, MessageSquare, Phone, Flame, Lock, Send, Globe,
} from 'lucide-react';
import { HotelConfig, PositionBudget, updateHotelConfig } from '@/lib/supabase';

const TEAL = '#0D9488';

type TileKey = 'WELCOME' | 'TRANSPORT' | 'FACILITIES' | 'SAFETY' | 'NEARBY' | 'FOOD' | 'REVIEW';

/* ── Shared helpers ─────────────────────────────────────── */
function Section({ title, Icon, children }: { title: string; Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={17} style={{ color: TEAL }} />
        <h3 className="font-bold text-[13px] text-gray-800">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

const lbl = 'text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest';
const inp = 'w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-[13px] border border-gray-100 focus:outline-none focus:border-teal-300 transition-colors';

/* ─────────────────────────────────────────────────────────
   PHONE HOME  —  matches real app screenshot
───────────────────────────────────────────────────────── */
function PhoneHome({ color, onTileClick }: { color: string; hotelName: string; onTileClick: (t: TileKey) => void }) {
  const blue = color;

  function Tile({ tile, filled, label, icon, style }: {
    tile: TileKey; filled: boolean; label: string; icon: React.ReactNode; style?: React.CSSProperties;
  }) {
    return (
      <button
        onClick={() => onTileClick(tile)}
        style={{ ...style, ...(filled ? { backgroundColor: blue } : { backgroundColor: '#fff', border: '1px solid #e8eaed' }) }}
        className="rounded-[18px] flex flex-col items-center justify-center gap-[5px] transition-all active:scale-95 hover:brightness-95 cursor-pointer w-full h-full shadow-sm"
      >
        <div style={{ color: filled ? '#fff' : blue }}>{icon}</div>
        <span className="text-[6.5px] font-black tracking-[0.12em]" style={{ color: filled ? '#fff' : blue }}>{label}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#f0f1f5', fontFamily: 'system-ui, sans-serif' }}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-2 pb-0.5">
        <span className="text-[6px] font-bold text-gray-500">9:41</span>
        <div className="flex gap-1 items-center">
          <div className="w-3 h-1.5 rounded-sm bg-gray-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        </div>
      </div>

      {/* Header */}
      <div className="px-4 pt-1 pb-2.5 flex items-start justify-between">
        <div>
          <div className="text-[14px] font-black text-gray-900 leading-tight">Hello!</div>
          <div className="text-[7px] text-gray-400 mt-0.5">What do you need today?</div>
        </div>
        <div className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center border border-gray-100">
          <Phone size={11} style={{ color: blue }} />
        </div>
      </div>

      {/* Row 1 — WELCOME | TRANSPORT */}
      <div className="flex gap-2 px-3 mb-2" style={{ height: 72 }}>
        <div className="flex-1"><Tile tile="WELCOME" filled label="WELCOME" icon={<MapPin size={14} />} /></div>
        <div className="flex-1"><Tile tile="TRANSPORT" filled={false} label="TRANSPORT" icon={<Bus size={14} />} /></div>
      </div>

      {/* Row 2 — FACILITIES | SAFETY */}
      <div className="flex gap-2 px-3 mb-2" style={{ height: 64 }}>
        <div className="flex-1"><Tile tile="FACILITIES" filled={false} label="FACILITIES" icon={<Bell size={13} />} /></div>
        <div className="flex-1"><Tile tile="SAFETY" filled label="SAFETY" icon={<ShieldCheck size={13} />} /></div>
      </div>

      {/* Row 3 — NEARBY (tall) | FOOD + REVIEW (stacked) */}
      <div className="flex gap-2 px-3 mb-2" style={{ height: 84 }}>
        <div style={{ width: '42%' }}>
          <Tile tile="NEARBY" filled={false} label="NEARBY" icon={<MapPin size={13} />} />
        </div>
        <div className="flex flex-col gap-2" style={{ flex: 1 }}>
          <div style={{ flex: '0 0 54%' }}>
            <Tile tile="FOOD" filled label="FOOD" icon={<UtensilsCrossed size={12} />} />
          </div>
          <div style={{ flex: 1 }}>
            <Tile tile="REVIEW" filled={false} label="LEAVE A REVIEW" icon={null} />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-auto mx-3 mb-2 bg-white rounded-2xl flex items-center justify-between px-3 py-2 shadow-sm border border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[7px]">🍪</div>
          <span className="text-[6px] text-gray-400 font-medium">Powered by Attenda</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[6px] font-black" style={{ color: blue }}>MY ORDERS</span>
          <div className="rounded-full px-2 py-1 text-[6px] font-black text-white flex items-center gap-0.5" style={{ backgroundColor: blue }}>
            <span className="w-2 h-2 rounded-full bg-white bg-opacity-30 flex items-center justify-center text-[5px]">⊕</span>
            REQUEST NOW
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PHONE INNER SCREEN  —  looks like the real guest page
───────────────────────────────────────────────────────── */
function PhoneScreen({ tile, form, color, onBack }: { tile: TileKey; form: HotelConfig; color: string; onBack: () => void }) {
  const titles: Record<TileKey, string> = {
    WELCOME: 'Welcome', TRANSPORT: 'Transport', FACILITIES: 'Facilities',
    SAFETY: 'Safety', NEARBY: 'Nearby', FOOD: 'Food & Dining', REVIEW: 'Leave a Review',
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#f7f8fb', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="bg-white px-3 py-2 flex items-center gap-2 border-b border-gray-100 shrink-0 shadow-sm">
        <button onClick={onBack} className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
          <ChevronLeft size={10} className="text-gray-500" />
        </button>
        <span className="text-[9px] font-black text-gray-800 tracking-tight">{titles[tile]}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2">

        {tile === 'WELCOME' && (
          <>
            {/* Welcome letter card */}
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[7px] font-black text-gray-800">{form.name || 'Your Hotel'}</span>
              </div>
              <p className="text-[6px] text-gray-600 leading-relaxed line-clamp-5">
                {form.welcomeLetter || 'Dear Guest, welcome to our property! We are delighted to have you with us. Please do not hesitate to reach out if you need anything during your stay.'}
              </p>
              <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden">
                  {form.teamPhotoUrl && <img src={form.teamPhotoUrl} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <p className="text-[6px] font-bold text-gray-800">{form.managerName || 'Hotel Manager'}</p>
                  <p className="text-[5.5px] text-gray-400">General Manager</p>
                </div>
              </div>
            </div>
            {/* Team photo */}
            {form.teamPhotoUrl && (
              <div className="rounded-2xl overflow-hidden shadow-sm">
                <img src={form.teamPhotoUrl} alt="Team" className="w-full object-cover" style={{ height: 52 }} />
                <div className="bg-white px-2 py-1">
                  <p className="text-[5.5px] text-gray-500 font-medium">Your team at {form.name}</p>
                </div>
              </div>
            )}
            {/* WiFi card */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                  <Wifi size={10} style={{ color }} />
                </div>
                <div>
                  <p className="text-[6.5px] font-black text-gray-800">{form.wifiName || 'Hotel-WiFi'}</p>
                  <p className="text-[5.5px] text-gray-400">{form.wifiPassword ? `Password: ${form.wifiPassword}` : 'Tap to copy password'}</p>
                </div>
              </div>
              <div className="text-[5.5px] font-bold px-1.5 py-0.5 rounded-lg border" style={{ color, borderColor: `${color}40` }}>COPY</div>
            </div>
          </>
        )}

        {tile === 'FACILITIES' && (
          <>
            {/* WiFi first */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                  <Wifi size={10} style={{ color }} />
                </div>
                <div>
                  <p className="text-[6.5px] font-black text-gray-800">{form.wifiName || 'Hotel-WiFi'}</p>
                  <p className="text-[5.5px] text-gray-400">Password: {form.wifiPassword || '••••••••'}</p>
                </div>
              </div>
              <div className="text-[5.5px] font-bold px-1.5 py-0.5 rounded-lg border" style={{ color, borderColor: `${color}40` }}>COPY</div>
            </div>
            {/* Amenities */}
            {((form.facilitiesContent?.length ?? 0) > 0 ? form.facilitiesContent! : [
              { title: 'Complimentary Breakfast', description: 'Served daily 6:30 – 9:30 AM in the lobby' },
              { title: 'Pool & Fitness Center', description: 'Open 6 AM – 10 PM every day' },
              { title: 'Guest Laundry', description: '2nd floor, coin-operated machines' },
              { title: 'Free Parking', description: 'Surface lot, unlimited stays' },
            ]).slice(0, 6).map((a, i) => (
              <div key={i} className="bg-white rounded-2xl p-2.5 shadow-sm border border-gray-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                  <Bell size={9} style={{ color }} />
                </div>
                <div>
                  <p className="text-[6.5px] font-black text-gray-800">{a.title}</p>
                  {a.description && <p className="text-[5.5px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{a.description}</p>}
                </div>
              </div>
            ))}
          </>
        )}

        {tile === 'TRANSPORT' && (
          <>
            {/* Tab strip */}
            <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100 flex gap-1">
              {['Airport', 'Cruise Port', 'Private'].map((t, i) => (
                <div key={t} className={`flex-1 rounded-xl py-1 text-center text-[5.5px] font-black ${i === 0 ? 'text-white' : 'text-gray-400'}`}
                  style={i === 0 ? { backgroundColor: color } : {}}>
                  {t}
                </div>
              ))}
            </div>
            {/* Shuttle banner */}
            <div className="rounded-2xl p-2.5 shadow-sm" style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)`, border: `1px solid ${color}30` }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Bus size={10} style={{ color }} />
                <p className="text-[7px] font-black text-gray-800">Hotel Shuttle</p>
                {form.hasFreeShuttle && (
                  <span className="ml-auto text-[5px] font-black px-1 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>FREE</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[5.5px] text-gray-500">
                <MapPin size={7} style={{ color }} />
                <span>{form.shuttlePickupLocation || 'Hotel Main Entrance'}</span>
              </div>
              {(form.shuttleStartTime || form.shuttleEndTime) && (
                <div className="flex items-center gap-1.5 text-[5.5px] text-gray-500 mt-0.5">
                  <span>🕐</span>
                  <span>{form.shuttleStartTime?.slice(0,5) || '--:--'} – {form.shuttleEndTime?.slice(0,5) || '--:--'}</span>
                </div>
              )}
            </div>
            {/* Schedule preview */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-gray-100">
              <p className="text-[6.5px] font-black text-gray-700 mb-1.5">Today's Schedule</p>
              {['7:00 AM','9:30 AM','12:00 PM','3:00 PM'].map(t => (
                <div key={t} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <span className="text-[5.5px] font-bold text-gray-700">{t}</span>
                  <div className="text-[5px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: color }}>BOOK</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tile === 'SAFETY' && (
          <>
            {/* Emergency banner */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame size={9} className="text-red-500" />
                <p className="text-[6.5px] font-black text-red-700">Emergency</p>
              </div>
              <p className="text-[5.5px] text-red-600 leading-relaxed">
                {form.safetyContent?.emergency_message || 'Remain calm. Call 911 immediately, then notify the front desk.'}
              </p>
            </div>
            {/* Emergency contacts */}
            {((form.safetyContent?.emergency_contacts?.length ?? 0) > 0 ? form.safetyContent!.emergency_contacts! : [
              { label: 'Front Desk', number: form.frontDeskPhone || '(000) 000-0000' },
              { label: 'Police', number: '911' },
            ]).map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-2.5 shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[6px] font-black text-gray-800">{c.label}</p>
                  <p className="text-[5.5px] text-gray-400">{c.number}</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                  <Phone size={9} className="text-red-500" />
                </div>
              </div>
            ))}
            {/* Safety sections */}
            {[
              { icon: <Flame size={9} className="text-orange-500" />, title: 'Fire Safety', items: form.safetyContent?.fire_safety_items || ['Pull nearest fire alarm', 'Use stairwells only', 'Meet at parking lot'] },
              { icon: <ShieldCheck size={9} style={{ color }} />, title: 'Property Security', items: form.safetyContent?.security_items || ['Keep door locked', 'Use hotel safe', 'Report suspicious activity'] },
            ].map(s => (
              <div key={s.title} className="bg-white rounded-2xl p-2.5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-1.5 mb-1.5">{s.icon}<p className="text-[6.5px] font-black text-gray-800">{s.title}</p></div>
                {s.items.slice(0,3).map((item: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1">
                    <div className="w-1 h-1 rounded-full mt-1 shrink-0 bg-gray-300" />
                    <p className="text-[5.5px] text-gray-500 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {tile === 'NEARBY' && (
          <>
            {/* Tab strip */}
            <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100 flex gap-1">
              {['Attractions', 'Restaurants'].map((t, i) => (
                <div key={t} className={`flex-1 rounded-xl py-1 text-center text-[5.5px] font-black ${i === 0 ? 'text-white' : 'text-gray-400'}`}
                  style={i === 0 ? { backgroundColor: color } : {}}>
                  {t}
                </div>
              ))}
            </div>
            {/* Ride card */}
            <div className="rounded-2xl p-2.5 shadow-sm flex items-center justify-between" style={{ backgroundColor: color }}>
              <div>
                <p className="text-[6.5px] font-black text-white">Need a Ride?</p>
                <p className="text-[5.5px] text-white text-opacity-80 mt-0.5">Uber · Lyft · Private</p>
              </div>
              <div className="bg-white rounded-xl px-2 py-1 text-[5.5px] font-black" style={{ color }}>Request Ride</div>
            </div>
            {/* Place cards */}
            {['Art Museum', 'City Park', 'Historic Downtown', 'Shopping Mall'].slice(0, 3).map((place, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-10 bg-gradient-to-r from-gray-100 to-gray-200 flex items-end px-2 pb-1">
                  <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={5} className="fill-amber-400 text-amber-400" />)}</div>
                </div>
                <div className="p-2">
                  <p className="text-[6.5px] font-black text-gray-800">{place}</p>
                  <div className="flex gap-1.5 mt-1">
                    <div className="text-[5px] font-bold px-1.5 py-0.5 rounded-lg border" style={{ color, borderColor: `${color}40` }}>CALL</div>
                    <div className="text-[5px] font-bold px-1.5 py-0.5 rounded-lg border" style={{ color, borderColor: `${color}40` }}>DIRECTIONS</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tile === 'FOOD' && (
          <>
            <div className="text-[6.5px] font-black text-gray-500 px-0.5">
              {form.foodContent?.intro_text || 'Order food from our partner restaurants directly to your room.'}
            </div>
            {/* Restaurant cards */}
            {['Seaside Grill', 'Sunrise Café', 'The Rooftop Bar'].map((r, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative h-12" style={{ background: `linear-gradient(135deg, ${color}20, ${color}08)` }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <UtensilsCrossed size={14} style={{ color: `${color}60` }} />
                  </div>
                  {i === 0 && (
                    <div className="absolute top-1.5 right-1.5 text-[5px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>ORDER NOW</div>
                  )}
                </div>
                <div className="px-2.5 py-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[6.5px] font-black text-gray-800">{r}</p>
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={5} className="fill-amber-400 text-amber-400" />)}</div>
                  </div>
                  <p className="text-[5.5px] text-gray-400 mt-0.5">0.{i+2} mi · In-Room Delivery</p>
                </div>
              </div>
            ))}
          </>
        )}

        {tile === 'REVIEW' && (
          <div className="flex flex-col items-center text-center">
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 w-full">
              <p className="text-[8px] font-black text-gray-900 mb-0.5">How was your stay?</p>
              <p className="text-[5.5px] text-gray-400 mb-3">Your feedback helps us improve</p>
              {/* Stars */}
              <div className="flex justify-center gap-1.5 mb-3">
                {[1,2,3,4,5].map(s => <Star key={s} size={14} className="fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-[6px] text-gray-500 mb-2">Share your experience on:</p>
              {/* Platform buttons */}
              <div className="space-y-1.5">
                {[
                  { name: 'Google', color: '#4285F4', show: !!form.googleReviewUrl || true },
                  { name: 'TripAdvisor', color: '#00AF87', show: !!form.tripadvisorUrl || true },
                  { name: 'Yelp', color: '#D32323', show: !!form.yelpUrl },
                ].filter(p => p.show).map(p => (
                  <div key={p.name} className="w-full py-1.5 rounded-2xl flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: p.color }}>
                    <Globe size={8} className="text-white" />
                    <span className="text-[6.5px] font-black text-white">{p.name}</span>
                    <ExternalLink size={7} className="text-white opacity-70" />
                  </div>
                ))}
              </div>
              {!form.googleReviewUrl && !form.tripadvisorUrl && !form.yelpUrl && (
                <p className="text-[5.5px] text-gray-300 mt-2">Add review URLs in the editor →</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   TILE SELECTOR  —  left panel grid when no tile is editing
───────────────────────────────────────────────────────── */
function TileSelector({ color, onSelect }: { color: string; onSelect: (t: TileKey) => void }) {
  const tiles: { key: TileKey; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: 'WELCOME', label: 'Welcome', desc: 'Letter, team photo, WiFi', icon: <MapPin size={16} /> },
    { key: 'TRANSPORT', label: 'Transport', desc: 'Shuttle times, booking', icon: <Bus size={16} /> },
    { key: 'FACILITIES', label: 'Facilities', desc: 'Amenities, pool, gym', icon: <Bell size={16} /> },
    { key: 'SAFETY', label: 'Safety', desc: 'Emergency contacts, safety info', icon: <ShieldCheck size={16} /> },
    { key: 'NEARBY', label: 'Nearby', desc: 'Attractions, local tips', icon: <MapPin size={16} /> },
    { key: 'FOOD', label: 'Food', desc: 'Restaurants, ordering', icon: <UtensilsCrossed size={16} /> },
    { key: 'REVIEW', label: 'Leave a Review', desc: 'Google, TripAdvisor, Yelp', icon: <Star size={16} /> },
  ];

  return (
    <div>
      <p className="text-[12px] text-gray-400 mb-4">Click any screen to edit its guest-facing content.</p>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(t => (
          <button key={t.key} onClick={() => onSelect(t.key)}
            className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-teal-200 hover:shadow-md transition-all group shadow-sm">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 transition-colors"
              style={{ backgroundColor: `${color}15`, color }}>
              {t.icon}
            </div>
            <p className="text-[13px] font-bold text-gray-800 mb-0.5">{t.label}</p>
            <p className="text-[11px] text-gray-400">{t.desc}</p>
            <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold" style={{ color }}>
              Edit content <ChevronRight size={11} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   TILE EDITOR  —  left panel when tile is selected
───────────────────────────────────────────────────────── */
function TileEditor({ tile, form, setForm, onBack, onSave, saved }: {
  tile: TileKey; form: HotelConfig; setForm: (f: HotelConfig) => void;
  onBack: () => void; onSave: () => void; saved: boolean;
}) {
  const titles: Record<TileKey, string> = {
    WELCOME: 'Welcome Screen', TRANSPORT: 'Transport Screen', FACILITIES: 'Facilities Screen',
    SAFETY: 'Safety Screen', NEARBY: 'Nearby Screen', FOOD: 'Food Screen', REVIEW: 'Review Screen',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-400 hover:text-gray-700 transition-colors bg-white border border-gray-200 rounded-xl px-3 py-1.5">
          <ChevronLeft size={13} /> All Screens
        </button>
        <h1 className="text-[20px] font-extrabold text-gray-900">{titles[tile]}</h1>
      </div>

      {tile === 'WELCOME' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-5">
          <div>
            <label className={lbl}>Welcome Letter</label>
            <p className="text-[11px] text-gray-400 mb-2">Personal message guests read when they open the app.</p>
            <textarea value={form.welcomeLetter} onChange={e => setForm({ ...form, welcomeLetter: e.target.value })} rows={7}
              className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none focus:border-teal-300 resize-none transition-colors"
              placeholder="Dear Guest, welcome to our property! We're so glad you chose to stay with us..." />
          </div>
          <div>
            <label className={lbl}>Team / Property Photo</label>
            <p className="text-[11px] text-gray-400 mb-2">Shown below the welcome letter.</p>
            <div className="flex items-center gap-2">
              <input value={form.teamPhotoUrl || ''} onChange={e => setForm({ ...form, teamPhotoUrl: e.target.value })}
                placeholder="https://..." className={inp + ' flex-1'} />
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-white shrink-0"
                style={{ backgroundColor: TEAL }}>
                <Upload size={13} /> Upload
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setForm({ ...form, teamPhotoUrl: ev.target?.result as string });
                  reader.readAsDataURL(file);
                }} />
              </label>
            </div>
            {form.teamPhotoUrl && (
              <img src={form.teamPhotoUrl} alt="Preview" className="mt-2 rounded-xl w-full max-h-40 object-cover border border-gray-100" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Wi-Fi Network</label>
              <input value={form.wifiName || ''} onChange={e => setForm({ ...form, wifiName: e.target.value })} className={inp} placeholder="Hotel-WiFi" />
            </div>
            <div>
              <label className={lbl}>Wi-Fi Password</label>
              <input value={form.wifiPassword || ''} onChange={e => setForm({ ...form, wifiPassword: e.target.value })} className={inp} placeholder="password123" />
            </div>
          </div>
          <div>
            <label className={lbl}>Brand Color</label>
            <div className="flex items-center gap-3 mb-2">
              <input type="color" value={form.brandColor || '#6B1D3C'} onChange={e => setForm({ ...form, brandColor: e.target.value })}
                className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200 p-0.5" />
              <input type="text" value={form.brandColor || '#6B1D3C'} onChange={e => {
                if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setForm({ ...form, brandColor: e.target.value });
              }} maxLength={7} className={inp + ' flex-1 font-mono'} placeholder="#6B1D3C" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['#6B1D3C','#0D9488','#1D4ED8','#7C3AED','#B45309','#DC2626','#0F172A','#059669'].map(c => (
                <button key={c} onClick={() => setForm({ ...form, brandColor: c })}
                  className="w-7 h-7 rounded-lg border-[3px] transition-transform active:scale-90"
                  style={{ backgroundColor: c, borderColor: form.brandColor === c ? '#111' : 'transparent' }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {tile === 'FACILITIES' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <p className="text-[12px] text-gray-500">Add amenities guests should know about. These appear as cards on the Facilities screen.</p>
          <div className="space-y-3">
            {(form.facilitiesContent || []).map((a, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amenity {idx + 1}</span>
                  <button onClick={() => setForm({ ...form, facilitiesContent: (form.facilitiesContent || []).filter((_, i) => i !== idx) })}
                    className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13} /></button>
                </div>
                <input value={a.title} onChange={e => {
                  const u = [...(form.facilitiesContent || [])]; u[idx] = { ...u[idx], title: e.target.value };
                  setForm({ ...form, facilitiesContent: u });
                }} placeholder="e.g. Complimentary Breakfast" className="w-full bg-white rounded-xl px-3 py-2 text-[13px] border border-gray-200 focus:outline-none" />
                <textarea value={a.description || ''} onChange={e => {
                  const u = [...(form.facilitiesContent || [])]; u[idx] = { ...u[idx], description: e.target.value };
                  setForm({ ...form, facilitiesContent: u });
                }} rows={2} placeholder="Hours, location, details..." className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none resize-none" />
              </div>
            ))}
            <button onClick={() => setForm({ ...form, facilitiesContent: [...(form.facilitiesContent || []), { icon: 'Bell', title: '', description: '' }] })}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 hover:text-teal-700 py-1">
              <Plus size={15} /> Add Amenity
            </button>
          </div>
        </div>
      )}

      {tile === 'TRANSPORT' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className={lbl}>Shuttle Pickup Location</label>
            <input value={form.shuttlePickupLocation || ''} onChange={e => setForm({ ...form, shuttlePickupLocation: e.target.value })}
              placeholder="e.g. Main entrance lobby" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Start Time</label>
              <input type="time" value={form.shuttleStartTime || ''} onChange={e => setForm({ ...form, shuttleStartTime: e.target.value })} className={inp} />
            </div>
            <div>
              <label className={lbl}>End Time</label>
              <input type="time" value={form.shuttleEndTime || ''} onChange={e => setForm({ ...form, shuttleEndTime: e.target.value })} className={inp} />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <input type="checkbox" id="freeShuttle" checked={!!form.hasFreeShuttle} onChange={e => setForm({ ...form, hasFreeShuttle: e.target.checked })}
              className="w-4 h-4 rounded accent-teal-600" />
            <label htmlFor="freeShuttle" className="text-[13px] font-semibold text-gray-700 cursor-pointer">Shuttle is free for guests</label>
          </div>
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-[12px] font-bold text-gray-600">Third-Party Transport Partner</p>
            <p className="text-[11px] text-gray-400">If you work with an external transport company, guests will see a booking option.</p>
            <div>
              <label className={lbl}>Company Name</label>
              <input value={form.transportContent?.third_party_name || ''} onChange={e => setForm({ ...form, transportContent: { ...(form.transportContent || {}), third_party_name: e.target.value } })}
                placeholder="e.g. CruisePort Transportation" className={inp} />
            </div>
            <div>
              <label className={lbl}>Booking URL</label>
              <input value={form.transportContent?.third_party_url || ''} onChange={e => setForm({ ...form, transportContent: { ...(form.transportContent || {}), third_party_url: e.target.value } })}
                placeholder="https://..." className={inp} />
            </div>
            <div>
              <label className={lbl}>Description shown to guests</label>
              <input value={form.transportContent?.third_party_description || ''} onChange={e => setForm({ ...form, transportContent: { ...(form.transportContent || {}), third_party_description: e.target.value } })}
                placeholder="e.g. Scheduled airport & cruise port transfers" className={inp} />
            </div>
          </div>
        </div>
      )}

      {tile === 'SAFETY' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className={lbl}>Emergency Message</label>
            <textarea value={form.safetyContent?.emergency_message || ''} onChange={e => setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_message: e.target.value } })} rows={3}
              className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none"
              placeholder="Remain calm. Call 911, then notify the front desk." />
          </div>
          <div>
            <label className={lbl}>Emergency Contacts</label>
            <div className="space-y-2">
              {((form.safetyContent?.emergency_contacts) || []).map((contact, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input value={contact.label || ''} onChange={e => { const u = [...((form.safetyContent?.emergency_contacts) || [])]; u[idx] = { ...u[idx], label: e.target.value }; setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: u } }); }} placeholder="Label" className="flex-[2] bg-gray-50 rounded-xl px-3 py-2 text-[12px] border border-gray-100 focus:outline-none" />
                  <input value={contact.number || ''} onChange={e => { const u = [...((form.safetyContent?.emergency_contacts) || [])]; u[idx] = { ...u[idx], number: e.target.value }; setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: u } }); }} placeholder="Number" className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-[12px] border border-gray-100 focus:outline-none" />
                  <button onClick={() => setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: ((form.safetyContent?.emergency_contacts) || []).filter((_, i) => i !== idx) } })} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13} /></button>
                </div>
              ))}
              <button onClick={() => setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: [...((form.safetyContent?.emergency_contacts) || []), { label: '', number: '' }] } })}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 py-1"><Plus size={15} /> Add Contact</button>
            </div>
          </div>
          <div>
            <label className={lbl}>Closing Message</label>
            <input value={form.safetyContent?.closing_message || ''} onChange={e => setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), closing_message: e.target.value } })}
              placeholder="Contact front desk anytime for safety concerns." className={inp} />
          </div>
        </div>
      )}

      {tile === 'NEARBY' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className={lbl}>Intro Message</label>
            <p className="text-[11px] text-gray-400 mb-2">Short intro guests see at the top of the Nearby screen.</p>
            <textarea value={form.nearbyIntro?.intro_text || ''} onChange={e => setForm({ ...form, nearbyIntro: { ...(form.nearbyIntro || {}), intro_text: e.target.value } })} rows={4}
              className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none"
              placeholder="Discover restaurants, attractions, and services near our hotel." />
          </div>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <p className="text-[12px] font-semibold text-blue-700 mb-1">💡 Auto-Discover Places</p>
            <p className="text-[11px] text-blue-500">Go to Property Settings → Property Identity and use the "Auto-Discover Nearby Places" button to automatically populate restaurants and attractions near your hotel.</p>
          </div>
        </div>
      )}

      {tile === 'FOOD' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className={lbl}>Intro Message</label>
            <p className="text-[11px] text-gray-400 mb-2">Short intro guests see at the top of the Food screen.</p>
            <textarea value={form.foodContent?.intro_text || ''} onChange={e => setForm({ ...form, foodContent: { ...(form.foodContent || {}), intro_text: e.target.value } })} rows={4}
              className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none"
              placeholder="Explore local partner restaurants and order delivery right to your room." />
          </div>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <p className="text-[12px] font-semibold text-blue-700 mb-1">💡 Restaurant Partners</p>
            <p className="text-[11px] text-blue-500">Restaurants are managed as Partners. Use Auto-Discover or add them manually from Property Settings.</p>
          </div>
        </div>
      )}

      {tile === 'REVIEW' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <p className="text-[12px] text-gray-500">Guests with 4–5 stars are redirected to these review platforms.</p>
          <div>
            <label className={lbl}>Google Review URL</label>
            <input value={form.googleReviewUrl || ''} onChange={e => setForm({ ...form, googleReviewUrl: e.target.value })}
              placeholder="https://www.google.com/maps/place/..." className={inp} />
          </div>
          <div>
            <label className={lbl}>TripAdvisor URL</label>
            <input value={form.tripadvisorUrl || ''} onChange={e => setForm({ ...form, tripadvisorUrl: e.target.value })}
              placeholder="https://www.tripadvisor.com/..." className={inp} />
          </div>
          <div>
            <label className={lbl}>Yelp URL</label>
            <input value={form.yelpUrl || ''} onChange={e => setForm({ ...form, yelpUrl: e.target.value })}
              placeholder="https://www.yelp.com/biz/..." className={inp} />
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Additional Review Links</p>
            {(form.customReviewLinks || []).map((link, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input value={link.label} onChange={e => { const u = [...(form.customReviewLinks || [])]; u[idx] = { ...u[idx], label: e.target.value }; setForm({ ...form, customReviewLinks: u }); }}
                  className="w-[100px] bg-gray-50 rounded-xl px-2.5 py-2 text-[12px] border border-gray-100 focus:outline-none" placeholder="Label" />
                <input value={link.url} onChange={e => { const u = [...(form.customReviewLinks || [])]; u[idx] = { ...u[idx], url: e.target.value }; setForm({ ...form, customReviewLinks: u }); }}
                  className="flex-1 bg-gray-50 rounded-xl px-2.5 py-2 text-[12px] border border-gray-100 focus:outline-none" placeholder="https://..." />
                <button onClick={() => setForm({ ...form, customReviewLinks: (form.customReviewLinks || []).filter((_, i) => i !== idx) })}
                  className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13} /></button>
              </div>
            ))}
            <button onClick={() => setForm({ ...form, customReviewLinks: [...(form.customReviewLinks || []), { label: '', url: '' }] })}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 py-1"><Plus size={15} /> Add Link</button>
          </div>
        </div>
      )}

      {saved && <div className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-[13px] font-medium text-center border border-emerald-100">✅ Changes saved</div>}
      <button onClick={onSave} className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-opacity hover:opacity-90" style={{ backgroundColor: TEAL }}>
        <Save size={16} /> Save Changes
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SETTINGS FORM  —  property identity, branding, etc.
───────────────────────────────────────────────────────── */
function SettingsForm({ form, setForm, onSave, saved, saveError, discovering, discoverResult, handleDiscover }: {
  form: HotelConfig; setForm: (f: HotelConfig) => void; onSave: () => void;
  saved: boolean; saveError: string; discovering: boolean;
  discoverResult: { added: number; total: number } | null; handleDiscover: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-extrabold text-gray-900">Property Settings</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Manage your property info, branding, and guest app content.</p>
      </div>

      <Section title="Property Identity" Icon={HotelIcon}>
        <div>
          <label className={lbl}>Property Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} placeholder="Hotel Name" />
        </div>
        <div>
          <label className={lbl}>Property Type</label>
          <select value={form.propertyType || 'Hotel'} onChange={e => setForm({ ...form, propertyType: e.target.value })}
            className={inp}>
            {['Hotel','Short-Term Rental','Motel','Vacation Rental','Boutique Stay','Other'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Manager Name</label>
          <input value={form.managerName} onChange={e => setForm({ ...form, managerName: e.target.value })} className={inp} />
        </div>
        <div>
          <label className={lbl}>Front Desk Phone</label>
          <input value={form.frontDeskPhone} onChange={e => setForm({ ...form, frontDeskPhone: e.target.value })} className={inp} />
        </div>
        <div>
          <label className={lbl}>Admin Phone</label>
          <input value={form.adminPhone || ''} onChange={e => setForm({ ...form, adminPhone: e.target.value })} placeholder="Admin/owner cell" className={inp} />
        </div>
        <div>
          <label className={lbl}>Room Count</label>
          <input type="number" value={form.roomCount || 0} onChange={e => setForm({ ...form, roomCount: parseInt(e.target.value) || 0 })} className={inp} />
        </div>
        <div>
          <label className={lbl}>Property Address</label>
          <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="1221 W State Road 84, FL" className={inp} />
        </div>
        {form.address && (
          <div>
            <button onClick={handleDiscover} disabled={discovering}
              className="w-full py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#7C3AED', color: 'white' }}>
              {discovering ? 'Discovering...' : '✨ Auto-Discover Nearby Places'}
            </button>
            {discoverResult && <p className="text-[12px] text-emerald-600 font-medium text-center mt-2">Added {discoverResult.added} new places ({discoverResult.total} found)</p>}
            <p className="text-[11px] text-gray-400 mt-1.5 text-center">Scans restaurants & attractions within 1.5 km via OpenStreetMap</p>
          </div>
        )}
      </Section>

      <Section title="Branding" Icon={Settings}>
        <div>
          <label className={lbl}>Brand Color</label>
          <div className="flex items-center gap-3 mb-2">
            <input type="color" value={form.brandColor || '#6B1D3C'} onChange={e => setForm({ ...form, brandColor: e.target.value })}
              className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200 p-0.5" />
            <input type="text" value={form.brandColor || '#6B1D3C'} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setForm({ ...form, brandColor: e.target.value }); }}
              maxLength={7} className={inp + ' flex-1 font-mono'} placeholder="#6B1D3C" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['#6B1D3C','#0D9488','#1D4ED8','#7C3AED','#B45309','#DC2626','#0F172A','#059669'].map(c => (
              <button key={c} onClick={() => setForm({ ...form, brandColor: c })}
                className="w-7 h-7 rounded-lg border-[3px] transition-transform active:scale-90"
                style={{ backgroundColor: c, borderColor: form.brandColor === c ? '#111' : 'transparent' }} />
            ))}
          </div>
        </div>
        <div>
          <label className={lbl}>Website URL</label>
          <input value={form.websiteUrl || ''} onChange={e => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://yourhotel.com" className={inp} />
        </div>
      </Section>

      <Section title="GM Daily Notes" Icon={CalendarDays}>
        <p className="text-[11px] text-gray-400 -mt-1">Staff see this on the Dashboard every morning.</p>
        <textarea value={form.gmNotes} onChange={e => setForm({ ...form, gmNotes: e.target.value })} rows={8}
          className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none font-mono"
          placeholder={`Today's priorities:\n• VIP arrivals/checkouts\n• Maintenance issues\n• Staffing notes`} />
      </Section>

      <Section title="Schedule Settings" Icon={CalendarDays}>
        <div>
          <label className={lbl}>Week starts on</label>
          <div className="flex gap-2">
            {['Sunday','Monday'].map(d => (
              <button key={d} onClick={() => setForm({ ...form, weekStartsOn: d as 'Sunday' | 'Monday' })}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold border transition-colors ${(form.weekStartsOn || 'Sunday') === d ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {d === 'Sunday' ? 'Sunday → Saturday' : 'Monday → Sunday'}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Position Budgets" Icon={DollarSign}>
        <p className="text-[11px] text-gray-400 -mt-1">Labor budgets per position for the KPI model.</p>
        <div className="space-y-4 mt-2">
          {[
            { key: 'front_desk', label: 'Front Desk' },
            { key: 'housekeeping', label: 'Housekeeping' },
            { key: 'maintenance', label: 'Maintenance' },
            { key: 'security', label: 'Security' },
            { key: 'drivers', label: 'Drivers' },
            { key: 'management', label: 'Management' },
          ].map(dept => {
            const budget = (form.positionBudgets || []).find(b => b.department === dept.key) || { department: dept.key, label: dept.label, weeklyBudgetHours: 0, modelType: 'hours_per_room' as const, hoursPerOccupiedRoom: 0, shiftsPerDay: 0, hoursPerShift: 0, fixedWeeklyHours: 0, checkoutMinutes: 0, stayoverMinutes: 0 } as PositionBudget;
            const updateBudget = (partial: Partial<typeof budget>) => {
              const existing = form.positionBudgets || [];
              const idx = existing.findIndex(b => b.department === dept.key);
              const updated = { ...budget, ...partial };
              if (idx >= 0) { const copy = [...existing]; copy[idx] = updated; setForm({ ...form, positionBudgets: copy }); }
              else setForm({ ...form, positionBudgets: [...existing, updated] });
            };
            return (
              <div key={dept.key} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                <h4 className="font-bold text-[13px] text-gray-800">{dept.label}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Weekly Budget (hrs)</label>
                    <input type="number" value={budget.weeklyBudgetHours} onChange={e => updateBudget({ weeklyBudgetHours: Number(e.target.value) || 0 })}
                      className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Model</label>
                    <select value={budget.modelType} onChange={e => updateBudget({ modelType: e.target.value as any })}
                      className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none">
                      <option value="hours_per_room">Hours per Room</option>
                      <option value="shifts_per_day">Shifts per Day</option>
                      <option value="fixed_hours">Fixed Hours</option>
                    </select>
                  </div>
                </div>
                {budget.modelType === 'hours_per_room' && (
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hours per Occupied Room</label>
                    <input type="number" step="0.01" value={budget.hoursPerOccupiedRoom} onChange={e => updateBudget({ hoursPerOccupiedRoom: Number(e.target.value) || 0 })} className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" /></div>
                )}
                {budget.modelType === 'shifts_per_day' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Shifts/Day</label>
                      <input type="number" value={budget.shiftsPerDay} onChange={e => updateBudget({ shiftsPerDay: Number(e.target.value) || 0 })} className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hours/Shift</label>
                      <input type="number" value={budget.hoursPerShift} onChange={e => updateBudget({ hoursPerShift: Number(e.target.value) || 0 })} className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" /></div>
                  </div>
                )}
                {budget.modelType === 'fixed_hours' && (
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Fixed Weekly Hours</label>
                    <input type="number" value={budget.fixedWeeklyHours} onChange={e => updateBudget({ fixedWeeklyHours: Number(e.target.value) || 0 })} className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" /></div>
                )}
                {dept.key === 'housekeeping' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Checkout (min)</label>
                      <input type="number" value={budget.checkoutMinutes} onChange={e => updateBudget({ checkoutMinutes: Number(e.target.value) || 0 })} className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Stayover (min)</label>
                      <input type="number" value={budget.stayoverMinutes} onChange={e => updateBudget({ stayoverMinutes: Number(e.target.value) || 0 })} className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" /></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Tenant Billing" Icon={DollarSign}>
        <div>
          <label className={lbl}>Payment Method</label>
          <select value={form.paymentType || ''} onChange={e => setForm({ ...form, paymentType: e.target.value })} className={inp}>
            <option value="">Select payment method</option>
            {['ACH / Bank Transfer','Check','Wire Transfer','Cash','Credit Card','Other'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Last Payment</label>
          <input value={form.lastPayment || ''} onChange={e => setForm({ ...form, lastPayment: e.target.value })} placeholder="e.g. $500 - Jun 1, 2026" className={inp} />
        </div>
      </Section>

      {saved && <div className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-[13px] font-medium text-center border border-emerald-100">✅ Changes saved</div>}
      {saveError && <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-[13px] font-medium text-center border border-red-200">❌ {saveError}</div>}
      <button onClick={onSave} className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-opacity hover:opacity-90" style={{ backgroundColor: TEAL }}>
        <Save size={16} /> SAVE CHANGES
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────── */
function HotelSettingsView({ config, onSaved }: { config: HotelConfig; onSaved: () => void }) {
  const [form, setForm] = useState<HotelConfig>(config);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<{ added: number; total: number } | null>(null);
  const [selectedTile, setSelectedTile] = useState<TileKey | null>(null);
  const [view, setView] = useState<'settings' | 'screens'>('settings');

  const handleSave = async () => {
    setSaveError('');
    try {
      const res = await fetch('/api/superadmin-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ action: 'update_hotel', data: { config: form } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Save failed');
      setSaved(true); onSaved(); setTimeout(() => setSaved(false), 2500);
    } catch {
      try {
        await updateHotelConfig(form);
        setSaved(true); onSaved(); setTimeout(() => setSaved(false), 2500);
      } catch (e: unknown) {
        setSaveError(e instanceof Error ? e.message : 'Save failed');
      }
    }
  };

  const handleDiscover = async () => {
    if (!form.address || !config.id) return;
    setDiscovering(true); setDiscoverResult(null);
    try {
      await updateHotelConfig(form);
      const res = await fetch('/api/places-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ hotelId: config.id, address: form.address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Discovery failed');
      setDiscoverResult(data); onSaved();
    } catch (e) { alert('Discovery failed: ' + (e as Error).message); }
    finally { setDiscovering(false); }
  };

  const color = form.brandColor || '#6B1D3C';

  return (
    <div className="flex gap-0 min-h-full bg-gray-50">
      {/* ── Left panel ── */}
      <div className="flex-1 min-w-0">
        {/* Tab bar */}
        <div className="flex gap-1 px-8 pt-8 pb-0">
          {[
            { key: 'settings', label: '⚙️ Property Settings' },
            { key: 'screens', label: '📱 Guest App Screens' },
          ].map(t => (
            <button key={t.key}
              onClick={() => { setView(t.key as any); setSelectedTile(null); }}
              className={`px-5 py-2.5 rounded-t-2xl text-[13px] font-bold transition-colors ${view === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-b-none rounded-tr-2xl border-t border-gray-100 shadow-sm px-8 py-8 max-w-2xl">
          {view === 'settings' && !selectedTile && (
            <SettingsForm
              form={form} setForm={setForm} onSave={handleSave}
              saved={saved} saveError={saveError}
              discovering={discovering} discoverResult={discoverResult}
              handleDiscover={handleDiscover}
            />
          )}

          {view === 'screens' && !selectedTile && (
            <div>
              <h1 className="text-[26px] font-extrabold text-gray-900 mb-1">Guest App Screens</h1>
              <TileSelector color={color} onSelect={t => { setSelectedTile(t); }} />
            </div>
          )}

          {selectedTile && (
            <TileEditor
              tile={selectedTile}
              form={form}
              setForm={setForm}
              onBack={() => setSelectedTile(null)}
              onSave={handleSave}
              saved={saved}
            />
          )}
        </div>
      </div>

      {/* ── Right panel: phone mockup ── */}
      <div className="hidden xl:flex flex-col items-center gap-4 px-12 pt-16 sticky top-0 h-screen self-start">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          {selectedTile ? 'Guest View' : 'Live Preview'}
        </p>

        {/* Phone shell */}
        <div className="relative" style={{ width: 248, height: 510 }}>
          {/* Outer shell */}
          <div className="absolute inset-0 rounded-[42px] bg-gray-800 shadow-[0_30px_80px_rgba(0,0,0,0.35)]" />
          {/* Side button */}
          <div className="absolute right-[-3px] top-[100px] w-1 h-10 bg-gray-700 rounded-r-full" />
          <div className="absolute left-[-3px] top-[80px] w-1 h-7 bg-gray-700 rounded-l-full" />
          <div className="absolute left-[-3px] top-[118px] w-1 h-7 bg-gray-700 rounded-l-full" />
          {/* Screen */}
          <div className="absolute inset-[6px] rounded-[36px] overflow-hidden bg-white">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-800 rounded-b-2xl z-10" />
            <div className="absolute inset-0 top-4 overflow-hidden">
              {selectedTile ? (
                <PhoneScreen tile={selectedTile} form={form} color={color} onBack={() => setSelectedTile(null)} />
              ) : (
                <PhoneHome color={color} hotelName={form.name} onTileClick={t => { setSelectedTile(t); setView('screens'); }} />
              )}
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="text-[10px] text-gray-400 text-center max-w-[160px] leading-relaxed">
          {selectedTile ? '← tap back to see home screen' : 'Tap any tile to preview its content'}
        </p>
      </div>
    </div>
  );
}

export default HotelSettingsView;
