'use client';
/* eslint-disable */

import { useState } from 'react';
import {
  Settings, Wifi, ImageIcon, ExternalLink, CalendarDays, DollarSign,
  Bell, ShieldCheck, Bus, UtensilsCrossed, MapPin, Plus, Trash2,
  Save, Upload, Hotel as HotelIcon, type LucideIcon,
} from 'lucide-react';
import { HotelConfig, updateHotelConfig } from '@/lib/supabase';

/* ── Constants ─────────────────────────────────────────── */
const TEAL = '#0D9488';

/* ── Shared UI Helpers ──────────────────────────────────── */
function Section({ title, Icon, children }: {
  title: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}) {
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

function Field({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none"
      />
    </div>
  );
}

/* ── Guest Home Preview ─────────────────────────────────── */
function GuestHomePreview({ color, hotelName }: { color: string; hotelName: string }) {
  const tiles = [
    { label: 'WELCOME', filled: true },
    { label: 'TRANSPORT', filled: false },
    { label: 'FACILITIES', filled: false },
    { label: 'MESSAGE', filled: false },
  ];
  return (
    <div className="relative mx-auto" style={{ width: 200, height: 400 }}>
      {/* Phone frame */}
      <div className="absolute inset-0 rounded-[28px] border-[6px] border-gray-800 bg-[#F4F4F5] overflow-hidden shadow-2xl">
        {/* Status bar */}
        <div className="bg-white px-3 pt-2 pb-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[9px] font-black text-black leading-none">Hello!</div>
              <div className="text-[6px] text-gray-400 mt-0.5">What do you need today?</div>
            </div>
            <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            </div>
          </div>
        </div>
        {/* 2×2 grid */}
        <div className="grid grid-cols-2 gap-1 p-1.5 h-[160px]">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-xl flex items-center justify-center text-[6px] font-bold tracking-wider"
              style={t.filled
                ? { backgroundColor: color, color: 'white' }
                : { backgroundColor: 'white', color, border: '1px solid #e5e7eb' }}
            >
              {t.label}
            </div>
          ))}
        </div>
        {/* Rewards banner */}
        <div className="mx-1.5 rounded-xl overflow-hidden" style={{ height: 44, backgroundColor: color, opacity: 0.15 }}>
          <div className="flex items-end h-full px-2 pb-1">
            <span className="text-[6px] font-bold" style={{ color }}>BEST WESTERN REWARDS</span>
          </div>
        </div>
        {/* Bottom row */}
        <div className="flex gap-1 p-1.5 mt-1" style={{ height: 70 }}>
          <div className="w-[38%] rounded-xl bg-white border border-gray-200 flex items-center justify-center">
            <span className="text-[5px] font-bold" style={{ color }}>NEARBY</span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex-1 rounded-xl flex items-center justify-center" style={{ backgroundColor: color }}>
              <span className="text-[5px] font-bold text-white">FOOD</span>
            </div>
            <div className="flex-1 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
              <span className="text-[5px] font-bold" style={{ color }}>REVIEW</span>
            </div>
          </div>
        </div>
        {/* Hotel name chip */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <div className="px-2 py-0.5 rounded-full text-white text-[5px] font-bold" style={{ backgroundColor: color }}>
            {hotelName || 'Your Hotel'}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hotel Settings View ────────────────────────────────── */
function HotelSettingsView({ config, onSaved }: { config: HotelConfig; onSaved: () => void }) {
  const [form, setForm] = useState<HotelConfig>(config);
  const [saved, setSaved] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<{ added: number; total: number } | null>(null);

  const handleSave = async () => {
    // Use service-role proxy for PIN-based logins (superadmin)
    try {
      const res = await fetch('/api/superadmin-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ action: 'update_hotel', data: { config: form } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Save failed');
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // Fallback to direct call for email-login admins
      await updateHotelConfig(form);
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleDiscover = async () => {
    if (!form.address || !config.id) return;
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      await updateHotelConfig(form);
      const res = await fetch('/api/places-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({ hotelId: config.id, address: form.address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Discovery failed');
      setDiscoverResult(data);
      onSaved();
    } catch (e) {
      alert('Discovery failed: ' + (e as Error).message);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="flex gap-8 p-8 min-h-full">
      {/* ── Left: Form ── */}
      <div className="flex-1 max-w-lg space-y-5">
        <h1 className="text-[26px] font-extrabold text-gray-900">Property Settings</h1>

        <Section title="Property Identity" Icon={HotelIcon}>
          <Field label="Property Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Property Type</label>
            <select
              value={form.propertyType || 'Hotel'}
              onChange={e => setForm({ ...form, propertyType: e.target.value })}
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Hotel">Hotel</option>
              <option value="Short-Term Rental">Short-Term Rental</option>
              <option value="Motel">Motel</option>
              <option value="Vacation Rental">Vacation Rental</option>
              <option value="Boutique Stay">Boutique Stay</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <Field label="Manager Name" value={form.managerName} onChange={v => setForm({ ...form, managerName: v })} />
          <Field label="Front Desk Phone" value={form.frontDeskPhone} onChange={v => setForm({ ...form, frontDeskPhone: v })} />
          <Field label="Admin Phone" value={form.adminPhone || ''} onChange={v => setForm({ ...form, adminPhone: v })} placeholder="Admin/owner cell number" />
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Room Count</label>
            <input type="number" value={form.roomCount || 0} onChange={e => setForm({ ...form, roomCount: parseInt(e.target.value) || 0 })}
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <Field
            label="Property Address"
            value={form.address}
            onChange={v => setForm({ ...form, address: v })}
            placeholder="1601 NW 42nd Ave, Miami, FL 33126"
          />
          {form.address && (
            <div>
              <button
                onClick={handleDiscover}
                disabled={discovering}
                className="w-full py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#7C3AED', color: 'white' }}
              >
                {discovering ? 'Discovering...' : 'Auto-Discover Nearby Places'}
              </button>
              {discoverResult && (
                <p className="text-[12px] text-emerald-600 font-medium text-center mt-2">
                  Added {discoverResult.added} new places ({discoverResult.total} found nearby)
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-1.5 text-center">
                Scans real restaurants &amp; attractions from OpenStreetMap within 1.5 km
              </p>
            </div>
          )}
        </Section>

        <Section title="Branding" Icon={Settings}>
          <p className="text-[11px] text-gray-400 -mt-1">
            Set the accent color used across the guest-facing app. Preview updates live on the right.
          </p>
          <div className="flex items-center gap-3 mt-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Brand Color</label>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="color"
                value={form.brandColor || '#6B1D3C'}
                onChange={e => setForm({ ...form, brandColor: e.target.value })}
                className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200 p-0.5"
              />
              <input
                type="text"
                value={form.brandColor || '#6B1D3C'}
                onChange={e => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setForm({ ...form, brandColor: val });
                }}
                maxLength={7}
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-100 font-mono focus:outline-none"
                placeholder="#6B1D3C"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {['#6B1D3C','#0D9488','#1D4ED8','#7C3AED','#B45309','#DC2626','#0F172A'].map(c => (
              <button
                key={c}
                onClick={() => setForm({ ...form, brandColor: c })}
                className="w-7 h-7 rounded-lg border-2 transition-transform active:scale-90"
                style={{ backgroundColor: c, borderColor: form.brandColor === c ? '#111' : 'transparent' }}
                title={c}
              />
            ))}
          </div>
          <Field label="Website URL" value={form.websiteUrl} onChange={v => setForm({ ...form, websiteUrl: v })} placeholder="https://yourhotel.com" />
        </Section>

        <Section title="WiFi Settings" Icon={Wifi}>
          <Field label="Network Name" value={form.wifiName} onChange={v => setForm({ ...form, wifiName: v })} />
          <Field label="Password" value={form.wifiPassword} onChange={v => setForm({ ...form, wifiPassword: v })} />
        </Section>

        <Section title="Welcome Letter" Icon={ImageIcon}>
          <textarea
            value={form.welcomeLetter}
            onChange={e => setForm({ ...form, welcomeLetter: e.target.value })}
            rows={5}
            className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none"
            placeholder="Dear Guest, welcome to our hotel..."
          />
          <div className="mt-3">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5"
            >Welcome Photo / Team Photo</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.teamPhotoUrl}
                onChange={e => setForm({ ...form, teamPhotoUrl: e.target.value })}
                placeholder="https://..."
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-100 focus:outline-none"
              />
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-white transition-colors"
                style={{ backgroundColor: TEAL }}>
                <Upload size={14} />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const dataUrl = event.target?.result as string;
                      setForm({ ...form, teamPhotoUrl: dataUrl });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>
        </Section>

        <Section title="Review Links" Icon={ExternalLink}>
          <p className="text-[11px] text-gray-400 -mt-1">
            Add links to your hotel&apos;s profiles on review sites. Guests can leave reviews directly from their app.
          </p>
          <Field label="Google Review URL" value={form.googleReviewUrl || ''} onChange={v => setForm({ ...form, googleReviewUrl: v })} placeholder="https://www.google.com/travel/hotels/..." />
          <Field label="TripAdvisor URL" value={form.tripadvisorUrl || ''} onChange={v => setForm({ ...form, tripadvisorUrl: v })} placeholder="https://www.tripadvisor.com/..." />
          <Field label="Yelp URL" value={form.yelpUrl || ''} onChange={v => setForm({ ...form, yelpUrl: v })} placeholder="https://www.yelp.com/..." />
          <div className="border-t border-gray-100 mt-3 pt-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Custom Review Links</p>
            <div className="space-y-2">
              {(form.customReviewLinks || []).map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={e => {
                    const updated = [...(form.customReviewLinks || [])];
                    updated[idx] = { ...updated[idx], label: e.target.value };
                    setForm({ ...form, customReviewLinks: updated });
                  }}
                  className="w-[110px] bg-gray-50 rounded-xl px-2.5 py-2 text-[12px] border border-gray-100 focus:outline-none"
                  placeholder="Label (e.g. Google)"
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={e => {
                    const updated = [...(form.customReviewLinks || [])];
                    updated[idx] = { ...updated[idx], url: e.target.value };
                    setForm({ ...form, customReviewLinks: updated });
                  }}
                  className="flex-1 bg-gray-50 rounded-xl px-2.5 py-2 text-[12px] border border-gray-100 focus:outline-none"
                  placeholder="https://..."
                />
                <button
                  onClick={() => {
                    const updated = (form.customReviewLinks || []).filter((_, i) => i !== idx);
                    setForm({ ...form, customReviewLinks: updated });
                  }}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const updated = [...(form.customReviewLinks || []), { label: '', url: '' }];
                setForm({ ...form, customReviewLinks: updated });
              }}
              className="flex items-center gap-1.5 text-[12px] font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              <Plus size={14} /> Add Review Link
            </button>
          </div>
          </div>
        </Section>

        <Section title="GM Daily Notes" Icon={CalendarDays}>
          <p className="text-[11px] text-gray-400 -mt-1">
            Write the daily morning brief here. Staff see it on the Daily Brief tab. Update this every morning.
          </p>
          <textarea
            value={form.gmNotes}
            onChange={e => setForm({ ...form, gmNotes: e.target.value })}
            rows={8}
            className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none font-mono"
            placeholder={`e.g. Today's priorities:
• VIP arrivals/checkouts
• Maintenance issues
• Staffing notes
• Special events today
• Safety reminders`}
          />
        </Section>

        <Section title="Schedule Settings" Icon={CalendarDays}>
          <p className="text-[11px] text-gray-400 -mt-1">
            Choose whether your schedule grid starts on Sunday or Monday.
          </p>
          <div className="mt-3">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Week starts on</label>
            <div className="flex gap-2">
              <button
                onClick={() => setForm({ ...form, weekStartsOn: 'Sunday' })}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold border ${
                  (form.weekStartsOn || 'Sunday') === 'Sunday'
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                Sunday → Saturday
              </button>
              <button
                onClick={() => setForm({ ...form, weekStartsOn: 'Monday' })}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold border ${
                  form.weekStartsOn === 'Monday'
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                Monday → Sunday
              </button>
            </div>
          </div>
        </Section>

        <Section title="Tenant Billing" Icon={DollarSign}>
          <p className="text-[11px] text-gray-400 -mt-1">
            Track how this tenant pays and when the last payment was received.
          </p>
          <div className="mt-3">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Payment Method</label>
            <select
              value={form.paymentType || ''}
              onChange={e => setForm({ ...form, paymentType: e.target.value })}
              className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select payment method</option>
              <option value="ach">ACH / Bank Transfer</option>
              <option value="check">Check</option>
              <option value="wire">Wire Transfer</option>
              <option value="cash">Cash</option>
              <option value="card">Credit Card</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Field
            label="Last Payment"
            value={form.lastPayment || ''}
            onChange={v => setForm({ ...form, lastPayment: v })}
            placeholder="e.g. $500 - Jun 1, 2026"
          />
        </Section>

        <Section title="Email Notifications" Icon={Bell}>
          <p className="text-[11px] text-gray-400 -mt-1">
            Receive an email whenever a guest submits a request or sends a message.
          </p>
          <Field
            label="Notification Email"
            value={form.notificationEmail}
            onChange={v => setForm({ ...form, notificationEmail: v })}
            placeholder="frontdesk@yourhotel.com"
          />
        </Section>

        <Section title="Guest Content — Facilities" Icon={Bell}>
          <p className="text-[11px] text-gray-400 -mt-1">Amenities guests see on the Facilities screen. Add, edit, or remove items.</p>
          <div className="space-y-3 mt-3">
            {(form.facilitiesContent || []).map((amenity, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Item {idx + 1}</span>
                  <button onClick={() => {
                    const updated = (form.facilitiesContent || []).filter((_, i) => i !== idx);
                    setForm({ ...form, facilitiesContent: updated });
                  }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
                <input value={amenity.icon} onChange={e => {
                  const updated = [...(form.facilitiesContent || [])];
                  updated[idx] = { ...updated[idx], icon: e.target.value };
                  setForm({ ...form, facilitiesContent: updated });
                }} placeholder="Icon name (e.g. Coffee, Wifi, Dumbbell)" className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" />
                <input value={amenity.title} onChange={e => {
                  const updated = [...(form.facilitiesContent || [])];
                  updated[idx] = { ...updated[idx], title: e.target.value };
                  setForm({ ...form, facilitiesContent: updated });
                }} placeholder="Title (e.g. Complimentary Breakfast)" className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" />
                <textarea value={amenity.description} onChange={e => {
                  const updated = [...(form.facilitiesContent || [])];
                  updated[idx] = { ...updated[idx], description: e.target.value };
                  setForm({ ...form, facilitiesContent: updated });
                }} rows={2} placeholder="Description" className="w-full bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none resize-none" />
              </div>
            ))}
            <button onClick={() => setForm({ ...form, facilitiesContent: [...(form.facilitiesContent || []), { icon: 'Coffee', title: '', description: '' }] })} className="flex items-center gap-1.5 text-[12px] font-medium text-teal-600 hover:text-teal-700"><Plus size={14} /> Add Amenity</button>
          </div>
        </Section>

        <Section title="Guest Content — Safety" Icon={ShieldCheck}>
          <p className="text-[11px] text-gray-400 -mt-1">Safety info guests see. Leave empty sections to use defaults.</p>
          <div className="space-y-3 mt-3">
            <Field label="Emergency Message" value={form.safetyContent?.emergency_message || ''} onChange={v => setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_message: v } })} placeholder="Remain calm. Call 911, then notify front desk." />
            <Field label="Closing Message" value={form.safetyContent?.closing_message || ''} onChange={v => setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), closing_message: v } })} placeholder="Contact front desk anytime for safety concerns." />
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Emergency Contacts</p>
            {((form.safetyContent?.emergency_contacts) || []).map((contact, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input value={contact.label || ''} onChange={e => {
                  const updated = [...((form.safetyContent?.emergency_contacts) || [])];
                  updated[idx] = { ...updated[idx], label: e.target.value };
                  setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: updated } });
                }} placeholder="Label (e.g. Front Desk)" className="flex-[2] bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" />
                <input value={contact.number || ''} onChange={e => {
                  const updated = [...((form.safetyContent?.emergency_contacts) || [])];
                  updated[idx] = { ...updated[idx], number: e.target.value };
                  setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: updated } });
                }} placeholder="Number" className="flex-1 bg-white rounded-xl px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" />
                <button onClick={() => {
                  const updated = ((form.safetyContent?.emergency_contacts) || []).filter((_, i) => i !== idx);
                  setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: updated } });
                }} className="text-red-400"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => setForm({ ...form, safetyContent: { ...(form.safetyContent || {}), emergency_contacts: [...((form.safetyContent?.emergency_contacts) || []), { label: '', number: '' }] } })} className="flex items-center gap-1.5 text-[12px] font-medium text-teal-600"><Plus size={14} /> Add Contact</button>
          </div>
        </Section>

        <Section title="Guest Content — Transport" Icon={Bus}>
          <p className="text-[11px] text-gray-400 -mt-1">Custom message shown on the Transport page.</p>
          <Field label="Pickup Note" value={form.transportContent?.pickup_note || ''} onChange={v => setForm({ ...form, transportContent: { ...(form.transportContent || {}), pickup_note: v } })} placeholder="Pickup requests are confirmed by staff. Contact front desk for immediate needs." />
        </Section>

        <Section title="Guest Content — Food" Icon={UtensilsCrossed}>
          <p className="text-[11px] text-gray-400 -mt-1">Intro text shown on the Food tab.</p>
          <textarea value={form.foodContent?.intro_text || ''} onChange={e => setForm({ ...form, foodContent: { ...(form.foodContent || {}), intro_text: e.target.value } })} rows={3} className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none" placeholder="Explore our local partner restaurants and order delivery right to your room." />
        </Section>

        <Section title="Guest Content — Nearby" Icon={MapPin}>
          <p className="text-[11px] text-gray-400 -mt-1">Intro text shown on the Nearby page.</p>
          <textarea value={form.nearbyIntro?.intro_text || ''} onChange={e => setForm({ ...form, nearbyIntro: { ...(form.nearbyIntro || {}), intro_text: e.target.value } })} rows={3} className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[13px] border border-gray-100 focus:outline-none resize-none" placeholder="Discover restaurants, attractions, and services near our hotel." />
        </Section>

        {/* Shuttle Management section removed per admin request */}

        {saved && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-[13px] font-medium text-center">
            ✅ Saved
          </div>
        )}

        <button onClick={handleSave} className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2" style={{ backgroundColor: TEAL }}>
          <Save size={16} /> SAVE CHANGES
        </button>
      </div>

      {/* ── Right: Live Preview ── */}
      <div className="hidden lg:flex flex-col items-center gap-4 pt-12 sticky top-8 self-start">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Live Preview</p>
        <GuestHomePreview color={form.brandColor || '#6B1D3C'} hotelName={form.name} />
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: form.brandColor || '#6B1D3C' }}>
            {form.brandColor || '#6B1D3C'}
          </div>
          <p className="text-[10px] text-gray-400">Updates as you edit</p>
        </div>
      </div>
    </div>
  );
}

export default HotelSettingsView;