/* eslint-disable */
// deploy-2026-06-05-001 - force chunk hash change
'use client';

import { useState, useEffect, useCallback, useRef, Fragment, Component } from 'react';

class ErrorBoundary extends Component<{children: React.ReactNode, fallback?: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode, fallback?: React.ReactNode}) {
    super(props);
    this.state = {hasError: false, error: null};
  }
  static getDerivedStateFromError(error: Error) {
    return {hasError: true, error};
  }
  componentDidCatch(error: Error, info: any) {
    console.error('ERROR BOUNDARY CAUGHT:', error.message, error.stack);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div className="p-8 text-red-600"><p className="font-bold text-[14px]">Something went wrong</p><pre className="text-[11px] mt-2 bg-red-50 p-3 rounded-xl overflow-auto">{this.state.error?.message}</pre></div>;
    }
    return this.props.children;
  }
}
import Image from 'next/image';
import {
  Bell, MessageSquare, Bus, Settings, Users,
  LogOut, RefreshCw, Plus, Trash2, Eye, EyeOff, Save,
  Hotel as HotelIcon, ExternalLink, type LucideIcon,
  Store, QrCode as QrCodeIcon, Building2, Copy, Check, ChevronDown, ChevronUp,
  UtensilsCrossed, UserPlus, BookOpen, Pencil, X as XIcon, DoorOpen, Upload,
  FileSpreadsheet, FileText, Lock, Mail, ClipboardList, CalendarDays, SendHorizontal,
  BarChart3, GraduationCap, Briefcase, ClipboardCheck, Clock, Wifi, ImageIcon, TrendingUp, Inbox, Search, Ship,
} from 'lucide-react';
import {
  supabase, subscribeToRequests, subscribeToMessages, updateRequestStatus, deleteRequest,
  getHotelConfig, updateHotelConfig, HotelConfig,
  getStaffAccounts, getStaffAccountsForHotel, createStaffAccountWithDetails, getStaffAccountByEmail,
  deleteStaffAccount, updateStaffDetails, updateStaffPermissions, StaffAccount,
  getPartners, createPartner, updatePartner, deletePartner, Partner,
  getPartnerMenuItems, createPartnerMenuItem, deletePartnerMenuItem, PartnerMenuItem,
  getQrCodes, createQrCode, deleteQrCode, QrCode as QrCodeRow,
  getAllHotels, createHotel,
  getShuttleRoutes, createShuttleRoute, deleteShuttleRoute,
  getAllShuttleSlotsForHotel, createShuttleSlot, deleteShuttleSlot,
  getAllShuttleBookingsForHotel, cancelShuttleBooking,
  getShuttleRequests, updateShuttleRequest, ShuttleRoute, ShuttleSlot, ShuttleBooking, ShuttleRequest,
  getCruiseSchedulesAll, createCruiseSchedule, deleteCruiseSchedule, CruiseSchedule,
  getAllKnowledgeBase, createKnowledgeEntry, updateKnowledgeEntry, deleteKnowledgeEntry, KnowledgeEntry,
  getAllHotelRooms, bulkInsertRooms, deleteRoom, createRoom, updateRoomType, updateRoomTypeBatch, HotelRoom,
  upsertGuestValidation, getGuestValidations,
  getChecklists, createChecklist, deleteChecklist, Checklist,
  getChecklistInstances, createChecklistInstance, updateChecklistInstance, ChecklistInstance,
  getStaffSchedules, getStaffSchedulesRange, createStaffSchedule, deleteStaffSchedule, StaffSchedule,
  getDailyRecap,
  getHotelOpsTools, getAllOpsTools,
  getLearningDocs, getHrDocs,
} from '@/lib/supabase';
import type { OpsTool } from '@/lib/supabase';
import CallAroundView from '@/components/ops-tools/CallAroundView';
import DailyLogsView from '@/components/ops-tools/DailyLogsView';
import NoShowsView from '@/components/ops-tools/NoShowsView';
import RoomMovesView from '@/components/ops-tools/RoomMovesView';
import BankCountView from '@/components/ops-tools/BankCountView';
import {
  listOps, createOps, updateOps, deleteOps,
  listKpiDefinitions, createKpiDefinition, deleteKpiDefinition,
  listKpiSubmissions, createKpiSubmission,
  listChecklistTemplates, createChecklistTemplate, deleteChecklistTemplate,
  listChecklistCompletions, createChecklistCompletion, updateChecklistCompletion,
  listForecasts, createForecast as createForecastRecord,
  listShifts, createGeneratedShift, updateShift, deleteShift,
  listLearningContent, createLearningContent, deleteLearningContent,
  listHrDocuments, createHrDocument, deleteHrDocument,
  listScheduleChangeRequests, createScheduleChangeRequest,
  listShuttleSlots, listKbSuggestions, createKbSuggestion, deleteKbSuggestion, listKbSuggestionsByStatus, createKbSuggestionPending, approveKbSuggestion, rejectKbSuggestion,
  suggestResponse,
  generateShiftsFromForecast, today,
  type KpiDefinition, type KpiSubmission,
  type ChecklistTemplate, type ChecklistCompletion,
  type Forecast, type GeneratedShift, type CoverageRule,
  type LearningContent, type HrDocument,
  type ScheduleChangeRequest,
  type OpRecord,
  type ShuttleSlot as OpsShuttleSlot,
} from '@/lib/opsStore';

/* ── Types ─────────────────────────────────────────────── */
type Role = 'admin' | 'staff' | 'superadmin' | 'vendor' | 'manager';
type NavTab =
  | 'orders' | 'messages' | 'shuttle'
  | 'hotel' | 'staff_mgmt'
  | 'partners' | 'qrcodes' | 'properties'
  | 'vendor_manifest' | 'knowledge' | 'guests' | 'rooms'
  | 'dailybrief' | 'property_info'
  | 'schedules' | 'checklists_tab' | 'kpis' | 'learning_hr'
  | 'shuttle_schedule';

interface Request {
  id: string;
  guest_name: string;
  room: string;
  type: string;
  details: string;
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
  assigned_to?: string;
}

interface Message {
  id: string;
  guest_name: string;
  room: string;
  sender: string;
  body: string;
  created_at: string;
}

interface Session {
  name: string;
  role: Role;
  vendorType?: string;
  department?: string;
}

/* ── Constants ─────────────────────────────────────────── */
const ADMIN_PIN = '2025';
const SUPERADMIN_PIN = '9999';
const TEAL = '#0D9488';
const BUILD_TS = Date.now();

const DEPARTMENTS = [
  { key: 'management',   label: 'Management',   icon: '👔' },
  { key: 'front_desk',   label: 'Front Desk',   icon: '🛎️' },
  { key: 'housekeeping', label: 'Housekeeping', icon: '🧹' },
  { key: 'maintenance',  label: 'Maintenance',  icon: '🔧' },
  { key: 'security',     label: 'Security',     icon: '🛡️' },
  { key: 'drivers',      label: 'Drivers',      icon: '🚐' },
] as const;
type DepartmentKey = typeof DEPARTMENTS[number]['key'];

const NAV: { tab: NavTab; label: string; icon: LucideIcon; roles: Role[]; section?: string }[] = [
  // ── TODAY — staff daily ops ──
  { tab: 'dailybrief',      label: 'Dashboard',         icon: BarChart3,       roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Today' },
  { tab: 'orders',          label: 'Requests',           icon: Bell,            roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Today' },
  { tab: 'messages',        label: 'Messages',           icon: MessageSquare,   roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Today' },
  { tab: 'schedules',       label: 'Schedules',          icon: CalendarDays,    roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Today' },

  // ── OPERATIONS — property tools ──
  { tab: 'shuttle',         label: 'Shuttle',            icon: Bus,             roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Operations' },
  { tab: 'kpis',            label: 'KPIs',               icon: TrendingUp,      roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Operations' },
  { tab: 'knowledge',       label: 'Knowledge Base',     icon: BookOpen,        roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Operations' },
  { tab: 'learning_hr',     label: 'Learning & HR',      icon: GraduationCap,   roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Operations' },
  { tab: 'property_info',   label: 'Property Info',      icon: HotelIcon,       roles: ['admin', 'staff', 'superadmin', 'manager'], section: 'Operations' },

  // ── ADMIN — settings & management ──
  { tab: 'shuttle_schedule', label: 'Shuttle Grid',      icon: Bus,             roles: ['admin', 'superadmin', 'manager'], section: 'Admin' },
  { tab: 'hotel',           label: 'Property Settings',   icon: Settings,        roles: ['admin', 'superadmin'], section: 'Admin' },
  { tab: 'staff_mgmt',      label: 'Staff Management',   icon: Users,           roles: ['admin', 'superadmin'], section: 'Admin' },
  { tab: 'partners',        label: 'Partners & Menu',    icon: Store,           roles: ['admin', 'superadmin'], section: 'Admin' },
  { tab: 'qrcodes',         label: 'QR Codes',           icon: QrCodeIcon,       roles: ['admin', 'superadmin'], section: 'Admin' },
  { tab: 'rooms',            label: 'Room Management',    icon: DoorOpen,        roles: ['admin', 'superadmin'], section: 'Admin' },

  // ── PLATFORM — superadmin only ──
  { tab: 'properties',      label: 'All Properties',     icon: Building2,      roles: ['superadmin'], section: 'Platform' },

  // ── VENDOR ──
  { tab: 'vendor_manifest', label: 'Vendor Dashboard',   icon: Users,           roles: ['vendor'], section: '' },
];

/* ── Main Component ───────────────────────────────────── */
export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<NavTab>('dailybrief');
  // Auth state
  const [authMode, setAuthMode] = useState<'email' | 'pin' | 'authenticated'>('pin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pendingAuthUser, setPendingAuthUser] = useState<{ name: string; role: Role; vendorType?: string } | null>(null);
  const [allHotels, setAllHotels] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [showHotelPicker, setShowHotelPicker] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  // Impersonation
  const [impersonatingUser, setImpersonatingUser] = useState<{ name: string; role: Role } | null>(null);
  const [showImpersonatePicker, setShowImpersonatePicker] = useState(false);
  // ── Alert bar state (must be before early returns — React hooks rule) ──
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const [lastRequestCount, setLastRequestCount] = useState(0);

  // pendingCount must be computed before early returns for the alert bar effect
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // Reset alert bar when new pending tickets appear
  useEffect(() => {
    if (pendingCount > lastRequestCount) {
      setDismissedAlert(false);
    }
    setLastRequestCount(pendingCount);
  }, [pendingCount]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotel = params.get('hotel');
    if (hotel) localStorage.setItem('attenda_hotel_slug', hotel);
  }, []);

  const handleEmailLogin = async () => {
    setAuthError('');
    if (!email || !password) { setAuthError('Email and password required.'); return; }
    setAuthLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      // Look up staff account by email
      const staff = await getStaffAccountByEmail(email);
      if (!staff) {
        await supabase.auth.signOut();
        setAuthError('No staff account found for this email. Contact your admin.');
        setAuthLoading(false);
        return;
      }

      // If they have a PIN set, require PIN 2FA
      if (staff.pin_code && staff.pin_code.length >= 4) {
        setPendingAuthUser({
          name: staff.name,
          role: (staff.role === 'manager' || staff.role === 'admin' ? 'admin' : staff.role === 'vendor' ? 'vendor' : 'staff') as Role,
          vendorType: staff.vendor_type || undefined,
        });
        setAuthMode('pin');
        setPin('');
        setPinError('');
        setAuthLoading(false);
        return;
      }

      // No PIN — log in directly
      const role: Role = staff.role === 'manager' || staff.role === 'admin' ? 'admin' : staff.role === 'vendor' ? 'vendor' : 'staff';
      setSession({ name: staff.name, role, vendorType: staff.vendor_type || undefined });
      setAuthMode('authenticated');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed.';
      if (msg.includes('Invalid login credentials')) {
        setAuthError('Invalid email or password.');
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePin2FA = async () => {
    setPinError('');
    if (!pin || !pendingAuthUser) return;
    if (pin === SUPERADMIN_PIN || pin === ADMIN_PIN) {
      // Legacy PINs work as 2FA too
      setSession(pendingAuthUser);
      setPendingAuthUser(null);
      setAuthMode('authenticated');
      return;
    }
    const { data } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('pin_code', pin)
      .eq('active', true)
      .single();
    if (data) {
      setSession(pendingAuthUser);
      setPendingAuthUser(null);
      setAuthMode('authenticated');
    } else {
      setPinError('Incorrect PIN. Try again.');
      setPin('');
    }
  };

  const handlePinOnlyFallback = async () => {
    setPinError('');
    if (pin === SUPERADMIN_PIN) {
      setSession({ name: 'Super Admin', role: 'superadmin' });
      setAuthMode('authenticated');
      return;
    }
    if (pin === ADMIN_PIN) {
      // Load all hotels so admin can pick one
      const { data } = await supabase.from('hotels').select('id,slug,name').order('name');
      setAllHotels(data || []);
      if (data && data.length === 1) {
        // Only one hotel — skip picker
        localStorage.setItem('attenda_hotel_slug', data[0].slug);
        setSession({ name: 'Admin', role: 'admin' });
        setAuthMode('authenticated');
      } else {
        setShowHotelPicker(true);
        setAuthMode('authenticated');
        // Session set in pickHotel callback
      }
      return;
    }
    const { data } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('pin_code', pin)
      .eq('active', true)
      .single();
    if (data) {
      const role: Role =
        data.role === 'manager' || data.role === 'admin' ? 'admin' :
        data.role === 'vendor' ? 'vendor' : 'staff';
      setSession({ name: data.name, role, vendorType: data.vendor_type || undefined, department: data.department || undefined });
      setAuthMode('authenticated');
    } else {
      setPinError('Incorrect PIN. Try again.');
      setPin('');
    }
  };

  const pickHotel = async (slug: string) => {
    localStorage.setItem('attenda_hotel_slug', slug);
    const c = await getHotelConfig(slug);
    if (c) setConfig(c);
    setSession({ name: 'Admin', role: 'admin' });
    setShowHotelPicker(false);
    setAuthMode('authenticated');
  };

  const switchHotel = async (slug: string) => {
    localStorage.setItem('attenda_hotel_slug', slug);
    const c = await getHotelConfig(slug);
    if (c) { setConfig(c); setTab('orders'); }
    if (session) await reload(session.role);
  };

  const reload = useCallback(async (role: Role) => {
    // Always load config first so we can filter by hotel
    const cfg = await getHotelConfig();
    if (cfg) setConfig(cfg);
    const hotelId = cfg?.id;

    const [req, msg] = await Promise.all([
      hotelId
        ? supabase.from('requests').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false })
        : supabase.from('requests').select('*').order('created_at', { ascending: false }),
      hotelId
        ? supabase.from('messages').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false })
        : supabase.from('messages').select('*').order('created_at', { ascending: false }),
    ]);
    if (req.data) setRequests(req.data);
    if (msg.data) setMessages(msg.data);

    if (role === 'admin' || role === 'superadmin') {
      setStaff(await getStaffAccounts(hotelId));
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    reload(session.role);
    // Load hotels list for sidebar switcher
    if (session.role === 'admin' || session.role === 'superadmin') {
      getAllHotels().then(data => setAllHotels(data as { id: string; slug: string; name: string }[]));
    }
    const hotelId = config?.id || null;
    const ch1 = subscribeToRequests(hotelId, (payload: any) => {
      // Email alert on new request
      if (payload?.eventType === 'INSERT' && payload?.new) {
        const r = payload.new;
        if (config?.notificationEmail && r.guest_name && r.room && r.type) {
          fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'new_request',
              data: {
                notificationEmail: config.notificationEmail,
                hotelName: config.name || 'Hotel',
                guestName: r.guest_name,
                room: r.room,
                requestType: r.type,
                details: r.details || '',
              },
            }),
          }).catch(() => {});
        }
      }
      reload(session.role);
    });
    const ch2 = subscribeToMessages(hotelId, (payload: any) => {
      // Email alert on new guest message
      if (payload?.eventType === 'INSERT' && payload?.new) {
        const m = payload.new;
        if (config?.notificationEmail && m.guest_name && m.body) {
          fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'guest_message',
              data: {
                notificationEmail: config.notificationEmail,
                hotelName: config.name || 'Hotel',
                guestName: m.guest_name,
                room: m.room || '',
                message: m.body,
              },
            }),
          }).catch(() => {});
        }
      }
      reload(session.role);
    });
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [session, reload, config]);

  /* ── Login screen ─────────────────────────────────── */
  if (!session) {
    if (authMode === 'pin') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
          <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
              <Lock size={24} style={{ color: TEAL }} />
            </div>
            <h1 className="text-xl font-bold text-center mb-1">Staff Dashboard</h1>
            {pendingAuthUser ? (
              <p className="text-sm text-gray-400 text-center mb-6">{pendingAuthUser.name} — enter your PIN to continue</p>
            ) : (
              <p className="text-sm text-gray-400 text-center mb-6">Enter your PIN</p>
            )}
            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError(''); }}
              onKeyDown={e => e.key === 'Enter' && (pendingAuthUser ? handlePin2FA() : handlePinOnlyFallback())}
              placeholder="PIN"
              maxLength={6} autoFocus
              className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] border border-gray-100 focus:outline-none text-center tracking-[0.3em] font-mono mb-2"
            />
            {pinError && <p className="text-red-500 text-[12px] text-center mb-2">{pinError}</p>}
            <button onClick={pendingAuthUser ? handlePin2FA : handlePinOnlyFallback}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px]" style={{ backgroundColor: TEAL }}>
              {pendingAuthUser ? 'CONFIRM' : 'ACCESS DASHBOARD'}
            </button>
            {!pendingAuthUser && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-center text-[12px] text-gray-400 mb-3">Need email sign in?</p>
                <button onClick={() => setAuthMode('email')} className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[12px] hover:bg-gray-200">
                  Sign in with email instead
                </button>
              </div>
            )}
            <p className="text-center mt-4 text-[12px] text-gray-400">
              Platform admin?{' '}
              <a href="/superadmin" className="font-semibold underline" style={{ color: TEAL }}>Super Admin →</a>
            </p>
          </div>
        </div>
      );
    }
    if (authMode === 'email') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
          <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
              <Mail size={24} style={{ color: TEAL }} />
            </div>
            <h1 className="text-xl font-bold text-center mb-1">Staff Dashboard</h1>
            <p className="text-sm text-gray-400 text-center mb-6">Sign in with your email and password</p>
            <div className="space-y-3">
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setAuthError(''); }} placeholder="Email address" onKeyDown={e => e.key === 'Enter' && handleEmailLogin()} autoComplete="email" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400" />
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setAuthError(''); }} placeholder="Password" onKeyDown={e => e.key === 'Enter' && handleEmailLogin()} autoComplete="current-password" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 focus:outline-none focus:border-teal-400 pr-11" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
              {authError && <p className="text-red-500 text-[12px] text-center bg-red-50 py-2 rounded-lg">{authError}</p>}
              <button onClick={handleEmailLogin} disabled={authLoading} className="w-full py-3.5 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: TEAL }}>
                {authLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={16} />}
                {authLoading ? 'Signing in...' : 'SIGN IN'}
              </button>
            </div>
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-center text-[12px] text-gray-400 mb-3">Need access?</p>
              <button onClick={() => setAuthMode('pin')} className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[12px] hover:bg-gray-200">Sign in with PIN instead</button>
            </div>
            <p className="text-center mt-4 text-[12px] text-gray-400">Platform admin? <a href="/superadmin" className="font-semibold underline" style={{ color: TEAL }}>Super Admin →</a></p>
          </div>
        </div>
      );
    }
  }

  /* ── Hotel Picker (for PIN 2025 admins with multiple properties) ─── */
  if (showHotelPicker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${TEAL}18` }}>
            <Building2 size={24} style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">Select Property</h1>
          <p className="text-sm text-gray-400 text-center mb-6">Choose which property to manage</p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {allHotels.map(h => (
              <button key={h.id} onClick={() => pickHotel(h.slug)}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3.5 transition-colors border border-gray-100 hover:border-gray-200">
                <p className="text-[14px] font-semibold text-gray-900">{h.name}</p>
                <p className="text-[11px] text-gray-400 font-mono">@{h.slug}</p>
              </button>
            ))}
          </div>
          <button onClick={() => { setShowHotelPicker(false); setAuthMode('pin'); setSession(null); }}
            className="w-full mt-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[12px] hover:bg-gray-200">
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  /* ── Impersonation Picker (superadmin only) ─────── */
  if (showImpersonatePicker) {
    const nonSuper = staff.filter(s => s.role !== 'superadmin' && s.role !== 'vendor');
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-[15px] font-bold mb-1">View as Staff Member</h2>
          <p className="text-[12px] text-gray-400 mb-4">Pick a staff member to see exactly what they see</p>
          {nonSuper.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-6">No staff accounts found. Add some in Staff Management first.</p>
          ) : (
            <div className="space-y-1 max-h-[350px] overflow-y-auto">
              {nonSuper.map(st => (
                <button key={st.id || st.name}
                  onClick={() => {
                    setImpersonatingUser({ name: st.name, role: st.role === 'admin' || st.role === 'manager' ? 'admin' : 'staff' });
                    setShowImpersonatePicker(false);
                    setTab('dailybrief');
                  }}
                  className="w-full text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3 transition-colors"
                >
                  <div>
                    <p className="text-[14px] font-semibold text-gray-900">{st.name}</p>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                      st.role === 'admin' || st.role === 'manager' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {st.role === 'admin' || st.role === 'manager' ? 'Admin' : 'Staff'}
                    </span>
                  </div>
                  <Eye size={16} className="text-gray-400" />
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowImpersonatePicker(false)}
            className="w-full mt-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[12px] hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ── Dashboard ────────────────────────────────────── */
  const s = session!;
  // Impersonation override — superadmin can view as staff
  const effectiveRole: Role = impersonatingUser?.role || s.role;
  const visibleNav = NAV.filter(n => n.roles.includes(effectiveRole));
  const isAdmin = s.role === 'admin' || s.role === 'superadmin';
  // Vendors land on their manifest tab
  const effectiveTab = (effectiveRole === 'vendor' && tab === 'orders') ? 'vendor_manifest' : tab;

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">

      {/* ── Mobile top bar ──────────────────────────── */}
      <header className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[15px] font-bold text-gray-900 leading-tight">{config?.name || 'Attenda'}</p>
            <p className="text-[11px] text-gray-500">{s.name} ·{' '}
              <span className={`font-semibold ${s.role === 'superadmin' ? 'text-purple-600' : s.role === 'admin' ? 'text-teal-600' : 'text-blue-600'}`}>
                {s.role === 'superadmin' ? 'Super Admin' : s.role === 'admin' ? 'Admin' : 'Staff'}
              </span>
            </p>
          </div>
          <button
            onClick={() => { supabase.auth.signOut(); setSession(null); setAuthMode('email'); setPin(''); setTab('orders'); }}
            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
        {/* Scrollable tab strip */}
        <div className="flex overflow-x-auto no-scrollbar border-t border-gray-100 bg-gray-50">
          {visibleNav.map(item => (
            <button
              key={item.tab}
              onClick={() => setTab(item.tab)}
              className={`relative shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold transition-colors whitespace-nowrap ${
                effectiveTab === item.tab ? 'text-white' : 'text-gray-500'
              }`}
              style={effectiveTab === item.tab ? { backgroundColor: TEAL } : {}}
            >
              <item.icon size={13} />
              {item.label}
              {item.tab === 'orders' && pendingCount > 0 && (
                <span className="bg-amber-400 text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="hidden md:flex w-[230px] bg-[#F3F4F6] flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
        <div className="px-5 pt-5 pb-4">
          <div className="inline-flex items-center justify-center w-10 h-6 rounded mb-2" style={{ backgroundColor: `${TEAL}20` }}>
            <span className="text-[10px] font-bold" style={{ color: TEAL }}>A</span>
          </div>
          <h2 className="text-[15px] font-bold text-gray-900 leading-tight">
            {config?.name || 'Attenda'}
          </h2>
          {isAdmin ? (
            <select
              value={config?.slug || ''}
              onChange={e => switchHotel(e.target.value)}
              className="w-full mt-1 text-[11px] text-gray-500 bg-transparent border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-400"
            >
              {allHotels.length === 0 && (
                // Lazy load hotels the first time
                <option value={config?.slug || ''}>{config?.slug || 'Loading...'}</option>
              )}
              {allHotels.map(h => (
                <option key={h.slug} value={h.slug}>{h.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-[12px] text-gray-500">
              {config?.slug ? `@${config.slug}` : 'Dashboard'}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200/60">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Logged in as</p>
          <p className="text-[14px] font-semibold text-gray-900">{s.name}</p>
          {impersonatingUser ? (
            <>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Impersonating</span>
                <span className="text-[11px] text-gray-500">{impersonatingUser.name}</span>
              </div>
              <button onClick={() => setImpersonatingUser(null)} className="mt-1 text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors">
                Stop Impersonating
              </button>
            </>
          ) : (
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
              s.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
              s.role === 'admin' ? 'bg-teal-100 text-teal-700' :
              s.role === 'vendor' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {s.role === 'superadmin' ? 'Super Admin' : s.role === 'admin' ? 'Admin' : s.role === 'vendor' ? `Vendor · ${s.vendorType || ''}` : 'Staff'}
            </span>
          )}
          {s.role === 'superadmin' && !impersonatingUser && (
            <button onClick={() => setShowImpersonatePicker(true)} className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 hover:text-purple-800 transition-colors">
              <Eye size={12} /> View as Staff
            </button>
          )}
        </div>

        <nav className="px-3 py-3 flex-1">
          {(() => {
            const sections = new Map<string, typeof visibleNav>();
            visibleNav.forEach(item => {
              const s = item.section || '';
              if (!sections.has(s)) sections.set(s, []);
              sections.get(s)!.push(item);
            });
            const sectionOrder = ['Today', 'Operations', 'Admin', 'Platform', ''];
            const sectionLabels: Record<string, string> = {
              'Today': 'TODAY',
              'Operations': 'OPERATIONS',
              'Admin': 'ADMIN',
              'Platform': 'PLATFORM',
              '': '',
            };
            const result: JSX.Element[] = [];
            sectionOrder.forEach(sec => {
              const items = sections.get(sec);
              if (!items || items.length === 0) return;
              if (sec) {
                result.push(
                  <p key={`h-${sec}`} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-4 pb-1.5">{sectionLabels[sec]}</p>
                );
              }
              items.forEach(item => {
                result.push(
                  <button
                    key={item.tab}
                    onClick={() => setTab(item.tab)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors text-left mb-0.5 ${
                      effectiveTab === item.tab ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'
                    }`}
                    style={effectiveTab === item.tab ? { backgroundColor: TEAL } : {}}
                  >
                    <item.icon size={15} />
                    {item.label}
                    {item.tab === 'orders' && pendingCount > 0 && (
                      <span className="ml-auto bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              });
            });
            return result;
          })()}
        </nav>

        <div className="p-4 border-t border-gray-200/60">
          <button
            onClick={() => { supabase.auth.signOut(); setSession(null); setAuthMode('email'); setPin(''); setTab('orders'); }}
            className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────── */}
      <main className="flex-1 min-w-0 bg-[#FAFAFA]">
        {/* ── Persistent ticket alert bar ── */}
        {pendingCount > 0 && !dismissedAlert && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-8 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <p className="text-[13px] font-semibold text-amber-800 truncate">
                <strong>{pendingCount}</strong> open ticket{pendingCount === 1 ? '' : 's'} — check Requests tab
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setTab('orders'); setDismissedAlert(true); }}
                className="text-[11px] font-bold px-3 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                View
              </button>
              <button
                onClick={() => setDismissedAlert(true)}
                className="text-[11px] text-amber-500 hover:text-amber-700 font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {/* ── Silent "all clear" when no open tickets ── */}
        {pendingCount === 0 && !dismissedAlert && requests.length > 0 && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 md:px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-[13px] font-semibold text-emerald-700">No open tickets — all clear ✅</p>
            </div>
            <button
              onClick={() => setDismissedAlert(true)}
              className="text-[11px] text-emerald-500 hover:text-emerald-700 font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
        {effectiveTab === 'dailybrief' && (
          <ErrorBoundary fallback={<div className="p-4 md:p-8"><div className="bg-red-50 border border-red-200 rounded-2xl p-6"><p className="text-[16px] font-bold text-red-800 mb-2">Dashboard error</p><pre id="error-message" className="text-[12px] text-red-700 whitespace-pre-wrap bg-red-100 p-4 rounded-xl">{/* error will show here */}</pre></div></div>}>
            <DailyBriefView hotelId={config?.id || ''} hotelName={config?.name || 'Hotel'} config={config} sessionName={session?.name || ''} department={session?.department} isAdmin={isAdmin} />
          </ErrorBoundary>
        )}
        {effectiveTab === 'property_info' && config && (
          <PropertyInfoView config={config} />
        )}
        {effectiveTab === 'schedules' && (
          <SchedulesView hotelId={config?.id || ''} isAdmin={isAdmin} weekStartsOn={config?.weekStartsOn || 'Sunday'} staffList={staff.map(s => ({ id: s.id, name: s.name, role: s.role, department: s.department }))} />
        )}
        {effectiveTab === 'checklists_tab' && (
          <ChecklistsTabView hotelId={config?.id || ''} isAdmin={isAdmin} />
        )}
        {effectiveTab === 'kpis' && (
          <KpisView hotelId={config?.id || ''} isAdmin={isAdmin} userId="" userName={session?.name || 'Staff'} />
        )}
        {effectiveTab === 'learning_hr' && (
          <LearningHRView hotelId={config?.id || ''} />
        )}
        {effectiveTab === 'orders' && (
          <OrdersView
            requests={requests}
            messages={messages}
            onStatusChange={async (id, status) => { await updateRequestStatus(id, status); reload(s.role); }}
            onDelete={async id => { await deleteRequest(id); reload(s.role); }}
            onRefresh={() => reload(s.role)}
          />
        )}
        {effectiveTab === 'messages' && (
          <MessagesView messages={messages} hotelId={config?.id || ''} />
        )}
        {effectiveTab === 'shuttle' && (
          <ShuttleView hotelId={config?.id || ''} isAdmin={isAdmin} />
        )}
        {effectiveTab === 'shuttle_schedule' && (
          <ShuttleScheduleView hotelId={config?.id || ''} isAdmin={isAdmin} />
        )}
        {effectiveTab === 'vendor_manifest' && (
          <VendorDashboard hotelId={config?.id || ''} vendorType={s.vendorType || 'shuttle'} vendorName={s.name} />
        )}
        {effectiveTab === 'hotel' && isAdmin && config && (
          <HotelSettingsView
            config={config}
            onSaved={async () => { const c = await getHotelConfig(); if (c) setConfig(c); }}
          />
        )}
        {effectiveTab === 'staff_mgmt' && isAdmin && (
          <StaffView hotelId={config?.id || ''} hotelName={config?.name || 'Hotel'} hotelSlug={config?.slug || ''} staff={staff} onRefresh={async () => setStaff(await getStaffAccountsForHotel(config?.id || ''))} />
        )}
        {effectiveTab === 'partners' && isAdmin && (
          <PartnersView hotelId={config?.id || ''} />
        )}
        {effectiveTab === 'qrcodes' && isAdmin && (
          <QrCodesView hotelId={config?.id || ''} hotelSlug={config?.slug || ''} />
        )}
        {effectiveTab === 'knowledge' && (
          <IncidentKBView hotelId={config?.id || ''} isAdmin={isAdmin} userName={s.name} />
        )}
        {effectiveTab === 'rooms' && isAdmin && (
          <RoomsView hotelId={config?.id || ''} hotelName={config?.name || 'Hotel'} />
        )}
        {effectiveTab === 'properties' && s.role === 'superadmin' && (
          <PropertiesView
            onSwitchHotel={async (slug: string) => {
              localStorage.setItem('attenda_hotel_slug', slug);
              const c = await getHotelConfig(slug);
              if (c) { setConfig(c); setTab('orders'); }
            }}
          />
        )}
        {effectiveTab === 'guests' && (
          <GuestsView hotelId={config?.id || ''} />
        )}
      </main>
    </div>
  );
}

