'use client';
/* eslint-disable */

import { useState } from 'react';
import {
  Settings, Wifi, ImageIcon, ExternalLink, CalendarDays, DollarSign,
  Bell, ShieldCheck, Bus, UtensilsCrossed, MapPin, Plus, Trash2,
  Save, Upload, Hotel as HotelIcon, ChevronLeft, type LucideIcon,
  Star, MessageSquare, Phone,
} from 'lucide-react';
import { HotelConfig, PositionBudget, updateHotelConfig } from '@/lib/supabase';

const TEAL = '#0D9488';

type TileKey = 'WELCOME' | 'TRANSPORT' | 'FACILITIES' | 'MESSAGE' | 'NEARBY' | 'FOOD' | 'REVIEW';

/* ── Shared helpers ─────────────────────────────────────── */
function Section({ title, Icon, children }: { title: string; Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} style={{ color: TEAL }} />
        <h3 className="font-bold text-[14px]">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none" />
    </div>
  );
}

const lbl = 'text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider';
const inp = 'w-full bg-gray-50 rounded-xl px-3.5 py-2.5 text-[13px] border border-gray-100 focus:outline-none';

/* ── Phone preview — home screen ───────────────────────── */
function PhoneHome({ color, onTileClick }: { color: string; hotelName: string; onTileClick: (t: TileKey) => void }) {
  function Tile({ label, tile, filled, icon }: { label: string; tile: TileKey; filled: boolean; icon: React.ReactNode }) {
    return (
      <button onClick={() => onTileClick(tile)}
        className="rounded-2xl flex flex-col items-center justify-center gap-0.5 hover:opacity-80 transition-opacity cursor-pointer w-full h-full"
        style={filled ? { backgroundColor: color, color: 'white' } : { backgroundColor: 'white', color, border: '1px solid #e5e7eb' }}>
        <div style={{ color: filled ? 'white' : color }}>{icon}</div>
        <span className="text-[5px] font-bold tracking-widest">{label}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <div className="bg-gray-100 px-3 pt-2 pb-1.5 shrink-0 flex items-start justify-between">
        <div>
          <div className="text-[10px] font-black text-black leading-tight">Hello!</div>
          <div className="text-[6px] text-gray-400">What do you need today?</div>
        </div>
        <div className="w-5 h-5 rounded-full border border-gray-200 bg-white flex items-center justify-center">
          <Phone size={8} style={{ color }} />
        </div>
      </div>

      {/* Row 1: WELCOME (big, filled) | TRANSPORT */}
      <div className="flex gap-1.5 px-2 mb-1.5" style={{ height: 56 }}>
        <div className="flex-1">
          <Tile label="WELCOME" tile="WELCOME" filled icon={<MapPin size={10} />} />
        </div>
        <div className="flex-1">
          <Tile label="TRANSPORT" tile="TRANSPORT" filled={false} icon={<Bus size={10} />} />
        </div>
      </div>

      {/* Row 2: FACILITIES | SAFETY (filled) */}
      <div className="flex gap-1.5 px-2 mb-1.5" style={{ height: 50 }}>
        <div className="flex-1">
          <Tile label="FACILITIES" tile="FACILITIES" filled={false} icon={<Bell size={10} />} />
        </div>
        <div className="flex-1">
          <Tile label="SAFETY" tile="MESSAGE" filled icon={<ShieldCheck size={10} />} />
        </div>
      </div>

      {/* Row 3: NEARBY (tall left) | FOOD (filled top) + LEAVE A REVIEW (bottom) */}
      <div className="flex gap-1.5 px-2 mb-1.5" style={{ height: 70 }}>
        <div style={{ width: '42%' }}>
          <Tile label="NEARBY" tile="NEARBY" filled={false} icon={<MapPin size={9} />} />
        </div>
        <div className="flex flex-col gap-1.5" style={{ flex: 1 }}>
          <div style={{ flex: '0 0 55%' }}>
            <Tile label="FOOD" tile="FOOD" filled icon={<UtensilsCrossed size={9} />} />
          </div>
          <div style={{ flex: 1 }}>
            <Tile label="LEAVE A REVIEW" tile="REVIEW" filled={false} icon={null} />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-auto mx-2 mb-1.5 bg-white rounded-2xl flex items-center justify-between px-2 py-1.5 border border-gray-100">
        <div className="flex items-center gap-1">
          <div className="w-3.5 h-3.5 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-[5px]">🍪</span>
          </div>
          <span className="text-[5px] text-gray-400">Powered by Attenda</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[5px] font-bold" style={{ color }}>MY ORDERS</span>
          <div className="rounded-full px-1.5 py-0.5 text-[5px] font-bold text-white" style={{ backgroundColor: color }}>REQUEST NOW</div>
        </div>
      </div>
    </div>
  );
}

/* ── Phone preview — inner screen content ───────────────── */
function PhoneScreen({ tile, form, color, onBack }: { tile: TileKey; form: HotelConfig; color: string; onBack: () => void }) {
  const titles: Record<TileKey, string> = {
    WELCOME: 'Welcome', TRANSPORT: 'Transport', FACILITIES: 'Facilities',
    MESSAGE: 'Message Us', NEARBY: 'Nearby', FOOD: 'Food & Dining', REVIEW: 'Rate Us',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mini header */}
      <div className="bg-white px-2 py-1.5 flex items-center gap-1.5 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={10} />
        </button>
        <span className="text-[8px] font-bold text-gray-800">{titles[tile]}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-2 py-1.5 space-y-1.5">
        {tile === 'WELCOME' && (
          <>
            <div className="bg-white rounded-lg p-2 border border-gray-100">
              <p className="text-[6px] text-gray-700 leading-relaxed line-clamp-5">
                {form.welcomeLetter || 'Your welcome letter will appear here. Add a personal message for guests.'}
              </p>
              <div className="mt-1.5 pt-1 border-t border-gray-100">
                <p className="text-[6px] font-bold" style={{ color }}>{form.managerName || 'Hotel Manager'}</p>
                <p className="text-[5px] text-gray-400">{form.name}</p>
              </div>
            </div>
            {form.teamPhotoUrl && (
              <div className="rounded-lg overflow-hidden border border-gray-100">
                <img src={form.teamPhotoUrl} alt="Team" className="w-full object-cover" style={{ height: 36 }} />
                <div className="bg-white px-1.5 py-0.5">
                  <p className="text-[5px] text-gray-500">Your team at {form.name}</p>
                </div>
              </div>
            )}
            {(form.wifiName) && (
              <div className="bg-white rounded-lg p-1.5 border border-gray-100 flex items-center gap-1.5">
                <Wifi size={8} style={{ color }} />
                <div>
                  <p className="text-[5px] font-bold text-gray-700">{form.wifiName}</p>
                  {form.wifiPassword && <p className="text-[5px] text-gray-400">{form.wifiPassword}</p>}
                </div>
              </div>
            )}
          </>
        )}

        {tile === 'FACILITIES' && (
          <>
            {((form.facilitiesContent || []).length > 0 ? form.facilitiesContent! : [
              { title: 'Complimentary Breakfast', description: '6:30–9:30 AM daily' },
              { title: 'Pool & Fitness Center', description: 'Open 6 AM – 10 PM' },
              { title: 'Guest Laundry', description: '2nd floor, coin-operated' },
            ]).slice(0, 5).map((a, i) => (
              <div key={i} className="bg-white rounded-lg p-1.5 border border-gray-100 flex items-center gap-1.5">
                <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                </div>
                <div>
                  <p className="text-[6px] font-semibold text-gray-800">{a.title}</p>
                  {a.description && <p className="text-[5px] text-gray-400 line-clamp-1">{a.description}</p>}
                </div>
              </div>
            ))}
          </>
        )}

        {tile === 'TRANSPORT' && (
          <>
            <div className="bg-white rounded-lg p-2 border border-gray-100">
              <div className="flex items-center gap-1 mb-1">
                <Bus size={8} style={{ color }} />
                <p className="text-[7px] font-bold text-gray-800">Hotel Shuttle</p>
              </div>
              <p className="text-[6px] text-gray-500">
                📍 {form.shuttlePickupLocation || 'Hotel Lobby'}
              </p>
              {(form.shuttleStartTime || form.shuttleEndTime) && (
                <p className="text-[6px] text-gray-500 mt-0.5">
                  🕐 {form.shuttleStartTime?.slice(0,5) || '--'} – {form.shuttleEndTime?.slice(0,5) || '--'}
                </p>
              )}
            </div>
            {form.transportContent?.third_party_name && (
              <div className="bg-white rounded-lg p-2 border border-gray-100">
                <p className="text-[7px] font-bold text-gray-800">{form.transportContent.third_party_name}</p>
                {form.transportContent.third_party_description && (
                  <p className="text-[6px] text-gray-400 mt-0.5">{form.transportContent.third_party_description}</p>
                )}
                <div className="mt-1 px-1.5 py-0.5 rounded-full text-white text-[5px] font-bold inline-block" style={{ backgroundColor: color }}>
                  Book Now
                </div>
              </div>
            )}
          </>
        )}

        {tile === 'MESSAGE' && (
          <>
            <div className="bg-white rounded-lg p-2 border border-gray-100 space-y-1">
              <div className="flex items-center gap-1">
                <Phone size={7} style={{ color }} />
                <p className="text-[6px] font-bold text-gray-700">Front Desk</p>
              </div>
              <p className="text-[7px] font-mono font-bold" style={{ color }}>{form.frontDeskPhone || '(000) 000-0000'}</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-gray-100">
              <div className="flex items-center gap-1 mb-1">
                <MessageSquare size={7} style={{ color }} />
                <p className="text-[6px] font-bold text-gray-700">Send a Message</p>
              </div>
              <div className="bg-gray-50 rounded px-1.5 py-1">
                <p className="text-[5px] text-gray-300">Type your message...</p>
              </div>
            </div>
          </>
        )}

        {tile === 'FOOD' && (
          <div className="bg-white rounded-lg p-2 border border-gray-100">
            <p className="text-[7px] font-bold text-gray-800 mb-1">Food & Dining</p>
            <p className="text-[6px] text-gray-500 leading-relaxed">
              {form.foodContent?.intro_text || 'Explore local partner restaurants and order delivery.'}
            </p>
            <div className="mt-2 space-y-1">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded px-1.5 py-1">
                  <div className="w-5 h-5 rounded bg-gray-200" />
                  <div><div className="h-1 bg-gray-200 rounded w-10 mb-0.5" /><div className="h-1 bg-gray-100 rounded w-6" /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tile === 'NEARBY' && (
          <div className="space-y-1">
            <div className="bg-white rounded-lg p-2 border border-gray-100">
              <p className="text-[7px] font-bold text-gray-800 mb-0.5">Nearby</p>
              <p className="text-[6px] text-gray-500">
                {form.nearbyIntro?.intro_text || 'Discover restaurants, attractions near the hotel.'}
              </p>
            </div>
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-lg px-2 py-1.5 border border-gray-100 flex items-center gap-1.5">
                <MapPin size={6} style={{ color }} />
                <div><div className="h-1 bg-gray-200 rounded w-12 mb-0.5" /><div className="h-0.5 bg-gray-100 rounded w-8" /></div>
              </div>
            ))}
          </div>
        )}

        {tile === 'REVIEW' && (
          <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
            <p className="text-[8px] font-bold text-gray-800 mb-0.5">How was your stay?</p>
            <p className="text-[5px] text-gray-400 mb-2">Tap a star to rate</p>
            <div className="flex justify-center gap-1 mb-2">
              {[1,2,3,4,5].map(s => <Star key={s} size={10} className="fill-amber-400 text-amber-400" />)}
            </div>
            <div className="space-y-1">
              {[form.googleReviewUrl && 'Google', form.tripadvisorUrl && 'TripAdvisor', form.yelpUrl && 'Yelp'].filter(Boolean).map(name => (
                <div key={name} className="px-2 py-0.5 rounded-lg border border-gray-200 text-[5px] font-bold text-gray-600">{name}</div>
              ))}
              {!form.googleReviewUrl && !form.tripadvisorUrl && !form.yelpUrl && (
                <p className="text-[5px] text-gray-300">Add review links on the left →</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Content editor per tile (LEFT SIDE when tile selected) */
function TileEditor({ tile, form, setForm, onBack, onSave, saved }: {
  tile: TileKey; form: HotelConfig; setForm: (f: HotelConfig) => void;
  onBack: () => void; onSave: () => void; saved: boolean;
}) {
  const titles: Record<TileKey, string> = {
    WELCOME: 'Welcome Screen', TRANSPORT: 'Transport Screen', FACILITIES: 'Facilities Screen',
    MESSAGE: 'Message Screen', NEARBY: 'Nearby Screen', FOOD: 'Food & Dining Screen', REVIEW: 'Review Screen',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={16} /> All Settings
        </button>
        <span className="text-gray-300">·</span>
        <h1 className="text-[18px] font-extrabold text-gray-900">{titles[tile]}</h1>
      </div>

      {tile === 'WELCOME' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <div>
            <label className={lbl}>Welcome Letter</label>
            <p className="text-[11px] text-gray-400 mb-1.5">This is the personal message guests read when they open the app.</p>
            <textarea value={form.welcomeLetter} onChange={e => setForm({ ...form, welcomeLetter: e.target.value })} rows={6}
              className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none"
              placeholder="Dear Guest, welcome to our hotel! We're so glad you're here..." />
          </div>
          <div>
            <label className={lbl}>Team / Property Photo</label>
            <p className="text-[11px] text-gray-400 mb-1.5">Shown below the welcome letter. Upload a team photo or property image.</p>
            <div className="flex items-center gap-2">
              <input value={form.teamPhotoUrl} onChange={e => setForm({ ...form, teamPhotoUrl: e.target.value })}
                placeholder="https://..." className={inp + ' flex-1'} />
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-white shrink-0 transition-colors" style={{ backgroundColor: TEAL }}>
                <Upload size={14} /> Upload
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
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
              <label className={lbl}>Wi-Fi Network Name</label>
              <input value={form.wifiName} onChange={e => setForm({ ...form, wifiName: e.target.value })} className={inp} placeholder="Hotel-WiFi" />
            </div>
            <div>
              <label className={lbl}>Wi-Fi Password</label>
              <input value={form.wifiPassword} onChange={e => setForm({ ...form, wifiPassword: e.target.value })} className={inp} placeholder="password123" />
            </div>
          </div>
          <div>
            <label className={lbl}>Brand Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.brandColor || '#6B1D3C'} onChange={e => setForm({ ...form, brandColor: e.target.value })}
                className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200 p-0.5" />
              <input type="text" value={form.brandColor || '#6B1D3C'} onChange={e => {
                if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setForm({ ...form, brandColor: e.target.value });
              }} maxLength={7} className={inp + ' flex-1 font-mono'} placeholder="#6B1D3C" />
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {['#6B1D3C','#0D9488','#1D4ED8','#7C3AED','#B45309','#DC2626','#0F172A'].map(c => (
                <button key={c} onClick={() => setForm({ ...form, brandColor: c })}
                  className="w-7 h-7 rounded-lg border-2 transition-transform active:scale-90"
                  style={{ backgroundColor: c, borderColor: form.brandColor === c ? '#111' : 'transparent' }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {tile === 'FACILITIES' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <div>
            <p className="text-[12px] text-gray-500 mb-3">These amenities appear as cards on the Facilities screen. Add anything guests should know about (pool hours, breakfast, laundry, parking, etc.)</p>
            <div className="space-y-3">
              {(form.facilitiesContent || []).map((a, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amenity {idx + 1}</span>
                    <button onClick={() => setForm({ ...form, facilitiesContent: (form.facilitiesContent || []).filter((_, i) => i !== idx) })}
                      className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                  <input value={a.title} onChange={e => {
                    const u = [...(form.facilitiesContent || [])]; u[idx] = { ...u[idx], title: e.target.value };
                    setForm({ ...form, facilitiesContent: u });
                  }} placeholder="e.g. Complimentary Breakfast" className="w-full bg-white rounded-xl px-3 py-2 text-[13px] border border-gray-200 focus:outline-none" />
                  <textarea value={a.description || ''} onChange={e => {
                    const u = [...(form.facilitiesContent || [])]; u[idx] = { ...u[idx], description: e.target.value };
                    setForm({ ...form, facilitiesContent: u });
                  }} rows={2} placeholder="Hours, location, any other details..." className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none resize-none" />
                </div>
              ))}
              <button onClick={() => setForm({ ...form, facilitiesContent: [...(form.facilitiesContent || []), { icon: 'Bell', title: '', description: '' }] })}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 hover:text-teal-700 py-2">
                <Plus size={15} /> Add Amenity
              </button>
            </div>
          </div>
        </div>
      )}

      {tile === 'TRANSPORT' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
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
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-[12px] font-bold text-gray-600">Third-Party Transport Partner</p>
            <p className="text-[11px] text-gray-400">If you work with an external transport company, guests will see their booking link as an option.</p>
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

      {tile === 'MESSAGE' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <div>
            <label className={lbl}>Front Desk Phone</label>
            <p className="text-[11px] text-gray-400 mb-1.5">Shown prominently so guests can call directly.</p>
            <input value={form.frontDeskPhone} onChange={e => setForm({ ...form, frontDeskPhone: e.target.value })} className={inp} placeholder="(000) 000-0000" />
          </div>
          <div>
            <label className={lbl}>Notification Email</label>
            <p className="text-[11px] text-gray-400 mb-1.5">Guest messages land in this inbox.</p>
            <input value={form.notificationEmail} onChange={e => setForm({ ...form, notificationEmail: e.target.value })}
              placeholder="frontdesk@yourhotel.com" className={inp} />
          </div>
        </div>
      )}

      {tile === 'FOOD' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <div>
            <label className={lbl}>Intro Message</label>
            <p className="text-[11px] text-gray-400 mb-1.5">Short intro guests see at the top of the Food screen.</p>
            <textarea value={form.foodContent?.intro_text || ''} onChange={e => setForm({ ...form, foodContent: { ...(form.foodContent || {}), intro_text: e.target.value } })} rows={4}
              className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none"
              placeholder="Explore local partner restaurants and order delivery right to your room." />
          </div>
        </div>
      )}

      {tile === 'NEARBY' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <div>
            <label className={lbl}>Intro Message</label>
            <p className="text-[11px] text-gray-400 mb-1.5">Short intro guests see at the top of the Nearby screen.</p>
            <textarea value={form.nearbyIntro?.intro_text || ''} onChange={e => setForm({ ...form, nearbyIntro: { ...(form.nearbyIntro || {}), intro_text: e.target.value } })} rows={4}
              className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none"
              placeholder="Discover restaurants, attractions, and services near our hotel." />
          </div>
        </div>
      )}

      {tile === 'REVIEW' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
          <p className="text-[12px] text-gray-500">Add your review profile URLs. Guests with 4-5 stars are redirected to these pages.</p>
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
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Custom Review Links</p>
            <div className="space-y-2">
              {(form.customReviewLinks || []).map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input value={link.label} onChange={e => {
                    const u = [...(form.customReviewLinks || [])]; u[idx] = { ...u[idx], label: e.target.value };
                    setForm({ ...form, customReviewLinks: u });
                  }} className="w-[100px] bg-gray-50 rounded-xl px-2.5 py-2 text-[12px] border border-gray-100 focus:outline-none" placeholder="Label" />
                  <input value={link.url} onChange={e => {
                    const u = [...(form.customReviewLinks || [])]; u[idx] = { ...u[idx], url: e.target.value };
                    setForm({ ...form, customReviewLinks: u });
                  }} className="flex-1 bg-gray-50 rounded-xl px-2.5 py-2 text-[12px] border border-gray-100 focus:outline-none" placeholder="https://..." />
                  <button onClick={() => setForm({ ...form, customReviewLinks: (form.customReviewLinks || []).filter((_, i) => i !== idx) })}
                    className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => setForm({ ...form, customReviewLinks: [...(form.customReviewLinks || []), { label: '', url: '' }] })}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 hover:text-teal-700 py-1">
                <Plus size={15} /> Add Review Link
              </button>
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-[13px] font-medium text-center">✅ Saved</div>
      )}
      <button onClick={onSave} className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2" style={{ backgroundColor: TEAL }}>
        <Save size={16} /> Save Changes
      </button>
    </div>
  );
}

/* ── Main settings form ─────────────────────────────────── */
function SettingsForm({ form, setForm, onSave, saved, saveError, discovering, discoverResult, handleDiscover }: {
  form: HotelConfig; setForm: (f: HotelConfig) => void; onSave: () => void;
  saved: boolean; saveError: string; discovering: boolean;
  discoverResult: { added: number; total: number } | null; handleDiscover: () => void;
}) {
  return (
    <div className="space-y-5">
      <h1 className="text-[26px] font-extrabold text-gray-900">Property Settings</h1>

      <Section title="Property Identity" Icon={HotelIcon}>
        <Field label="Property Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
        <div>
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Property Type</label>
          <select value={form.propertyType || 'Hotel'} onChange={e => setForm({ ...form, propertyType: e.target.value })}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-100 focus:outline-none">
            {['Hotel','Short-Term Rental','Motel','Vacation Rental','Boutique Stay','Other'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <Field label="Manager Name" value={form.managerName} onChange={v => setForm({ ...form, managerName: v })} />
        <Field label="Front Desk Phone" value={form.frontDeskPhone} onChange={v => setForm({ ...form, frontDeskPhone: v })} />
        <Field label="Admin Phone" value={form.adminPhone || ''} onChange={v => setForm({ ...form, adminPhone: v })} placeholder="Admin/owner cell" />
        <div>
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Room Count</label>
          <input type="number" value={form.roomCount || 0} onChange={e => setForm({ ...form, roomCount: parseInt(e.target.value) || 0 })}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-100 focus:outline-none" />
        </div>
        <Field label="Property Address" value={form.address} onChange={v => setForm({ ...form, address: v })} placeholder="1221 W State Road 84, FL" />
        {form.address && (
          <div>
            <button onClick={handleDiscover} disabled={discovering}
              className="w-full py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: '#7C3AED', color: 'white' }}>
              {discovering ? 'Discovering...' : 'Auto-Discover Nearby Places'}
            </button>
            {discoverResult && <p className="text-[12px] text-emerald-600 font-medium text-center mt-2">Added {discoverResult.added} new places ({discoverResult.total} found)</p>}
            <p className="text-[11px] text-gray-400 mt-1.5 text-center">Scans restaurants & attractions from OpenStreetMap within 1.5 km</p>
          </div>
        )}
      </Section>

      <Section title="Branding" Icon={Settings}>
        <div className="flex items-center gap-3 mt-1">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Brand Color</label>
          <div className="flex items-center gap-2 flex-1">
            <input type="color" value={form.brandColor || '#6B1D3C'} onChange={e => setForm({ ...form, brandColor: e.target.value })}
              className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200 p-0.5" />
            <input type="text" value={form.brandColor || '#6B1D3C'} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setForm({ ...form, brandColor: e.target.value }); }}
              maxLength={7} className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-100 font-mono focus:outline-none" placeholder="#6B1D3C" />
          </div>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {['#6B1D3C','#0D9488','#1D4ED8','#7C3AED','#B45309','#DC2626','#0F172A'].map(c => (
            <button key={c} onClick={() => setForm({ ...form, brandColor: c })}
              className="w-7 h-7 rounded-lg border-2 transition-transform active:scale-90"
              style={{ backgroundColor: c, borderColor: form.brandColor === c ? '#111' : 'transparent' }} />
          ))}
        </div>
        <Field label="Website URL" value={form.websiteUrl} onChange={v => setForm({ ...form, websiteUrl: v })} placeholder="https://yourhotel.com" />
      </Section>

      <Section title="GM Daily Notes" Icon={CalendarDays}>
        <p className="text-[11px] text-gray-400 -mt-1">Staff see this on the Dashboard every morning.</p>
        <textarea value={form.gmNotes} onChange={e => setForm({ ...form, gmNotes: e.target.value })} rows={8}
          className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none font-mono"
          placeholder={`Today's priorities:\n• VIP arrivals/checkouts\n• Maintenance issues\n• Staffing notes`} />
      </Section>

      <Section title="Schedule Settings" Icon={CalendarDays}>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Week starts on</label>
          <div className="flex gap-2">
            {['Sunday','Monday'].map(d => (
              <button key={d} onClick={() => setForm({ ...form, weekStartsOn: d as 'Sunday' | 'Monday' })}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold border ${(form.weekStartsOn || 'Sunday') === d ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                {d === 'Sunday' ? 'Sunday → Saturday' : 'Monday → Sunday'}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Position Budgets" Icon={DollarSign}>
        <p className="text-[11px] text-gray-400 -mt-1">Labor budgets per position for the KPI model.</p>
        <div className="space-y-4 mt-3">
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
                      className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" placeholder="e.g. 168" />
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
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hours per Occupied Room</label>
                    <input type="number" step="0.01" value={budget.hoursPerOccupiedRoom} onChange={e => updateBudget({ hoursPerOccupiedRoom: Number(e.target.value) || 0 })}
                      className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" placeholder="e.g. 0.3" />
                  </div>
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

      <Section title="Guest Content — Safety" Icon={ShieldCheck}>
        <p className="text-[11px] text-gray-400 -mt-1">Safety info guests see. Leave empty to use defaults.</p>
        <Field label="Emergency Message" value={form.safetyContent?.emergency_message || ''} onChange={v => setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_message: v } })} placeholder="Remain calm. Call 911, then notify front desk." />
        <Field label="Closing Message" value={form.safetyContent?.closing_message || ''} onChange={v => setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), closing_message: v } })} placeholder="Contact front desk anytime for safety concerns." />
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Emergency Contacts</p>
        {((form.safetyContent?.emergency_contacts) || []).map((contact, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input value={contact.label || ''} onChange={e => { const u = [...((form.safetyContent?.emergency_contacts) || [])]; u[idx] = { ...u[idx], label: e.target.value }; setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: u } }); }} placeholder="Label" className="flex-[2] bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" />
            <input value={contact.number || ''} onChange={e => { const u = [...((form.safetyContent?.emergency_contacts) || [])]; u[idx] = { ...u[idx], number: e.target.value }; setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: u } }); }} placeholder="Number" className="flex-1 bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" />
            <button onClick={() => setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: ((form.safetyContent?.emergency_contacts) || []).filter((_, i) => i !== idx) } })} className="text-red-400"><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={() => setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: [...((form.safetyContent?.emergency_contacts) || []), { label: '', number: '' }] } })} className="flex items-center gap-1.5 text-[12px] font-medium text-teal-600"><Plus size={14} /> Add Contact</button>
      </Section>

      <Section title="Tenant Billing" Icon={DollarSign}>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Payment Method</label>
          <select value={form.paymentType || ''} onChange={e => setForm({ ...form, paymentType: e.target.value })}
            className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100 focus:outline-none">
            <option value="">Select payment method</option>
            {['ACH / Bank Transfer','Check','Wire Transfer','Cash','Credit Card','Other'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <Field label="Last Payment" value={form.lastPayment || ''} onChange={v => setForm({ ...form, lastPayment: v })} placeholder="e.g. $500 - Jun 1, 2026" />
      </Section>

      {saved && <div className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-[13px] font-medium text-center">✅ Saved</div>}
      {saveError && <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-[13px] font-medium text-center border border-red-200">❌ {saveError}</div>}
      <button onClick={onSave} className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2" style={{ backgroundColor: TEAL }}>
        <Save size={16} /> SAVE CHANGES
      </button>
    </div>
  );
}

/* ── HotelSettingsView ──────────────────────────────────── */
function HotelSettingsView({ config, onSaved }: { config: HotelConfig; onSaved: () => void }) {
  const [form, setForm] = useState<HotelConfig>(config);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<{ added: number; total: number } | null>(null);
  const [selectedTile, setSelectedTile] = useState<TileKey | null>(null);

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

  return (
    <div className="flex gap-8 p-8 min-h-full">
      {/* ── Left: form or tile editor ── */}
      <div className="flex-1 max-w-lg space-y-5">
        {selectedTile ? (
          <TileEditor
            tile={selectedTile}
            form={form}
            setForm={setForm}
            onBack={() => setSelectedTile(null)}
            onSave={handleSave}
            saved={saved}
          />
        ) : (
          <SettingsForm
            form={form} setForm={setForm} onSave={handleSave}
            saved={saved} saveError={saveError}
            discovering={discovering} discoverResult={discoverResult}
            handleDiscover={handleDiscover}
          />
        )}
      </div>

      {/* ── Right: phone preview ── */}
      <div className="hidden lg:flex flex-col items-center gap-3 pt-12 sticky top-8 self-start">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          {selectedTile ? 'Guest View' : 'Live Preview'}
        </p>

        {/* Phone frame */}
        <div className="relative" style={{ width: 200, height: 400 }}>
          <div className="absolute inset-0 rounded-[28px] border-[6px] border-gray-800 bg-[#F4F4F5] overflow-hidden shadow-2xl">
            {selectedTile ? (
              <PhoneScreen tile={selectedTile} form={form} color={form.brandColor || '#6B1D3C'} onBack={() => setSelectedTile(null)} />
            ) : (
              <PhoneHome color={form.brandColor || '#6B1D3C'} hotelName={form.name} onTileClick={setSelectedTile} />
            )}
          </div>
        </div>

        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: form.brandColor || '#6B1D3C' }}>
            {form.brandColor || '#6B1D3C'}
          </div>
          <p className="text-[10px] text-gray-400">
            {selectedTile ? 'Editing ← tap back to switch screens' : 'Tap a screen to edit its content'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default HotelSettingsView;
