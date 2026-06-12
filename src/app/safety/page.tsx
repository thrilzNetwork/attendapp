'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Flame, AlertTriangle, ShieldCheck, DoorOpen, AlarmSmoke, Crosshair } from 'lucide-react';
import { getHotelConfig, HotelConfig } from '@/lib/supabase';
import { goBackToHotel } from '@/lib/guest-context';

const DEFAULT_EMERGENCY_MESSAGE = 'Remain calm. Call 911 for immediate emergency response. Then notify the front desk at {frontDesk}.';

const DEFAULT_EMERGENCY_CONTACTS: Array<{ label: string; number: string }> = [
  { label: 'Emergency (Police, Fire, Medical)', number: '911' },
  { label: 'Front Desk', number: '{frontDesk}' },
  { label: 'Hotel Security', number: 'Ext. 0' },
];

const DEFAULT_FIRE_SAFETY_ITEMS = [
  'Smoke detectors are installed in every room and tested monthly.',
  'Know your nearest fire exit — posted on the back of your door.',
  'In case of fire: Do not use elevators. Use stairs and proceed to the nearest exit.',
  'If trapped: Seal door cracks with wet towels, signal from window, call 911.',
  'Assembly point is in the front parking lot — away from the building.',
];

const DEFAULT_CO_ITEMS = [
  'CO detectors are located on every floor and inside every guest room.',
  'If you hear a chirping sound, notify the front desk immediately — do not silence it.',
  'Symptoms of CO poisoning: headache, dizziness, nausea, confusion — seek fresh air and call 911.',
  'Smoke alarms are interconnected. If one triggers, all units in the zone activate.',
  'Do not cover or disable any detectors. Tampering will result in a penalty.',
];

const DEFAULT_SECURITY_ITEMS = [
  'Exterior doors are locked from 10:00 PM to 6:00 AM. Use your room key for entry.',
  'Security cameras are operational in public areas, parking lot, and hallways.',
  'Report any suspicious activity to the front desk immediately.',
  'Lock your room door at all times and use the deadbolt when inside.',
  'Do not leave valuables unattended. Use the in-room safe or front desk safe deposit.',
];

const DEFAULT_CLOSING_MESSAGE = 'If you have any safety concerns, contact the front desk at any time. Your wellbeing is our top priority.';

function fillTemplate(template: string, frontDesk: string): string {
  return template.replace('{frontDesk}', frontDesk);
}

export default function SafetyPage() {
  const router = useRouter();
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [brandColor, setBrandColor] = useState('#6B1D3C');
  useEffect(() => {
    let cancelled = false;
    getHotelConfig().then(cfg => {
      if (cancelled) return;
      setConfig(cfg);
      if (cfg?.brandColor) setBrandColor(cfg.brandColor);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const frontDesk = config?.frontDeskPhone || 'Ext. 0';

  const sc = config?.safetyContent;

  // Emergency message
  const rawEmergencyMsg = sc?.emergency_message || DEFAULT_EMERGENCY_MESSAGE;
  const emergencyMessage = fillTemplate(rawEmergencyMsg, frontDesk);

  // Emergency contacts
  const rawContacts = sc?.emergency_contacts && sc.emergency_contacts.length > 0
    ? sc.emergency_contacts
    : DEFAULT_EMERGENCY_CONTACTS;
  const emergencies = rawContacts.map(c => ({
    label: c.label,
    number: fillTemplate(c.number, frontDesk),
  }));

  // Safety items
  const fireSafetyItems = sc?.fire_safety_items && sc.fire_safety_items.length > 0
    ? sc.fire_safety_items
    : DEFAULT_FIRE_SAFETY_ITEMS;

  const coItems = sc?.co_items && sc.co_items.length > 0
    ? sc.co_items
    : DEFAULT_CO_ITEMS;

  const securityItems = sc?.security_items && sc.security_items.length > 0
    ? sc.security_items
    : DEFAULT_SECURITY_ITEMS;

  // Closing message
  const rawClosingMsg = sc?.closing_message || DEFAULT_CLOSING_MESSAGE;
  const closingMessage = fillTemplate(rawClosingMsg, frontDesk);

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white">
        <button onClick={() => goBackToHotel(router)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-black">Safety</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-8 space-y-3">
          {/* Emergency Banner */}
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold text-red-800 mb-1">In Case of Emergency</p>
              <p className="text-[12px] text-red-700 leading-relaxed">{emergencyMessage}</p>
            </div>
          </div>

          {/* Emergency Numbers */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-[12px] text-gray-400 uppercase tracking-wider mb-3 font-semibold">Emergency Contacts</p>
            <div className="space-y-2">
              {emergencies.map((e, i) => (
                <a key={i} href={`tel:${e.number.replace(/[^0-9]/g, '')}`} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 active:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <Phone size={16} style={{ color: brandColor }} />
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800">{e.label}</p>
                    </div>
                  </div>
                  <span className="text-[14px] font-bold" style={{ color: brandColor }}>{e.number}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Fire Safety */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={18} className="text-orange-500" />
              <p className="text-[14px] font-bold text-gray-800">Fire Safety</p>
            </div>
            <div className="space-y-2">
              {fireSafetyItems.map((text, i) => (
                <div key={i} className="flex items-start gap-2">
                  <DoorOpen size={14} className="text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-gray-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* COA / Smoke Detectors */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <AlarmSmoke size={18} style={{ color: brandColor }} />
              <p className="text-[14px] font-bold text-gray-800">Carbon Monoxide & Smoke Detection</p>
            </div>
            <div className="space-y-2">
              {coItems.map((text, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-gray-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Property Security */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Crosshair size={18} style={{ color: brandColor }} />
              <p className="text-[14px] font-bold text-gray-800">Property Security</p>
            </div>
            <div className="space-y-2">
              {securityItems.map((text, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-gray-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <p className="text-[11px] text-amber-700 text-center">{closingMessage}</p>
          </div>
        </div>
      </div>
    </div>
  );
}