/* ── Orders View ──────────────────────────────────────── */
function OrdersView({
  requests, messages, onStatusChange, onDelete, onRefresh,
}: {
  requests: Request[];
  messages: Message[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [statusTab, setStatusTab] = useState<'active' | 'completed' | 'messages'>('active');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Food' | 'Transport' | 'Amenities' | 'Other'>('All');
  const [transportSubFilter, setTransportSubFilter] = useState<'all' | 'airport' | 'cruise'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ guest_name: '', room: '', type: 'Other', details: '', step: 'category' });

  // Guest messages (sender=guest only, most recent first)
  const guestMessages = messages.filter(m => m.sender === 'guest')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleAssign = async (reqId: string, name: string) => {
    if (!name.trim()) return;
    await onStatusChange(reqId, 'in-progress');
    // Update assigned_to in Supabase
    await supabase.from('requests').update({ assigned_to: name.trim() }).eq('id', reqId);
    setAssignForm(prev => ({ ...prev, [reqId]: '' }));
    // Send email notification
    const cfg = await getHotelConfig();
    if (cfg?.notificationEmail) {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'assignment',
          data: {
            notificationEmail: cfg.notificationEmail,
            hotelName: cfg.name,
            assignedTo: name.trim(),
            requestId: reqId,
          },
        }),
      }).catch(() => {});
    }
  };

  const checkTypeOrDetails = (r: Request, keywords: string[]) =>
    keywords.some(kw => r.type?.toLowerCase().includes(kw) || r.details?.toLowerCase().includes(kw));

  const isFood = (r: Request) =>
    checkTypeOrDetails(r, ['food_order', 'order', 'restaurant', 'food', 'burger', 'pizza', 'menu', 'delivery']);
  const isTransport = (r: Request) =>
    checkTypeOrDetails(r, ['transport', 'shuttle', 'taxi', 'uber', 'ride', 'pickup', 'dropoff']);

  const isAirport = (r: Request) =>
    isTransport(r) && r.details?.toLowerCase().includes('airport');
  const isCruise = (r: Request) =>
    isTransport(r) && r.details?.toLowerCase().includes('cruise');

  const isCheckinRequest = (r: Request) =>
    r.type?.toLowerCase().includes('check-in') || r.type?.toLowerCase().includes('checkin');

  const isAmenity = (r: Request) =>
    checkTypeOrDetails(r, ['amenity', 'towel', 'housekeep', 'clean', 'water', 'bottle', 'toilet', 'soap', 'shampoo']);

  const filtered = requests.filter(r => {
    if (typeFilter === 'All') return true;
    if (typeFilter === 'Food') return isFood(r);
    if (typeFilter === 'Transport') {
      if (transportSubFilter === 'airport') return isAirport(r);
      if (transportSubFilter === 'cruise') return isCruise(r);
      return isTransport(r);
    }
    if (typeFilter === 'Amenities') return isAmenity(r);
    return !isFood(r) && !isTransport(r) && !isAmenity(r);
  });

  const active = filtered.filter(r => r.status !== 'completed');
  const completed = filtered.filter(r => r.status === 'completed');
  const visible = statusTab === 'active' ? active : completed;

  const FILTERS: Array<{ key: 'All' | 'Food' | 'Transport' | 'Amenities' | 'Other'; label: string }> = [
    { key: 'All', label: 'All' },
    { key: 'Food', label: '🍴 Food' },
    { key: 'Transport', label: '🚗 Transport' },
    { key: 'Amenities', label: '🛁 Amenities' },
    { key: 'Other', label: '📋 Other' },
  ];

  const handleCreateRequest = async () => {
    if (!createForm.guest_name.trim() || !createForm.room.trim()) return;
    const hotelSlug = localStorage.getItem('attenda_hotel_slug');
    const cfg = await getHotelConfig(hotelSlug || undefined);
    await supabase.from('requests').insert({
      hotel_id: cfg?.id,
      guest_name: createForm.guest_name.trim(),
      room: createForm.room.trim(),
      type: createForm.type,
      details: createForm.details.trim() || createForm.type,
      status: 'pending',
    });
    setShowCreateModal(false);
    setCreateForm({ guest_name: '', room: '', type: 'Other', details: '', step: 'category' });
    onRefresh();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Live Orders</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:opacity-90 transition-opacity" style={{ backgroundColor: TEAL }}>
            <Plus size={16} /> New Request
          </button>
          <button onClick={onRefresh} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
        {[
          { label: 'Pending', count: filtered.filter(r => r.status === 'pending').length, color: 'text-amber-600' },
          { label: 'In Progress', count: filtered.filter(r => r.status === 'in-progress').length, color: 'text-blue-600' },
          { label: 'Completed', count: filtered.filter(r => r.status === 'completed').length, color: 'text-emerald-600' },
          { label: 'Messages', count: guestMessages.length, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase font-bold">{s.label}</p>
            <p className={`text-[28px] font-extrabold ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Type filter bar */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
              typeFilter === f.key
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            style={typeFilter === f.key ? { backgroundColor: TEAL } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transport sub-tabs */}
      {typeFilter === 'Transport' && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
          {[
            { key: 'all' as const, label: 'All Transport' },
            { key: 'airport' as const, label: '✈️ Airport' },
            { key: 'cruise' as const, label: '🚢 Cruise' },
          ].map(sub => (
            <button
              key={sub.key}
              onClick={() => setTransportSubFilter(sub.key)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                transportSubFilter === sub.key
                  ? 'text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
              style={transportSubFilter === sub.key ? { backgroundColor: TEAL } : {}}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Active/Completed/Messages tabs */}
      <div className="flex gap-2 mb-4">
        {(['active', 'completed', 'messages'] as const).map(t => (
          <button key={t} onClick={() => setStatusTab(t)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              statusTab === t ? 'bg-white border border-gray-200 text-gray-900 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {t === 'active' ? `Active (${active.length})` : t === 'completed' ? `Completed (${completed.length})` : `💬 Messages (${guestMessages.length})`}
          </button>
        ))}
      </div>

      {/* Messages feed */}
      {statusTab === 'messages' && (
        <div className="space-y-3">
          {guestMessages.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-[13px] text-gray-500">No guest messages yet.</p>
            </div>
          ) : guestMessages.map(msg => (
            <div key={msg.id} className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">💬 Guest Message</span>
                    <span className="text-[11px] text-gray-400">• {new Date(msg.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[14px] font-bold text-gray-900 mb-0.5">{msg.guest_name} — Room {msg.room}</p>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{msg.body}</p>
                </div>
                <a href="/staff?tab=messages" className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-600 hover:bg-purple-100 whitespace-nowrap">
                  Reply →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {statusTab !== 'messages' && <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <p className="text-[13px] text-gray-500">
              {statusTab === 'active' ? 'No active orders.' : 'No completed orders.'}
            </p>
          </div>
        ) : visible.map(req => {
          const foodOrder = isFood(req);
          return (
          <div key={req.id}>
            <div
              onClick={() => setExpanded(expanded === req.id ? null : req.id)}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 shadow-sm cursor-pointer hover:border-teal-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${req.status === 'pending' ? 'bg-amber-400' : req.status === 'in-progress' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{req.type}</span>
                  {foodOrder && <UtensilsCrossed size={11} className="text-amber-500" />}
                  {isCheckinRequest(req) && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      ⚠️ Unverified Guest
                    </span>
                  )}
                  {req.details?.includes('Clover #') && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      Clover POS
                    </span>
                  )}
                  {req.assigned_to && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">
                      👤 {req.assigned_to}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">• {new Date(req.created_at).toLocaleString()}</span>
                </div>
                <p className="text-[14px] font-bold text-gray-900 mb-0.5">{req.guest_name} — Room {req.room}</p>
                <p className="text-[13px] text-gray-600 truncate">{req.details}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                {req.status === 'pending' && (
                  <>
                    {isCheckinRequest(req) ? (
                      <button onClick={async () => { await supabase.from('requests').update({status:'completed'}).eq('id', req.id); onRefresh(); }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold hover:opacity-80"
                        style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                        ✅ Confirm Guest
                      </button>
                    ) : (
                      <button onClick={() => onStatusChange(req.id, 'in-progress')}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold hover:opacity-80"
                        style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                        {foodOrder ? 'Notify Restaurant' : 'Start'}
                      </button>
                    )}
                    <button onClick={() => onDelete(req.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-100">
                      Delete
                    </button>
                  </>
                )}
                {req.status === 'in-progress' && (
                  <button onClick={() => onStatusChange(req.id, 'completed')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-bold hover:bg-emerald-100">
                    Done
                  </button>
                )}
                {req.status === 'completed' && (
                  <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-bold">Completed</span>
                )}
              </div>
            </div>

            {/* Expanded panel */}
            {expanded === req.id && (
              <div className="bg-gray-50 border border-t-0 border-gray-200 rounded-b-xl p-5 space-y-3 shadow-sm">
                {/* Full details */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Full Details</p>
                  <p className="text-[13px] text-gray-800 whitespace-pre-wrap leading-relaxed">{req.details}</p>
                </div>

                {/* Guest info */}
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <span className="text-gray-400">Guest:</span>{' '}
                    <span className="font-semibold text-gray-800">{req.guest_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Room:</span>{' '}
                    <span className="font-semibold text-gray-800">{req.room}</span>
                  </div>
                </div>

                {/* Clover delivery panel */}
                {req.details?.includes('Clover #') && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1">Clover Delivery</p>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <span className="text-gray-400">Status:</span>{' '}
                        <span className="font-semibold text-purple-700">
                          {req.status === 'pending' ? 'Sent to Kitchen' : req.status === 'in-progress' ? 'Cooking' : 'Ready'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Delivery:</span>{' '}
                        <span className="font-semibold text-gray-800">Uber Direct</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Fee (5%):</span>{' '}
                        <span className="font-semibold text-emerald-600">
                          ${((parseFloat(req.details?.match(/— \$([\d.]+)/)?.[1] || '0')) * 0.05).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assign to */}
                {req.status !== 'completed' && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assign to</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Staff name..."
                        value={assignForm[req.id] || ''}
                        onChange={e => {
                          setAssignForm(prev => ({ ...prev, [req.id]: e.target.value }));
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleAssign(req.id, assignForm[req.id] || '');
                          }
                        }}
                        className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none focus:border-teal-400"
                      />
                      <button
                        onClick={() => handleAssign(req.id, assignForm[req.id] || '')}
                        disabled={!assignForm[req.id]?.trim()}
                        className="px-3 py-2 rounded-lg text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-30 transition-colors"
                        style={{ backgroundColor: assignForm[req.id]?.trim() ? TEAL : '#e5e7eb', color: assignForm[req.id]?.trim() ? 'white' : '#9ca3af' }}
                      >
                        <UserPlus size={13} /> Assign & Notify
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
        })}
      </div>}
      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-bold text-gray-900">New Request</h3>
                <p className="text-[12px] text-gray-400">Tap a category to start</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200"><XIcon size={16} /></button>
            </div>

            {/* Step 1: POS-style grid */}
            {createForm.step === 'category' && (
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'Food Order',         icon: '🍴', label: 'Food Order',     color: 'bg-orange-50 border-orange-200 hover:bg-orange-100', iconBg: 'bg-orange-100 text-orange-600' },
                    { key: 'Airport Shuttle',     icon: '✈️', label: 'Airport Shuttle', color: 'bg-sky-50 border-sky-200 hover:bg-sky-100',     iconBg: 'bg-sky-100 text-sky-600' },
                    { key: 'Cruise Shuttle',      icon: '🚢', label: 'Cruise Shuttle',  color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',    iconBg: 'bg-blue-100 text-blue-600' },
                    { key: 'Housekeeping',        icon: '🧹', label: 'Housekeeping',    color: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100', iconBg: 'bg-emerald-100 text-emerald-600' },
                    { key: 'Maintenance',         icon: '🔧', label: 'Maintenance',     color: 'bg-amber-50 border-amber-200 hover:bg-amber-100', iconBg: 'bg-amber-100 text-amber-600' },
                    { key: 'Amenity',             icon: '🛁', label: 'Amenity',         color: 'bg-purple-50 border-purple-200 hover:bg-purple-100', iconBg: 'bg-purple-100 text-purple-600' },
                  ].map(cat => (
                    <button key={cat.key} onClick={() => setCreateForm({ ...createForm, type: cat.key, step: 'details' })}
                      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-5 transition-all active:scale-95 ${cat.color}`}
                      style={{ minHeight: 100 }}
                    >
                      <span className="text-3xl leading-none">{cat.icon}</span>
                      <span className="text-[12px] font-bold text-gray-700 text-center leading-tight">{cat.label}</span>
                    </button>
                  ))}
                  <button onClick={() => setCreateForm({ ...createForm, type: 'Other', step: 'details' })}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 p-5 bg-gray-50 hover:bg-gray-100 transition-all active:scale-95"
                    style={{ minHeight: 100 }}
                  >
                    <span className="text-3xl leading-none">📋</span>
                    <span className="text-[12px] font-bold text-gray-500 text-center leading-tight">Other</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Guest details */}
            {createForm.step === 'details' && (
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setCreateForm({ ...createForm, step: 'category', type: '', guest_name: '', room: '', details: '' })} className="text-[12px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    ← Back
                  </button>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">{createForm.type}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={createForm.guest_name} onChange={e => setCreateForm({ ...createForm, guest_name: e.target.value })}
                    placeholder="Guest name *" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[16px] border border-gray-100 outline-none focus:border-teal-400" />
                  <input value={createForm.room} onChange={e => setCreateForm({ ...createForm, room: e.target.value })}
                    placeholder="Room *" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[16px] border border-gray-100 outline-none focus:border-teal-400" />
                </div>
                <textarea value={createForm.details} onChange={e => setCreateForm({ ...createForm, details: e.target.value })}
                  placeholder="Details (optional)" rows={3} className="w-full bg-gray-50 rounded-xl px-4 py-3.5 text-[14px] border border-gray-100 outline-none resize-none focus:border-teal-400" />
                <button onClick={handleCreateRequest} disabled={!createForm.guest_name.trim() || !createForm.room.trim()}
                  className="w-full py-4 rounded-2xl text-white text-[16px] font-bold disabled:opacity-40 hover:opacity-90 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: TEAL }}>
                  <Plus size={18} className="inline mr-1.5" /> Submit {createForm.type}
                </button>
              </div>
            )}

            {/* Step 3: Quick-add presets */}
            {createForm.step === 'quick' && (
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setCreateForm({ ...createForm, step: 'category' })} className="text-[12px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    ← Categories
                  </button>
                  <span className="text-[11px] font-bold text-gray-500">Quick Add</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['Fresh Towels', 'Extra Pillows', 'Water Bottles', 'Toiletries', 'Wake Up Call', 'Late Checkout'].map(preset => (
                    <button key={preset} onClick={async () => {
                      const hotelSlug = localStorage.getItem('attenda_hotel_slug');
                      const cfg = await getHotelConfig(hotelSlug || undefined);
                      await supabase.from('requests').insert({
                        hotel_id: cfg?.id,
                        guest_name: createForm.guest_name,
                        room: createForm.room,
                        type: 'Amenity',
                        details: preset,
                        status: 'pending',
                      });
                      setShowCreateModal(false);
                      setCreateForm({ guest_name: '', room: '', type: 'Other', details: '', step: 'category' });
                      onRefresh();
                    }}
                      className="text-left px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-[13px] font-semibold text-gray-700 hover:bg-gray-100 transition-all active:scale-95"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Messages View (WhatsApp-Style Split) ──────────────── */
function MessagesView({ messages, hotelId }: { messages: Message[]; hotelId?: string }) {
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [staffChannel, setStaffChannel] = useState<Message[]>([]);
  const [staffMsg, setStaffMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [internalTab, setInternalTab] = useState<'guest' | 'staff'>('guest');

  // Load staff messages
  useEffect(() => {
    if (!hotelId) return;
    supabase.from('messages')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('sender', 'staff')
      .eq('room', '__staff__')
      .order('created_at', { ascending: true })
      .then(({ data }) => setStaffChannel(data || []));
  }, [hotelId]);

  // Subscribe to new staff messages
  useEffect(() => {
    if (!hotelId) return;
    const ch = supabase
      .channel('staff-messages-live')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `hotel_id=eq.${hotelId}` },
        () => {
          supabase.from('messages')
            .select('*')
            .eq('hotel_id', hotelId)
            .eq('sender', 'staff')
            .eq('room', '__staff__')
            .order('created_at', { ascending: true })
            .then(({ data }) => setStaffChannel(data || []));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hotelId]);

  // Build conversation groups (by guest_name), sorted by most recent
  const byGuest = new Map<string, Message[]>();
  messages.forEach(msg => {
    const arr = byGuest.get(msg.guest_name) || [];
    arr.push(msg);
    byGuest.set(msg.guest_name, arr);
  });
  const groups: { guest_name: string; room: string; messages: Message[]; lastMsg: Message; unread: number }[] = [];
  byGuest.forEach((msgs, name) => {
    // Filter out internal staff messages from guest view
    const real = msgs.filter(m => m.room !== '__staff__');
    if (real.length === 0) return;
    real.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    groups.push({
      guest_name: name,
      room: real[real.length - 1].room,
      messages: real,
      lastMsg: real[real.length - 1],
      unread: real.length,
    });
  });
  groups.sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime());

  const selected = groups.find(g => g.guest_name === selectedGuest);
  const [showArchived, setShowArchived] = useState(false);

  // Split into today's active convos vs archived (no activity today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeGroups = groups.filter(g => new Date(g.lastMsg.created_at) >= today);
  const archivedGroups = groups.filter(g => new Date(g.lastMsg.created_at) < today);

  const filteredGroups = showArchived ? archivedGroups : activeGroups;

  const handleSend = async () => {
    if (!replyText.trim() || !selected || !hotelId) return;
    await supabase.from('messages').insert({
      hotel_id: hotelId,
      guest_name: selected.guest_name,
      room: selected.room,
      sender: 'staff',
      body: replyText.trim(),
    });
    setReplyText('');
  };

  const sendStaffMessage = async () => {
    if (!staffMsg.trim() || !hotelId) return;
    await supabase.from('messages').insert({
      hotel_id: hotelId,
      guest_name: 'Staff Channel',
      room: '__staff__',
      sender: 'staff',
      body: staffMsg.trim(),
    });
    setStaffMsg('');
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selected, selectedGuest]);

  /* ── Left Panel: Contact List ────────────────────────── */
  const contactList = (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200">
        <h2 className="text-[15px] font-extrabold text-gray-900">Chats</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">{activeGroups.length} active · {archivedGroups.length} archived</p>
      </div>
      <div className="flex gap-1 px-4 py-2 border-b border-gray-100">
        <button onClick={() => setShowArchived(false)} className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors ${!showArchived ? 'bg-teal-100 text-teal-800' : 'text-gray-500 hover:bg-gray-100'}`}>Active ({activeGroups.length})</button>
        <button onClick={() => setShowArchived(true)} className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors ${showArchived ? 'bg-teal-100 text-teal-800' : 'text-gray-500 hover:bg-gray-100'}`}>Archived ({archivedGroups.length})</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[12px] text-gray-500">{showArchived ? 'No archived conversations.' : 'No active conversations today.'}</p>
          </div>
        ) : (
          filteredGroups.map(g => (
            <button
              key={g.guest_name}
              onClick={() => setSelectedGuest(g.guest_name)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                selectedGuest === g.guest_name ? 'bg-teal-50' : ''
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
                {g.guest_name.charAt(0).toUpperCase()}
              </div>
              {/* Preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{g.guest_name}</p>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                    {new Date(g.lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  Room {g.room} — {g.lastMsg.body}
                </p>
              </div>
              {/* Unread badge */}
              {g.unread > 0 && (
                <span className="text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: TEAL }}>
                  {g.unread}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  /* ── Right Panel: Chat History + Reply ───────────────── */
  const chatContent = selected ? (
    <div className="h-full flex flex-col bg-[#ECE5DD]">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
        <button
          onClick={() => setSelectedGuest(null)}
          className="lg:hidden text-gray-500 hover:text-gray-700"
          aria-label="Back to conversations"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
          {selected.guest_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-gray-900">{selected.guest_name}</p>
          <p className="text-[11px] text-gray-500">Room {selected.room}</p>
        </div>
      </div>

      {/* Message bubbles (all) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {selected.messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'staff' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
              msg.sender === 'staff'
                ? 'bg-[#DCF8C6] text-gray-800 rounded-br-md'   // staff = sent = green bubble
                : 'bg-white text-gray-800 rounded-bl-md'        // guest = received = white bubble
            }`}>
              {msg.body}
            </div>
            <span className="text-[9px] text-gray-400 mt-0.5 px-1">
              {msg.sender === 'staff' ? 'Staff' : msg.guest_name} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* Reply input */}
      <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a reply..."
            className="flex-1 bg-white rounded-full px-4 py-2.5 text-[13px] outline-none border border-gray-200 placeholder-gray-400 focus:border-teal-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!replyText.trim()}
            className="px-5 py-2.5 rounded-full text-white font-semibold text-[13px] disabled:opacity-40 transition-colors"
            style={{ backgroundColor: TEAL }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="h-full flex items-center justify-center bg-[#FAFAFA]">
      <div className="text-center">
        <MessageSquare size={44} className="text-gray-200 mx-auto mb-3" />
        <p className="text-[13px] text-gray-500 font-medium">Select a conversation</p>
        <p className="text-[11px] text-gray-400 mt-1">Choose a guest from the sidebar to view their messages.</p>
      </div>
    </div>
  );

  /* ── Tab switcher ────────────────────────────────────── */
  const tabBar = (
    <div className="flex gap-0.5 p-2 bg-gray-100 rounded-xl mb-3 mx-4 mt-3">
      <button onClick={() => setInternalTab('guest')}
        className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-colors ${internalTab === 'guest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
        Guest Chats ({activeGroups.length + archivedGroups.length})
      </button>
      <button onClick={() => setInternalTab('staff')}
        className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-colors ${internalTab === 'staff' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
        Staff Channel ({staffChannel.length})
      </button>
    </div>
  );

  /* ── Staff Channel View ─────────────────────────────── */
  const staffChannelView = (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-[15px] font-extrabold text-gray-900">Staff Channel</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">Internal team messages — all staff see this</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FAFAFA]">
        {staffChannel.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[12px] text-gray-500">No staff messages yet.</p>
          </div>
        ) : (
          staffChannel.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'staff' ? 'items-start' : 'items-end'}`}>
              <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm bg-white text-gray-800 rounded-bl-md">
                <p className="text-[10px] font-bold text-gray-500 mb-0.5">{msg.guest_name}</p>
                {msg.body}
              </div>
              <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <input value={staffMsg} onChange={e => setStaffMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendStaffMessage(); } }}
            placeholder="Message the team..."
            className="flex-1 bg-white rounded-full px-4 py-2.5 text-[13px] outline-none border border-gray-200 placeholder-gray-400" />
          <button onClick={sendStaffMessage} disabled={!staffMsg.trim()}
            className="px-5 py-2.5 rounded-full text-white font-semibold text-[13px] disabled:opacity-40" style={{ backgroundColor: TEAL }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Layout: Desktop = split, Mobile = full screen ─── */
  return internalTab === 'staff' ? (
    <div className="h-full">{staffChannelView}</div>
  ) : (
    <div className="h-full flex flex-col">
      {tabBar}
      <div className="flex-1 flex">
        {/* Left panel — hidden on mobile when a conversation is open */}
        <div className="hidden lg:flex lg:flex-col w-80 border-r border-gray-200 shrink-0">
          {contactList}
        </div>
        <div className={`lg:hidden w-full ${selectedGuest ? 'hidden' : 'block'}`}>
          {contactList}
        </div>

        {/* Right panel — chat */}
        <div className={`flex-1 min-w-0 ${selectedGuest ? 'block' : 'hidden lg:block'}`}>
          {chatContent}
        </div>
      </div>
    </div>
  );
}

/* ── Shuttle View (In-App) ──────────────────────────────── */
function ShuttleView({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [calendarTab, setCalendarTab] = useState<'calendar' | 'routes'>('calendar');
  const [calendarEntries, setCalendarEntries] = useState<{ id: string; name: string; date: string; time: string; price: number; link: string; type: string }[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', date: '', time: '', price: '0', link: '', type: 'airport' });
  // editingEvent unused - reserved for future inline editing
  // setEditingEvent unused - reserved for future inline editing

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  useEffect(() => {
    const loadCal = async () => {
      setLoadingCal(true);
      try {
        const [slots, cruises] = await Promise.all([
          getAllShuttleSlotsForHotel(hotelId),
          getCruiseSchedulesAll(hotelId),
        ]);
        const entries: typeof calendarEntries = [];
        slots.forEach(s => {
          (s.days_of_week || []).forEach(() => {
            entries.push({
              id: `slot-${s.id}`,
              name: s.route_name || s.event_label || 'Shuttle',
              date: s.date || new Date().toISOString().split('T')[0],
              time: s.departure_time?.slice(0,5) || '',
              price: s.override_price ?? s.route_price ?? 0,
              link: '',
              type: s.route_type || 'custom',
            });
          });
        });
        cruises.forEach(c => {
          entries.push({
            id: `cruise-${c.id}`,
            name: `${c.ship_name}${c.cruise_line ? ` (${c.cruise_line})` : ''}`,
            date: c.departure_date,
            time: c.departure_time?.slice(0,5) || '',
            price: 0,
            link: '',
            type: 'cruise',
          });
        });
        setCalendarEntries(entries);
      } catch (e) { console.error('Load calendar error:', e); }
      setLoadingCal(false);
    };
    loadCal();
  }, [hotelId]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const today = new Date().toISOString().split('T')[0];

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEntries.filter(e => e.date === dateStr);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const handleAddEvent = async () => {
    if (!newEvent.name || !newEvent.date || !newEvent.time) return;
    try {
      if (newEvent.type === 'cruise') {
        await createCruiseSchedule({
          hotel_id: hotelId,
          ship_name: newEvent.name,
          cruise_line: newEvent.name,
          terminal: '',
          departure_date: newEvent.date,
          departure_time: newEvent.time,
          notes: newEvent.link ? `Link: ${newEvent.link}` : '',
        });
      } else {
        const routeName = `Calendar: ${newEvent.name}`;
        const route = await createShuttleRoute({
          hotel_id: hotelId,
          name: routeName,
          type: newEvent.type as 'airport' | 'cruise' | 'custom',
          price: parseFloat(newEvent.price) || 0,
        });
        if (route) {
          await createShuttleSlot({
            route_id: route.id,
            departure_time: newEvent.time + ':00',
            date: newEvent.date,
            days_of_week: [],
            capacity: 0,
            event_label: newEvent.name,
            override_price: parseFloat(newEvent.price) || 0,
          });
        }
      }
    } catch (e) { console.error('Add event error:', e); }
    setNewEvent({ name: '', date: '', time: '', price: '0', link: '', type: 'airport' });
    setShowAddEvent(false);
    window.location.reload();
  };

  const calView = (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="px-3 py-1.5 text-[13px] font-bold text-gray-600 hover:bg-gray-100 rounded-lg">&lt;</button>
          <h2 className="text-[18px] font-extrabold text-gray-900">{MONTH_NAMES[currentMonth]} {currentYear}</h2>
          <button onClick={handleNextMonth} className="px-3 py-1.5 text-[13px] font-bold text-gray-600 hover:bg-gray-100 rounded-lg">&gt;</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCalendarTab(calendarTab === 'calendar' ? 'routes' : 'calendar')}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold ${calendarTab === 'calendar' ? 'bg-white border border-gray-200 shadow-sm text-gray-900' : 'bg-gray-100 text-gray-500'}`}>
            {calendarTab === 'calendar' ? '📋 Routes View' : '📅 Calendar View'}
          </button>
          {isAdmin && (
            <button onClick={() => setShowAddEvent(!showAddEvent)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[13px] font-semibold" style={{ backgroundColor: TEAL }}>
              <Plus size={14} /> Add Calendar Entry
            </button>
          )}
        </div>
      </div>

      {/* Add event form */}
      {showAddEvent && isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-[15px]">New Calendar Entry</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Calendar Name *</label>
              <input value={newEvent.name} onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                placeholder='e.g. "Airport Shuttle" or "Royal Caribbean"'
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Type</label>
              <select value={newEvent.type} onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                <option value="airport">Airport (free)</option>
                <option value="cruise">Cruise Port</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Date *</label>
              <input type="date" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Time *</label>
              <input type="time" value={newEvent.time} onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            {newEvent.type !== 'airport' && (
              <>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Price ($)</label>
                  <input type="number" min="0" step="0.01" value={newEvent.price}
                    onChange={e => setNewEvent({ ...newEvent, price: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Link to Order (optional)</label>
                  <input value={newEvent.link} onChange={e => setNewEvent({ ...newEvent, link: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddEvent} className="flex-1 py-2.5 rounded-xl text-white font-bold text-[13px]" style={{ backgroundColor: TEAL }}>
              Add to Calendar
            </button>
            <button onClick={() => setShowAddEvent(false)} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      {loadingCal ? (
        <div className="text-center py-12"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: TEAL }} /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {DAY_NAMES.map(d => (
              <div key={d} className="px-2 py-2 text-[11px] font-bold text-gray-400 uppercase text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/50 border-b border-r border-gray-100" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const events = getEventsForDay(day);
              const isToday = dateStr === today;
              return (
                <div key={day}
                  className={`min-h-[80px] p-1.5 border-b border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'bg-teal-50' : ''}`}
                  onClick={() => isAdmin && setShowAddEvent(true)}>
                  <div className={`text-[12px] font-bold mb-1 ${isToday ? 'text-teal-600' : 'text-gray-700'}`}>{day}</div>
                  <div className="space-y-0.5">
                    {events.slice(0, 2).map(e => (
                      <div key={e.id}
                        className={`text-[9px] font-bold px-1 py-0.5 rounded truncate ${
                          e.type === 'airport' ? 'bg-blue-100 text-blue-700' :
                          e.type === 'cruise' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }`}
                        title={`${e.name} ${e.time}${e.price > 0 ? ` $${e.price}` : ''}`}>
                        {e.name.split(' ')[0]} {e.time}
                      </div>
                    ))}
                    {events.length > 2 && <div className="text-[9px] text-gray-400 font-bold px-1">+{events.length - 2} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event list below calendar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-[14px]">All Upcoming ({calendarEntries.filter(e => e.date >= today).length})</h3>
        </div>
        {calendarEntries.filter(e => e.date >= today).length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No scheduled events.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {calendarEntries.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).map(e => (
              <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  e.type === 'airport' ? 'bg-blue-100 text-blue-700' :
                  e.type === 'cruise' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                }`}>{e.type}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-gray-900">{e.name}</p>
                  <p className="text-[11px] text-gray-400">{e.date} at {e.time}</p>
                </div>
                {e.price > 0 && <span className="text-[12px] font-bold text-amber-700">${e.price}</span>}
                {e.price === 0 && e.type === 'airport' && <span className="text-[10px] font-bold text-emerald-700">Free</span>}
                {e.link && (
                  <a href={e.link} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-bold px-2 py-1 rounded bg-teal-50 text-teal-600 hover:bg-teal-100">Order</a>
                )}
                {isAdmin && (
                  <button onClick={async () => {
                    const id = e.id;
                    if (id.startsWith('slot-')) await deleteShuttleSlot(id.replace('slot-', ''));
                    if (id.startsWith('cruise-')) await deleteCruiseSchedule(id.replace('cruise-', ''));
                    window.location.reload();
                  }} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Shuttle Schedule</h1>
      </div>
      {calView}
    </div>
  );
}

/* ── Shuttle Routes Panel ───────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ShuttleRoutesPanel({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [routes, setRoutes] = useState<ShuttleRoute[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [bookings, setBookings] = useState<Record<string, ShuttleBooking[]>>({});
  const [loading, setLoading] = useState(true);
  const [newRoute, setNewRoute] = useState({ name: '', type: 'airport', price: 0 });
  const [newSlot, setNewSlot] = useState<{ route_id: string; show: boolean; time: string; days: number[]; capacity: number; event_label: string; override_price: number | null }>({ route_id: '', show: false, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null });
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const load = useCallback(async () => {
    const r = await getShuttleRoutes(hotelId);
    setRoutes(r);
    const s = await getAllShuttleSlotsForHotel(hotelId);
    setSlots(s);
    const b = await getAllShuttleBookingsForHotel(hotelId);
    const bySlot: Record<string, ShuttleBooking[]> = {};
    b.forEach(bk => { if (!bySlot[bk.slot_id]) bySlot[bk.slot_id] = []; bySlot[bk.slot_id].push(bk); });
    setBookings(bySlot);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const handleAddRoute = async () => {
    if (!newRoute.name) return;
    await createShuttleRoute({ hotel_id: hotelId, name: newRoute.name, type: newRoute.type, price: newRoute.price });
    setNewRoute({ name: '', type: 'airport', price: 0 });
    load();
  };

  const handleAddSlot = async () => {
    if (!newSlot.time || !newSlot.route_id) return;
    await createShuttleSlot({ route_id: newSlot.route_id, departure_time: newSlot.time + ':00', days_of_week: newSlot.days, capacity: newSlot.capacity, event_label: newSlot.event_label, override_price: newSlot.override_price ?? undefined });
    setNewSlot({ route_id: '', show: false, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null });
    load();
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      {/* Add Route */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-extrabold text-[15px] mb-3">+ Add Route</h3>
          <div className="flex gap-2 items-end flex-wrap">
            <input placeholder="Route name (e.g. MIA Airport)" value={newRoute.name} onChange={e => setNewRoute({ ...newRoute, name: e.target.value })}
              className="flex-1 min-w-[160px] bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            <select value={newRoute.type} onChange={e => setNewRoute({ ...newRoute, type: e.target.value })}
              className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
              <option value="airport">Airport (free)</option><option value="cruise">Cruise Port</option><option value="custom">Custom</option>
            </select>
            <div>
              <label className="text-[10px] text-gray-400 block">$ per person</label>
              <input type="number" min="0" step="0.01" value={newRoute.price || ''} placeholder="0" onChange={e => setNewRoute({ ...newRoute, price: parseFloat(e.target.value)||0 })}
                className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none w-[72px]" />
            </div>
            <button onClick={handleAddRoute} className="px-4 py-2.5 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: '#0D9488' }}>Add</button>
          </div>
        </div>
      )}

      {/* Routes & Slots */}
      {routes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <Bus size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No shuttle routes configured yet.</p>
          {isAdmin && <p className="text-[12px] text-gray-400 mt-1">Add your first route above.</p>}
        </div>
      ) : routes.map(route => {
        const routeSlots = slots.filter(s => s.route_id === route.id);
        return (
          <div key={route.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-teal-100 text-teal-700">{route.type}</span>
                <h3 className="font-extrabold text-[16px] text-gray-900">{route.name}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: (route.price||0) > 0 ? '#FEF3C7' : '#D1FAE5', color: (route.price||0) > 0 ? '#92400E' : '#065F46' }}>{(route.price||0) > 0 ? `$${route.price}/person` : 'Free'}</span>
                <span className="text-[12px] text-gray-400">{routeSlots.length} slots</span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button onClick={e => { e.stopPropagation(); setNewSlot({ route_id: route.id, show: true, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null }); }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-600">+ Slot</button>
                    <button onClick={e => { e.stopPropagation(); if(confirm('Delete this route and all slots?')) { deleteShuttleRoute(route.id); load(); } }}
                      className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </>
                )}
                {expandedRoute === route.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {expandedRoute === route.id && (
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                {/* Add slot form */}
                {newSlot.show && newSlot.route_id === route.id && (
                  <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4 space-y-3">
                    <div className="space-y-3">
                      <div className="flex gap-2 items-end">
                        <div>
                          <label className="text-[10px] text-gray-400 block">Time</label>
                          <input type="time" value={newSlot.time} onChange={e => setNewSlot({ ...newSlot, time: e.target.value })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block">Capacity (0=unlimited)</label>
                          <input type="number" min="0" max="99" value={newSlot.capacity} onChange={e => setNewSlot({ ...newSlot, capacity: parseInt(e.target.value)||0 })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-24" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block">Override $ (optional)</label>
                          <input type="number" min="0" step="0.01" value={newSlot.override_price ?? ''} placeholder="--" onChange={e => setNewSlot({ ...newSlot, override_price: e.target.value ? parseFloat(e.target.value) : null })}
                            className="bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none w-[80px]" />
                        </div>
                        <button onClick={handleAddSlot} className="px-4 py-2 rounded-lg text-white font-bold text-[12px]" style={{ backgroundColor: '#0D9488' }}>Save</button>
                        <button onClick={() => setNewSlot({ route_id: '', show: false, time: '', days: [1,2,3,4,5,6,7], capacity: 0, event_label: '', override_price: null })} className="px-3 py-2 text-[12px] text-gray-400">Cancel</button>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block">Event / Cruise Line (optional)</label>
                        <input value={newSlot.event_label} onChange={e => setNewSlot({ ...newSlot, event_label: e.target.value })} placeholder="e.g. Royal Caribbean · May 17" 
                          className="w-full bg-gray-50 rounded-lg px-3 py-2 border text-[13px] outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map((d, i) => {
                        const dayNum = i + 1;
                        const active = newSlot.days.includes(dayNum);
                        return (
                          <button key={d} onClick={() => setNewSlot({ ...newSlot, days: active ? newSlot.days.filter(x => x !== dayNum) : [...newSlot.days, dayNum] })}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${active ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{d}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Slots list */}
                {routeSlots.length === 0 ? (
                  <p className="text-[13px] text-gray-400 py-2">No time slots yet.</p>
                ) : routeSlots.map(slot => {
                  const slotBookings = bookings[slot.id] || [];
                  const dayNames = (slot.days_of_week || []).map(d => DAYS[d-1]).join(', ') || 'One-off';
                  return (
                    <div key={slot.id} className="bg-white rounded-xl border border-gray-100 mb-2 overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedSlot(expandedSlot === slot.id ? null : slot.id)}>
                        <div className="flex items-center gap-4">
                          <span className="text-[18px] font-extrabold text-gray-900">{slot.departure_time?.slice(0,5)}</span>
                          <span className="text-[11px] text-gray-400">{slot.event_label ? slot.event_label : dayNames}</span>
                          {(slot.override_price ?? slot.route_price ?? 0) > 0 && <span className="text-[11px] font-semibold text-amber-700">${slot.override_price ?? slot.route_price}/pp</span>}
                          {slot.capacity > 0 && <span className="text-[11px] font-semibold text-emerald-600">{slot.capacity - slotBookings.length} / {slot.capacity} spots</span>}
                          <span className="text-[11px] font-semibold text-purple-600">{slotBookings.length} booked</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && <button onClick={e => { e.stopPropagation(); if(confirm('Delete slot?')) { deleteShuttleSlot(slot.id); load(); } }} className="text-red-400"><Trash2 size={12} /></button>}
                          {expandedSlot === slot.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>
                      {expandedSlot === slot.id && (
                        <div className="border-t border-gray-100 px-4 py-3">
                          {slotBookings.length === 0 ? (
                            <p className="text-[12px] text-gray-400">No bookings yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {slotBookings.map(b => (
                                <div key={b.id} className="flex items-center justify-between text-[12px]">
                                  <div>
                                    <span className="font-semibold text-gray-800">{b.guest_name} · Room {b.room_number} · {b.pax} pax</span>
                                    {(b.price_charged || 0) > 0 && <span className="ml-2 text-[10px] text-amber-700 font-bold">${b.price_charged} charged {b.charge_accepted ? '✅' : '⚠️ not accepted'}</span>}
                                  </div>
                                  <button onClick={() => { cancelShuttleBooking(b.id); load(); }} className="text-[10px] text-red-500 font-bold">Cancel</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Shuttle Requests Panel ─────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ShuttleRequestsPanel({ hotelId }: { hotelId: string }) {
  const [requests, setRequests] = useState<ShuttleRequest[]>([]);
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [reqs, staff] = await Promise.all([getShuttleRequests(hotelId), getStaffAccountsForHotel(hotelId)]);
    setRequests(reqs);
    setStaffList(staff.filter(s => s.active));
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = requests.filter(r => r.status === 'pending');
  const active = requests.filter(r => r.status === 'assigned' || r.status === 'in_progress');
  const done = requests.filter(r => r.status === 'completed' || r.status === 'cancelled');

  return (
    <div className="space-y-6">
      {pending.length + active.length === 0 && done.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <Bus size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No pickup requests yet.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-amber-600 uppercase tracking-wider mb-2">Pending ({pending.length})</h3>
              <div className="space-y-2">
                {pending.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{r.guest_name} · Room {r.room_number} · {r.pax} pax</p>
                        <p className="text-[12px] text-gray-500">{r.destination} · {r.date || 'No date'} {r.time || ''}</p>
                        {r.notes && <p className="text-[11px] text-gray-400 mt-0.5">{r.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select onChange={async e => { if(e.target.value) { await updateShuttleRequest(r.id, { assigned_driver_id: e.target.value, status: 'assigned' }); load(); } }}
                        className="flex-1 bg-gray-50 rounded-lg px-3 py-2 border text-[12px] outline-none">
                        <option value="">Assign driver...</option>
                        {staffList.map(s => <option key={s.id} value={s.id}>{s.name} {s.phone ? `· ${s.phone}` : ''}</option>)}
                      </select>
                      <button onClick={async () => { await updateShuttleRequest(r.id, { status: 'cancelled' }); load(); }}
                        className="px-3 py-2 rounded-lg text-[11px] font-bold text-red-600 bg-red-50">Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-blue-600 uppercase tracking-wider mb-2">In Progress ({active.length})</h3>
              <div className="space-y-2">
                {active.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{r.guest_name} · Room {r.room_number}</p>
                        <p className="text-[12px] text-gray-500">{r.destination} · Driver: {r.assigned_driver_name || 'Unassigned'}</p>
                      </div>
                      <button onClick={async () => { await updateShuttleRequest(r.id, { status: 'completed' }); load(); }}
                        className="px-3 py-2 rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: '#0D9488' }}>Complete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <summary className="text-[13px] font-bold text-gray-500 cursor-pointer">Completed ({done.length})</summary>
              <div className="space-y-1 mt-2">
                {done.map(r => (
                  <div key={r.id} className="flex items-center gap-3 text-[12px] text-gray-500 py-1">
                    <span>{r.guest_name} · {r.destination}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100">{r.status}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

/* ── Cruise Calendar Panel ───────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CruiseCalendarPanel({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [schedules, setSchedules] = useState<CruiseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ship_name: '', cruise_line: '', terminal: '', departure_date: '', departure_time: '', notes: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const data = await getCruiseSchedulesAll(hotelId);
    setSchedules(data);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.ship_name || !form.departure_date || !form.departure_time) return;
    setAdding(true);
    await createCruiseSchedule({ hotel_id: hotelId, ...form });
    setForm({ ship_name: '', cruise_line: '', terminal: '', departure_date: '', departure_time: '', notes: '' });
    await load();
    setAdding(false);
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const today = new Date().toISOString().split('T')[0];
  const upcoming = schedules.filter(s => s.departure_date >= today);
  const past = schedules.filter(s => s.departure_date < today);

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-extrabold text-[15px] mb-3">+ Add Cruise Schedule</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Ship Name *</label>
              <input value={form.ship_name} onChange={e => setForm({ ...form, ship_name: e.target.value })} placeholder="e.g. Harmony of the Seas"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Cruise Line</label>
              <input value={form.cruise_line} onChange={e => setForm({ ...form, cruise_line: e.target.value })} placeholder="e.g. Royal Caribbean"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Terminal</label>
              <input value={form.terminal} onChange={e => setForm({ ...form, terminal: e.target.value })} placeholder="e.g. Terminal D"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Departure Date *</label>
              <input type="date" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Departure Time *</label>
              <input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Pier, parking, check-in info..."
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={adding || !form.ship_name || !form.departure_date || !form.departure_time}
            className="mt-4 px-5 py-2.5 rounded-xl text-white font-semibold text-[13px] disabled:opacity-40"
            style={{ backgroundColor: TEAL }}>
            {adding ? 'Adding...' : 'Add to Calendar'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="text-[18px]">🚢</span>
          <h3 className="font-extrabold text-[15px]">Upcoming Departures ({upcoming.length})</h3>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No upcoming cruises scheduled.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map(s => (
              <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{s.cruise_line || 'Cruise'}</span>
                    {s.terminal && <span className="text-[11px] text-gray-400">{s.terminal}</span>}
                  </div>
                  <p className="text-[15px] font-bold text-gray-900">{s.ship_name}</p>
                  <p className="text-[13px] text-gray-600">
                    {new Date(s.departure_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {s.departure_time.slice(0, 5)}
                  </p>
                  {s.notes && <p className="text-[11px] text-gray-400 mt-0.5">{s.notes}</p>}
                </div>
                {isAdmin && (
                  <button onClick={async () => { await deleteCruiseSchedule(s.id); load(); }}
                    className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <summary className="text-[13px] font-bold text-gray-500 cursor-pointer">Past Departures ({past.length})</summary>
          <div className="space-y-2 mt-3">
            {past.map(s => (
              <div key={s.id} className="flex items-center justify-between text-[12px] py-1">
                <span className="text-gray-500">{s.ship_name} · {s.departure_date} {s.departure_time.slice(0,5)}</span>
                {isAdmin && (
                  <button onClick={async () => { await deleteCruiseSchedule(s.id); load(); }} className="text-red-400 text-[11px]">Remove</button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ── Vendor Dashboard ────────────────────────────────────── */
function VendorDashboard({ hotelId, vendorType, vendorName }: { hotelId: string; vendorType: string; vendorName: string }) {
  const isShuttle = vendorType === 'shuttle' || vendorType === 'taxi';
  const isCatering = vendorType === 'catering' || vendorType === 'restaurant';

  return (
    <div>
      {isShuttle && <ShuttleVendorView hotelId={hotelId} vendorName={vendorName} vendorType={vendorType} />}
      {isCatering && <RestaurantVendorView hotelId={hotelId} vendorName={vendorName} />}
      {!isShuttle && !isCatering && <GeneralVendorView hotelId={hotelId} vendorName={vendorName} vendorType={vendorType} />}
    </div>
  );
}

function ShuttleVendorView({ hotelId, vendorName, vendorType }: { hotelId: string; vendorName: string; vendorType: string }) {
  const [bookings, setBookings] = useState<ShuttleBooking[]>([]);
  const [slots, setSlots] = useState<ShuttleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [allBookings, allSlots] = await Promise.all([
      getAllShuttleBookingsForHotel(hotelId),
      getAllShuttleSlotsForHotel(hotelId),
    ]);
    setBookings(allBookings);
    setSlots(allSlots);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const today = new Date().toISOString().split('T')[0];
  const slotMap = Object.fromEntries(slots.map(s => [s.id, s]));
  const filteredBookings = bookings.filter(b => {
    if (!dateFilter) return true;
    const slot = slotMap[b.slot_id];
    return (slot?.date || today) === dateFilter;
  });
  const totalPax = filteredBookings.reduce((sum, b) => sum + (b.pax || 1), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Passenger Manifest</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · {vendorType} operator</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Bookings</p>
          <p className="text-[28px] font-extrabold text-teal-600">{filteredBookings.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Passengers</p>
          <p className="text-[28px] font-extrabold text-blue-600">{totalPax}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Routes Active</p>
          <p className="text-[28px] font-extrabold text-gray-700">{slots.length}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none" />
        {dateFilter && <button onClick={() => setDateFilter('')} className="text-[12px] text-gray-400">Clear</button>}
        <span className="text-[12px] text-gray-400">{dateFilter ? `Showing ${dateFilter}` : 'All bookings'}</span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-[14px]">Booking List ({filteredBookings.length})</h3>
        </div>
        {filteredBookings.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No bookings found.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredBookings.map((b, i) => {
              const slot = slotMap[b.slot_id];
              return (
                <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                  <span className="text-[12px] font-bold text-gray-400 w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-gray-900">{b.guest_name}</p>
                    <p className="text-[11px] text-gray-500">Room {b.room_number} · {b.pax} pax{b.notes ? ` · ${b.notes}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-gray-700">{slot?.route_name || b.route_name || '—'}</p>
                    <p className="text-[11px] text-gray-400">{slot?.departure_time?.slice(0,5) || '—'}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {b.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RestaurantVendorView({ hotelId, vendorName }: { hotelId: string; vendorName: string }) {
  const [orders, setOrders] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('type', 'Food Order')
      .order('created_at', { ascending: false });
    setOrders((data || []) as Request[]);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await updateRequestStatus(id, status);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as Request['status'] } : o));
  };

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = orders.filter(o => o.status === 'pending');
  const inProgress = orders.filter(o => o.status === 'in-progress');
  const completed = orders.filter(o => o.status === 'completed');

  const OrderCard = ({ order }: { order: Request }) => (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${order.status === 'pending' ? 'border-amber-300' : order.status === 'in-progress' ? 'border-teal-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[14px] font-bold text-gray-900">{order.guest_name}</p>
          <p className="text-[11px] text-gray-500">Room {order.room} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : order.status === 'in-progress' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
          {order.status}
        </span>
      </div>
      <p className="text-[13px] text-gray-700 mb-3 line-clamp-2">{order.details}</p>
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <button onClick={() => updateStatus(order.id, 'in-progress')}
            className="flex-1 py-2 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
            Start Preparing
          </button>
        )}
        {order.status === 'in-progress' && (
          <button onClick={() => updateStatus(order.id, 'completed')}
            className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-[12px] font-bold">
            Mark Delivered
          </button>
        )}
        {order.status === 'completed' && (
          <span className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-400 text-[12px] font-bold text-center">Delivered</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Incoming Orders</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · Food & Beverage</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pending.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-teal-200 p-4 shadow-sm">
          <p className="text-[11px] text-teal-500 uppercase font-bold">Preparing</p>
          <p className="text-[28px] font-extrabold text-teal-600">{inProgress.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Delivered Today</p>
          <p className="text-[28px] font-extrabold text-gray-700">{completed.length}</p>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <UtensilsCrossed size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-gray-400">No orders yet</p>
          <p className="text-[12px] text-gray-300 mt-1">New orders will appear here in real time</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending ({pending.length})</p>
              {pending.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
          {inProgress.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wider mt-4">Preparing ({inProgress.length})</p>
              {inProgress.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
          {completed.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-4">Delivered ({completed.length})</p>
              {completed.map(o => <OrderCard key={o.id} order={o} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GeneralVendorView({ hotelId, vendorName, vendorType }: { hotelId: string; vendorName: string; vendorType: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(50);
    setRequests((data || []) as Request[]);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const pending = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Vendor Dashboard</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{vendorName} · {vendorType}</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-[12px] font-semibold">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Requests</p>
          <p className="text-[28px] font-extrabold text-teal-600">{requests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pending}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-[14px]">Recent Requests</h3>
        </div>
        {requests.length === 0 ? (
          <div className="px-5 py-8 text-center"><p className="text-[13px] text-gray-400">No requests yet.</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {requests.map(r => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{r.guest_name} — Room {r.room}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">{r.type} · {r.details?.slice(0, 60)}{r.details?.length > 60 ? '…' : ''}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Enhanced Staff View ─────────────────────────────────── */
function StaffView({ hotelId, hotelName, hotelSlug, staff, onRefresh }: { hotelId: string; hotelName: string; hotelSlug: string; staff: StaffAccount[]; onRefresh: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', pin: '', role: 'staff', vendor_type: '', department: '' });
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [editingPerms, setEditingPerms] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editingDeptValue, setEditingDeptValue] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const ALL_PERMS = ['orders', 'messages', 'shuttle', 'hotel', 'staff_mgmt', 'partners', 'qrcodes'];

  const handleAdd = async () => {
    setPinError('');
    if (!form.name || !form.pin) return;
    if (!/^\d{4,6}$/.test(form.pin)) {
      setPinError('PIN must be 4–6 digits.');
      return;
    }
    // If email is set and sendInvite is on, use auto-generated PIN (don't show raw PIN to admin)
    await createStaffAccountWithDetails({
      hotel_id: hotelId, name: form.name, role: form.role,
      email: form.email, phone: form.phone, pin_code: form.pin,
      permissions: form.role === 'vendor' ? [] : ['orders', 'messages', 'shuttle'],
      vendor_type: form.role === 'vendor' ? form.vendor_type || 'shuttle' : undefined,
      department: form.department || undefined,
    });

    // Send invitation email with setup link
    if (form.email && sendInvite) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attendaapp.com';
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'staff_invitation',
          data: {
            staffEmail: form.email,
            staffName: form.name,
            staffRole: form.role,
            hotelName,
            hotelSlug,
            pin: form.pin,
            setupUrl: `${baseUrl}/staff/setup?email=${encodeURIComponent(form.email)}&hotel=${encodeURIComponent(hotelSlug)}&mode=setup`,
          },
        }),
      }).catch(() => {});
    }

    setForm({ name: '', email: '', phone: '', pin: '', role: 'staff', vendor_type: '', department: '' });
    onRefresh();
  };

  const handlePermToggle = async (staffId: string, perm: string, current: string[]) => {
    const updated = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
    await updateStaffPermissions(staffId, updated);
    onRefresh();
  };

  const handleToggleActive = async (s: StaffAccount) => {
    await updateStaffDetails(s.id!, { active: !s.active });
    onRefresh();
  };

  const permLabels: Record<string, string> = {
    orders: 'Live Orders', messages: 'Guest Messages', shuttle: 'Shuttle Ops',
    hotel: 'Hotel Settings', staff_mgmt: 'Staff Mgmt', partners: 'Partners', qrcodes: 'QR Codes',
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-[26px] font-extrabold text-gray-900 mb-6">Staff Management</h1>
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-[15px] mb-3">Add Staff Member</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="vendor">Vendor (external)</option>
                </select>
              </div>
            </div>
            {form.role === 'vendor' && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Vendor Type</label>
                <select value={form.vendor_type} onChange={e => setForm({ ...form, vendor_type: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-orange-200 text-[13px] outline-none">
                  <option value="shuttle">Shuttle Company</option>
                  <option value="taxi">Taxi / Rideshare</option>
                  <option value="tour">Tour Operator</option>
                  <option value="catering">Catering</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-[10px] text-orange-600 mt-1">Vendors only see their own manifest — no hotel data.</p>
              </div>
            )}
            {/* Position / Department */}
            {form.role !== 'vendor' && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Position / Department</label>
                <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                  <option value="">— No position —</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d.key} value={d.key}>{d.icon} {d.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Used for checklist filtering on the Dashboard.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="staff@hotel.com"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="305-555-0100"
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5 uppercase font-bold">PIN Code *</label>
              <div className="relative">
                <input type={showPin ? 'text' : 'password'} value={form.pin} onChange={e => { setForm({ ...form, pin: e.target.value }); setPinError(''); }} maxLength={6} placeholder="4-6 digits"
                  className={`w-full bg-gray-50 rounded-xl px-3 py-2.5 border text-[13px] outline-none pr-10 ${pinError ? 'border-red-400' : 'border-gray-200'}`} />
                <button onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPin ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {pinError && <p className="text-[11px] text-red-500 mt-1">{pinError}</p>}
            </div>
            <button onClick={handleAdd} className="w-full py-3 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: '#0D9488' }}>ADD STAFF MEMBER</button>
            {form.email && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sendInvite} onChange={e => setSendInvite(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: '#0D9488' }} />
                <span className="text-[11px] text-gray-500">Send invitation email with setup link</span>
              </label>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-bold text-[15px]">Active Staff ({staff.filter(s => s.active).length})</h3></div>
          <div className="divide-y divide-gray-50">
            {staff.filter(s => s.active).length === 0 ? (
              <div className="px-5 py-6 text-center"><p className="text-[13px] text-gray-400">No staff accounts yet.</p></div>
            ) : staff.filter(s => s.active).map(s => (
              <div key={s.id} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{s.name}
                      <span className="text-[10px] text-gray-400 capitalize font-normal"> · {s.role}{s.vendor_type ? ` (${s.vendor_type})` : ''}</span>
                    </p>
                    <p className="text-[11px] text-gray-400">{s.email}{s.email && s.phone ? ' · ' : ''}{s.phone} · PIN: ••••
                      {s.department && (
                        <span> · Position: {DEPARTMENTS.find(d => d.key === s.department)?.icon} {DEPARTMENTS.find(d => d.key === s.department)?.label || s.department}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditingPerms(editingPerms === s.id ? null : s.id!)}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">Permissions</button>
                    <button onClick={() => {
                      if (editingDept === s.id) { setEditingDept(null); return; }
                      setEditingDept(s.id!);
                      setEditingDeptValue(s.department || '');
                    }} className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">Position</button>
                    <button onClick={() => handleToggleActive(s)} className="text-[10px] font-bold px-2 py-1 rounded bg-amber-100 text-amber-700">Deactivate</button>
                    <button onClick={() => { if(confirm('Delete?')) { deleteStaffAccount(s.id!); onRefresh(); } }}
                      className="text-red-400"><Trash2 size={13} /></button>
                  </div>
                </div>
                {editingPerms === s.id && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ALL_PERMS.map(p => {
                      const has = (s.permissions || []).includes(p);
                      return (
                        <button key={p} onClick={() => handlePermToggle(s.id!, p, s.permissions || [])}
                          className={`px-2 py-1 rounded text-[10px] font-bold ${has ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{permLabels[p]}</button>
                      );
                    })}
                  </div>
                )}
                {editingDept === s.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <select value={editingDeptValue} onChange={e => setEditingDeptValue(e.target.value)}
                      className="flex-1 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200 text-[12px] outline-none">
                      <option value="">— No position —</option>
                      {DEPARTMENTS.map(d => (
                        <option key={d.key} value={d.key}>{d.icon} {d.label}</option>
                      ))}
                    </select>
                    <button onClick={async () => {
                      await updateStaffDetails(s.id!, { department: editingDeptValue || undefined });
                      setEditingDept(null);
                      onRefresh();
                    }} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white" style={{backgroundColor: TEAL}}>Save</button>
                    <button onClick={() => setEditingDept(null)} className="text-[11px] text-gray-500 font-semibold px-2">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Inactive staff */}
        {staff.filter(s => !s.active).length > 0 && (
          <details className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <summary className="text-[13px] font-bold text-gray-500 cursor-pointer">Inactive ({staff.filter(s => !s.active).length})</summary>
            <div className="space-y-2 mt-2">
              {staff.filter(s => !s.active).map(s => (
                <div key={s.id} className="flex items-center justify-between text-[12px] py-1">
                  <span className="text-gray-500">{s.name} · {s.role}</span>
                  <button onClick={() => handleToggleActive(s)} className="text-[10px] font-bold text-emerald-600">Reactivate</button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
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
    await updateHotelConfig(form);
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDiscover = async () => {
    if (!form.address || !config.id) return;
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      await updateHotelConfig(form);
      const res = await fetch('/api/places-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                Sunday
              </button>
              <button
                onClick={() => setForm({ ...form, weekStartsOn: 'Monday' })}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold border ${
                  form.weekStartsOn === 'Monday'
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                Monday
              </button>
            </div>
          </div>
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



/* ── Partners View ──────────────────────────────────────── */
function PartnersView({ hotelId }: { hotelId: string }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<Record<string, PartnerMenuItem[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'restaurant', description: '', image_url: '',
    phone: '', address: '', hours: '', distance: '', rating: '0', has_ordering: false, email: '',
    attenda_fee_percent: '15', hotel_revenue_share_percent: '5',
  });
  const [cloverForm, setCloverForm] = useState({
    merchantId: '', accessToken: '', refreshToken: '', enabled: false,
  });
  const [deliveryProviders, setDeliveryProviders] = useState<{ name: string; url: string }[]>([]);
  const [deliveryProviderForm, setDeliveryProviderForm] = useState({ name: '', url: '' });
  const [menuForm, setMenuForm] = useState<Record<string, { name: string; description: string; price: string }>>({});
  const [dpForm, setDpForm] = useState<Record<string, { name: string; url: string }>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  const loadPartners = useCallback(async () => {
    const data = await getPartners(hotelId);
    setPartners(data);
  }, [hotelId]);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  const loadMenu = async (partnerId: string) => {
    const items = await getPartnerMenuItems(partnerId);
    setMenuItems(prev => ({ ...prev, [partnerId]: items }));
  };

  const toggle = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    loadMenu(id);
  };

  const handleAdd = async () => {
    if (!form.name) return;
    await createPartner({
      hotel_id: hotelId,
      name: form.name,
      category: form.category,
      description: form.description,
      image_url: form.image_url,
      phone: form.phone,
      address: form.address,
      hours: form.hours,
      distance: form.distance,
      rating: parseFloat(form.rating) || 0,
      has_ordering: form.has_ordering,
      email: form.email,
      clover_merchant_id: cloverForm.merchantId || undefined,
      clover_access_token: cloverForm.accessToken || undefined,
      clover_refresh_token: cloverForm.refreshToken || undefined,
      clover_enabled: cloverForm.enabled,
      delivery_providers: deliveryProviders,
      attenda_fee_percent: parseFloat(form.attenda_fee_percent) || 15,
      hotel_revenue_share_percent: parseFloat(form.hotel_revenue_share_percent) || 5,
    });
    setForm({ name: '', category: 'restaurant', description: '', image_url: '', phone: '', address: '', hours: '', distance: '', rating: '0', has_ordering: false, email: '', attenda_fee_percent: '15', hotel_revenue_share_percent: '5' });
    setCloverForm({ merchantId: '', accessToken: '', refreshToken: '', enabled: false });
    setDeliveryProviders([]);
    setDeliveryProviderForm({ name: '', url: '' });
    setShowForm(false);
    loadPartners();
  };

  const handleCloverSync = async (p: Partner) => {
    if (!p.clover_merchant_id || !p.clover_access_token) return;
    setSyncing(p.id);
    try {
      const { getCloverMenu } = await import('@/lib/clover');
      const items = await getCloverMenu(p.clover_merchant_id, p.clover_access_token);
      const existing = await getPartnerMenuItems(p.id);
      for (const item of existing) await deletePartnerMenuItem(item.id);
      for (const item of items) {
        await createPartnerMenuItem({
          partner_id: p.id,
          name: item.name,
          description: item.description || '',
          price: item.price / 100,
        });
      }
      alert(`Synced ${items.length} items from Clover`);
      loadMenu(p.id);
    } catch (e) {
      alert('Sync failed: ' + (e as Error).message);
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this partner and all their menu items?')) return;
    await deletePartner(id);
    loadPartners();
  };

  const handleAddMenuItem = async (partnerId: string) => {
    const mf = menuForm[partnerId];
    if (!mf?.name || !mf?.price) return;
    await createPartnerMenuItem({
      partner_id: partnerId,
      name: mf.name,
      description: mf.description || '',
      price: parseFloat(mf.price),
    });
    setMenuForm(prev => ({ ...prev, [partnerId]: { name: '', description: '', price: '' } }));
    loadMenu(partnerId);
  };

  const handleDeleteMenuItem = async (itemId: string, partnerId: string) => {
    await deletePartnerMenuItem(itemId);
    loadMenu(partnerId);
  };

  const catColor: Record<string, string> = {
    restaurant: 'bg-orange-100 text-orange-700',
    attraction: 'bg-blue-100 text-blue-700',
    service: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Partners & Menu</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage nearby partners, restaurants, and their menus.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-semibold"
          style={{ backgroundColor: TEAL }}>
          <Plus size={14} /> Add Partner
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-[15px] mb-4">New Partner</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Name *" value={form.name} onChange={v => setForm({ ...form, name: v })} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none">
                <option value="restaurant">Restaurant</option>
                <option value="attraction">Attraction</option>
                <option value="service">Service</option>
              </select>
            </div>
            <Field label="Distance (e.g. 0.3 mi)" value={form.distance} onChange={v => setForm({ ...form, distance: v })} />
            <div className="col-span-2">
              <Field label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} />
            </div>
            <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
            <Field label="Email (order notifications)" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="orders@restaurant.com" />
            <Field label="Hours" value={form.hours} onChange={v => setForm({ ...form, hours: v })} placeholder="Mon–Sun 8am–10pm" />
            <div className="col-span-2">
              <Field label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Image</label>
              <div className="flex gap-2 items-center">
                <button type="button" onClick={() => document.getElementById('partner-image-upload')?.click()}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600">
                  <Upload size={14} className="inline mr-1.5" />Upload Image
                </button>
                <input id="partner-image-upload" type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => setForm({ ...form, image_url: ev.target?.result as string });
                    reader.readAsDataURL(file);
                  }} />
                {form.image_url && (
                  <>
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                      <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <button type="button" onClick={() => setForm({ ...form, image_url: '' })}
                      className="text-red-400 hover:text-red-600 text-[11px] font-medium">Clear</button>
                  </>
                )}
              </div>
            </div>
            <Field label="Rating (0–5)" value={form.rating} onChange={v => setForm({ ...form, rating: v })} />

            {/* ── Delivery Setup (restaurants only) ── */}
            {form.category === 'restaurant' && (
              <div className="col-span-2 mt-2 space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pt-1">Delivery Setup</p>

                {/* Tier A — Restaurant-managed */}
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <p className="text-[13px] font-bold text-gray-800 mb-0.5">A · Restaurant manages their own delivery</p>
                  <p className="text-[11px] text-gray-500 mb-3">Guests see tap-to-order buttons for their existing apps. Attenda just displays the links — zero extra cost.</p>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={deliveryProviderForm.name}
                      onChange={e => setDeliveryProviderForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                    >
                      <option value="">Choose app…</option>
                      <option value="Uber Eats">Uber Eats</option>
                      <option value="DoorDash">DoorDash</option>
                      <option value="Grubhub">Grubhub</option>
                      <option value="Order Inn">Order Inn</option>
                      <option value="Instacart">Instacart</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      placeholder="Paste their store link…"
                      value={deliveryProviderForm.url}
                      onChange={e => setDeliveryProviderForm(f => ({ ...f, url: e.target.value }))}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none"
                    />
                    <button type="button"
                      onClick={() => {
                        if (!deliveryProviderForm.name || !deliveryProviderForm.url) return;
                        setDeliveryProviders(prev => [...prev, { name: deliveryProviderForm.name, url: deliveryProviderForm.url }]);
                        setDeliveryProviderForm({ name: '', url: '' });
                      }}
                      className="px-3 py-2 rounded-lg text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
                      + Add
                    </button>
                  </div>
                  {deliveryProviders.length > 0 && (
                    <div className="space-y-1">
                      {deliveryProviders.map((p, i) => (
                        <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                          <span className="text-[12px] font-semibold text-gray-800">{p.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 max-w-[150px] truncate">{p.url}</span>
                            <button type="button" onClick={() => setDeliveryProviders(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><XIcon size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tier B — Attenda-powered */}
                <div className={`rounded-xl border-2 p-4 transition-colors ${form.has_ordering ? 'border-[#0D9488] bg-teal-50/40' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start gap-2.5 mb-2">
                    <input type="checkbox" id="has_ordering" checked={form.has_ordering}
                      onChange={e => setForm({ ...form, has_ordering: e.target.checked })}
                      className="w-4 h-4 rounded mt-0.5 shrink-0" />
                    <div>
                      <label htmlFor="has_ordering" className="text-[13px] font-bold text-gray-800 cursor-pointer">B · Attenda-powered delivery</label>
                      <p className="text-[11px] text-gray-500 mt-0.5">Restaurant saves vs. Uber Eats rates. Hotel earns revenue on every order. Exclusively powered by Clover POS.</p>
                    </div>
                  </div>

                  {form.has_ordering && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-teal-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Attenda charges restaurant</label>
                          <div className="relative">
                            <input type="number" min="1" max="50" step="0.5"
                              value={form.attenda_fee_percent}
                              onChange={e => setForm({ ...form, attenda_fee_percent: e.target.value })}
                              className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] border border-gray-200 focus:outline-none pr-7" />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-bold">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hotel earns per order</label>
                          <div className="relative">
                            <input type="number" min="0" max="50" step="0.5"
                              value={form.hotel_revenue_share_percent}
                              onChange={e => setForm({ ...form, hotel_revenue_share_percent: e.target.value })}
                              className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] border border-gray-200 focus:outline-none pr-7" />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-bold">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 border border-teal-100 text-[11px] text-teal-700">
                        On a $100 order: restaurant pays ${((parseFloat(form.attenda_fee_percent) || 15)).toFixed(0)}, hotel earns ${((parseFloat(form.hotel_revenue_share_percent) || 5)).toFixed(0)}, Attenda keeps ${Math.max(0, (parseFloat(form.attenda_fee_percent) || 15) - (parseFloat(form.hotel_revenue_share_percent) || 5)).toFixed(0)}.
                      </div>
                      <div className="space-y-2">
                        <a href={`/api/clover-oauth?partner=new&hotel=${hotelId}`}
                          className="w-full py-2.5 rounded-lg font-bold text-[12px] flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700">
                          🔗 Connect Clover (OAuth)
                        </a>
                        <p className="text-[10px] text-gray-400 text-center">Exclusive Attenda × Clover integration</p>
                        <details className="text-[11px]">
                          <summary className="text-gray-400 cursor-pointer hover:text-gray-600">Enter credentials manually</summary>
                          <div className="space-y-2 mt-2">
                            <Field label="Clover Merchant ID" value={cloverForm.merchantId} onChange={v => setCloverForm({ ...cloverForm, merchantId: v })} placeholder="ABC123DEF456" />
                            <Field label="Clover Access Token" value={cloverForm.accessToken} onChange={v => setCloverForm({ ...cloverForm, accessToken: v })} placeholder="sk_..." />
                            <Field label="Clover Refresh Token" value={cloverForm.refreshToken} onChange={v => setCloverForm({ ...cloverForm, refreshToken: v })} placeholder="rt_..." />
                            <div className="flex items-center gap-2">
                              <input type="checkbox" id="clover_enabled" checked={cloverForm.enabled}
                                onChange={e => setCloverForm({ ...cloverForm, enabled: e.target.checked })} className="w-4 h-4 rounded" />
                              <label htmlFor="clover_enabled" className="text-[12px] font-medium text-gray-700">Enable Clover POS</label>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd}
              className="flex-1 py-3 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: TEAL }}>
              SAVE PARTNER
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-[13px]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {partners.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <Store size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No partners yet. Add your first partner above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partners.map(p => {
            const isEditing = editingPartner?.id === p.id;
            return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catColor[p.category] || 'bg-gray-100 text-gray-600'}`}>
                      {p.category}
                    </span>
                    {p.delivery_providers && p.delivery_providers.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        {p.delivery_providers.length} app{p.delivery_providers.length > 1 ? 's' : ''} linked
                      </span>
                    )}
                    {p.has_ordering && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                        Attenda-powered
                      </span>
                    )}
                    {p.clover_enabled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        Clover ✓
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mt-2">
                      <input value={editingPartner!.name} onChange={e => setEditingPartner({ ...editingPartner!, name: e.target.value })}
                        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none font-bold" placeholder="Name" />
                      <input value={editingPartner!.description} onChange={e => setEditingPartner({ ...editingPartner!, description: e.target.value })}
                        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" placeholder="Description" />
                      <div className="flex gap-2">
                        <input value={editingPartner!.phone} onChange={e => setEditingPartner({ ...editingPartner!, phone: e.target.value })}
                          className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" placeholder="Phone" />
                        <input value={editingPartner!.hours} onChange={e => setEditingPartner({ ...editingPartner!, hours: e.target.value })}
                          className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" placeholder="Hours" />
                      </div>
                      <div className="flex gap-2 items-center">
                        <button type="button" onClick={() => document.getElementById(`partner-edit-upload-${p.id}`)?.click()}
                          className="text-[11px] font-semibold px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600">
                          <Upload size={12} className="inline mr-1" />Upload Image
                        </button>
                        <input id={`partner-edit-upload-${p.id}`} type="file" accept="image/*" className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => setEditingPartner({ ...editingPartner!, image_url: ev.target?.result as string });
                            reader.readAsDataURL(file);
                          }} />
                        {editingPartner!.image_url && (
                          <span className="text-[10px] text-gray-400 truncate max-w-[100px]">✓ image set</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-[15px] text-gray-900">{p.name}</p>
                      {p.description && <p className="text-[12px] text-gray-500 mt-0.5 truncate">{p.description}</p>}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={async () => {
                        if (!editingPartner) return;
                        await updatePartner(p.id, {
                          name: editingPartner.name,
                          description: editingPartner.description,
                          phone: editingPartner.phone,
                          hours: editingPartner.hours,
                          image_url: editingPartner.image_url,
                        });
                        setEditingPartner(null);
                        loadPartners();
                      }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-600 hover:bg-teal-100">
                        <Save size={12} /> Save
                      </button>
                      <button onClick={() => setEditingPartner(null)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingPartner({ ...p })}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-400">
                        <Pencil size={14} />
                      </button>
                      {(p.has_ordering || (p.delivery_providers && p.delivery_providers.length > 0)) && (
                        <button onClick={() => toggle(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                          style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                          Manage {expanded === p.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                      {p.has_ordering && !p.clover_enabled && (
                        <a href={`/api/clover-oauth?partner=${p.id}&hotel=${hotelId}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-600 hover:bg-purple-100">
                          🔗 Connect Clover
                        </a>
                      )}
                      {p.has_ordering && p.clover_enabled && p.clover_merchant_id && p.clover_access_token && (
                        <button onClick={() => handleCloverSync(p)} disabled={syncing === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50">
                          {syncing === p.id ? 'Syncing…' : 'Sync Clover'}
                        </button>
                      )}
                      <button onClick={() => handleDelete(p.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!isEditing && expanded === p.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-5">

                  {/* ── Tier A: Own delivery apps ── */}
                  {p.category === 'restaurant' && (
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">A · Restaurant&apos;s own delivery apps</h4>
                      <div className="flex gap-2 mb-2">
                        <select value={dpForm[p.id]?.name || ''}
                          onChange={e => setDpForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], name: e.target.value } }))}
                          className="bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none">
                          <option value="">App…</option>
                          <option value="Uber Eats">Uber Eats</option>
                          <option value="DoorDash">DoorDash</option>
                          <option value="Grubhub">Grubhub</option>
                          <option value="Order Inn">Order Inn</option>
                          <option value="Instacart">Instacart</option>
                          <option value="Other">Other</option>
                        </select>
                        <input placeholder="Paste store link…" value={dpForm[p.id]?.url || ''}
                          onChange={e => setDpForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], url: e.target.value } }))}
                          className="flex-1 bg-white rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none" />
                        <button onClick={async () => {
                          const name = dpForm[p.id]?.name; const url = dpForm[p.id]?.url;
                          if (!name || !url) return;
                          await updatePartner(p.id, { delivery_providers: [...(p.delivery_providers || []), { name, url }] });
                          setDpForm(prev => ({ ...prev, [p.id]: { name: '', url: '' } }));
                          loadPartners();
                        }} className="px-3 py-2 rounded-lg text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: TEAL }}>
                          + Add
                        </button>
                      </div>
                      {(p.delivery_providers || []).length > 0 ? (
                        <div className="space-y-1">
                          {(p.delivery_providers || []).map((dp, i) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <span className="text-[12px] font-semibold text-gray-800">{dp.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 max-w-[180px] truncate">{dp.url}</span>
                                <button onClick={async () => {
                                  await updatePartner(p.id, { delivery_providers: (p.delivery_providers || []).filter((_, j) => j !== i) });
                                  loadPartners();
                                }} className="text-red-400 hover:text-red-600"><XIcon size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400">No apps linked — guests will only see in-room ordering or contact info.</p>
                      )}
                    </div>
                  )}

                  {/* ── Tier B: Attenda-powered ── */}
                  {p.category === 'restaurant' && (
                    <div className={`rounded-xl border-2 p-4 ${p.has_ordering ? 'border-teal-200 bg-white' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[12px] font-bold text-gray-800">B · Attenda-powered delivery</p>
                          <p className="text-[11px] text-gray-500">Restaurant saves, hotel earns. Powered by Clover.</p>
                        </div>
                        <input type="checkbox" checked={p.has_ordering}
                          onChange={async e => { await updatePartner(p.id, { has_ordering: e.target.checked }); loadPartners(); }}
                          className="w-4 h-4 rounded" />
                      </div>
                      {p.has_ordering && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-teal-100">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Attenda charges</label>
                              <div className="relative">
                                <input type="number" min="1" max="50" step="0.5"
                                  defaultValue={p.attenda_fee_percent ?? 15}
                                  onBlur={async e => { await updatePartner(p.id, { attenda_fee_percent: parseFloat(e.target.value) || 15 }); loadPartners(); }}
                                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none pr-6" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold">%</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Hotel earns</label>
                              <div className="relative">
                                <input type="number" min="0" max="50" step="0.5"
                                  defaultValue={p.hotel_revenue_share_percent ?? 5}
                                  onBlur={async e => { await updatePartner(p.id, { hotel_revenue_share_percent: parseFloat(e.target.value) || 5 }); loadPartners(); }}
                                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[12px] border border-gray-200 focus:outline-none pr-6" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-bold">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Menu items (Attenda-powered only) ── */}
                  {p.has_ordering && (
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Menu Items</h4>
                  <div className="flex gap-2 mb-4">
                    <input
                      placeholder="Item name *"
                      value={menuForm[p.id]?.name || ''}
                      onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], name: e.target.value } }))}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none"
                    />
                    <input
                      placeholder="Description"
                      value={menuForm[p.id]?.description || ''}
                      onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], description: e.target.value } }))}
                      className="flex-1 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none"
                    />
                    <input
                      placeholder="$0.00"
                      type="number"
                      step="0.01"
                      value={menuForm[p.id]?.price || ''}
                      onChange={e => setMenuForm(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))}
                      className="w-20 bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200 focus:outline-none"
                    />
                    <button onClick={() => handleAddMenuItem(p.id)}
                      className="px-3 py-2 rounded-lg text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
                      Add
                    </button>
                  </div>
                  {(menuItems[p.id] || []).length === 0 ? (
                    <p className="text-[12px] text-gray-400">No menu items yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(menuItems[p.id] || []).map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                          <div>
                            <span className="text-[13px] font-semibold text-gray-900">{item.name}</span>
                            {item.description && <span className="text-[11px] text-gray-400 ml-2">{item.description}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[13px] font-bold text-gray-700">${Number(item.price).toFixed(2)}</span>
                            <button onClick={() => handleDeleteMenuItem(item.id, p.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── QR Codes View ──────────────────────────────────────── */
function QrCodesView({ hotelId, hotelSlug }: { hotelId: string; hotelSlug: string }) {
  const [codes, setCodes] = useState<QrCodeRow[]>([]);
  const [form, setForm] = useState({ label: '', location_type: 'room' });
  const [copied, setCopied] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    const data = await getQrCodes(hotelId);
    setCodes(data);
  }, [hotelId]);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attenda.vercel.app';
  const getUrl = (label: string) => `${baseUrl}/?hotel=${hotelSlug}&room=${encodeURIComponent(label)}`;

  const handleAdd = async () => {
    if (!form.label) return;
    const url = getUrl(form.label);
    await createQrCode(hotelId, form.label, form.location_type, url);
    setForm({ label: '', location_type: 'room' });
    loadCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this QR code?')) return;
    await deleteQrCode(id);
    loadCodes();
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">QR Codes</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Generate QR codes for each room or location. Guests scan to open the app pre-filled with their info.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h3 className="font-bold text-[14px] mb-2">Batch Generate from Room Database</h3>
        <p className="text-[12px] text-gray-400 mb-3">
          Uses your actual room list from Room Management. Only rooms without QR codes are generated.
        </p>
        <div className="flex gap-3 mb-4">
          <div className="flex items-end">
            <button
              onClick={async () => {
                const rooms = await getAllHotelRooms(hotelId);
                if (!rooms || rooms.length === 0) return alert('No rooms in database. Upload room numbers in Room Management first.');
                let count = 0;
                let skipped = 0;
                for (const room of rooms) {
                  const label = room.room_number;
                  const exists = codes.some(c => c.label === label);
                  if (!exists) {
                    await createQrCode(hotelId, label, 'room', getUrl(label));
                    count++;
                  } else {
                    skipped++;
                  }
                }
                alert(`✅ Generated ${count} QR codes from ${rooms.length} rooms (${skipped} already existed, skipped)`);
                loadCodes();
              }}
              className="px-5 py-3 rounded-xl text-white font-semibold text-[13px] whitespace-nowrap"
              style={{ backgroundColor: TEAL }}
            >
              Generate from Room DB ({codes.filter(c => c.location_type === 'room').length} existing)
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <h3 className="font-bold text-[14px] mb-4">Generate Single QR Code</h3>
          <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Label (room # or location name)" value={form.label} onChange={v => setForm({ ...form, label: v })} placeholder="205 or Pool Deck" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-400 mb-1 block uppercase tracking-wider">Type</label>
            <select value={form.location_type} onChange={e => setForm({ ...form, location_type: e.target.value })}
              className="bg-gray-50 rounded-xl px-3.5 py-3 text-[14px] border border-gray-100 focus:outline-none">
              {['room', 'lobby', 'pool', 'elevator', 'restaurant', 'gym', 'spa'].map(lt => (
                <option key={lt} value={lt} className="capitalize">{lt.charAt(0).toUpperCase() + lt.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleAdd}
              className="px-5 py-3 rounded-xl text-white font-semibold text-[13px]" style={{ backgroundColor: TEAL }}>
              Generate
            </button>
          </div>
        </div>
        </div>
      </div>

      {codes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <QrCodeIcon size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[13px] text-gray-500">No QR codes yet. Generate your first above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {codes.map(code => {
            const url = code.url || getUrl(code.label);
            const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
            return (
              <div key={code.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex gap-4">
                  <Image src={qrImgUrl} alt={`QR for ${code.label}`} width={80} height={80} className="rounded-lg border border-gray-100 shrink-0" unoptimized />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-bold text-[15px] text-gray-900">{code.label}</p>
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize mt-0.5">
                          {code.location_type}
                        </span>
                      </div>
                      <button onClick={() => handleDelete(code.id)} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 break-all mt-2 line-clamp-2">{url}</p>
                    <button
                      onClick={() => handleCopy(url, code.id)}
                      className="mt-2 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}
                    >
                      {copied === code.id ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy URL</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Properties View ──────────────────────────────────────── */
function PropertiesView({ onSwitchHotel }: { onSwitchHotel: (slug: string) => void }) {
  const [hotels, setHotels] = useState<{ id: string; slug: string; name: string; brand: string }[]>([]);
  const [form, setForm] = useState({ slug: '', name: '', adminEmail: '', propertyType: 'Hotel' });
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getAllHotels().then(setHotels);
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://attenda.vercel.app';
  const getGuestUrl = (slug: string) => `${baseUrl}/?hotel=${slug}`;
  const getAdminUrl = (slug: string) => `${baseUrl}/staff?hotel=${slug}`;

  const handleCreate = async () => {
    if (!form.slug || !form.name) return;
    setCreating(true);
    try {
      const hotel = await createHotel({ slug: form.slug, name: form.name, adminEmail: form.adminEmail || undefined, propertyType: form.propertyType });
      if (form.adminEmail && hotel) {
        const origin = window.location.origin;
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'tenant_onboarding',
            data: {
              hotelName: form.name,
              slug: form.slug,
              adminEmail: form.adminEmail,
              guestUrl: `${origin}/?hotel=${form.slug}`,
              adminUrl: `${origin}/staff?hotel=${form.slug}`,
            },
          }),
        });
      }
      setForm({ slug: '', name: '', adminEmail: '', propertyType: 'Hotel' });
      getAllHotels().then(setHotels);
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : '') || (typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : '');
      alert(msg.includes('unique') || msg.includes('duplicate') ? 'Slug already in use. Try a different one.' : msg || 'Failed to create hotel. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">All Properties</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">{hotels.length} propert{hotels.length !== 1 ? 'ies' : 'y'} on this platform.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h3 className="font-bold text-[14px] mb-4">Create New Property</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Property Name *" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Miami Airport Hotel" />
          <Field label="URL Slug *" value={form.slug} onChange={v => setForm({ ...form, slug: v.toLowerCase().replace(/\s+/g, '-') })} placeholder="miami-airport" />
          <div className="col-span-2">
            <Field label="Admin Email (optional — for onboarding email)" value={form.adminEmail} onChange={v => setForm({ ...form, adminEmail: v })} placeholder="manager@property.com" />
          </div>
          <div className="col-start-1">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Property Type</label>
            <select
              value={form.propertyType}
              onChange={e => setForm({ ...form, propertyType: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
              <option value="Hotel">Hotel</option>
              <option value="Short-Term Rental">Short-Term Rental</option>
              <option value="Motel">Motel</option>
              <option value="Vacation Rental">Vacation Rental</option>
              <option value="Boutique Stay">Boutique Stay</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        {form.slug && (
          <p className="text-[11px] text-gray-400 mb-3 font-mono">Guest URL preview: {getGuestUrl(form.slug)}</p>
        )}
        <button onClick={handleCreate} disabled={creating}
          className="px-6 py-3 rounded-xl text-white font-semibold text-[13px] disabled:opacity-60" style={{ backgroundColor: TEAL }}>
          {creating ? 'Creating...' : 'CREATE PROPERTY'}
        </button>
      </div>

      <div className="space-y-4">
        {hotels.map(hotel => {
          const guestUrl = getGuestUrl(hotel.slug);
          const adminUrl = getAdminUrl(hotel.slug);
          return (
            <div key={hotel.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-extrabold text-[16px] text-gray-900">{hotel.name}</p>
                    <p className="text-[12px] text-gray-400 font-mono mt-0.5">@{hotel.slug}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shrink-0 mt-1"
                    style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                    {hotel.brand || 'Hotel'}
                  </span>
                </div>
                <button onClick={() => onSwitchHotel(hotel.slug)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                  Manage
                </button>
              </div>

              <div className="space-y-2">
                {([
                  { label: 'Guest App URL', url: guestUrl, id: hotel.id + '-guest', note: 'Share with guests or embed in QR code' },
                  { label: 'Admin / Staff URL', url: adminUrl, id: hotel.id + '-admin', note: 'Send to hotel admin • Admin PIN: 2025' },
                ] as const).map(({ label, url, id, note }) => (
                  <div key={id} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                      <p className="text-[12px] text-gray-700 font-mono truncate mt-0.5">{url}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>
                    </div>
                    <button onClick={() => handleCopy(url, id)}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                      {copied === id ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
const KB_CATEGORIES = ['General', 'WiFi & Tech', 'Amenities', 'Transport', 'Food & Dining', 'Check-in / Check-out', 'Safety', 'Local Area', 'Incidents'];

function KnowledgeBaseView({ hotelId }: { hotelId: string }) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ category: 'General', question: '', answer: '', keywords: '', source_url: '' });
  const [saving, setSaving] = useState(false);

  // URL import state
  const [importUrl, setImportUrl] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);

  // PDF upload state
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setEntries(await getAllKnowledgeBase(hotelId));
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ category: 'General', question: '', answer: '', keywords: '', source_url: '' }); setEditingId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    const keywords = form.keywords.split(',').map(k => k.trim()).filter(Boolean);
    const sourceUrl = form.source_url.trim() || undefined;
    if (editingId) {
      await updateKnowledgeEntry(editingId, { category: form.category, question: form.question.trim(), answer: form.answer.trim(), keywords, source_url: sourceUrl });
    } else {
      await createKnowledgeEntry({ hotel_id: hotelId, category: form.category, question: form.question.trim(), answer: form.answer.trim(), keywords, source_url: sourceUrl });
    }
    await load();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (e: KnowledgeEntry) => {
    setForm({ category: e.category, question: e.question, answer: e.answer, keywords: (e.keywords || []).join(', '), source_url: e.source_url || '' });
    setEditingId(e.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await deleteKnowledgeEntry(id);
    await load();
  };

  const handleToggle = async (e: KnowledgeEntry) => {
    await updateKnowledgeEntry(e.id, { active: !e.active });
    await load();
  };

  // ── URL Import ──────────────────────────────────────────
  const handleImportUrl = async () => {
    const url = importUrl.trim();
    if (!url) return;
    if (!/^https?:\/\/.+/i.test(url)) { alert('Please enter a valid URL (starting with http:// or https://)'); return; }
    setImportingUrl(true);
    try {
      const res = await fetch(url);
      const html = await res.text();
      // Extract <title> for the question
      const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : url;
      // Try to extract body text for answer
      let bodyText = '';
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        bodyText = bodyMatch[1]
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 3000);
      }
      const answer = bodyText || 'Source URL — content could not be extracted.';
      setForm({
        category: 'General',
        question: title,
        answer,
        keywords: '',
        source_url: url,
      });
      setEditingId(null);
      setShowForm(true);
      setImportUrl('');
    } catch {
      alert('Failed to fetch URL. Check that the URL is accessible and try again.');
    }
    setImportingUrl(false);
  };

  // ── PDF Import ──────────────────────────────────────────
  const handlePdfFile = async (file: File) => {
    if (file.type !== 'application/pdf') { alert('Please upload a .pdf file.'); return; }
    setUploadFileName(file.name);
    setUploadingPdf(true);
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;
      const data = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fullText += content.items.map((item: any) => (item as any).str).join(' ') + '\n';
      }
      const trimmed = fullText.trim().substring(0, 3000);
      const topic = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      setForm({
        category: 'General',
        question: `From document: ${topic}`,
        answer: trimmed || '(No extractable text found in PDF)',
        keywords: '',
        source_url: '',
      });
      setEditingId(null);
      setShowForm(true);
    } catch {
      alert('Failed to parse PDF. The file may be corrupted or protected.');
    }
    setUploadingPdf(false);
  };

  const usedCategories = ['All', ...Array.from(new Set(entries.map(e => e.category)))];
  const visible = entries.filter(e => {
    const catOk = filterCat === 'All' || e.category === filterCat;
    const searchOk = !search || e.question.toLowerCase().includes(search.toLowerCase()) || e.answer.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  const grouped: Record<string, KnowledgeEntry[]> = {};
  visible.forEach(e => { if (!grouped[e.category]) grouped[e.category] = []; grouped[e.category].push(e); });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold text-gray-900">Knowledge Base</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage Q&A that the chatbot uses to answer guests automatically</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold shadow-sm"
          style={{ backgroundColor: TEAL }}>
          <Plus size={15} /> Add Entry
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[15px]">{editingId ? 'Edit Entry' : 'New Knowledge Entry'}</h3>
            <button onClick={resetForm}><XIcon size={18} className="text-gray-400" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none">
                {KB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Question / Topic</label>
              <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="e.g. What time is breakfast served?"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Answer</label>
              <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                placeholder="e.g. Complimentary breakfast is served 6:30 AM – 9:30 AM daily in the lobby."
                rows={3}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none resize-none" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Keywords (comma-separated, optional)</label>
              <input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                placeholder="e.g. breakfast, food, morning, eat"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none" />
              <p className="text-[11px] text-gray-400 mt-1">Helps the chatbot match guest messages more accurately</p>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Source URL (optional)</label>
              <input value={form.source_url} onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
                placeholder="https://example.com/page-with-info"
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[14px] outline-none" />
              <p className="text-[11px] text-gray-400 mt-1">Where this information was sourced from</p>
            </div>
          </div>

          {/* Quick Import Tools */}
          <div className="flex items-center gap-3 pt-1 pb-2">
            {/* Import from URL */}
            <div className="flex items-center gap-2 flex-1">
              <input value={importUrl} onChange={e => setImportUrl(e.target.value)}
                placeholder="https://…"
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 text-[13px] outline-none" />
              <button onClick={handleImportUrl} disabled={importingUrl || !importUrl.trim()}
                className="shrink-0 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-[12px] disabled:opacity-40 hover:bg-indigo-100 transition-colors">
                {importingUrl ? 'Fetching…' : 'Import URL'}
              </button>
            </div>
            {/* Upload PDF */}
            <label className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 font-bold text-[12px] cursor-pointer hover:bg-amber-100 transition-colors">
              <Upload size={14} />
              {uploadingPdf ? 'Parsing…' : uploadFileName ? uploadFileName.replace(/^.{20}.*$/, m => m.substring(0,20)+'…') : 'Upload PDF'}
              <input type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); e.target.value = ''; }} />
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving || !form.question.trim() || !form.answer.trim()}
              className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add to Knowledge Base'}
            </button>
            <button onClick={resetForm} className="px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-[14px]">Cancel</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Entries', count: entries.length, color: 'text-gray-800' },
          { label: 'Active', count: entries.filter(e => e.active).length, color: 'text-emerald-600' },
          { label: 'Categories', count: new Set(entries.map(e => e.category)).size, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase font-bold">{s.label}</p>
            <p className={`text-[26px] font-extrabold ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search questions & answers…"
          className="flex-1 min-w-[200px] bg-white rounded-xl px-3.5 py-2 border border-gray-200 text-[13px] outline-none" />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {usedCategories.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${filterCat === c ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
              style={filterCat === c ? { backgroundColor: TEAL } : {}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: TEAL }} /></div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-gray-500">No entries yet</p>
          <p className="text-[12px] text-gray-400 mt-1">Add Q&A pairs to help the chatbot answer guests automatically</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
              <div className="space-y-2">
                {items.map(entry => (
                  <div key={entry.id} className={`bg-white rounded-xl border p-4 shadow-sm transition-opacity ${entry.active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-gray-900 mb-1">{entry.question}</p>
                        <p className="text-[13px] text-gray-600 leading-relaxed">{entry.answer}</p>
                        {entry.keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.keywords.map((k, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-500 font-medium">{k}</span>
                            ))}
                          </div>
                        )}
                        {entry.source_url && (
                          <a href={entry.source_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-[12px] text-blue-600 hover:text-blue-800 hover:underline font-medium">
                            <ExternalLink size={12} />
                            {entry.source_url}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleToggle(entry)} title={entry.active ? 'Deactivate' : 'Activate'}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${entry.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                          {entry.active ? <Check size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button onClick={() => handleEdit(entry)}
                          className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(entry.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Guests View ──────────────────────────────────────── */
interface GuestSessionData {
  name: string;
  room: string;
  checkout: string;
  checkedIn: string;
  validationStatus?: 'pending' | 'confirmed';
  validatedAt?: string;
  lastSeen?: string;
}

function GuestsView({ hotelId }: { hotelId: string }) {
  const [guests, setGuests] = useState<GuestSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  const loadGuests = useCallback(async () => {
    const guestList: GuestSessionData[] = [];

    // Fetch from database (guests table)
    try {
      const dbGuests = await getGuestValidations(hotelId);
      dbGuests.forEach(g => {
        guestList.push({
          name: g.name,
          room: g.room,
          checkout: '',
          checkedIn: g.validatedAt,
          validationStatus: 'confirmed',
          validatedAt: g.validatedAt,
          lastSeen: g.validatedAt,
        });
      });
    } catch (err) {
      console.error('Error loading guest validations from DB:', err);
    }

    // Also check localStorage for current session
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        const existing = guestList.findIndex(g => g.name === session.name && g.room === session.room);
        if (existing >= 0) {
          // Merge — localStorage session may have a more recent validation status
          if (session.validationStatus === 'confirmed') {
            guestList[existing].validationStatus = 'confirmed';
            guestList[existing].validatedAt = session.validatedAt || guestList[existing].validatedAt;
          }
        } else {
          guestList.push({
            name: session.name,
            room: session.room,
            checkout: session.checkout || '',
            checkedIn: session.checkedIn || '',
            validationStatus: session.validationStatus || 'pending',
            validatedAt: session.validatedAt,
            lastSeen: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error parsing guest session:', err);
      }
    }

    // Also get guests from recent requests
    try {
      const { data } = await supabase
        .from('requests')
        .select('guest_name, room')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        data.forEach((r: { guest_name: string; room: string }) => {
          const existing = guestList.findIndex(g => g.name === r.guest_name && g.room === r.room);
          if (existing < 0) {
            guestList.push({
              name: r.guest_name,
              room: r.room,
              checkout: '',
              checkedIn: '',
              validationStatus: 'pending',
              lastSeen: new Date().toISOString(),
            });
          }
        });
      }
    } catch (err) {
      console.error('Error loading guests from requests:', err);
    }

    setGuests(guestList);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => {
    loadGuests();
    // Subscribe to localStorage changes for real-time updates
    const handleStorage = () => loadGuests();
    window.addEventListener('storage', handleStorage);
    // Poll for updates every 5 seconds
    const interval = setInterval(loadGuests, 5000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [loadGuests]);

  const confirmGuest = async (guest: GuestSessionData) => {
    // Write to database so it persists across devices
    if (hotelId) {
      try {
        await upsertGuestValidation(hotelId, guest.name, guest.room, new Date().toISOString());
      } catch (err) {
        console.error('Error writing guest validation to DB:', err);
      }
    }
    // Update localStorage if it's the current session
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.name === guest.name && session.room === guest.room) {
          session.validationStatus = 'confirmed';
          session.validatedAt = new Date().toISOString();
          localStorage.setItem('guestSession', JSON.stringify(session));
          // Broadcast to other tabs
          window.dispatchEvent(new StorageEvent('storage'));
        }
      } catch (err) {
        console.error('Error confirming guest:', err);
      }
    }
    loadGuests();
  };

  const filteredGuests = guests.filter(g => {
    if (filter === 'pending') return g.validationStatus !== 'confirmed';
    if (filter === 'confirmed') return g.validationStatus === 'confirmed';
    return true;
  });

  const confirmedCount = guests.filter(g => g.validationStatus === 'confirmed').length;
  const pendingCount = guests.length - confirmedCount;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold text-gray-900">Guest Check-ins</h1>
        <button onClick={loadGuests} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-gray-400 uppercase font-bold">Total Guests</p>
          <p className="text-[28px] font-extrabold text-gray-900">{guests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-amber-500 uppercase font-bold">Pending</p>
          <p className="text-[28px] font-extrabold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-[11px] text-emerald-500 uppercase font-bold">Confirmed</p>
          <p className="text-[28px] font-extrabold text-emerald-600">{confirmedCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'confirmed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              filter === f
                ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All Guests' : f === 'pending' ? 'Pending' : 'Confirmed'}
          </button>
        ))}
      </div>

      {/* Guest List */}
      <div className="space-y-3">
        {filteredGuests.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <Users size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-500">No guests found.</p>
          </div>
        ) : (
          filteredGuests.map((guest, i) => (
            <div
              key={`${guest.name}-${guest.room}-${i}`}
              className={`bg-white rounded-xl border p-5 shadow-sm transition-all ${
                guest.validationStatus === 'confirmed'
                  ? 'border-gray-200'
                  : 'border-l-4 border-l-amber-400 border-r border-t border-b border-amber-100 animate-pulse'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      guest.validationStatus === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                      guest.validationStatus === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {guest.validationStatus === 'confirmed' ? 'Validated' : 'Pending Validation'}
                    </span>
                  </div>
                  <p className="text-[16px] font-bold text-gray-900">{guest.name}</p>
                  <p className="text-[13px] text-gray-500">Room {guest.room}</p>
                  {guest.checkout && (
                    <p className="text-[12px] text-gray-400 mt-1">
                      Checkout: {new Date(guest.checkout).toLocaleDateString()}
                    </p>
                  )}
                  {guest.validatedAt && (
                    <p className="text-[11px] text-emerald-600 mt-1">
                      Confirmed at {new Date(guest.validatedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {guest.validationStatus !== 'confirmed' ? (
                    <button
                      onClick={() => confirmGuest(guest)}
                      className="px-4 py-2 rounded-lg text-white text-[12px] font-bold bg-emerald-500 hover:bg-emerald-600 transition-colors"
                    >
                      Confirm Guest
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[12px] font-bold">
                      ✓ Confirmed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Note */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-[13px] text-amber-800">
          <strong>Note:</strong> Since PMS integration is not yet active, guests show as &quot;Pending&quot; until manually confirmed by staff.
          Guests can still use the app while pending, but they will need to validate before placing orders or booking transport.
        </p>
      </div>
    </div>
  );
}

/* ── Rooms View (Bulk upload + management) ───────────────── */
function RoomsView({ hotelId, hotelName }: { hotelId: string; hotelName: string }) {
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsedRooms, setParsedRooms] = useState<{ room_number: string; room_type: string; floor: number }[]>([]);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newRoomNum, setNewRoomNum] = useState('');
  const [newRoomType, setNewRoomType] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editTypeVal, setEditTypeVal] = useState('');
  const dragRef = useRef<HTMLDivElement>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rooms.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rooms.map(r => r.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected rooms?`)) return;
    setSaving(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await deleteRoom(id);
      }
      setMessage({ type: 'success', text: `Deleted ${selectedIds.size} rooms.` });
      setSelectedIds(new Set());
      await loadRooms();
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'Failed'}` });
    }
    setSaving(false);
  };

  const handleBatchSetType = async () => {
    if (selectedIds.size === 0) return;
    const newType = prompt('Set room type for all selected rooms:', 'Standard');
    if (!newType) return;
    setSaving(true);
    try {
      await updateRoomTypeBatch(selectedIds, newType);
      setMessage({ type: 'success', text: `Updated ${selectedIds.size} rooms to "${newType}".` });
      setSelectedIds(new Set());
      await loadRooms();
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'Failed'}` });
    }
    setSaving(false);
  };

  const handleSaveEditType = async (roomId: string) => {
    setSaving(true);
    try {
      await updateRoomType(roomId, editTypeVal);
      setEditingRoom(null);
      setEditTypeVal('');
      await loadRooms();
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'Failed'}` });
    }
    setSaving(false);
  };

  const loadRooms = useCallback(async () => {
    setLoading(true);
    const data = await getAllHotelRooms(hotelId);
    setRooms(data);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const results: { room_number: string; room_type: string; floor: number }[] = [];
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    const roomIdx = headers.findIndex(h => /room|number|unit|apt/i.test(h));
    const typeIdx = headers.findIndex(h => /type|category|class|kind/i.test(h));
    const floorIdx = headers.findIndex(h => /floor|level/i.test(h));

    if (roomIdx < 0) {
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols[0]) results.push({ room_number: cols[0], room_type: cols[1] || '', floor: parseInt(cols[2]) || 0 });
      }
    } else {
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols[roomIdx]) results.push({
          room_number: cols[roomIdx],
          room_type: typeIdx >= 0 ? cols[typeIdx] || '' : '',
          floor: floorIdx >= 0 ? parseInt(cols[floorIdx]) || 0 : 0,
        });
      }
    }
    return results;
  };

  const parseExcel = async (file: File): Promise<{ room_number: string; room_type: string; floor: number }[]> => {
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });

    const results: { room_number: string; room_type: string; floor: number }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      // Find header row(s) that contain "ROOM" or similar
      const hasHeader = row.some(c => /room|number|unit|apt/i.test(String(c ?? '').trim()));
      if (hasHeader) { continue; }

      // Skip rows that look like labels (MONTH, DETAIL, NOTE, etc.)
      const textCells = row.filter(c => String(c ?? '').trim().length > 0);
      if (textCells.length === 0) continue;
      const allNonNumeric = textCells.every(c => isNaN(Number(String(c).trim())));
      if (allNonNumeric) continue;

      // Scan every cell for 3-4 digit room numbers
      for (const cell of row) {
        const val = String(cell ?? '').trim();
        if (!val || val.length < 2) continue;
        // Match room numbers like 102, 201, 230, 105A etc. but not things like 2025 (pins)
        const num = Number(val);
        if (!isNaN(num) && num >= 50 && num <= 9999) {
          const floor = num >= 100 ? Math.floor(num / 100) : 0;
          // Deduplicate within this parse session
          if (!results.some(r => r.room_number === String(num))) {
            results.push({ room_number: String(num), room_type: '', floor });
          }
        }
      }
    }

    return results.sort((a, b) => parseInt(a.room_number) - parseInt(b.room_number));
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setMessage(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'csv') {
        const text = await file.text();
        const parsed = parseCSV(text);
        if (parsed.length === 0) { setMessage({ type: 'error', text: 'Could not find room numbers in this file.' }); return; }
        setParsedRooms(parsed);
        setMessage({ type: 'success', text: `Parsed ${parsed.length} rooms from CSV. Review below, then click "Replace All Rooms".` });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const parsed = await parseExcel(file);
        if (parsed.length === 0) { setMessage({ type: 'error', text: 'Could not find room numbers in this spreadsheet.' }); return; }
        setParsedRooms(parsed);
        setMessage({ type: 'success', text: `Parsed ${parsed.length} rooms from Excel. Review below, then click "Replace All Rooms".` });
      } else if (ext === 'pdf') {
        try {
          const pdfjs = await import('pdfjs-dist');
          pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;
          const data = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data }).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fullText += content.items.map((item: any) => (item as any).str).join(' ') + '\\n';
          }
          const roomRegex = /\b(\d{3,4}[A-Z]?)\b/g;
          const matches = fullText.match(roomRegex);
          if (matches && matches.length > 0) {
            const unique = Array.from(new Set(matches)).map(r => ({ room_number: r, room_type: '', floor: parseInt(r) > 100 ? Math.floor(parseInt(r) / 100) : 0 }));
            setParsedRooms(unique);
            setMessage({ type: 'success', text: `Extracted ${unique.length} rooms from PDF. Review below, then click "Replace All Rooms".` });
          } else {
            setMessage({ type: 'error', text: 'Could not find room numbers in this PDF. Try a CSV or Excel file instead.' });
          }
        } catch {
          setMessage({ type: 'error', text: 'Failed to parse PDF. Try CSV or Excel instead.' });
        }
      } else {
        setMessage({ type: 'error', text: 'Unsupported file. Upload .csv, .xlsx, .xls, or .pdf' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: `Error parsing file: ${e instanceof Error ? e.message : 'Unknown error'}` });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleReplace = async () => {
    if (parsedRooms.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      await bulkInsertRooms(hotelId, parsedRooms);
      setMessage({ type: 'success', text: `Replaced with ${parsedRooms.length} rooms. Saved to database.` });
      setParsedRooms([]);
      setFileName('');
      setManualMode(false);
      await loadRooms();
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'Failed to save'}` });
    }
    setSaving(false);
  };

  const handleAddManual = async () => {
    if (!newRoomNum.trim()) return;
    setSaving(true);
    try {
      await createRoom(hotelId, { room_number: newRoomNum.trim(), room_type: newRoomType, floor: parseInt(newRoomNum.trim()) > 100 ? Math.floor(parseInt(newRoomNum.trim()) / 100) : 0 });
      setNewRoomNum('');
      setNewRoomType('');
      setMessage({ type: 'success', text: `Room ${newRoomNum.trim()} added.` });
      await loadRooms();
    } catch (e) {
      setMessage({ type: 'error', text: `Error: ${e instanceof Error ? e.message : 'Failed to add room'}` });
    }
    setSaving(false);
  };

  const handleDeleteRoom = async (id: string) => {
    await deleteRoom(id);
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  if (loading) return <div className="p-8"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mt-12" /></div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold text-gray-900">Room Management</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{hotelName} &middot; {rooms.length} rooms on file</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setManualMode(!manualMode)}
            className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
          >
            <Plus size={14} /> {manualMode ? 'Bulk Upload' : 'Add Manually'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-[13px] font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {manualMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
          <h3 className="text-[14px] font-bold text-gray-800 mb-3">Add Room Manually</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text" value={newRoomNum} onChange={e => setNewRoomNum(e.target.value)}
              placeholder="Room number (e.g. 205)"
              className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200 text-[13px] outline-none"
              onKeyDown={e => e.key === 'Enter' && handleAddManual()}
            />
            <input
              type="text" value={newRoomType} onChange={e => setNewRoomType(e.target.value)}
              placeholder="Type (optional)"
              className="w-32 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200 text-[13px] outline-none"
            />
          </div>
          <button
            onClick={handleAddManual}
            disabled={saving || !newRoomNum.trim()}
            className="px-4 py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50"
            style={{ backgroundColor: '#0D9488' }}
          >
            {saving ? 'Adding...' : 'Add Room'}
          </button>
        </div>
      )}

      {!manualMode && (
        <>
          <div
            ref={dragRef}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-teal-400 transition-colors cursor-pointer mb-4"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv,.xlsx,.xls,.pdf';
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              input.onchange = (e: any) => { if (e.target?.files?.[0]) handleFile(e.target.files[0]); };
              input.click();
            }}
          >
            <Upload size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[14px] font-semibold text-gray-600 mb-1">Upload room list</p>
            <p className="text-[11px] text-gray-400">
              {fileName ? `Selected: ${fileName}` : 'CSV, Excel (.xlsx), or PDF &middot; Click or drag'}
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><FileSpreadsheet size={14} /> CSV</span>
              <span className="flex items-center gap-1"><FileSpreadsheet size={14} /> Excel</span>
              <span className="flex items-center gap-1"><FileText size={14} /> PDF</span>
            </div>
          </div>

          {parsedRooms.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-gray-800">Preview ({parsedRooms.length} rooms)</h3>
                <button
                  onClick={handleReplace}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-50"
                  style={{ backgroundColor: '#0D9488' }}
                >
                  {saving ? 'Saving...' : 'Replace All Rooms'}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Room #</th>
                      <th className="text-left px-4 py-2 font-semibold">Type</th>
                      <th className="text-left px-4 py-2 font-semibold">Floor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsedRooms.slice(0, 200).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-800">{r.room_number}</td>
                        <td className="px-4 py-2 text-gray-500">{r.room_type || '&mdash;'}</td>
                        <td className="px-4 py-2 text-gray-500">{r.floor || '&mdash;'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-gray-800">Existing Rooms ({rooms.length})</h3>
          <div className="flex items-center gap-2">
            {(selectedIds.size > 0) && (
              <>
                <span className="text-[11px] text-gray-500">{selectedIds.size} selected</span>
                <button onClick={handleBatchSetType} disabled={saving}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: `${TEAL}15`, color: TEAL }}>
                  Set Type
                </button>
                <button onClick={handleBatchDelete} disabled={saving}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-red-500 hover:bg-red-50">
                  Delete Selected
                </button>
              </>
            )}
            <button onClick={loadRooms} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-teal-600">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>
        {rooms.length === 0 ? (
          <div className="p-8 text-center">
            <DoorOpen size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-500 mb-1">No rooms uploaded yet.</p>
            <p className="text-[12px] text-gray-400">Upload a CSV or Excel file with your room list, or add rooms manually.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase sticky top-0">
                <tr>
                  <th className="w-8 px-2 py-2">
                    <input type="checkbox" checked={rooms.length > 0 && selectedIds.size === rooms.length}
                      onChange={toggleSelectAll} className="accent-teal-500 cursor-pointer" />
                  </th>
                  <th className="text-left px-4 py-2 font-semibold">Room #</th>
                  <th className="text-left px-4 py-2 font-semibold">Type</th>
                  <th className="text-left px-4 py-2 font-semibold">Floor</th>
                  <th className="text-right px-4 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rooms.map(room => (
                  <tr key={room.id} className={`hover:bg-gray-50 ${selectedIds.has(room.id) ? 'bg-teal-50/30' : ''}`}>
                    <td className="w-8 px-2 py-2">
                      <input type="checkbox" checked={selectedIds.has(room.id)}
                        onChange={() => toggleSelect(room.id)} className="accent-teal-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-2 font-semibold text-gray-800">{room.room_number}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {editingRoom === room.id ? (
                        <div className="flex items-center gap-1">
                          <input type="text" value={editTypeVal}
                            onChange={e => setEditTypeVal(e.target.value)}
                            className="w-24 bg-gray-50 rounded px-2 py-1 text-[12px] border border-gray-200 outline-none"
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEditType(room.id); if (e.key === 'Escape') setEditingRoom(null); }}
                            autoFocus />
                          <button onClick={() => handleSaveEditType(room.id)} className="text-teal-600 hover:text-teal-800"><Check size={13} /></button>
                          <button onClick={() => setEditingRoom(null)} className="text-gray-400 hover:text-gray-600"><XIcon size={13} /></button>
                        </div>
                      ) : (
                        <span>{room.room_type || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{room.floor || '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setEditingRoom(room.id); setEditTypeVal(room.room_type || ''); }}
                          className="text-gray-400 hover:text-teal-600 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDeleteRoom(room.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Front Desk View ──────────────────────────────────── */
function FrontDeskView({ hotelId, isAdmin, staff, hotelName, config }: {
  hotelId: string; isAdmin: boolean;
  staff: { id?: string; name: string; email?: string; role: string; department?: string }[];
  hotelName: string;
  config: HotelConfig;
}) {
  const [enabledTools, setEnabledTools] = useState<{ tool: OpsTool; enabled: boolean }[]>([]);
  const [tab, setTab] = useState<string>('recap');
  const today = new Date().toISOString().split('T')[0];
  const [recap, setRecap] = useState<{ requestsToday: number; completedToday: number; pendingNow: number; messagesToday: number; shuttleBookingsToday: number; avgResponseMin: number; staffOnDuty: number; checklistsCompleted: number; checklistsTotal: number } | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [instances, setInstances] = useState<ChecklistInstance[]>([]);
  const [showNewChecklist, setShowNewChecklist] = useState(false);
  const [newCL, setNewCL] = useState({ name: '', items: '' });
  const [addInstanceFor, setAddInstanceFor] = useState<string | null>(null);
  const [instanceStaff, setInstanceStaff] = useState('');
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [newSched, setNewSched] = useState({ staff_name: '', staff_id: '', shift_date: today, start_time: '09:00', end_time: '17:00', role: 'staff', notes: '' });
  const [scheduleDate, setScheduleDate] = useState(today);
  // Chatbot state
  const [kbEntries, setKbEntries] = useState<KnowledgeEntry[]>([]);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResults, setChatResults] = useState<KnowledgeEntry[]>([]);
  // Shuttle overview state
  const [todayShuttleSlots, setTodayShuttleSlots] = useState<ShuttleSlot[]>([]);
  const [todayShuttleRoutes, setTodayShuttleRoutes] = useState<ShuttleRoute[]>([]);
  // Recurring schedule form
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ route_id: '', start_time: '06:00', end_time: '22:00', interval_min: 60, days: [1,2,3,4,5,6,7], capacity: 8 });

  // Load enabled ops tools from DB
  useEffect(() => {
    (async () => {
      try {
        const [tools, toggles] = await Promise.all([getAllOpsTools(), getHotelOpsTools(hotelId)]);
        const toggleMap = new Map(toggles.map(t => [t.tool_key, t.enabled]));
        const enabled = tools.filter(t => toggleMap.get(t.key) !== false).map(t => ({ tool: t, enabled: toggleMap.get(t.key) ?? true }));
        setEnabledTools(enabled);
      } catch {
        // If tables don't exist yet, fall back to default set
        setEnabledTools([
          { tool: { key: 'recap', name: 'Daily Recap', icon: 'BarChart3', category: 'front_desk', description: '', is_built_in: true, id: '' }, enabled: true },
          { tool: { key: 'checklists', name: 'Checklists', icon: 'ClipboardList', category: 'front_desk', description: '', is_built_in: true, id: '' }, enabled: true },
          { tool: { key: 'schedule', name: 'Staff Schedule', icon: 'CalendarDays', category: 'front_desk', description: '', is_built_in: true, id: '' }, enabled: true },
          { tool: { key: 'assistant', name: 'Staff Assistant', icon: 'Bot', category: 'front_desk', description: '', is_built_in: true, id: '' }, enabled: true },
        ]);
      }
    })();
  }, [hotelId]);

  useEffect(() => { loadData(); }, [hotelId, tab, scheduleDate]);
  const loadData = async () => {
    const [r, c, ci, s, kb, slots, routes] = await Promise.all([
      getDailyRecap(hotelId), getChecklists(hotelId),
      getChecklistInstances(hotelId, today), getStaffSchedules(hotelId, scheduleDate),
      getAllKnowledgeBase(hotelId), getAllShuttleSlotsForHotel(hotelId),
      getShuttleRoutes(hotelId),
    ]);
    setRecap(r); setChecklists(c); setInstances(ci); setSchedules(s);
    setKbEntries(kb); setTodayShuttleSlots(slots); setTodayShuttleRoutes(routes);
  };

  const handleCreateChecklist = async () => {
    if (!newCL.name.trim()) return;
    const items = newCL.items.split('\n').filter(Boolean).map((label, i) => ({ id: `item-${i}`, label: label.trim() }));
    await createChecklist(hotelId, newCL.name.trim(), items);
    setNewCL({ name: '', items: '' }); setShowNewChecklist(false);
    setChecklists(await getChecklists(hotelId));
  };

  const handleStartChecklist = async (checklistId: string) => {
    await createChecklistInstance({ checklist_id: checklistId, hotel_id: hotelId, staff_name: instanceStaff || undefined });
    setAddInstanceFor(null); setInstanceStaff('');
    setInstances(await getChecklistInstances(hotelId, today));
  };

  const handleToggleCheckItem = async (instanceId: string, itemId: string, isChecked: boolean) => {
    const inst = instances.find(i => i.id === instanceId);
    if (!inst) return;
    const checked = isChecked
      ? inst.checked_items.filter(x => x.item_id !== itemId)
      : [...inst.checked_items, { item_id: itemId, checked_at: new Date().toISOString() }];
    const cl = checklists.find(c => c.id === inst.checklist_id);
    const completed = checked.length === (cl?.items.length || 0);
    await updateChecklistInstance(instanceId, { checked_items: checked, completed });
    setInstances(await getChecklistInstances(hotelId, today));
  };

  const sendScheduleEmail = async (sched: StaffSchedule) => {
    const m = staff.find(s => s.name === sched.staff_name);
    if (!m?.email) return;
    await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'schedule_posted', data: { staffEmail: m.email, staffName: sched.staff_name, hotelName, shiftDate: sched.shift_date, startTime: sched.start_time, endTime: sched.end_time, role: sched.role } }) }).catch(() => {});
  };

  const handleCreateSchedule = async () => {
    if (!newSched.staff_name.trim()) return;
    const data = await createStaffSchedule({ hotel_id: hotelId, staff_name: newSched.staff_name.trim(), staff_id: newSched.staff_id || undefined, shift_date: newSched.shift_date, start_time: newSched.start_time, end_time: newSched.end_time, role: newSched.role, notes: newSched.notes || undefined });
    if (data) sendScheduleEmail(data);
    setShowNewSchedule(false);
    setNewSched({ staff_name: '', staff_id: '', shift_date: today, start_time: '09:00', end_time: '17:00', role: 'staff', notes: '' });
    setSchedules(await getStaffSchedules(hotelId, scheduleDate));
  };

  const handleDeleteSchedule = async (id: string) => { await deleteStaffSchedule(id); setSchedules(await getStaffSchedules(hotelId, scheduleDate)); };

  const DAYS_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const handleGenerateRecurring = async () => {
    const r = recurringForm;
    if (!r.route_id || !r.start_time || !r.end_time) return;
    const [startH, startM] = r.start_time.split(':').map(Number);
    const [endH, endM] = r.end_time.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    for (let m = startMin; m < endMin; m += r.interval_min) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      await createShuttleSlot({
        route_id: r.route_id,
        departure_time: `${hh}:${mm}:00`,
        days_of_week: r.days,
        capacity: r.capacity,
        date: undefined,
        event_label: '',
        override_price: undefined,
      });
    }
    setShowRecurringForm(false);
    const updatedSlots = await getAllShuttleSlotsForHotel(hotelId);
    setTodayShuttleSlots(updatedSlots);
  };

  const renderShuttleOverview = () => {
    if (!config.hasFreeShuttle) {
      return (
        <div className="bg-gray-50 rounded-2xl p-5 text-center border border-gray-100">
          <Bus size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-[13px] text-gray-500">This property does not offer a free shuttle.</p>
        </div>
      );
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDay = new Date().getDay() || 7; // 1=Mon ... 7=Sun
    const todaySlots = todayShuttleSlots.filter(s =>
      (s.date === todayStr) || (s.days_of_week?.includes(todayDay) && !s.date)
    );
    const byRoute: Record<string, ShuttleSlot[]> = {};
    todaySlots.forEach(s => {
      const k = s.route_name || 'Shuttle';
      if (!byRoute[k]) byRoute[k] = [];
      byRoute[k].push(s);
    });
    const entries = Object.entries(byRoute);
    if (entries.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm">
          <Bus size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-[13px] text-gray-500">No shuttle runs scheduled today.</p>
        </div>
      );
    }
    return (
      <>
        {entries.map(([name, routeSlots]) => (
          <div key={name} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-3">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[13px] font-bold text-gray-700">{name}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {routeSlots.sort((a, b) => (a.departure_time || '').localeCompare(b.departure_time || '')).map(slot => (
                <div key={slot.id} className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-gray-900">{slot.departure_time?.slice(0, 5)}</span>
                  <span className="text-[12px] font-semibold text-teal-600">{slot.bookings_count || 0} booked{slot.capacity > 0 ? ` / ${slot.capacity}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6"><h1 className="text-[26px] font-extrabold text-gray-900">Front Desk</h1></div>
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {(() => {
          const tabConfig: Record<string, {label: string}> = {
            'recap': {label:"📊 Daily Recap"},
            'checklists': {label:"📝 Checklists"},
            'schedule': {label:"📅 Staff Schedule"},
            'assistant': {label:"🤖 Staff Assistant"},
            'call-around': {label:"📞 Call Around"},
            'daily-logs': {label:"📋 Daily Logs"},
            'no-shows': {label:"🚫 No Shows"},
            'room-moves': {label:"🔄 Room Moves"},
            'bank-count': {label:"💰 Bank Count"},
          };
          const visible = enabledTools.filter(t => t.enabled).map(t => t.tool.key);
          return visible.map(key => {
            const cfg = tabConfig[key];
            if (!cfg) return null;
            return (
              <button key={key} onClick={() => setTab(key)}
                className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${tab === key ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                style={tab === key ? { backgroundColor: TEAL } : {}}>{cfg.label}</button>
            );
          });
        })()}
      </div>

      {tab === 'recap' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[{label:'Requests Today',count:recap?.requestsToday||0,color:'text-blue-600'},{label:'Completed',count:recap?.completedToday||0,color:'text-emerald-600'},{label:'Pending Now',count:recap?.pendingNow||0,color:'text-amber-600'},{label:'Avg Response',count:`${recap?.avgResponseMin||0}m`,color:'text-purple-600'}].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"><p className="text-[11px] text-gray-400 uppercase font-bold">{s.label}</p><p className={`text-[28px] font-extrabold ${s.color}`}>{s.count}</p></div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
            {[{label:'Guest Messages',count:recap?.messagesToday||0,icon:'💬',color:'text-violet-600'},{label:'Shuttle Bookings',count:recap?.shuttleBookingsToday||0,icon:'🚗',color:'text-teal-600'},{label:'Staff on Duty',count:recap?.staffOnDuty||0,icon:'👤',color:'text-gray-700'}].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"><p className="text-[11px] text-gray-400 uppercase font-bold">{s.label}</p><p className={`text-[24px] font-extrabold ${s.color}`}>{s.icon} {s.count}</p></div>
            ))}
          </div>
          {recap && recap.checklistsTotal > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-[11px] text-gray-400 uppercase font-bold">Checklists Today</p>
              <p className="text-[24px] font-extrabold text-gray-800">{recap.checklistsCompleted} / {recap.checklistsTotal} completed</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-2"><div className="h-2 rounded-full" style={{width:`${(recap.checklistsCompleted/recap.checklistsTotal)*100}%`,backgroundColor:TEAL}} /></div>
            </div>
          )}
          {!recap && (<div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><p className="text-[13px] text-gray-500">{'Loading today\u2019s data...'}</p></div>)}

          {/* Today's Shuttle Overview — only if hotel has free shuttle enabled */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-extrabold text-gray-800">Today&apos;s Shuttle Schedule</h2>
              {config.hasFreeShuttle && config.shuttleStartTime && config.shuttleEndTime && (
                <span className="text-[11px] font-semibold text-gray-500">
                  Runs {config.shuttleStartTime.slice(0,5)}–{config.shuttleEndTime.slice(0,5)}
                </span>
              )}
            </div>
            {renderShuttleOverview()}
          </div>
        </div>
      )}

      {tab === 'checklists' && (
        <div>
          {isAdmin && (
            <div className="mb-6">
              {!showNewChecklist ? (
                <button onClick={() => setShowNewChecklist(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:opacity-90" style={{backgroundColor:TEAL}}><Plus size={14} /> Create Checklist Template</button>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-[15px] font-bold text-gray-900 mb-3">New Checklist Template</h3>
                  <div className="space-y-3">
                    <input value={newCL.name} onChange={e => setNewCL({...newCL,name:e.target.value})} placeholder="Checklist name (e.g. 'AM Walkthrough')" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
                    <div><p className="text-[11px] text-gray-400 mb-1 font-medium">Items (one per line)</p><textarea value={newCL.items} onChange={e => setNewCL({...newCL,items:e.target.value})} placeholder="Verify breakfast setup&#10;Inspect pool area&#10;Restock amenities" rows={4} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none resize-none" /></div>
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    <button onClick={() => {setShowNewChecklist(false);setNewCL({name:'',items:''})}} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Cancel</button>
                    <button onClick={handleCreateChecklist} disabled={!newCL.name.trim()} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-40" style={{backgroundColor:TEAL}}>Create</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-4">
            {checklists.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><ClipboardList size={32} className="text-gray-300 mx-auto mb-2" /><p className="text-[13px] text-gray-500 mb-1">No checklist templates yet.</p>{isAdmin && <p className="text-[12px] text-gray-400">Create one above to get started.</p>}</div>
            ) : checklists.map(cl => {
              const activeInst = instances.find(i => i.checklist_id === cl.id && !i.completed);
              const completedInst = instances.find(i => i.checklist_id === cl.id && i.completed);
              return (
                <div key={cl.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3"><h3 className="text-[15px] font-bold text-gray-900">{cl.name}</h3><span className="text-[11px] text-gray-400">{cl.items.length} items</span></div>
                  {activeInst ? (
                    <div>
                      <p className="text-[12px] text-gray-500 mb-2">{activeInst.staff_name || 'Staff'} — in progress</p>
                      <div className="space-y-1.5">{cl.items.map(item => {
                        const checked = activeInst.checked_items.some(x => x.item_id === item.id);
                        return (<label key={item.id} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={checked} onChange={() => handleToggleCheckItem(activeInst.id, item.id, checked)} className="accent-teal-500 w-4 h-4" /><span className={`text-[13px] ${checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.label}</span></label>);
                      })}</div>
                    </div>
                  ) : completedInst ? (
                    <div>
                      <p className="text-[12px] text-emerald-600 font-semibold mb-2">✅ Completed by {completedInst.staff_name || 'Staff'}</p>
                      <div className="space-y-1">{cl.items.map(item => (<div key={item.id} className="flex items-center gap-2"><span className="text-emerald-500">✓</span><span className="text-[13px] text-gray-400 line-through">{item.label}</span></div>))}</div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[12px] text-gray-400 mb-3">Not started today</p>
                      {addInstanceFor === cl.id ? (
                        <div className="flex gap-2"><input value={instanceStaff} onChange={e => setInstanceStaff(e.target.value)} placeholder="Your name" className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-200 outline-none" /><button onClick={() => handleStartChecklist(cl.id)} disabled={!instanceStaff.trim()} className="px-3 py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-40" style={{backgroundColor:TEAL}}>Start</button><button onClick={() => {setAddInstanceFor(null);setInstanceStaff('')}} className="px-3 py-2 rounded-lg text-gray-500 text-[12px] font-semibold bg-gray-100">Cancel</button></div>
                      ) : (<button onClick={() => setAddInstanceFor(cl.id)} className="text-[12px] font-bold px-3 py-1.5 rounded-lg" style={{backgroundColor:`${TEAL}15`,color:TEAL}}>+ Start Checklist</button>)}
                    </div>
                  )}
                  {isAdmin && (<div className="mt-3 pt-3 border-t border-gray-100 flex gap-2"><button onClick={() => deleteChecklist(cl.id).then(() => setChecklists(prev => prev.filter(c => c.id !== cl.id)))} className="text-[11px] text-red-500 hover:text-red-700 font-medium">Delete</button></div>)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'schedule' && (
        <div>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-4 py-2"><CalendarDays size={16} className="text-gray-400" /><input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="text-[14px] border-none outline-none bg-transparent" /></div>
            {isAdmin && (<button onClick={() => setShowNewSchedule(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:opacity-90" style={{backgroundColor:TEAL}}><Plus size={14} /> Post Schedule</button>)}
            <button onClick={async () => setSchedules(await getStaffSchedules(hotelId, scheduleDate))} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl text-[13px] font-semibold text-gray-600 hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
          </div>
          {showNewSchedule && isAdmin && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
              <h3 className="text-[15px] font-bold text-gray-900 mb-3">Post New Shift</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-[11px] text-gray-400 mb-1 block font-medium">Staff Member</label><div className="flex gap-2"><input value={newSched.staff_name} onChange={e => {setNewSched({...newSched,staff_name:e.target.value});const match=staff.find(s=>s.name.toLowerCase()===e.target.value.toLowerCase());if(match)setNewSched(prev=>({...prev,staff_id:match.id||''}))}} list="staff-list" placeholder="Type name or pick from list" className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /><datalist id="staff-list">{staff.map(s => <option key={s.id||s.name} value={s.name} />)}</datalist></div></div>
                <div><label className="text-[11px] text-gray-400 mb-1 block font-medium">Date</label><input type="date" value={newSched.shift_date} onChange={e => setNewSched({...newSched,shift_date:e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /></div>
                <div><label className="text-[11px] text-gray-400 mb-1 block font-medium">Role</label><input value={newSched.role} onChange={e => setNewSched({...newSched,role:e.target.value})} placeholder="Front Desk / Housekeeping" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /></div>
                <div><label className="text-[11px] text-gray-400 mb-1 block font-medium">Start Time</label><input type="time" value={newSched.start_time} onChange={e => setNewSched({...newSched,start_time:e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /></div>
                <div><label className="text-[11px] text-gray-400 mb-1 block font-medium">End Time</label><input type="time" value={newSched.end_time} onChange={e => setNewSched({...newSched,end_time:e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /></div>
                <div className="col-span-2"><label className="text-[11px] text-gray-400 mb-1 block font-medium">Notes (optional)</label><input value={newSched.notes} onChange={e => setNewSched({...newSched,notes:e.target.value})} placeholder="e.g. Cover front desk + shuttle dispatch" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" /></div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button onClick={() => {setShowNewSchedule(false)}} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">Cancel</button>
                <button onClick={handleCreateSchedule} disabled={!newSched.staff_name.trim()} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-40 flex items-center gap-1.5" style={{backgroundColor:TEAL}}><SendHorizontal size={14} /> Post & Send Email</button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 text-center">Staff with an email address will receive a notification.</p>
            </div>
          )}
          {schedules.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm"><CalendarDays size={32} className="text-gray-300 mx-auto mb-2" /><p className="text-[13px] text-gray-500">No schedules for this date.</p>{isAdmin && <p className="text-[12px] text-gray-400 mt-1">Click &quot;Post Schedule&quot; to add shifts.</p>}</div>
          ) : (
            <div className="space-y-3">
              {schedules.map(s => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold shrink-0" style={{backgroundColor:TEAL}}>{s.staff_name.charAt(0).toUpperCase()}</div><div><p className="text-[14px] font-bold text-gray-900">{s.staff_name}</p><p className="text-[12px] text-gray-500">{s.start_time.slice(0,5)} — {s.end_time.slice(0,5)}{s.role ? ` · ${s.role}` : ''}{s.notes ? <span className="ml-2 text-gray-400">· {s.notes}</span> : ''}</p></div></div>
                  <div className="flex items-center gap-2"><span className="text-[11px] text-gray-400">{s.shift_date}</span>{isAdmin && <button onClick={() => handleDeleteSchedule(s.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recurring Shuttle Schedule Generator */}
      {tab === 'schedule' && isAdmin && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {!showRecurringForm ? (
            <button onClick={() => setShowRecurringForm(true)}
              className="flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2.5 rounded-xl text-[13px] font-bold hover:bg-teal-100 transition-colors">
              <Plus size={14} /> Generate Recurring Shuttle Times
            </button>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
              <h3 className="text-[15px] font-bold text-gray-900 mb-3">Generate Recurring Times</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block font-medium">Route</label>
                  <select value={recurringForm.route_id} onChange={e => setRecurringForm({...recurringForm, route_id: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                    <option value="">Select route...</option>
                    {todayShuttleRoutes.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.type}) {r.price > 0 ? `· $${r.price}` : '· Free'}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block font-medium">Start Time</label>
                    <input type="time" value={recurringForm.start_time} onChange={e => setRecurringForm({...recurringForm, start_time: e.target.value})}
                      className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block font-medium">End Time</label>
                    <input type="time" value={recurringForm.end_time} onChange={e => setRecurringForm({...recurringForm, end_time: e.target.value})}
                      className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block font-medium">Every</label>
                    <select value={recurringForm.interval_min} onChange={e => setRecurringForm({...recurringForm, interval_min: parseInt(e.target.value)})}
                      className="w-full bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none">
                      <option value={30}>30 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>2 hr</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block font-medium">Capacity per slot</label>
                  <input type="number" min={1} max={99} value={recurringForm.capacity} onChange={e => setRecurringForm({...recurringForm, capacity: parseInt(e.target.value) || 8})}
                    className="w-24 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-[13px] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block font-medium">Days of Week</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS_LABELS.map((d, i) => {
                      const dayNum = i + 1;
                      const active = recurringForm.days.includes(dayNum);
                      return (
                        <button key={d} onClick={() => setRecurringForm({
                          ...recurringForm,
                          days: active ? recurringForm.days.filter(x => x !== dayNum) : [...recurringForm.days, dayNum]
                        })}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${active ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button onClick={() => setShowRecurringForm(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600">Cancel</button>
                <button onClick={handleGenerateRecurring} disabled={!recurringForm.route_id}
                  className="px-5 py-2 rounded-xl text-white text-[13px] font-bold disabled:opacity-40" style={{backgroundColor: TEAL}}>Generate Times</button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 text-center">Creates timed slots matching the selected schedule, every day of the week selected.</p>
            </div>
          )}
        </div>
      )}

      {/* Staff Assistant / Knowledge Base Chatbot */}
      {tab === 'assistant' && (
        <div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: TEAL }}>
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-white" />
                <span className="text-[15px] font-bold text-white">Staff Assistant</span>
              </div>
            </div>
            <div className="p-4 border-b border-gray-100">
              <input
                value={chatQuery}
                onChange={e => {
                  setChatQuery(e.target.value);
                  if (!e.target.value.trim()) { setChatResults([]); return; }
                  const q = e.target.value.toLowerCase();
                  setChatResults(kbEntries.filter(entry =>
                    entry.active && (entry.question.toLowerCase().includes(q) || entry.answer.toLowerCase().includes(q) || entry.keywords?.some(k => k.toLowerCase().includes(q)))
                  ).slice(0, 10));
                }}
                placeholder="Ask anything about hotel policies..."
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-200 outline-none placeholder-gray-400"
              />
              <p className="text-[11px] text-gray-400 mt-2">Powered by the Knowledge Base. Admin adds entries in the Knowledge Base tab.</p>
            </div>
            {chatResults.length === 0 && !chatQuery.trim() ? (
              <div className="p-8 text-center">
                <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-[14px] font-semibold text-gray-500">Ask the Staff Assistant</p>
                <p className="text-[12px] text-gray-400 mt-1">Search the knowledge base for answers about check-in, breakfast, wifi, amenities...</p>
                {kbEntries.length > 0 && (
                  <p className="text-[11px] text-gray-300 mt-2">{kbEntries.filter(e => e.active).length} knowledge entries available</p>
                )}
              </div>
            ) : chatResults.length === 0 && chatQuery.trim() ? (
              <div className="p-8 text-center">
                <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-[13px] text-gray-500">No matching results found.</p>
                <p className="text-[11px] text-gray-400 mt-1">Try different keywords or ask an admin to add this info to the Knowledge Base.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {chatResults.map(entry => (
                  <div key={entry.id} className="px-5 py-4">
                    <p className="text-[13px] font-bold text-gray-900 mb-1">{entry.question}</p>
                    <p className="text-[12px] text-gray-600 leading-relaxed">{entry.answer}</p>
                    {entry.source_url && (
                      <a href={entry.source_url} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] font-bold text-blue-600 hover:underline mt-1 inline-block">
                        Source &rarr;
                      </a>
                    )}
                    {entry.keywords && entry.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.keywords.map((kw, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-[12px] text-amber-800">
              <strong>Tip:</strong> Go to the <span className="font-semibold">Knowledge Base</span> tab to add or manage entries. The staff assistant searches all active entries by question, answer, and keywords.
            </p>
          </div>
        </div>
      )}

      {/* ── New ops tool renderings ─────────────────────── */}
      {tab === 'call-around' && <CallAroundView hotelId={hotelId} />}
      {tab === 'daily-logs' && <DailyLogsView hotelId={hotelId} />}
      {tab === 'no-shows' && <NoShowsView hotelId={hotelId} />}
      {tab === 'room-moves' && <RoomMovesView hotelId={hotelId} />}
      {tab === 'bank-count' && <BankCountView hotelId={hotelId} />}
    </div>
  );
}

/* ── Daily Brief View (staff-facing) ──────────────────── */
function DailyBriefView({ hotelId, hotelName, config, sessionName, department, isAdmin }: { hotelId: string; hotelName: string; config: HotelConfig | null; sessionName: string; department?: string; isAdmin: boolean }) {
  const [recap, setRecap] = useState<{
    requestsToday: number; completedToday: number; pendingNow: number;
    messagesToday: number; shuttleBookingsToday: number;
    avgResponseMin: number; staffOnDuty: number;
    checklistsCompleted: number; checklistsTotal: number;
  } | null>(null);
  const [todayShuttleSlots, setTodayShuttleSlots] = useState<ShuttleSlot[]>([]);
  const [monthShuttleSlots, setMonthShuttleSlots] = useState<OpsShuttleSlot[]>([]);
  const [todayShuttleRoutes, setTodayShuttleRoutes] = useState<ShuttleRoute[]>([]);
  const [weekShifts, setWeekShifts] = useState<StaffSchedule[]>([]);
  // Checklists loaded inline from supabase staff_checklists + instances
  const [checklistTemplates, setChecklistTemplates] = useState<Checklist[]>([]);
  const [checklistInstances, setChecklistInstances] = useState<ChecklistInstance[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    (async () => {
      const [r, slots, routes, monthSlots, schedules, templates, instances] = await Promise.all([
        getDailyRecap(hotelId),
        getAllShuttleSlotsForHotel(hotelId),
        getShuttleRoutes(hotelId),
        listShuttleSlots(hotelId),
        getStaffSchedulesRange(hotelId, today(), addDays(today(), 7)),
        getChecklists(hotelId),
        getChecklistInstances(hotelId, todayStr),
      ]);
      setRecap(r);
      setTodayShuttleSlots(slots);
      setTodayShuttleRoutes(routes);
      setMonthShuttleSlots(monthSlots || []);
      setWeekShifts(schedules || []);
      setChecklistTemplates(templates || []);
      setChecklistInstances(instances || []);
    })();
  }, [hotelId, todayStr]);

  const startInstance = async (templateId: string) => {
    setSubmitting(true);
    const { error: err } = await supabase.from('staff_checklist_instances').insert({
      checklist_id: templateId,
      hotel_id: hotelId,
      staff_name: sessionName || 'Staff',
      shift_date: todayStr,
      checked_items: [],
      completed: false,
    });
    if (!err) {
      const updated = await getChecklistInstances(hotelId, todayStr);
      setChecklistInstances(updated || []);
    }
    setSubmitting(false);
  };

  const toggleChecklistItem = async (instanceId: string, itemId: string, currentlyChecked: boolean) => {
    const inst = checklistInstances.find(i => i.id === instanceId);
    if (!inst) return;
    const newChecked = currentlyChecked
      ? inst.checked_items.filter(x => x.item_id !== itemId)
      : [...inst.checked_items, { item_id: itemId, checked_at: new Date().toISOString() }];
    const tpl = checklistTemplates.find(t => t.id === inst.checklist_id);
    const completed = newChecked.length === (tpl?.items.length || 0);
    await supabase.from('staff_checklist_instances').update({
      checked_items: newChecked,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', instanceId);
    const updated = await getChecklistInstances(hotelId, todayStr);
    setChecklistInstances(updated || []);
  };

  // Filter checklists by department + title match: staff see their dept, admin/managers see all
  // Checks both the `department` field AND the checklist name for department keywords
  const myDept = department || '';
  const deptLabel = DEPARTMENTS.find(d => d.key === myDept)?.label || '';
  const deptKeywords = [myDept, deptLabel.toLowerCase(), ...deptLabel.split(' ').map(w => w.toLowerCase())].filter(Boolean);
  const relevantTemplates = isAdmin || !myDept
    ? checklistTemplates
    : checklistTemplates.filter(t => {
        // Exact department match
        if (t.department === myDept) return true;
        // Match by name/title containing department keywords
        const nameLower = (t.name || '').toLowerCase();
        if (deptKeywords.some(kw => nameLower.includes(kw))) return true;
        // Match by assigned_role
        const roleLower = (t.assigned_role || '').toLowerCase();
        if (deptKeywords.some(kw => roleLower.includes(kw))) return true;
        // Show unassigned checklists to everyone
        if (!t.department && !t.assigned_role) return true;
        return false;
      });

  const todayDay = new Date().getDay() || 7;
  const daySlots = todayShuttleSlots.filter(s =>
    (s.date === todayStr) || (s.days_of_week?.includes(todayDay) && !s.date)
  );

  const addDays = (d: string, n: number) => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() + n);
    return dt.toISOString().split('T')[0];
  };
  const next14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().split('T')[0];
    const dow = d.getDay();
    const slotsCount = monthShuttleSlots.filter(s => s.day_of_week === dow).length;
    const shiftsCount = weekShifts.filter(s => s.shift_date === ds).length;
    return { date: ds, day: d.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d.getDate(), slotsCount, shiftsCount, isToday: i === 0 };
  });

  // Get today's instance for a template
  const todaysInstance = (templateId: string) =>
    checklistInstances
      .filter(i => i.checklist_id === templateId)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* ── Header Row ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Good morning, {sessionName || config?.managerName || 'team'} ☀️</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {hotelName}</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[11px] text-gray-400">Today</span>
          <span className="text-[11px] font-bold text-gray-900">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* ── Today's Brief / GM Notes ── */}
      {config?.gmNotes ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={16} style={{ color: TEAL }} />
            <h2 className="text-[15px] font-bold text-gray-900">Today&apos;s Brief</h2>
          </div>
          <div className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">{config?.gmNotes}</div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
          <p className="text-[13px] text-amber-800 font-medium">No daily brief yet. The GM/Manager can add notes in Property Settings.</p>
        </div>
      )}

      {/* ── Quick Stats Row ── */}
      {recap && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pending</p>
            <p className="text-[28px] font-extrabold text-gray-900 mt-1">{recap.pendingNow}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Completed</p>
            <p className="text-[28px] font-extrabold text-gray-900 mt-1">{recap.completedToday}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Staff on Duty</p>
            <p className="text-[28px] font-extrabold text-gray-900 mt-1">{recap.staffOnDuty}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Avg Response</p>
            <p className="text-[20px] font-extrabold text-gray-900 mt-1">{recap.avgResponseMin}<span className="text-[12px] font-normal text-gray-400"> min</span></p>
          </div>
        </div>
      )}

      {/* ── Two-column layout for main content ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Left column: Today's Activity */}
        <div className="space-y-5">
          {/* Requests Today */}
          {recap && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-gray-900">Today&apos;s Activity</h3>
                <span className="text-[11px] text-gray-400">{recap.requestsToday} requests · {recap.messagesToday} messages</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full transition-all" style={{width:`${recap.requestsToday > 0 ? Math.min((recap.completedToday/recap.requestsToday)*100, 100) : 0}%`, backgroundColor: TEAL}} />
                </div>
                <span className="text-[12px] font-bold text-gray-700">{recap.completedToday}/{recap.requestsToday} done</span>
              </div>
            </div>
          )}

          {/* ── Interactive Checklists ── */}
          {relevantTemplates.length > 0 && (
            <div className="space-y-3">
              {relevantTemplates.map(tpl => {
                const inst = todaysInstance(tpl.id);
                const totalItems = tpl.items?.length || 0;
                const doneCount = inst?.checked_items.length || 0;
                return (
                  <div key={tpl.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[13px] font-bold text-gray-900">{tpl.name}</p>
                        <p className="text-[11px] text-gray-500">
                          {totalItems} item{totalItems === 1 ? '' : 's'}
                          {inst ? ` · ${doneCount}/${totalItems} done` : ''}
                        </p>
                      </div>
                      {!inst && totalItems > 0 ? (
                        <button
                          onClick={() => startInstance(tpl.id)}
                          disabled={submitting}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                          style={{ backgroundColor: TEAL }}
                        >
                          {submitting ? '...' : 'Start'}
                        </button>
                      ) : inst?.completed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Done</span>
                      ) : inst ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">In Progress</span>
                      ) : null}
                    </div>
                    {inst && totalItems > 0 && (
                      <>
                        <div className="bg-gray-100 rounded-full h-1.5 mb-2">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${(doneCount / totalItems) * 100}%`, backgroundColor: TEAL }} />
                        </div>
                        <div className="space-y-1">
                          {tpl.items.map(item => {
                            const isChecked = !!inst.checked_items.find(x => x.item_id === item.id);
                            return (
                              <label key={item.id} className="flex items-center gap-2.5 py-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleChecklistItem(inst.id, item.id, isChecked)}
                                  disabled={submitting}
                                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                                  style={{ accentColor: TEAL }}
                                />
                                <span className={`text-[12px] ${isChecked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Next 14 Days */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={16} style={{ color: TEAL }} />
              <h3 className="text-[13px] font-bold text-gray-900">Next 14 Days</h3>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {next14.map(d => (
                <div key={d.date} className={`text-center p-2 rounded-xl border ${d.isToday ? 'border-gray-900 bg-gray-50' : 'border-gray-100'}`}>
                  <p className={`text-[9px] font-bold uppercase ${d.isToday ? 'text-gray-900' : 'text-gray-400'}`}>{d.day}</p>
                  <p className={`text-[14px] font-extrabold ${d.isToday ? 'text-gray-900' : 'text-gray-700'}`}>{d.dayNum}</p>
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {d.slotsCount > 0 && <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ backgroundColor: `${TEAL}20`, color: TEAL }}>{d.slotsCount}🚌</span>}
                    {d.shiftsCount > 0 && <span className="text-[8px] px-1 py-0.5 rounded font-bold bg-gray-100 text-gray-600">{d.shiftsCount}👤</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Schedule & Shuttle */}
        <div className="space-y-5">
          {/* Today's Shuttle */}
          {daySlots.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Bus size={16} style={{ color: TEAL }} />
                <h3 className="text-[13px] font-bold text-gray-900">Today&apos;s Shuttle</h3>
                <span className="text-[11px] text-gray-400">{daySlots.length} trips</span>
              </div>
              <div className="space-y-2">
                {(() => {
                  const routeMap = new Map(todayShuttleRoutes.map(r => [r.id, r.name]));
                  const grouped: Record<string, ShuttleSlot[]> = {};
                  daySlots.forEach(s => {
                    const key = routeMap.get(s.route_id) || 'Shuttle';
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(s);
                  });
                  return Object.entries(grouped).map(([routeName, slots]) => (
                    <div key={routeName}>
                      <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">{routeName}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {slots.sort((a, b) => a.departure_time.localeCompare(b.departure_time)).map(s => (
                          <span key={s.id} className="text-[11px] bg-gray-100 text-gray-600 font-medium px-2 py-1 rounded-lg">
                            {s.departure_time.slice(0, 5)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Bus size={16} className="text-gray-300" />
                <h3 className="text-[13px] font-bold text-gray-900">Today&apos;s Shuttle</h3>
              </div>
              <p className="text-[12px] text-gray-400">No shuttle trips scheduled today.</p>
            </div>
          )}

          {/* Cruise Calendar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Ship size={16} style={{ color: TEAL }} />
              <h3 className="text-[13px] font-bold text-gray-900">Cruise Ships</h3>
            </div>
            <CruiseCalendar hotelId={hotelId} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Cruise Calendar — reads from cruise_schedules table; falls back to a quiet empty state */
function CruiseCalendar({ hotelId }: { hotelId: string }) {
  const [schedules, setSchedules] = useState<CruiseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const data = await getCruiseSchedulesAll(hotelId);
        // Filter to next 30 days
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 30);
        setSchedules((data || []).filter(s => {
          const dStr = s.departure_date;
          if (!dStr) return false;
          const d = new Date(dStr);
          return d >= new Date() && d <= cutoff;
        }));
      } catch {
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [hotelId]);

  if (loading) return <p className="text-[12px] text-gray-400">Loading cruise schedule…</p>;
  if (schedules.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-[12px] text-gray-500">No cruise ships docking in the next 30 days.</p>
        <p className="text-[11px] text-gray-400 mt-1">Add cruise schedules in Property Settings to see them here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {schedules.slice(0, 8).map((s, i) => {
        const d = new Date(s.departure_date);
        return (
          <div key={s.id || i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5">
            <div className="text-center w-10">
              <p className="text-[9px] font-bold text-gray-400 uppercase">{d.toLocaleDateString('en-US', { month: 'short' })}</p>
              <p className="text-[16px] font-extrabold text-gray-900">{d.getDate()}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-gray-900 truncate">{s.ship_name || 'Cruise ship'}</p>
              <p className="text-[11px] text-gray-500">{s.cruise_line || ''}{s.terminal ? ` · ${s.terminal}` : ''}{s.departure_time ? ` · ${s.departure_time}` : ''}</p>
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase">{s.notes ? s.notes.slice(0, 12) : ''}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Property Info View (staff-facing) ───────────────── */
function PropertyInfoView({ config }: { config: HotelConfig }) {
  const items = [
    { label: 'Property Name', value: config.name, icon: HotelIcon },
    { label: 'Manager', value: config.managerName, icon: Users },
    { label: 'Address', value: config.address, icon: MapPin },
    { label: 'Front Desk Phone', value: config.frontDeskPhone, icon: Phone },
    { label: 'WiFi Network', value: config.wifiName, icon: Wifi },
    { label: 'WiFi Password', value: config.wifiPassword, icon: Lock },
    { label: 'Website', value: config.websiteUrl, icon: ExternalLink, link: true },
  ].filter(i => i.value);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-[22px] font-extrabold text-gray-900 mb-1">Property Info</h1>
      <p className="text-[13px] text-gray-500 mb-6">Quick reference for {config.name}</p>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${TEAL}15` }}>
              <item.icon size={18} style={{ color: TEAL }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
              {item.link ? (
                <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold text-blue-600 hover:underline break-all">{item.value}</a>
              ) : (
                <p className="text-[14px] font-semibold text-gray-900 break-all">{item.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Schedules View — Staff × Day Matrix ───────────────── */
function SchedulesView({ hotelId, isAdmin, staffList, weekStartsOn }: { hotelId: string; isAdmin: boolean; staffList: { id?: string; name: string; role?: string; department?: string }[]; weekStartsOn?: string }) {
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState<string>(getWeekStart(today(), weekStartsOn));
  const [showAdd, setShowAdd] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({
    staff_id: '', staff_name: '', shift_date: today(),
    start_time: '07:00', end_time: '15:00', role: 'staff', notes: '',
  });

  const [reqForm, setReqForm] = useState({
    staff_name: '', department: 'front_desk' as DepartmentKey,
    shift_date: today(), change_type: 'time_off' as ScheduleChangeRequest['change_type'], details: '',
  });

  const load = async () => {
    const weekEnd = addDays(weekStart, 6);
    const [s, cr] = await Promise.all([
      getStaffSchedulesRange(hotelId, weekStart, weekEnd),
      listScheduleChangeRequests(hotelId, 'pending'),
    ]);
    setSchedules(s || []);
    setChangeRequests(cr);
  };
  useEffect(() => { load(); }, [hotelId, weekStart]);

  const handleAdd = async () => {
    if (!addForm.staff_name.trim() || !addForm.shift_date) return;
    setSubmitting(true); setError(null);
    const data = await createStaffSchedule({
      hotel_id: hotelId,
      staff_name: addForm.staff_name.trim(),
      staff_id: addForm.staff_id || undefined,
      shift_date: addForm.shift_date,
      start_time: addForm.start_time,
      end_time: addForm.end_time,
      role: addForm.role,
      notes: addForm.notes || undefined,
    });
    if (data) {
      const m = staffList.find(s => s.name === addForm.staff_name.trim()) as StaffAccount | undefined;
      if (m?.email) {
        fetch('/api/email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'schedule_posted',
            data: { staffEmail: m.email, staffName: addForm.staff_name.trim(), hotelName: '', shiftDate: addForm.shift_date, startTime: addForm.start_time, endTime: addForm.end_time, role: addForm.role },
          }),
        }).catch(() => {});
      }
    }
    setShowAdd(false);
    setAddForm({ staff_id: '', staff_name: '', shift_date: today(), start_time: '07:00', end_time: '15:00', role: 'staff', notes: '' });
    await load();
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this shift?')) return;
    await deleteStaffSchedule(id);
    await load();
  };

  const submitRequest = async () => {
    if (!reqForm.details.trim() && reqForm.change_type === 'other') { setError('Tell us what you need.'); return; }
    setSubmitting(true); setError(null);
    const res = await createScheduleChangeRequest(hotelId, {
      requested_by: reqForm.staff_name || 'Staff',
      shift_date: reqForm.shift_date,
      department: reqForm.department,
      change_type: reqForm.change_type,
      details: reqForm.details,
    });
    if (!res) { setError('Could not send request.'); setSubmitting(false); return; }
    setShowRequest(false);
    setReqForm({ staff_name: '', department: 'front_desk', shift_date: today(), change_type: 'time_off', details: '' });
    await load();
    setSubmitting(false);
  };

  const completeChange = async (id: string) => { await updateOps(id, { status: 'completed' }); load(); };

  // Week dates
  const weekDates = getWeekDates(weekStart);
  const weekEnd = weekDates[6];

  // Group schedules by staff_name, then by day
  const staffNames = schedules.map(s => s.staff_name).filter((v, i, a) => a.indexOf(v) === i).sort();
  // Also include all active staff from staffList if they have no schedules
  const allStaffMap: Record<string, boolean> = {};
  staffNames.forEach(n => allStaffMap[n] = true);
  staffList.forEach(s => allStaffMap[s.name] = true);
  const allStaffSorted = Object.keys(allStaffMap).sort();

  // Get department for each staff member from staffList
  const staffDept = (name: string): string => {
    const m = staffList.find(s => s.name === name);
    return m?.department || '';
  };

  // Group by department
  const staffByDept: Record<string, string[]> = {};
  allStaffSorted.forEach(name => {
    const dept = staffDept(name) || 'unassigned';
    if (!staffByDept[dept]) staffByDept[dept] = [];
    staffByDept[dept].push(name);
  });

  const daySchedule = (staffName: string, date: string): StaffSchedule[] => {
    return schedules.filter(s => s.staff_name === staffName && s.shift_date === date);
  };

  const deptBg = (dept: string) => {
    const colors: Record<string, string> = {
      management: 'bg-purple-50',
      front_desk: 'bg-sky-50',
      housekeeping: 'bg-emerald-50',
      maintenance: 'bg-amber-50',
      security: 'bg-slate-100',
      drivers: 'bg-orange-50',
      unassigned: 'bg-gray-50',
    };
    return colors[dept] || 'bg-gray-50';
  };

  const shiftColors: Record<string, string> = {
    management: 'bg-purple-100 border-purple-200 text-purple-900',
    front_desk: 'bg-blue-100 border-blue-200 text-blue-900',
    housekeeping: 'bg-emerald-100 border-emerald-200 text-emerald-900',
    maintenance: 'bg-amber-100 border-amber-200 text-amber-900',
    security: 'bg-slate-200 border-slate-300 text-slate-900',
    drivers: 'bg-orange-100 border-orange-200 text-orange-900',
  };
  const shiftColor = (dept: string) => shiftColors[dept] || 'bg-gray-100 border-gray-200';

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Schedules</h1>
          <p className="text-[13px] text-gray-500">{formatDateRange(weekStart, weekEnd)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
            <Plus size={14} /> Add Shift
          </button>
          {!isAdmin && (
            <button onClick={() => setShowRequest(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[12px] font-bold text-gray-600">
              <CalendarDays size={14} /> Request Off
            </button>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-gray-600">← Prev</button>
        <button onClick={() => setWeekStart(getWeekStart(today(), weekStartsOn))} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-gray-600">This week</button>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-gray-600">Next →</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-xl px-4 py-3 mb-4">{error}</div>}

      {/* Pending change requests banner (admin) */}
      {isAdmin && changeRequests.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 mb-5">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">⏳ {changeRequests.length} request{changeRequests.length === 1 ? '' : 's'} pending</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {changeRequests.slice(0, 5).map(cr => (
              <div key={cr.id} className="bg-white rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-gray-900 truncate">{cr.details.requested_by} · {cr.details.change_type}</p>
                  <p className="text-[10px] text-gray-500">{cr.details.shift_date} · {DEPARTMENTS.find(d => d.key === cr.details.department)?.label} · {cr.details.details}</p>
                </div>
                <button onClick={() => completeChange(cr.id)} className="text-[10px] font-bold px-2 py-1 rounded-lg text-white shrink-0" style={{ backgroundColor: TEAL }}>Done</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff × Day matrix */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="bg-gray-50 border-b border-r border-gray-200 p-2.5 w-[140px] sticky left-0 z-10 text-left">
                  <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">Staff</span>
                </th>
                {weekDates.map(d => {
                  const isToday = d === today();
                  return (
                    <th key={d} className={`border-b border-r border-gray-200 p-2 text-center min-w-[100px] ${isToday ? 'bg-teal-50' : 'bg-gray-50'}`}>
                      <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">{dayName(d)}</div>
                      <div className={`text-[15px] font-extrabold mt-0.5 ${isToday ? 'text-teal-700' : 'text-gray-900'}`}>{dayMonth(d)}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(staffByDept).map(([dept, names]) => (
                <Fragment key={dept}>
                  {/* Department header row */}
                  <tr key={`dept-${dept}`}>
                    <td className={`${deptBg(dept)} border-b border-r border-gray-200 px-3 py-1.5 sticky left-0`} colSpan={8}>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-gray-500">
                        {DEPARTMENTS.find(d => d.key === dept)?.icon} {DEPARTMENTS.find(d => d.key === dept)?.label || 'Unassigned'}
                      </span>
                    </td>
                  </tr>
                  {/* Staff rows */}
                  {names.map(name => {
                    const deptColor = shiftColor(dept);
                    return (
                      <tr key={name}>
                        <td className="bg-white border-b border-r border-gray-200 p-2 sticky left-0">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{backgroundColor: TEAL}}>
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[12px] font-semibold text-gray-900 truncate">{name}</span>
                          </div>
                        </td>
                        {weekDates.map(d => {
                          const shifts = daySchedule(name, d);
                          return (
                            <td key={d} className="border-b border-r border-gray-100 p-1.5 align-middle min-h-[48px]">
                              {shifts.length > 0 ? (
                                <div className="space-y-1">
                                  {shifts.map(s => (
                                    <div key={s.id} className={`rounded-lg border px-2 py-1.5 text-[11px] leading-tight ${deptColor} ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                                      onClick={() => isAdmin && handleDelete(s.id)}
                                      title={isAdmin ? 'Click to remove' : ''}
                                    >
                                      <p className="font-bold">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</p>
                                      {s.notes && <p className="text-[9px] opacity-70 truncate">{s.notes}</p>}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center">
                                  <span className="text-[10px] text-gray-300">—</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
              {allStaffSorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-[13px] text-gray-400">
                    No staff assigned yet. Add a shift to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3 text-[10px]">
          <span className="font-bold text-gray-500 uppercase">Legend:</span>
          {DEPARTMENTS.map(d => (
            <span key={d.key} className={`px-2 py-0.5 rounded-lg border ${shiftColor(d.key)}`}>{d.icon} {d.label}</span>
          ))}
          {isAdmin && <span className="ml-auto text-gray-400">Click a shift to remove it</span>}
        </div>
      </div>

      {/* Add Shift modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold">Add Shift</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Staff Member</label>
                <div className="flex gap-2 mt-1">
                  <input value={addForm.staff_name} onChange={e => {
                    setAddForm(p => ({ ...p, staff_name: e.target.value }));
                    const match = staffList.find(s => s.name.toLowerCase() === e.target.value.toLowerCase());
                    if (match) setAddForm(prev => ({ ...prev, staff_id: match.id || '' }));
                  }} list="schedule-staff-list" placeholder="Name or pick from list"
                    className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
                  <datalist id="schedule-staff-list">
                    {staffList.map(s => <option key={s.id || s.name} value={s.name} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</label>
                  <input type="date" value={addForm.shift_date} onChange={e => setAddForm(p => ({ ...p, shift_date: e.target.value }))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role</label>
                  <input value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))} placeholder="Front Desk"
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start</label>
                  <input type="time" value={addForm.start_time} onChange={e => setAddForm(p => ({ ...p, start_time: e.target.value }))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">End</label>
                  <input type="time" value={addForm.end_time} onChange={e => setAddForm(p => ({ ...p, end_time: e.target.value }))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none mt-1" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Notes (optional)</label>
                <input value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Cover front desk + shuttle"
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none mt-1" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleAdd} disabled={submitting || !addForm.staff_name.trim() || !addForm.shift_date}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                  {submitting ? 'Adding…' : 'Add Shift'}
                </button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff: Request Day Off / Change modal */}
      {showRequest && !isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowRequest(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold">Request Day Off / Change</h2>
              <button onClick={() => setShowRequest(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">Your manager will see this in their queue.</p>
            <div className="space-y-3">
              <input value={reqForm.staff_name} onChange={e => setReqForm(p => ({ ...p, staff_name: e.target.value }))} placeholder="Your name"
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
              <select value={reqForm.department} onChange={e => setReqForm(p => ({ ...p, department: e.target.value as DepartmentKey }))}
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none">
                {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
              </select>
              <input value={reqForm.shift_date} onChange={e => setReqForm(p => ({ ...p, shift_date: e.target.value }))} type="date"
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
              <div className="grid grid-cols-3 gap-2">
                {(['time_off', 'swap', 'cover', 'time_change', 'other'] as const).map(t => (
                  <button key={t} onClick={() => setReqForm(p => ({ ...p, change_type: t }))}
                    className={`py-2 rounded-xl text-[11px] font-bold border ${reqForm.change_type === t ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                    {t === 'time_off' ? 'Day off' : t === 'time_change' ? 'Time change' : t === 'swap' ? 'Swap' : t === 'cover' ? 'Cover' : 'Other'}
                  </button>
                ))}
              </div>
              <textarea value={reqForm.details} onChange={e => setReqForm(p => ({ ...p, details: e.target.value }))} rows={3} placeholder="Reason / details (optional for Day off)"
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 outline-none" />
              <div className="flex gap-2 pt-1">
                <button onClick={submitRequest} disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                  {submitting ? 'Sending…' : 'Send Request'}
                </button>
                <button onClick={() => setShowRequest(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Week helpers
function getWeekStart(date: string, _weekStartsOn?: string): string {
  // Always Monday → Sunday (hotel operations standard)
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const monOffset = day === 0 ? 6 : day - 1; // Monday=0
  d.setDate(d.getDate() - monOffset);
  return d.toISOString().split('T')[0];
}
function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function dayName(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}
function dayMonth(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}
function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}
function formatDateRange(a: string, b: string): string {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return `${da.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${db.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// Default coverage rules used by the forecast form
const DEFAULT_COVERAGE_RULES: CoverageRule[] = [
  { department: 'front_desk',   position: 'Front Desk Agent',  ratio: 30, min_staff: 1, max_staff: 4, start_time: '07:00', end_time: '23:00' },
  { department: 'housekeeping', position: 'Housekeeper',       ratio: 15, min_staff: 2, max_staff: 8, start_time: '08:00', end_time: '16:00' },
  { department: 'maintenance',  position: 'Maintenance Tech',  ratio: 50, min_staff: 1, max_staff: 3, start_time: '08:00', end_time: '17:00' },
  { department: 'security',     position: 'Security Officer',  ratio: 60, min_staff: 1, max_staff: 2, start_time: '22:00', end_time: '06:00' },
  { department: 'drivers',      position: 'Shuttle Driver',    ratio: 40, min_staff: 0, max_staff: 3, start_time: '06:00', end_time: '22:00' },
  { department: 'management',   position: 'Manager on Duty',   ratio: 80, min_staff: 1, max_staff: 2, start_time: '08:00', end_time: '20:00' },
];

/* ── Checklists Tab View ─────────────────────────────── */
function ChecklistsTabView({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [templates, setTemplates] = useState<Checklist[]>([]);
  const [instances, setInstances] = useState<ChecklistInstance[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState<DepartmentKey>('front_desk');
  const [openDept, setOpenDept] = useState<DepartmentKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [t, i] = await Promise.all([getChecklists(hotelId), getChecklistInstances(hotelId)]);
    setTemplates(t || []);
    setInstances(i || []);
  };
  useEffect(() => { load(); }, [hotelId]);

  const today = new Date().toISOString().split('T')[0];

  const create = async () => {
    if (!newName.trim()) return;
    setSubmitting(true); setError(null);
    const { error: err } = await supabase.from('staff_checklists').insert({
      hotel_id: hotelId,
      name: newName.trim(),
      items: [],
      department: newDept,
      is_active: true,
      assigned_role: 'staff',
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    setNewName(''); setNewDept('front_desk'); setShowNew(false);
    await load();
    setSubmitting(false);
  };

  const startInstance = async (templateId: string) => {
    setSubmitting(true); setError(null);
    const { error: err } = await supabase.from('staff_checklist_instances').insert({
      checklist_id: templateId,
      hotel_id: hotelId,
      staff_name: sessionStorage.getItem('attenda_session_name') || 'Staff',
      shift_date: today,
      checked_items: [],
      completed: false,
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    await load();
    setSubmitting(false);
  };

  const toggleItem = async (instanceId: string, itemId: string, currentlyChecked: boolean) => {
    const inst = instances.find(i => i.id === instanceId);
    if (!inst) return;
    const newChecked = currentlyChecked
      ? inst.checked_items.filter(x => x.item_id !== itemId)
      : [...inst.checked_items, { item_id: itemId, checked_at: new Date().toISOString() }];
    const tpl = templates.find(t => t.id === inst.checklist_id);
    const completed = newChecked.length === (tpl?.items.length || 0);
    await supabase.from('staff_checklist_instances').update({
      checked_items: newChecked,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', instanceId);
    await load();
  };

  const removeTemplate = async (id: string) => {
    if (!confirm('Delete this checklist template?')) return;
    await deleteChecklist(id);
    load();
  };

  // Build a map of templates by department
  const templatesByDept: Record<string, Checklist[]> = {};
  templates.filter(t => t.is_active !== false).forEach(t => {
    const k = t.department || 'front_desk';
    (templatesByDept[k] = templatesByDept[k] || []).push(t);
  });

  // Today's instance per template (most recent if multiple)
  const todaysInstanceFor = (templateId: string) =>
    instances
      .filter(i => i.checklist_id === templateId && i.shift_date === today)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-gray-900">Checklists</h1>
          <p className="text-[13px] text-gray-500">Today&apos;s tasks by department</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold" style={{ backgroundColor: TEAL }}>
            <Plus size={14} /> New
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-xl px-4 py-3 mb-4">{error}</div>}

      {/* Department sections — click to expand and see today's checklist */}
      <div className="space-y-3">
        {DEPARTMENTS.map(dept => {
          const deptTemplates = templatesByDept[dept.key] || [];
          const open = openDept === dept.key;
          return (
            <div key={dept.key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenDept(open ? null : dept.key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">{dept.icon}</span>
                  <div className="text-left">
                    <p className="text-[14px] font-bold text-gray-900">{dept.label}</p>
                    <p className="text-[11px] text-gray-500">
                      {deptTemplates.length} checklist{deptTemplates.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {deptTemplates.length === 0 ? (
                    <p className="text-[12px] text-gray-400 px-4 py-4">No checklists for {dept.label} yet. {isAdmin ? 'Create one above.' : 'Ask your manager to add one.'}</p>
                  ) : (
                    deptTemplates.map(tpl => {
                      const inst = todaysInstanceFor(tpl.id);
                      const totalItems = tpl.items?.length || 0;
                      const doneCount = inst?.checked_items.length || 0;
                      return (
                        <div key={tpl.id} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-[14px] font-semibold text-gray-900">{tpl.name}</p>
                              <p className="text-[11px] text-gray-500">
                                {totalItems} item{totalItems === 1 ? '' : 's'}
                                {inst ? ` · ${doneCount}/${totalItems} done` : ' · not started'}
                              </p>
                            </div>
                            {isAdmin ? (
                              <button onClick={() => removeTemplate(tpl.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                                <Trash2 size={14} />
                              </button>
                            ) : !inst && totalItems > 0 ? (
                              <button onClick={() => startInstance(tpl.id)} disabled={submitting} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                                Start
                              </button>
                            ) : inst?.completed ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Done</span>
                            ) : inst ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">In Progress</span>
                            ) : null}
                          </div>

                          {/* Progress bar */}
                          {inst && totalItems > 0 && (
                            <div className="bg-gray-100 rounded-full h-1.5 mb-3">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${(doneCount / totalItems) * 100}%`, backgroundColor: TEAL }} />
                            </div>
                          )}

                          {/* Items — only show for staff once they start the checklist, or for admin always */}
                          {(inst || isAdmin) && totalItems > 0 && (
                            <div className="space-y-1">
                              {tpl.items.map(item => {
                                const isChecked = !!inst?.checked_items.find(x => x.item_id === item.id);
                                return (
                                  <label key={item.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => inst && toggleItem(inst.id, item.id, isChecked)}
                                      disabled={!inst || submitting}
                                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                                      style={{ accentColor: TEAL }}
                                    />
                                    <span className={`text-[13px] ${isChecked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                      {item.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Admin: no-instance preview of items */}
                          {!inst && isAdmin && totalItems > 0 && (
                            <p className="text-[11px] text-gray-400 mt-1">Staff will start and check these off as they work.</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin: new checklist template modal */}
      {showNew && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowNew(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold">New Checklist Template</h2>
              <button onClick={() => setShowNew(false)} className="p-1 text-gray-400 hover:text-gray-600"><XIcon size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">Name the checklist and pick a department. Add items next (one per line).</p>
            <div className="space-y-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Morning Room Check" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" autoFocus />
              <select value={newDept} onChange={e => setNewDept(e.target.value as DepartmentKey)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100">
                {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
              </select>
              <div className="flex gap-2 pt-1">
                <button onClick={create} disabled={submitting} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>{submitting ? 'Saving…' : 'Create'}</button>
                <button onClick={() => setShowNew(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Learning View ───────────────────────────────────── */
/* ── Learning & HR (combined) ─────────────────────────── */
function LearningHRView({ hotelId }: { hotelId: string }) {
  const [learning, setLearning] = useState<(KnowledgeEntry)[]>([]);
  const [hr, setHr] = useState<(KnowledgeEntry)[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [l, h] = await Promise.all([getLearningDocs(hotelId), getHrDocs(hotelId)]);
      setLearning(l || []);
      setHr(h || []);
      setLoading(false);
    })();
  }, [hotelId]);

  const filterDocs = (docs: KnowledgeEntry[]) => {
    if (!search.trim()) return docs;
    const q = search.toLowerCase();
    return docs.filter(d =>
      d.question.toLowerCase().includes(q) ||
      d.answer.toLowerCase().includes(q) ||
      (d.keywords || []).some(k => k.toLowerCase().includes(q))
    );
  };

  const filteredLearning = filterDocs(learning);
  const filteredHR = filterDocs(hr);
  const totalCount = learning.length + hr.length;

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-gray-900 mb-1">Learning & HR</h1>
        <p className="text-[13px] text-gray-500">Training, policies, forms, and employee reference</p>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search policies, SOPs, training, forms..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-[13px] bg-white focus:outline-none focus:border-gray-400"
          />
        </div>
        {search && (
          <p className="text-[11px] text-gray-500 mt-1.5">
            {filteredLearning.length + filteredHR.length} of {totalCount} match "{search}"
          </p>
        )}
      </div>

      {/* Learning section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap size={16} className="text-gray-700" />
          <h2 className="text-[15px] font-bold text-gray-900">Learning</h2>
          <span className="text-[11px] text-gray-500">({filteredLearning.length})</span>
        </div>
        {filteredLearning.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <p className="text-[13px] text-gray-500">{search ? 'No matches in learning' : 'No training materials yet'}</p>
            {!search && <p className="text-[11px] text-gray-400 mt-1">Admins add docs from Knowledge Base.</p>}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredLearning.map(d => (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-[14px] font-bold text-gray-900">{d.question}</p>
                {d.answer && <p className="text-[12px] text-gray-600 mt-1.5 line-clamp-3">{d.answer}</p>}
                {d.source_url && (
                  <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 hover:underline mt-2">
                    <ExternalLink size={11} /> Open
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HR section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Briefcase size={16} className="text-gray-700" />
          <h2 className="text-[15px] font-bold text-gray-900">HR Documents</h2>
          <span className="text-[11px] text-gray-500">({filteredHR.length})</span>
        </div>
        {filteredHR.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <p className="text-[13px] text-gray-500">{search ? 'No matches in HR' : 'No HR documents yet'}</p>
            {!search && <p className="text-[11px] text-gray-400 mt-1">Admins add HR docs from Knowledge Base.</p>}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredHR.map(d => (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-[14px] font-bold text-gray-900">{d.question}</p>
                {d.answer && <p className="text-[12px] text-gray-600 mt-1.5 line-clamp-3">{d.answer}</p>}
                {d.source_url && (
                  <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 hover:underline mt-2">
                    <ExternalLink size={11} /> Open document
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// KPI TRACKING VIEW
// ============================================================
function KpisView({ hotelId, isAdmin, userName }: { hotelId: string; isAdmin: boolean; userId: string; userName: string }) {
  const [kpis, setKpis] = useState<OpRecord[]>([]);
  const [logs, setLogs] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ kpi_name: '', unit: '', target: 0, frequency: 'daily' as 'daily' | 'weekly' | 'monthly', category: 'Operations' });
  const [logValues, setLogValues] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [defs, lg] = await Promise.all([listKpiDefinitions(hotelId), listKpiSubmissions(hotelId)]);
      setKpis(defs || []);
      setLogs(lg || []);
      setLoading(false);
    })();
  }, [hotelId]);

  const today = new Date().toISOString().split('T')[0];
  const isInWindow = (kpiId: string, freq: string): boolean => {
    if (freq === 'daily') return !logs.some(l => (l.details as any).definition_id === kpiId && (l.details as any).shift_date === today);
    if (freq === 'weekly') {
      const ws = getWeekStart(today);
      return !logs.some(l => (l.details as any).definition_id === kpiId && getWeekStart((l.details as any).shift_date) === ws);
    }
    if (freq === 'monthly') {
      const m = today.substring(0, 7);
      return !logs.some(l => (l.details as any).definition_id === kpiId && (l.details as any).shift_date?.startsWith(m));
    }
    return true;
  };

  const saveKpi = async () => {
    if (!form.kpi_name) return;
    setSubmitting(true);
    try {
      await createKpiDefinition(hotelId, form);
      const defs = await listKpiDefinitions(hotelId);
      setKpis(defs || []);
      setShowAdd(false);
      setForm({ kpi_name: '', unit: '', target: 0, frequency: 'daily', category: 'Operations' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitLog = async (kpi: OpRecord) => {
    const def = kpi.details as any;
    const v = logValues[kpi.id];
    if (v === undefined) return;
    setSubmitting(true);
    try {
      await createKpiSubmission(hotelId, { definition_id: kpi.id, kpi_name: def.kpi_name, value: v, shift_date: today, submitted_by: userName });
      const lg = await listKpiSubmissions(hotelId);
      setLogs(lg || []);
      setLogValues(p => { const n = { ...p }; delete n[kpi.id]; return n; });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteKpi = async (id: string) => {
    if (!confirm('Delete this KPI?')) return;
    await deleteOps(id);
    setKpis(kpis.filter(k => k.id !== id));
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-extrabold text-gray-900">KPIs</h1>
          <p className="text-[12px] text-gray-500">Track performance metrics</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-xl text-white font-bold text-[12px] flex items-center gap-1" style={{ backgroundColor: TEAL }}>
            <Plus size={14} /> New KPI
          </button>
        )}
      </div>

      {kpis.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <TrendingUp size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">No KPIs yet</p>
          <p className="text-[12px] text-gray-400 mt-1">{isAdmin ? 'Tap "New KPI" to add one' : 'Your manager will add KPIs'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {kpis.map(k => {
            const def = k.details as any;
            const due = isInWindow(k.id, def.frequency);
            const recent = logs.filter(l => (l.details as any).definition_id === k.id).slice(0, 5);
            return (
              <div key={k.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-gray-900">{def.kpi_name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold capitalize">{def.frequency}</span>
                      {def.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">{def.category}</span>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Target: {def.target} {def.unit}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteKpi(k.id)} className="p-1 text-gray-400 hover:text-gray-700"><Trash2 size={14} /></button>
                  )}
                </div>
                {!isAdmin && due && (
                  <div className="mt-3 flex items-center gap-2">
                    <input type="number" value={logValues[k.id] ?? ''} onChange={e => setLogValues(p => ({ ...p, [k.id]: Number(e.target.value) }))} placeholder={`Value (${def.unit})`} className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[13px] border border-gray-100" />
                    <button onClick={() => submitLog(k)} disabled={submitting} className="px-3 py-2 rounded-lg text-white font-bold text-[12px]" style={{ backgroundColor: TEAL }}>Log</button>
                  </div>
                )}
                {!isAdmin && !due && (
                  <p className="text-[11px] text-gray-600 mt-2 font-semibold">✓ Logged this {def.frequency.replace('ly', '')}</p>
                )}
                {isAdmin && recent.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Recent</p>
                    <div className="space-y-1">
                      {recent.map(l => {
                        const ld = l.details as any;
                        return (
                          <div key={l.id} className="flex items-center justify-between text-[12px]">
                            <span className="text-gray-600">{ld.shift_date} · {ld.submitted_by}</span>
                            <span className="font-bold text-gray-900">{ld.value} {def.unit}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold mb-4">New KPI</h2>
            <div className="space-y-3">
              <input value={form.kpi_name} onChange={e => setForm(p => ({ ...p, kpi_name: e.target.value }))} placeholder="KPI name (e.g. Check-in time)" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Target</label>
                  <input type="number" value={form.target} onChange={e => setForm(p => ({ ...p, target: Number(e.target.value) }))} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Unit</label>
                  <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="min, %, $…" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Frequency</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['daily', 'weekly', 'monthly'] as const).map(f => (
                    <button key={f} onClick={() => setForm(p => ({ ...p, frequency: f }))} className={`py-2 rounded-xl text-[12px] font-bold border capitalize ${form.frequency === f ? 'border-gray-900 text-gray-900 bg-gray-100' : 'bg-white border-gray-200 text-gray-600'}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1">
                  <option>Revenue</option>
                  <option>Operations</option>
                  <option>Guest Experience</option>
                  <option>Quality</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveKpi} disabled={submitting || !form.kpi_name} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>{submitting ? 'Saving…' : 'Save KPI'}</button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SHUTTLE SCHEDULE VIEW (Sun–Sat week grid with time-slot rows)
// ============================================================
function ShuttleScheduleView({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [slots, setSlots] = useState<(OpsShuttleSlot & { id: string })[]>([]);
  const [config, setConfig] = useState<HotelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [form, setForm] = useState<{ day_of_week: number; departure_time: string; pickup_location: string; destination: string; service_type: 'regular' | 'express'; capacity: number; notes: string }>({ day_of_week: 1, departure_time: '08:00', pickup_location: '', destination: '', service_type: 'regular', capacity: 12, notes: '' });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, c] = await Promise.all([listShuttleSlots(hotelId), getHotelConfig(hotelId)]);
      setSlots(s || []);
      setConfig(c);
      setLoading(false);
    })();
  }, [hotelId]);

  const save = async () => {
    if (!form.pickup_location) return;
    try {
      await createOps(hotelId, 'shuttle_slot', form, 'active', { guest_name: 'Admin', room: 'SHUTTLE' });
      const s = await listShuttleSlots(hotelId);
      setSlots(s || []);
      setShowAdd(false);
      setForm({ day_of_week: 1, departure_time: '08:00', pickup_location: '', destination: '', service_type: 'regular', capacity: 12, notes: '' });
    } catch {
      alert('Failed to save shuttle slot');
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this slot?')) return;
    await deleteOps(id);
    setSlots(slots.filter(s => s.id !== id));
  };

  const generateMonth = async () => {
    if (!config?.hasFreeShuttle) {
      setGenResult('Free shuttle is not enabled. Turn it on in Property Settings first.');
      return;
    }
    const startTime = config.shuttleStartTime?.slice(0, 5);
    const endTime = config.shuttleEndTime?.slice(0, 5);
    if (!startTime || !endTime) {
      setGenResult('Set shuttle start and end times in Property Settings first.');
      return;
    }
    if (!config.shuttleDays || config.shuttleDays.length === 0) {
      setGenResult('Set shuttle days in Property Settings first.');
      return;
    }
    setGenerating(true);
    setGenResult(null);
    try {
      const [year, month] = genMonth.split('-').map(Number);
      const startMin = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const endMin = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      const lastDay = new Date(year, month, 0).getDate();
      let created = 0;
      let skipped = 0;
      for (let d = 1; d <= lastDay; d++) {
        const dt = new Date(year, month - 1, d);
        const dow = dt.getDay(); // 0=Sun..6=Sat
        // Convert 0-6 to our schedule's day_of_week convention (this view uses 0=Sun..6=Sat, matching Date.getDay)
        if (!config.shuttleDays.includes(dow)) { skipped++; continue; }
        for (let m = startMin; m <= endMin; m += 60) {
          const hh = String(Math.floor(m / 60)).padStart(2, '0');
          const mm = String(m % 60).padStart(2, '0');
          // Skip if a slot for this day+time already exists
          const exists = slots.some(s => s.day_of_week === dow && s.departure_time === `${hh}:${mm}:00`);
          if (exists) { skipped++; continue; }
          await createOps(hotelId, 'shuttle_slot', {
            day_of_week: dow,
            departure_time: `${hh}:${mm}:00`,
            pickup_location: config.shuttlePickupLocation || 'Hotel lobby',
            destination: 'Airport',
            service_type: 'regular',
            capacity: config.shuttleCapacity || 8,
            notes: '',
          }, 'active', { guest_name: 'Admin', room: 'SHUTTLE' });
          created++;
        }
      }
      const refreshed = await listShuttleSlots(hotelId);
      setSlots(refreshed || []);
      setGenResult(`Created ${created} slots for ${genMonth}${skipped ? `, skipped ${skipped} duplicates or off-days` : ''}.`);
    } catch (e: any) {
      setGenResult(`Failed: ${e?.message || 'unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SERVICE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    regular: { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-300' },
    express: { bg: 'bg-gray-900', text: 'text-white', ring: 'ring-gray-700' },
  };

  // Build unique time-slot rows
  const allTimes = Array.from(new Set(slots.map(s => s.departure_time))).sort();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-extrabold text-gray-900">Shuttle Schedule</h1>
          <p className="text-[12px] text-gray-500">Free pickup and drop-off times</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowGenerate(true)} disabled={!config?.hasFreeShuttle} className="px-3 py-2 rounded-xl bg-gray-900 text-white font-bold text-[12px] flex items-center gap-1 disabled:opacity-40" title={!config?.hasFreeShuttle ? 'Enable free shuttle in Property Settings first' : 'Auto-fill the month'}>
              <CalendarDays size={14} /> Generate Month
            </button>
            <button onClick={() => setShowAdd(true)} className="px-3 py-2 rounded-xl text-white font-bold text-[12px] flex items-center gap-1" style={{ backgroundColor: TEAL }}>
              <Plus size={14} /> Add Slot
            </button>
          </div>
        )}
      </div>

      {slots.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Bus size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">No shuttle slots configured</p>
          {isAdmin && <p className="text-[12px] text-gray-400 mt-1">Tap "Add Slot" to build the weekly grid</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 text-left p-2 font-bold text-gray-500 uppercase text-[10px] min-w-[80px]">Time</th>
                  {DAYS.map(d => <th key={d} className="text-center p-2 font-bold text-gray-500 uppercase text-[10px] min-w-[110px]">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {allTimes.map(time => (
                  <tr key={time} className="border-b border-gray-100">
                    <td className="sticky left-0 z-10 bg-white p-2 font-bold text-gray-700 text-[11px]">{time}</td>
                    {DAYS.map((_, dayIdx) => {
                      const cellSlots = slots.filter(s => s.day_of_week === dayIdx && s.departure_time === time);
                      return (
                        <td key={dayIdx} className="p-1 align-top">
                          {cellSlots.map(s => {
                            const c = SERVICE_COLORS[s.service_type] || SERVICE_COLORS.regular;
                            return (
                              <div key={s.id} className={`${c.bg} ${c.text} rounded-lg p-1.5 mb-1 ring-1 ${c.ring} relative group`}>
                                <p className="font-bold text-[10px] leading-tight">{s.pickup_location}</p>
                                {s.notes && <p className="text-[9px] opacity-80 leading-tight mt-0.5">→ {s.notes}</p>}
                                {isAdmin && (
                                  <button onClick={() => del(s.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px]">×</button>
                                )}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 ring-1 ring-gray-300"></span><span className="text-gray-600">Regular</span></span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-900 ring-1 ring-gray-700"></span><span className="text-gray-600">Express</span></span>
          </div>
        </div>
      )}

      {showAdd && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold mb-4">New Shuttle Slot</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Day</label>
                <div className="grid grid-cols-7 gap-1 mt-1">
                  {DAYS.map((d, i) => (
                    <button key={d} onClick={() => setForm(p => ({ ...p, day_of_week: i }))} className={`py-2 rounded-lg text-[10px] font-bold ${form.day_of_week === i ? 'text-white' : 'bg-gray-100 text-gray-600'}`} style={form.day_of_week === i ? { backgroundColor: TEAL } : {}}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Departure Time</label>
                <input type="time" value={form.departure_time} onChange={e => setForm(p => ({ ...p, departure_time: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
              </div>
              <input value={form.pickup_location} onChange={e => setForm(p => ({ ...p, pickup_location: e.target.value }))} placeholder="Pickup location (e.g. Hotel lobby)" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
              <input value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} placeholder="Destination (e.g. MIA Airport)" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Service</label>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {(['regular', 'express'] as const).map(t => (
                      <button key={t} onClick={() => setForm(p => ({ ...p, service_type: t }))} className={`py-2 rounded-xl text-[11px] font-bold border capitalize ${form.service_type === t ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`} style={form.service_type === t ? { backgroundColor: TEAL } : {}}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Capacity</label>
                  <input type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
                </div>
              </div>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Notes (optional)" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100" />
              <div className="flex gap-2 pt-2">
                <button onClick={save} disabled={!form.pickup_location} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>Save</button>
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGenerate && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => { setShowGenerate(false); setGenResult(null); }}>
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold mb-1">Generate Month of Shuttle Slots</h2>
            <p className="text-[11px] text-gray-500 mb-4">
              Auto-fills every {config?.shuttleDays && config.shuttleDays.length < 7 ? 'selected ' : ''}day from {config?.shuttleStartTime?.slice(0, 5) || '—'} to {config?.shuttleEndTime?.slice(0, 5) || '—'} on the hour. Uses {config?.shuttlePickupLocation || 'Hotel lobby'} → Airport, capacity {config?.shuttleCapacity || 8}. Existing slots are kept; duplicates are skipped.
            </p>

            <label className="text-[10px] font-bold text-gray-500 uppercase">Month</label>
            <input type="month" value={genMonth} onChange={e => setGenMonth(e.target.value)} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1 mb-4" />

            {genResult && (
              <div className="bg-gray-50 rounded-xl p-3 text-[12px] text-gray-700 mb-3">
                {genResult}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={generateMonth} disabled={generating} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                {generating ? 'Generating…' : 'Generate'}
              </button>
              <button onClick={() => { setShowGenerate(false); setGenResult(null); }} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// INCIDENT / KNOWLEDGE BASE VIEW (paste incident → AI suggestion → save)
// ============================================================
function IncidentKBView({ hotelId, isAdmin, userName }: { hotelId: string; isAdmin: boolean; userName: string }) {
  const [approved, setApproved] = useState<OpRecord[]>([]);
  const [pending, setPending] = useState<OpRecord[]>([]);
  const [rejected, setRejected] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState('');
  const [category, setCategory] = useState<string>('Complaint');
  const [suggestion, setSuggestion] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'approved' | 'pending' | 'rejected' | 'all'>('approved');
  const [ask, setAsk] = useState('');
  const [askResult, setAskResult] = useState<{ id: string; title: string; category: string; situation: string; response: string; score: number } | null>(null);
  const [askNotFound, setAskNotFound] = useState(false);
  const [askCopied, setAskCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const [a, p, r] = await Promise.all([
      listKbSuggestionsByStatus(hotelId, 'active'),
      listKbSuggestionsByStatus(hotelId, 'pending'),
      listKbSuggestionsByStatus(hotelId, 'rejected'),
    ]);
    setApproved(a || []);
    setPending(p || []);
    setRejected(r || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hotelId]);

  const generateSuggestion = () => {
    if (!incident) return;
    const result = suggestResponse(incident, category as any);
    setSuggestion(result.response);
  };

  const save = async () => {
    if (!incident || !suggestion) return;
    setSaving(true);
    try {
      // New flow: staff submissions start in 'pending' for admin review
      await createKbSuggestionPending(hotelId, {
        title: category + ' response',
        category,
        situation: incident,
        response: suggestion,
        added_by: userName,
      });
      await load();
      setIncident('');
      setSuggestion('');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id: string) => {
    await approveKbSuggestion(id);
    await load();
  };

  const reject = async (id: string) => {
    if (!confirm('Reject this entry? It will be moved to Rejected and not appear in search.')) return;
    await rejectKbSuggestion(id);
    await load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this KB entry?')) return;
    await deleteKbSuggestion(id);
    await load();
  };

  const askKb = () => {
    if (!ask.trim()) { setAskResult(null); setAskNotFound(false); return; }
    const q = ask.toLowerCase().trim();
    // Score each approved entry by keyword overlap on situation + response + category
    const scored = approved.map(e => {
      const d = e.details as any;
      const haystack = [d.situation || '', d.response || '', d.category || '', d.title || ''].join(' ').toLowerCase();
      const qWords = q.split(/\s+/).filter(w => w.length > 1);
      let score = 0;
      for (const w of qWords) {
        if (haystack.includes(w)) score += 2;
        // Whole phrase bonus
        if (haystack.includes(q)) score += 3;
      }
      // Exact phrase match big bonus
      if (haystack.includes(q)) score += 5;
      return { id: e.id, title: d.title, category: d.category, situation: d.situation, response: d.response, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    if (scored.length === 0) {
      setAskResult(null);
      setAskNotFound(true);
    } else {
      setAskResult(scored[0]);
      setAskNotFound(false);
      setAskCopied(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  const categories = [
    { key: 'Complaint', label: 'Complaint', icon: '⚠️' },
    { key: 'Praise', label: 'Praise', icon: '⭐' },
    { key: 'Service', label: 'Service', icon: '💬' },
    { key: 'Safety', label: 'Incident', icon: '🚨' },
  ];

  const visible = filter === 'all'
    ? [...pending, ...approved, ...rejected]
    : filter === 'pending' ? pending
    : filter === 'rejected' ? rejected
    : approved;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-[20px] font-extrabold text-gray-900">Knowledge Base</h1>
        <p className="text-[12px] text-gray-500">Ask the KB · log incidents · admin approves · team searches</p>
      </div>

      {/* Ask the KB — chatbot-style search bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
          <Search size={11} /> Ask the KB
        </label>
        <div className="flex gap-2 mt-1.5">
          <input
            type="text"
            value={ask}
            onChange={e => { setAsk(e.target.value); if (!e.target.value) { setAskResult(null); setAskNotFound(false); } }}
            onKeyDown={e => { if (e.key === 'Enter') askKb(); }}
            placeholder="e.g. guest complaint about noise, late checkout fee..."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100"
          />
          <button onClick={askKb} disabled={!ask.trim()} className="px-4 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
            Ask
          </button>
        </div>

        {askResult && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 font-semibold capitalize">{askResult.category}</span>
              <span className="text-[10px] text-gray-500">{askResult.title}</span>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 mb-0.5">Situation</p>
            <p className="text-[12px] text-gray-700">{askResult.situation}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 mb-0.5">Suggested response</p>
            <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{askResult.response}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { navigator.clipboard.writeText(askResult.response); setAskCopied(true); setTimeout(() => setAskCopied(false), 1500); }} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                <Copy size={11} /> {askCopied ? 'Copied' : 'Copy response'}
              </button>
            </div>
          </div>
        )}

        {askNotFound && ask.trim() && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3 text-[12px] text-gray-600">
            No approved KB entry matches "{ask}". {isAdmin ? 'Review the Pending tab below — entries awaiting your approval.' : 'Paste the situation in the form below to log a new incident for admin review.'}
          </div>
        )}
      </div>

      {/* Submit a new incident */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Plus size={14} className="text-gray-700" />
          <p className="text-[14px] font-bold text-gray-900">Log a new incident</p>
        </div>
        <p className="text-[11px] text-gray-500 mb-3">Staff submissions are saved as <span className="font-semibold">Pending</span>. Admins review and approve to add to the searchable KB.</p>
        <label className="text-[10px] font-bold text-gray-500 uppercase">Category</label>
        <div className="grid grid-cols-4 gap-1 mt-1 mb-3">
          {categories.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)} className={`py-2 rounded-xl text-[11px] font-bold border ${category === c.key ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'}`} style={category === c.key ? { backgroundColor: TEAL } : {}}>
              <span className="mr-1">{c.icon}</span>{c.label}
            </button>
          ))}
        </div>
        <label className="text-[10px] font-bold text-gray-500 uppercase">What happened?</label>
        <textarea value={incident} onChange={e => setIncident(e.target.value)} rows={3} placeholder="e.g. Guest in 312 complained about noise from the room above at 1am..." className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
        <button onClick={generateSuggestion} disabled={!incident} className="mt-3 w-full py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>
          ✨ Suggest Response
        </button>
        {suggestion && (
          <>
            <label className="text-[10px] font-bold text-gray-500 uppercase mt-3 block">Suggested response (edit if needed)</label>
            <textarea value={suggestion} onChange={e => setSuggestion(e.target.value)} rows={5} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-[14px] border border-gray-100 mt-1" />
            <div className="flex gap-2 mt-3">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-[13px] disabled:opacity-50" style={{ backgroundColor: TEAL }}>{saving ? 'Submitting…' : 'Submit for Review'}</button>
              <button onClick={() => { setIncident(''); setSuggestion(''); }} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-[13px]">Clear</button>
            </div>
          </>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {([
          { key: 'approved', label: `✓ Approved (${approved.length})` },
          ...(isAdmin ? [{ key: 'pending', label: `⏳ Pending (${pending.length})` }] : []),
          ...(isAdmin ? [{ key: 'rejected', label: `✗ Rejected (${rejected.length})` }] : []),
          ...(isAdmin ? [{ key: 'all', label: `All (${approved.length + pending.length + rejected.length})` }] : []),
        ] as { key: 'approved' | 'pending' | 'rejected' | 'all'; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap ${filter === t.key ? 'text-white' : 'bg-white border border-gray-200 text-gray-600'}`} style={filter === t.key ? { backgroundColor: TEAL } : {}}>{t.label}</button>
        ))}
      </div>

      {/* KB entries */}
      {visible.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">
            {filter === 'pending' ? 'No pending entries' : filter === 'rejected' ? 'No rejected entries' : 'No KB entries yet'}
          </p>
          <p className="text-[12px] text-gray-400 mt-1">
            {filter === 'pending' ? 'New staff submissions will appear here for your review.' : 'Submit an incident above to start the KB.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(e => {
            const d = e.details as any;
            const isPending = e.status === 'pending';
            const isRejected = e.status === 'rejected';
            return (
              <details key={e.id} className={`bg-white rounded-2xl border shadow-sm group ${isPending ? 'border-amber-200' : isRejected ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
                <summary className="p-4 cursor-pointer list-none flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold capitalize">{d.category}</span>
                      {isPending && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">⏳ Pending</span>}
                      {isRejected && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-semibold">✗ Rejected</span>}
                      <span className="text-[10px] text-gray-400">{e.created_at?.split('T')[0]}</span>
                      <span className="text-[10px] text-gray-400">by {d.added_by}</span>
                    </div>
                    <p className="text-[13px] text-gray-700 line-clamp-2">{d.situation}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={ev => { ev.preventDefault(); del(e.id); }} className="p-1 text-gray-400 hover:text-gray-700 ml-2" title="Delete"><Trash2 size={14} /></button>
                  )}
                </summary>
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-3 mb-1">Suggested response</p>
                  <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{d.response}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => { navigator.clipboard.writeText(d.response); }} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: TEAL }}>
                      <Copy size={11} /> Copy
                    </button>
                    {isAdmin && isPending && (
                      <>
                        <button onClick={() => approve(e.id)} className="ml-auto px-3 py-1.5 rounded-lg text-white font-bold text-[11px]" style={{ backgroundColor: TEAL }}>
                          ✓ Approve
                        </button>
                        <button onClick={() => reject(e.id)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {isAdmin && isRejected && (
                      <button onClick={() => approve(e.id)} className="ml-auto px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-[11px]">
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADMIN CALLOUTS (requests for changes / time off)
// ============================================================
function AdminCalloutsView({ hotelId }: { hotelId: string }) {
  const [reqs, setReqs] = useState<OpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await listScheduleChangeRequests(hotelId, 'pending');
      setReqs(r || []);
      setLoading(false);
    })();
  }, [hotelId]);

  const resolve = async (id: string) => {
    await updateOps(id, { status: 'resolved' });
    setReqs(reqs.filter(r => r.id !== id));
  };

  if (loading) return <div className="p-4 text-center text-[13px] text-gray-400 py-12">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-[20px] font-extrabold text-gray-900">Staff Callouts</h1>
        <p className="text-[12px] text-gray-500">Requests for time off, swaps, and changes</p>
      </div>
      {reqs.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Inbox size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] text-gray-500 font-medium">No pending callouts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reqs.map(r => {
            const d = r.details as any;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{d.requested_by} · {d.change_type?.replace('_', ' ')}</p>
                    <p className="text-[12px] text-gray-500 mt-1">{d.details}</p>
                    <p className="text-[10px] text-gray-400 mt-2">{d.shift_date} · {d.department}</p>
                  </div>
                  <button onClick={() => resolve(r.id)} className="px-3 py-1.5 rounded-lg text-white font-bold text-[11px]" style={{ backgroundColor: TEAL }}>Resolve</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline helpers for SVG icons not in lucide
const MapPin = ({ size, style }: { size: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const Phone = ({ size, style }: { size: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
