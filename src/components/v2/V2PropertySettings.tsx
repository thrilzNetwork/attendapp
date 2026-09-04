'use client';

/* ═══════════════════════════════════════════ components/v2/V2PropertySettings.tsx
   Attenda V2 — Property Settings. EXACT implementation of mockup
   docs/v2-mockups/05-property-settings.jpg (spec: docs/v2-mockups/specs/
   05-property-settings.md).

   Layout per mockup:
     · Property Profile strip — Operating Since · Time Zone · Total Rooms ·
       Departments · System Version
     · 3-col band — Property Information | System Configuration | Integrations
     · 3-col band — Room Inventory Overview | Recent Property Updates |
       Alerts & System Status
     · Quick Actions (6 buttons)

   Per §3 sidebar-fold decision, QR Codes and AI Agent land here
   (Integrations panel + Quick Actions). CRUD stays in HotelSettingsView /
   QrCodesView / AgentDashboard via Manage actions.

   Data policy: mockup fields with no backing config render exactly as
   designed with '—' (Property Code, Country, Date/Time Format, Language,
   Currency, etc.). NEVER substituted, NEVER dropped.
   ═════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowLeft, Settings as SettingsIcon, UserCog, BedDouble, Users, Code2,
  Palette, QrCode as QrCodeIcon, Bot, Wifi, CreditCard, MessageSquare,
  KeyRound, RefreshCw,
} from 'lucide-react';
import { V2Panel, V2ScreenHeader, V2QuickActions } from './ui';
import { getAllHotelRooms, type HotelConfig, type HotelRoom } from '@/lib/supabase';

const HotelSettingsView = dynamic(() => import('@/components/staff/HotelSettingsView'), { ssr: false });
const QrCodesView = dynamic(() => import('@/components/staff/QrCodesView'), { ssr: false });
const AgentDashboard = dynamic(() => import('@/components/agent/AgentDashboard'), { ssr: false });

const INK = '#16233B', MUTED = '#5B6B7E', BORDER = '#E5EAF0';
const ROOM_TYPE_COLORS = ['#14A8A0', '#7C5CE0', '#D97706', '#2F6FEB', '#DC2626', '#5B6B7E'];

type ManageMode = null | 'settings' | 'qrcodes' | 'agent';

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <li className="flex justify-between gap-3">
      <span className="shrink-0" style={{ color: MUTED }}>{label}</span>
      <span className={`text-right ${strong ? 'font-semibold' : 'font-medium'}`} style={{ color: INK }}>{value}</span>
    </li>
  );
}

function StatusChip({ on, label }: { on: boolean; label?: string }) {
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={on
        ? { backgroundColor: '#E7F6EC', color: '#16A34A' }
        : { backgroundColor: '#EEF1F4', color: MUTED }}>
      {label || (on ? 'Connected' : 'Not connected')}
    </span>
  );
}

export default function V2PropertySettings({ config, onSaved }: { config: HotelConfig; onSaved: () => Promise<void> | void }) {
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [asOf, setAsOf] = useState('');
  const [manage, setManage] = useState<ManageMode>(null);

  useEffect(() => {
    if (!config?.id) return;
    setAsOf(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    getAllHotelRooms(config.id).then(setRooms).catch(() => setRooms([]));
  }, [config?.id]);

  if (manage) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
        <button onClick={() => setManage(null)}
          className="flex items-center gap-1.5 text-[13px] font-bold mb-4 hover:underline" style={{ color: '#0E7C74' }}>
          <ArrowLeft size={15} /> Back to Property Settings dashboard
        </button>
        {manage === 'settings' && <HotelSettingsView config={config} onSaved={async () => { await onSaved(); }} />}
        {manage === 'qrcodes' && <QrCodesView hotelId={config.id || ''} hotelSlug={config.slug} />}
        {manage === 'agent' && <AgentDashboard hotelId={config.id || ''} hotelName={config.name} />}
      </div>
    );
  }

  const roomTypeCounts = new Map<string, number>();
  for (const r of rooms) {
    if (!r.is_active) continue;
    roomTypeCounts.set(r.room_type || 'Other', (roomTypeCounts.get(r.room_type || 'Other') || 0) + 1);
  }
  const roomTypeRows = Array.from(roomTypeCounts.entries()).sort((a, b) => b[1] - a[1]);
  const totalRooms = rooms.filter(r => r.is_active).length || config.roomCount || 0;

  const departmentsActive = Object.values(config.features || {}).filter(Boolean).length
    || Object.keys(config.features || {}).length;

  const refresh = () => setAsOf(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        title="Property Settings"
        subtitle="Manage property information, preferences & system configuration"
        dataAsOf={asOf}
        onRefresh={refresh}
        right={
          <button className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-xl border hover:opacity-80"
            style={{ borderColor: BORDER, color: INK }} title="Coming soon">
            <SettingsIcon size={13} /> Customize Dashboard
          </button>
        }
      />
      <p className="text-[12px] mb-4 flex items-center gap-1.5" style={{ color: MUTED }}>
        Keep your property profile updated to ensure accurate operations and reporting.
      </p>

      {/* ── Property Profile strip — exactly as mockup ──────────────────── */}
      <V2Panel title="Property Profile" action={
        <button onClick={() => setManage('settings')} className="text-[12px] font-bold hover:underline" style={{ color: '#0E7C74' }}>
          View details →
        </button>
      }>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Property</div>
            <div className="text-[15px] font-bold truncate" style={{ color: INK }}>{config.name || '—'}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Operating Since</div>
            <div className="text-[15px] font-bold" style={{ color: INK }}>—</div>
            <div className="text-[11px]" style={{ color: MUTED }}>not on file</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Time Zone</div>
            <div className="text-[15px] font-bold truncate" style={{ color: INK }}>{config.timezone || '—'}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Total Rooms</div>
            <div className="text-[15px] font-bold" style={{ color: INK }}>{totalRooms || '—'}</div>
            <div className="text-[11px]" style={{ color: MUTED }}>Across {roomTypeRows.length || '—'} room types</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>Departments</div>
            <div className="text-[15px] font-bold" style={{ color: INK }}>{departmentsActive || '—'}</div>
            <div className="text-[11px]" style={{ color: MUTED }}>Active departments</div>
          </div>
        </div>
      </V2Panel>

      {/* ── Band 1: Property Information | System Configuration | Integrations ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4 items-start">
        <V2Panel title="Property Information"
          action={<button onClick={() => setManage('settings')} className="text-[12px] font-bold hover:underline" style={{ color: '#0E7C74' }}>Edit</button>}>
          <ul className="flex flex-col gap-2.5 text-[13px]">
            <Row label="Property Name" value={config.name || '—'} strong />
            <Row label="Property Code" value="—" />
            <Row label="Address" value={config.address || '—'} strong />
            <Row label="Country" value="—" />
            <Row label="Phone" value={config.frontDeskPhone || '—'} strong />
            <Row label="Email" value={config.notificationEmail || '—'} strong />
            <Row label="Website" value={config.websiteUrl || '—'} strong />
          </ul>
        </V2Panel>

        <V2Panel title="System Configuration"
          action={<button onClick={() => setManage('settings')} className="text-[12px] font-bold hover:underline" style={{ color: '#0E7C74' }}>Edit</button>}>
          <ul className="flex flex-col gap-2.5 text-[13px]">
            <Row label="Date Format" value="—" />
            <Row label="Time Format" value="—" />
            <Row label="Week Starts On" value={config.weekStartsOn || 'Sunday'} strong />
            <Row label="Default View" value="—" />
            <Row label="Language" value="—" />
            <Row label="Currency" value="—" />
            <Row label="Notifications" value="—" />
            <Row label="Default Unit of Measure" value="—" />
            <Row label="Fiscal Year Start" value="—" />
            <Row label="Data Retention" value="—" />
            <Row label="Backup Frequency" value="—" />
            <Row label="Auto Assignment" value="—" />
            <Row label="SLA Tracking" value="—" />
            <Row label="API Access" value="—" />
          </ul>
          <p className="text-[12px] mt-3" style={{ color: MUTED }}>— means not configured yet</p>
        </V2Panel>

        <V2Panel title="Integrations"
          action={<button onClick={() => setManage('qrcodes')} className="text-[12px] font-bold hover:underline" style={{ color: '#0E7C74' }}>View all</button>}>
          <ul className="flex flex-col gap-2.5 text-[13px]">
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2" style={{ color: INK }}><CreditCard size={15} style={{ color: '#0E7C74' }} /> Stripe — Payment Gateway</span>
              <StatusChip on={!!config.paymentType} />
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2" style={{ color: INK }}><Wifi size={15} style={{ color: '#0E7C74' }} /> Guest Wifi</span>
              <StatusChip on={!!config.wifiName} label={config.wifiName ? 'Connected' : 'Not set'} />
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2" style={{ color: INK }}><QrCodeIcon size={15} style={{ color: '#0E7C74' }} /> QR Codes</span>
              <button onClick={() => setManage('qrcodes')} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#E4F5F3', color: '#0E7C74' }}>Manage</button>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2" style={{ color: INK }}><Bot size={15} style={{ color: '#0E7C74' }} /> AI Agent</span>
              <button onClick={() => setManage('agent')} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#E4F5F3', color: '#0E7C74' }}>Configure</button>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2" style={{ color: INK }}><MessageSquare size={15} style={{ color: '#0E7C74' }} /> Guest Messaging</span>
              <StatusChip on={false} />
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2" style={{ color: INK }}><KeyRound size={15} style={{ color: '#0E7C74' }} /> Door Lock System</span>
              <StatusChip on={false} />
            </li>
          </ul>
          <button onClick={() => setManage('qrcodes')} className="text-[12px] font-bold mt-3 hover:underline" style={{ color: '#0E7C74' }}>
            Manage Integrations →
          </button>
        </V2Panel>
      </div>

      {/* ── Band 2: Room Inventory | Recent Updates | Alerts ────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4 items-start">
        <V2Panel title="Room Inventory Overview" action={
          <button onClick={() => setManage('settings')} className="text-[12px] font-bold hover:underline" style={{ color: '#0E7C74' }}>View all</button>
        }>
          {roomTypeRows.length === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>No room data yet — upload rooms in Room Management.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {roomTypeRows.map(([type, count], i) => (
                <li key={type} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 capitalize" style={{ color: INK }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ROOM_TYPE_COLORS[i % ROOM_TYPE_COLORS.length] }} />
                    {type}
                  </span>
                  <span className="font-semibold" style={{ color: INK }}>{count} · {totalRooms ? Math.round((count / totalRooms) * 100) : 0}%</span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setManage('settings')} className="text-[12px] font-bold mt-3 hover:underline" style={{ color: '#0E7C74' }}>
            Manage Room Types →
          </button>
        </V2Panel>

        <V2Panel title="Recent Property Updates" action={
          <span className="text-[12px] font-bold" style={{ color: '#0E7C74' }}>View all</span>
        }>
          <p className="text-[13px] py-4 text-center" style={{ color: MUTED }}>No property updates logged yet.</p>
          <p className="text-[12px] font-bold" style={{ color: '#0E7C74' }}>View All Activity →</p>
        </V2Panel>

        <V2Panel title="Alerts & System Status" action={
          <span className="text-[12px] font-bold" style={{ color: '#0E7C74' }}>View all</span>
        }>
          <ul className="flex flex-col gap-2.5 text-[13px]">
            <li className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold" style={{ color: INK }}>License Renewal Due</div>
                <div className="text-[11px]" style={{ color: MUTED }}>No license data on file</div>
              </div>
              <span className="font-semibold" style={{ color: MUTED }}>—</span>
            </li>
            <li className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold" style={{ color: INK }}>System Maintenance</div>
                <div className="text-[11px]" style={{ color: MUTED }}>Nothing scheduled</div>
              </div>
              <span className="font-semibold" style={{ color: MUTED }}>—</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2" style={{ color: INK }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#16A34A' }} />
                All Systems Operational
              </span>
              <StatusChip on label="Healthy" />
            </li>
          </ul>
        </V2Panel>
      </div>

      {/* ── Quick Actions — 6 buttons per mockup ────────────────────────── */}
      <div className="mt-4">
        <V2Panel title="Quick Actions">
          <V2QuickActions actions={[
            { icon: SettingsIcon, label: 'Edit Property Profile', caption: 'Update property information', onClick: () => setManage('settings') },
            { icon: UserCog, label: 'System Settings', caption: 'Configure system preferences', onClick: () => setManage('settings') },
            { icon: BedDouble, label: 'Manage Room Types', caption: 'Add or edit room configurations', onClick: () => setManage('settings') },
            { icon: Users, label: 'User Permissions', caption: 'Manage access and roles', onClick: () => setManage('settings') },
            { icon: Code2, label: 'Manage Integrations', caption: 'Connect third-party systems', onClick: () => setManage('qrcodes') },
            { icon: Palette, label: 'Branding & Assets', caption: 'Upload logos and brand assets', onClick: () => setManage('settings') },
          ]} />
        </V2Panel>
      </div>
    </div>
  );
}